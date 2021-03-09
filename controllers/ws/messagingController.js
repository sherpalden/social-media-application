const mongoose = require('mongoose');

const users = require('../../models/users/users.js')
const conversations = require('../../models/chat/conversations.js')
const messages = require('../../models/chat/messages.js')

const validationController = require('../validationController.js')

const getDmMessages = async (socket, data, cb) => {
	try {
		let skips = 0, limit = 10;
        if(data.skips) {skips = parseInt(data.skips);}
        if(data.limit) {limit = parseInt(data.limit);}
		const nextSkips = limit + skips;

		if(!data.receiverID) return cb({msg: "receiverID of receipent is required"});
		if(data.receiverID.split('').length != 24) return cb({msg: "Invalid receiverID"});

		const senderID = socket.userID;
		if(senderID == data.receiverID) return cb({msg: "receiverID cannot be yourself"})

		let conversationID, totalMessages;

		let messageLists = [];
		if(data.conversationID){
			if(data.conversationID.split('').length != 24) return cb({msg: "Invalid conversationID"});
			conversationID = data.conversationID;
			messageLists = await messages.aggregate([
				{$match: {conversationID: mongoose.Types.ObjectId(data.conversationID)}},
				{$sort: {_id: -1}},
				{$skip: skips},
				{$limit: limit},
			]);
			totalMessages = await messages.countDocuments({conversationID: mongoose.Types.ObjectId(data.conversationID)})
		}
		else {
			conversation = await conversations.findOne({
				$and:[
				{type: "dm"},
				{members: {$in: mongoose.Types.ObjectId(data.receiverID)}},
				{members: {$in: mongoose.Types.ObjectId(senderID)}},
			]})
			if(!conversation){
				conversation = await conversations.create({
					type: "dm",
					members: [data.receiverID, senderID]
				})
			}
			conversationID = conversation._id;
			messageLists = await messages.aggregate([
				{$match: {conversationID: conversation._id}},
				{$sort: {_id: -1}},
				{$skip: skips},
				{$limit: limit},
			])
			totalMessages = await messages.countDocuments({conversationID: conversationID})
		}

		if(nextSkips >= totalMessages){
            socket.nextSkips = null;
        } 
        else{
            socket.nextSkips = nextSkips;
        }

        let dataToSend = {
            messages: messageLists,
            conversationID: conversationID,
            total: totalMessages,
            nextSkips: socket.nextSkips
        }
        return cb(null, dataToSend);
	}
	catch(err) {
		return cb({msg: err.message});
	}
}

const postDmText = async (socket, data, cb) => {
	try {
		if(!data.receiverID) return cb({msg: "receiverID of receipent is required"});
		if(data.receiverID.split('').length != 24) return cb({msg: "Invalid receiverID"});

		if(!data.conversationID) return cb({msg: "conversationID of chat is required"});
		if(data.conversationID.split('').length != 24) return cb({msg: "Invalid conversationID"});

		if(!data.text) return cb({msg: "empty message cannot be sent"})

		const senderID = socket.userID;

		let conversation = await conversations.findOne({_id: mongoose.Types.ObjectId(data.conversationID)});

		if(!conversation) return cb({msg: "conversation not found"})
		conversation.lastMessagedAt = Date.now()

		const message = await messages.create({
			conversationID: conversation._id,
			senderID: senderID,
			text: data.text,
		})
		await conversation.save()
		return cb(null, message)
	}
	catch(err){
		// console.log(err)
		return cb({msg: err.message})
	}
}

const postDmFiles = async (socket, data, cb) => {
	try {
		if(!data.receiverID) return cb({msg: "receiverID of receipent is required"});
		if(data.receiverID.split('').length != 24) return cb({msg: "Invalid receiverID"});

		if(!data.conversationID) return cb({msg: "conversationID of chat is required"});
		if(data.conversationID.split('').length != 24) return cb({msg: "Invalid conversationID"});

		if(!data.files || (data.files.length < 1)) return cb({msg: "empty message cannot be sent"});

		const senderID = socket.userID;

		let conversation = await conversations.findOne({_id: mongoose.Types.ObjectId(data.conversationID)});
		if(!conversation) return cb({msg: "conversation not found"})
		conversation.lastMessagedAt = Date.now()

		const message = await messages.create({
			conversationID: conversation._id,
			senderID: senderID,
			files: data.files,
		})
		await conversation.save()
		return cb(null, message)
	}
	catch(err){
		// console.log(err)
		return cb({msg: err.message})
	}
}

