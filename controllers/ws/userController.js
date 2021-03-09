//database models required
const users = require('../../models/users/users.js');
const userProfiles = require('../../models/users/userProfile.js');
const userNotifications = require('../../models/notifications/userNotifications.js');

//require npm
const mongoose = require('mongoose');

//require notification type
const notificationType = require('../../notificationType.js');

const addFriend = async (socket, data, cb) => {
    try {
        const senderID = socket.userID;
        if(!data.receiverID) return cb({msg: "ReceiverID is required"});
        const receiverID = data.receiverID;
        if(receiverID.split('').length != 24) return cb({msg: "Invalid receiverID"});

        const senderArray = await users.aggregate([
            { $match: {_id: mongoose.Types.ObjectId(senderID)}},
            { $project: {fullName:1}},
            { $lookup: 
                { 
                    from: 'user_profiles', 
                    pipeline: [
                        { $match: {userID: mongoose.Types.ObjectId(senderID)} },
                        { $project: {profilePic:1}}
                    ],
                    as: 'profileInfo'
                }
            },
            { $unwind: '$profileInfo'},
        ])
        if(senderArray.length < 1) return cb({msg:"Sender Not Found"});
        const sender = senderArray[0];

        const receiver = await users.findOne(
            {_id: mongoose.Types.ObjectId(receiverID)},
            {fullName:1, inLinkRequests:1, notifications: 1}
        );
        if(!receiver) return cb({msg: "Receiver Not Found"});

        receiver.inLinkRequests.push({
            userID: sender._id,
            fullName: sender.fullName
        });

        const notification = await userNotifications.create({
            type: notificationType.addedFriend,
            receiverID: receiverID,
            senderID: sender._id,
            message: `${sender.fullName} sent you a friend request.`,
        })

        const newNotifications = await userNotifications.countDocuments({
            $and: [
                {receiverID: mongoose.Types.ObjectId(receiverID)},
                {isSeen: false}
            ]
        });
        await users.updateOne(
           {_id: mongoose.Types.ObjectId(senderID)},
           {$addToSet: { outLinkRequests: {userID: receiver._id, fullName: receiver.fullName}}}
        )
        await receiver.save();

        let senderData = {
            _id: notification._id,
            sender: {
                _id: sender._id,
                fullName: sender.fullName,
                profilePic: sender.profileInfo.profilePic
            },
            type: notificationType.addedFriend,
            message: `${sender.fullName} sent you a friend request.`,
            date: notification.date,
            newNotifications: newNotifications,
        }
        return cb(null, senderData);
    }
    catch(err) {
        return cb({msg: err.message});
    }
}

const acceptFriend = async (socket, data, cb) => {
    try {
        const receiverID = socket.userID;
        if(!data.senderID) return cb({msg: "senderID is required"});
        const senderID = data.senderID;
        if(senderID.split('').length != 24) return cb({msg: "Invalid senderID"});
        //receiver is the one who accepted the friend request.
        const receiverArray = await users.aggregate([
            { $match: {_id: mongoose.Types.ObjectId(receiverID)}},
            { $project: {fullName:1, links:1, inLinkRequests:1}},
            { $lookup: 
                { 
                    from: 'user_profiles', 
                    pipeline: [
                        { $match: {userID: mongoose.Types.ObjectId(senderID)} },
                        { $project: { profilePic: 1 }}
                    ],
                    as: 'profileInfo'
                }
            },
            { $unwind: '$profileInfo'},
        ])
        if(receiverArray.length < 1) return cb({msg:"Receiver Not Found"});
        const receiver = receiverArray[0];

        const sender = await users.findOne(
            {_id: mongoose.Types.ObjectId(senderID)},
            {fullName:1, links:1, outLinkRequests:1, notifications:1}
        );
        if(!sender) return cb({msg: "Sender Not Found"});

        let isReqSent = false;
        let isReqReceived = false;
        let sentReqID, receiveReqID;
        sender.outLinkRequests.forEach(linkReq => {
            if(linkReq.userID.equals(receiver._id)){ 
                isReqSent = true;
                receiveReqID = linkReq._id;
                return;
            }
        })
        receiver.inLinkRequests.forEach(linkReq => {
            if(linkReq.userID.equals(sender._id)){ 
                isReqReceived = true;
                sentReqID = linkReq._id;
                return;
            }
        })
        if(!isReqSent || !isReqReceived) return cb({msg: "Invalid request!, the sender has not sent a request to you."})

        sender.outLinkRequests.pull(receiveReqID);

        sender.links.push({
            userID: receiver._id,
            fullName: receiver.fullName
        });
      
        const notification = await userNotifications.create({
            type: notificationType.acceptedFriend,
            senderID: receiver._id,
            receiverID: sender._id,
            message: `${receiver.fullName} accepted your friend request.`,
        })

        const newNotifications = await userNotifications.countDocuments({
            $and: [
                {receiverID: mongoose.Types.ObjectId(senderID)},
                {isSeen: false}
            ]
        });
        const linkAccepter = await users.findOne({_id: mongoose.Types.ObjectId(receiverID)});
        linkAccepter.links.push({userID: sender._id, fullName: sender.fullName});
        linkAccepter.inLinkRequests.pull(sentReqID);
        await linkAccepter.save();
        await sender.save();

        let receiverData = {
            _id: notification._id,
            sender: {
                _id: receiver._id,
                fullName: receiver.fullName,
                profilePic: receiver.profileInfo.profilePic
            },
            type: notificationType.acceptedFriend,
            message: `${receiver.fullName} accepted your friend request.`,
            date: notification.date,
            newNotifications: newNotifications,
        }

        return cb(null, receiverData);
    }
    catch(err) {
        return cb({msg: err.message});
    }
}

