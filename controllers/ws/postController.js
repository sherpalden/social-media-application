//database models required
const users = require('../../models/users/users.js');
const userProfiles = require('../../models/users/userProfile.js');
const userNotifications = require('../../models/notifications/userNotifications.js');
const userPosts = require('../../models/users/userPosts.js');

const mongoose = require('mongoose');

//require notification type
const notificationType = require('../../notificationType.js');

const connectToPost = async (socket, data, cb) => {
    try {
        const senderID = socket.userID;

        if(!data.receiverID) return cb({msg: "receiverID is required"});
        const receiverID = data.receiverID;
        if(receiverID.split('').length != 24) return cb({msg: "Invalid receiverID"});

        if(!data.postID) return cb({msg: "postID is required"});
        const postID = data.postID;
        if(postID.split('').length != 24) return cb({msg: "Invalid postID"});

        const post = await userPosts.findOne({_id: mongoose.Types.ObjectId(postID)});
        if(!post) return cb({msg: "Post Not Found"});

        const senderArray = await users.aggregate([
            { $match: {_id: mongoose.Types.ObjectId(senderID)}},
            { $project: {fullName:1}},
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
        if(senderArray.length < 1) return cb({msg:"Sender Not Found"});
        const sender = senderArray[0];

        const receiver = await users.findOne(
            {_id: mongoose.Types.ObjectId(receiverID)},
            {notifications: 1}
        );
        if(!receiver) return cb({msg: "Receiver Not Found"});

        const notification = await userNotifications.create({
            type: notificationType.connectedToPost,
            senderID: senderID,
            receiverID: receiverID,
            postID: postID,
            message: `${sender.fullName} connected you to the post.`
        })

        const newNotifications = await userNotifications.countDocuments({
            $and: [
                {receiverID: mongoose.Types.ObjectId(receiverID)},
                {isSeen: false}
            ]
        });

        await receiver.save();

        let postData = {
            _id: notification._id,
            sender: {
                _id: senderID,
                fullName: sender.fullName,
                profilePic: sender.profileInfo.profilePic
            },
            type: notificationType.connectedToPost,
            postID: postID,
            message: `${sender.fullName} connected you to the post.`,
            date: notification.date,
            newNotifications: newNotifications,
        } 
        return cb(null, postData);
    }
    catch(err) {
        return cb({msg: err.message});
    }
}

const connectToPost_v1 = async (socket, data, cb) => {
    try {
        const senderID = socket.userID;

        if(!data.receivers || data.receivers.length < 1) return cb({msg: "receiverID is required"});
        const receivers = data.receivers;
        receivers.forEach(receiverID => {
            if(receiverID.split('').length != 24) return cb({msg: "Invalid receiverID"});
        })

        if(!data.postID) return cb({msg: "postID is required"});
        const postID = data.postID;
        if(postID.split('').length != 24) return cb({msg: "Invalid postID"});

        const post = await userPosts.findOne({_id: mongoose.Types.ObjectId(postID)});
        if(!post) return cb({msg: "Post Not Found"});

        const senderArray = await users.aggregate([
            { $match: {_id: mongoose.Types.ObjectId(senderID)}},
            { $project: {fullName:1}},
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
        if(senderArray.length < 1) return cb({msg:"Sender Not Found"});
        const sender = senderArray[0];

        let notificationArray = [];

        for(let eachReceiverID of receivers){
            const receiver = await users.findOne(
                {_id: mongoose.Types.ObjectId(eachReceiverID)},
                {notifications: 1}
            );
            if(!receiver) return cb({msg: "Receiver Not Found"});

            const notification = await userNotifications.create({
                type: notificationType.connectedToPost,
                senderID: senderID,
                receiverID: eachReceiverID,
                postID: postID,
                message: `${sender.fullName} connected you to the post.`
            })

            const newNotifications = await userNotifications.countDocuments({
                $and: [
                    {receiverID: mongoose.Types.ObjectId(eachReceiverID)},
                    {isSeen: false}
                ]
            });

            await receiver.save();

            notificationArray.push({
                receiverID: eachReceiverID,
                _id: notification._id,
                sender: {
                    _id: senderID,
                    fullName: sender.fullName,
                    profilePic: sender.profileInfo.profilePic
                },
                type: notificationType.connectedToPost,
                postID: postID,
                message: `${sender.fullName} connected you to the post.`,
                date: notification.date,
                newNotifications: newNotifications,
            }) 
        }

        return cb(null, notificationArray);
    }
    catch(err) {
        return cb({msg: err.message});
    }
}

module.exports = {
    connectToPost,
    connectToPost_v1
}