const createGroupConversation = async (socket, data, cb) => {
	try {
		if(!data.members || (data.members.length < 2)) return cb({msg: "A group conversation requires at least two members excluding yourself"});
		if(!data.groupName) return cb({msg: "Group name is required for group conversation"});
		for(memberID of data.members){
			if(memberID.split('').length != 24) return cb({msg: `Invalid memberID ${memberID}`});
		}
		const adminID = socket.userID;
		data.members.push(adminID);
		const conversation = await conversations.create({
			type: "gm",
			room: data.groupName,
			admin: adminID,
			members: data.members
		})
		let newConversation = {members: [],};
		for(memberID of conversation.members){
			let userData = await users.aggregate([
				{ $match: {_id: memberID}},
	            { $project: {fullName:1}},
	            { $lookup: 
	                { 
	                    from: 'user_profiles', 
	                    pipeline: [
	                        { $match: {userID: mongoose.Types.ObjectId(memberID)} },
	                        { $project: {profilePic:1}}
	                    ],
	                    as: 'profileInfo'
	                }
	            },
	            { $unwind: '$profileInfo'},
			])
			if(userData.length > 0){
				newConversation.members.push({
					_id: userData[0]._id, 
					fullName: userData[0].fullName, 
					profilePic: userData[0].profileInfo.profilePic
				})
			}
		}
		newConversation.groupName = conversation.room;
		for(member of newConversation.members){
			if(member._id.equals(conversation.adminID)){
				newConversation.admin = member
				break;
			}
		}
		newConversation.conversationID = conversation._id;
		return cb(null, newConversation);
	}
	catch(err) {
		return cb({msg: err.message});
	}
}

const getGroupConversations = async (socket, cb) => {
	try {
		const userID = socket.userID;
		const myGroupConversations = await conversations.find({
			$and:[
				{type: "gm"},
				{members: {$in: mongoose.Types.ObjectId(userID)}}
			]
		});
		if(myGroupConversations.length < 1) return cb(null)
		for(conversation of myGroupConversations){
			for(memberID of conversation.members){
				let userData = await users.aggregate([
					{ $match: {_id: memberID}},
		            { $project: {fullName:1}},
		            { $lookup: 
		                { 
		                    from: 'user_profiles', 
		                    pipeline: [
		                        { $match: {userID: memberID} },
		                        { $project: {profilePic:1}}
		                    ],
		                    as: 'profileInfo'
		                }
		            },
		            { $unwind: '$profileInfo'},
				])
				let index = conversation.members.indexOf(memberID);
				if(userData.length > 0){
					conversation.members[index] = {
						_id: userData[0]._id, 
						fullName: userData[0].fullName, 
						profilePic: userData[0].profileInfo.profilePic
					};
				}
			}
		}
		cb(null, myGroupConversations)
	}
	catch(err) {
		console.log(err)
		return cb({msg: err.message})
	}
}

const getGmMessages = async (socket, data, cb) => {
	try {
		let skips = 0, limit = 10;
        if(data.skips) {skips = parseInt(data.skips);}
        if(data.limit) {limit = parseInt(data.limit);}
		const nextSkips = limit + skips;

		const userID = socket.userID;

		if(!data.conversationID) return cb({msg: "Group conversationID is required"});
		if(data.conversationID.split('').length != 24) return cb({msg: "Invalid conversationID"});

		const messageLists = await messages.aggregate([
			{$match: {conversationID: mongoose.Types.ObjectId(data.conversationID)}},
			{$sort: {_id: -1}},
			{$skip: skips},
			{$limit: limit},
			{$lookup: 
				{ 
					from: 'users', 
					let: { user_id: "$senderID" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$_id", "$$user_id"] } } },
						{ $project: {fullName: 1}}
					],
					as: '$senderInfo'
				}
			},
			{$unwind: '$senderInfo'},
			{ $lookup: 
				{ 
					from: 'user_profiles', 
					let: { user_id: "$senderID" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$userID", "$$user_id"] } } },
						{ $project: { profilePic: 1 }}
					],
					as: '$senderProfileInfo'
				}
			},
			{$unwind: '$senderProfileInfo'},
			{$project: {
                sender: {
                    _id: "$senderID",
                    fullName: "$senderInfo.fullName",
                    profilePic: "$senderProfileInfo.profilePic"
                },
                date: 1, files: 1, text: 1, senderID: 0,
            }},
		]);

		const totalMessages = await messages.countDocuments({conversationID: mongoose.Types.ObjectId(data.conversationID)})

		if(nextSkips >= totalMessages){
            socket.nextSkips = null;
        } 
        else{
            socket.nextSkips = nextSkips;
        }

        let dataToSend = {
            messages: messageLists,
            conversationID: data.conversationID,
            total: totalMessages,
            nextSkips: socket.nextSkips
        }
        return cb(null, dataToSend);
	}
	catch(err) {
		return cb({msg: err.message});
	}
}

