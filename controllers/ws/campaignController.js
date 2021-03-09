const campaigns = require('../../models/campaigns/campaigns.js');
const users = require('../../models/users/users.js');
const userProfiles = require('../../models/users/userProfile.js');
const userNotifications = require('../../models/notifications/userNotifications.js');

//require notification type
const notificationType = require('../../notificationType.js');

const mongoose = require('mongoose');

const connectToCampaign = async (socket, data, cb) => {
    try {
        const senderID = socket.userID;

        if(!data.receiverID) return cb({msg: "receiverID is required"});
        const receiverID = data.receiverID;
        if(receiverID.split('').length != 24) return cb({msg: "Invalid receiverID"});

        if(!data.campaignID) return cb({msg: "campaignID is required"});
        const campaignID = data.campaignID;
        if(campaignID.split('').length != 24) return cb({msg: "Invalid campaignID"});

        const campaign = await campaigns.findOne({_id: mongoose.Types.ObjectId(campaignID)});
        if(!campaign) return cb({msg: "campaign Not Found"});

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
            type: notificationType.connectedToCampaign,
            senderID: senderID,
            receiverID: receiverID,
            campaignID: campaignID,
            message: `${sender.fullName} connected you to the campaign.`
        })

        const newNotifications = await userNotifications.countDocuments({
            $and: [
                {receiverID: mongoose.Types.ObjectId(receiverID)},
                {isSeen: false}
            ]
        });

        await receiver.save();

        let campaignData = {
            _id: notification._id,
            sender: {
                _id: senderID,
                fullName: sender.fullName,
                profilePic: sender.profileInfo.profilePic
            },
            type: notificationType.connectedToCampaign,
            campaignID: campaignID,
            message: `${sender.fullName} connected you to the campaign.`,
            date: notification.date,
            newNotifications: newNotifications,
        }
        return cb(null, campaignData);
    }
    catch(err) {
        return cb({msg: err.message});
    }
}

const connectToCampaign_v1 = async (socket, data, cb) => {
    try {
        const senderID = socket.userID;

        if(!data.receivers || data.receivers.length < 1) return cb({msg: "receiver array is required"});
        const receivers = data.receivers;
        receivers.forEach(receiverID => {
            if(receiverID.split('').length != 24) return cb({msg: "Invalid receiverID"});
        })

        if(!data.campaignID) return cb({msg: "campaignID is required"});
        const campaignID = data.campaignID;
        if(campaignID.split('').length != 24) return cb({msg: "Invalid campaignID"});

        const campaign = await campaigns.findOne({_id: mongoose.Types.ObjectId(campaignID)});
        if(!campaign) return cb({msg: "campaign Not Found"});

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
                type: notificationType.connectedToCampaign,
                senderID: senderID,
                receiverID: eachReceiverID,
                campaignID: campaignID,
                message: `${sender.fullName} connected you to the campaign.`
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
                type: notificationType.connectedToCampaign,
                campaignID: campaignID,
                message: `${sender.fullName} connected you to the campaign.`,
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
    connectToCampaign,
    connectToCampaign_v1,
}