const rejectFriend = async (socket, data, cb) => {
    try {
        const receiverID = socket.userID;
        if(!data.senderID) return cb({msg: "senderID is required"});
        const senderID = data.senderID;
        if(senderID.split('').length != 24) return cb({msg: "Invalid senderID"});
        //receiver is the one who accepted the friend request.
        const receiverArray = await users.aggregate([
            { $match: {_id: mongoose.Types.ObjectId(receiverID)}},
            { $project: {inLinkRequests:1}},
            { $lookup: 
                { 
                    from: 'user_profiles', 
                    pipeline: [
                        { $match: {userID: mongoose.Types.ObjectId(senderID)} },
                        { $project: { profilePic: 1 }}
                    ],
                    as: 'profileInfo'
                }
            },
            { $unwind: '$profileInfo'},
        ])
        if(receiverArray.length < 1) return cb({msg:"Receiver Not Found"});
        const receiver = receiverArray[0];

        const sender = await users.findOne(
            {_id: mongoose.Types.ObjectId(senderID)},
            {outLinkRequests:1}
        );
        if(!sender) return cb({msg: "Sender Not Found"});

        let isReqSent = false;
        let isReqReceived = false;
        let sentReqID, receiveReqID;
        sender.outLinkRequests.forEach(linkReq => {
            if(linkReq.userID.equals(receiver._id)){ 
                isReqSent = true;
                receiveReqID = linkReq._id;
                return;
            }
        })
        receiver.inLinkRequests.forEach(linkReq => {
            if(linkReq.userID.equals(sender._id)){ 
                isReqReceived = true;
                sentReqID = linkReq._id;
                return;
            }
        })
        if(!isReqSent || !isReqReceived) return cb({msg: "Invalid request!, the sender has not sent a request to you."})

        sender.outLinkRequests.pull(receiveReqID);

        const linkRejecter = await users.findOne({_id: mongoose.Types.ObjectId(receiverID)});
        linkRejecter.inLinkRequests.pull(sentReqID);
        await linkRejecter.save();
        await sender.save();

        return cb(null);
    }
    catch(err) {
        return cb({msg: err.message});
    }
}

const loadNotifications = async (socket, data, cb) => {
    try {
        let skips = 0, limit = 10;
        if(data.skips) {skips = parseInt(data.skips);}
        if(data.limit) {limit = parseInt(data.limit);}
        const nextSkips = skips + limit;

        const userID = socket.userID;
        const notificationArray = await userNotifications.aggregate([
            { $match: { receiverID: mongoose.Types.ObjectId(userID)}},
            { $sort: {_id: -1}},
            { $skip: skips},
            { $limit: limit},
            { $lookup: 
                { 
                    from: 'users', 
                    let: { sender_id: "$senderID" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$_id", "$$sender_id"] } } },
                        { $project: {fullName: 1 }}
                    ],
                    as: 'senderInfo'
                }
            },
            { $unwind: '$senderInfo'},
            { $lookup: 
                { 
                    from: 'user_profiles', 
                    let: { sender_id: "$senderID" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$userID", "$$sender_id"] } } },
                        { $project: { profilePic: 1 }}
                    ],
                    as: 'senderProfileInfo'
                }
            },
            { $unwind: '$senderProfileInfo'},
            { $project: {
                sender: {
                    _id: "$senderID",
                    fullName: "$senderInfo.fullName",
                    profilePic: "$senderProfileInfo.profilePic"
                },
                type: 1, message: 1, date: 1, isSeen: 1, postID: 1, campaignID:1, commentID: 1
            }},
        ])

        const totalNotification = await userNotifications.countDocuments({receiverID: mongoose.Types.ObjectId(userID)});

        const newNotifications = await userNotifications.countDocuments({
            $and: [
                {receiverID: mongoose.Types.ObjectId(userID)},
                {isSeen: false}
            ]
        });
        
        if(nextSkips >= totalNotification){
            socket.nextSkips = null;
        } 
        else{
            socket.nextSkips = nextSkips;
        }

        let dataToSend = {
            notifications: notificationArray,
            total: totalNotification,
            newNotifications: newNotifications,
            nextSkips: socket.nextSkips
        }
        return cb(null, dataToSend);
    }
    catch(err) {
        return cb({msg: err.message});
    }
}

const seenNotification = async (socket, data, cb) => {
    try {
        const notificattionID = data.notificationID;
        if(notificationID.split('').length != 24) return cb({msg: "Invalid notificationID"});

        const notification = await userNotifications.findOne({_id: mongoose.Types.ObjectId(notificationID)});
        if(!notification) return cb({msg: "This notificationID does not exist"});
        notification.isSeen = true;
        await notification.save();
        return cb(null);
    }
    catch(err){
        return cb({msg: err.message})
    }
}

module.exports = {
    addFriend,
    acceptFriend,
    rejectFriend,
    loadNotifications,
    seenNotification,
}