const postGmText = async (socket, data, cb) => {
	try {
		if(!data.conversationID) return cb({msg: "conversationID of group conversation is required"});
		if(data.conversationID.split('').length != 24) return cb({msg: "Invalid conversationID"});

		if(!data.text) return cb({msg: "empty message cannot be sent"})

		const senderID = socket.userID;
		const senderArr = await users.aggregate([
			{$match: {_id: mongoose.Types.ObjectId(senderID)}},
            {$lookup: 
                { 
                    from: 'user_profiles', 
                    pipeline: [
                        { $match: {userID: mongoose.Types.ObjectId(senderID)} },
                        { $project: {profilePic:1}}
                    ],
                    as: 'profileInfo'
                }
            },
            {$unwind: '$profileInfo'},
            {$project: {
                sender: {
                    _id: senderID,
                    fullName: "$fullName",
                    profilePic: "$profileInfo.profilePic"
                },
                _id: 0,
            }},
		])

		let conversation = await conversations.findOne({_id: mongoose.Types.ObjectId(data.conversationID)});

		if(!conversation) return cb({msg: "conversation not found"})
		conversation.lastMessagedAt = Date.now()
		const message = await messages.create({
			conversationID: conversation._id,
			senderID: senderID,
			text: data.text,
		})
		await conversation.save()
		return cb(null, {
			_id: message._id,
			room: conversation.room,
			conversationID: message.conversationID,
			text: message.text,
			sender: senderArr[0].sender
		});
	}
	catch(err) {
		return cb({msg: err.message})
	}
}

const postGmFiles = async (socket, data, cb) => {
	try {
		if(!data.conversationID) return cb({msg: "conversationID of group conversation is required"});
		if(data.conversationID.split('').length != 24) return cb({msg: "Invalid conversationID"});

		if(!data.files) return cb({msg: "empty message cannot be sent"})

		const senderID = socket.userID;
		const senderArr = await users.aggregate([
			{$match: {_id: mongoose.Types.ObjectId(senderID)}},
            {$lookup: 
                { 
                    from: 'user_profiles', 
                    pipeline: [
                        { $match: {userID: mongoose.Types.ObjectId(senderID)} },
                        { $project: {profilePic:1}}
                    ],
                    as: 'profileInfo'
                }
            },
            {$unwind: '$profileInfo'},
            {$project: {
                sender: {
                    _id: senderID,
                    fullName: "$fullName",
                    profilePic: "$profileInfo.profilePic"
                },
                _id: 0,
            }},
		])

		let conversation = await conversations.findOne({_id: mongoose.Types.ObjectId(data.conversationID)});

		if(!conversation) return cb({msg: "conversation not found"})
		conversation.lastMessagedAt = Date.now()
		const message = await messages.create({
			conversationID: conversation._id,
			senderID: senderID,
			files: data.files,
		})
		await conversation.save()
		return cb(null, {
			_id: message._id,
			room: conversation.room,
			conversationID: message.conversationID,
			files: message.files,
			sender: senderArr[0].sender
		});
	}
	catch(err) {
		return cb({msg: err.message})
	}
}


module.exports = {
	getDmMessages,
	postDmText,
	postDmFiles,

	createGroupConversation,
	getGroupConversations,
	getGmMessages,
	postGmText,
	postGmFiles,
}
