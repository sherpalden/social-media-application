const jwt = require('jsonwebtoken');
const fs = require('fs');
const util = require('util');
const path = require('path');

//require socket Controllers
const userCtrl = require('./controllers/ws/userController');
const postCtrl = require('./controllers/ws/postController');
const campaignCtrl = require('./controllers/ws/campaignController');
const msgCtrl = require('./controllers/ws/messagingController');

const conversations = require('./models/chat/conversations.js')

const wsfileUpload = require('./helpers/ws/wsFileUploads.js');

const rootSocket = (io) => {
    // connection to homeSocket
    const homeSocket = io.of('/');
    let userArray = {};
    // middleware
    homeSocket.use( async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            const userInfo = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            const userID = userInfo.userID;
            socket.userID = userID;
            userArray[`${userID}`] = socket.id;
            next();
        }
        catch(err){
            next(err);
        }
    });

    homeSocket.on('connection', (socket) => {
        //join to all the rooms user is in
        socket.on('joinToRooms', async () => {
            try {
                let myConversations = await conversations.find({
                    $and:[
                        {type: "gm"},
                        {members: {$in: socket.userID}},
                    ]
                })
                for(conversation of myConversations){
                    await socket.join(conversation._id.toString());
                }
            }
            catch(err){console.log(err.message)};
        })

        socket.on('loadActiveFriends', (res) => {
            //load only active friends...
        })

        socket.on('loadRecentDirectConversations', (data, res) => {
            
        })

        socket.on('getDmMessages', (data, res) => {
            try {
                msgCtrl.getDmMessages(socket, data, (err, messageData) => {
                    if(!err){
                        return res(null, messageData)
                    }
                    else return res(err);
                })
            }
            catch(err) {
                return res({msg: err.message});
            }
        })
    
        socket.on('sendDmText', (data, res) => {
            try {
                msgCtrl.postDmText(socket, data, (err, messageData) => {
                    if(!err){
                        if(userArray[data.receiverID]){
                            homeSocket.to(userArray[data.receiverID]).emit('directMessage', messageData);
                        }
                        return res(null, messageData)
                    }
                    else return res(err);
                })
            }
            catch(err) {
                return res({msg: err.message});
            }
        })

        socket.on('sliceUpload', (data, res) => {
            if(data.size > 10485760) return res({msg: "File size greater than 10MB cannot be uploaded"})
            const filePath = "./public/uploads/temp";
            wsfileUpload.uploadFile(filePath, data, (err, result) => {
                if(!err){
                    res(null, result);
                }
            })
        })

        socket.on('sendDmFiles', (data, res) => {
            try {
                msgCtrl.postDmFiles(socket, data, async (err, messageData) => {
                    if(!err){
                        const rename = util.promisify(fs.rename);
                        for(file of messageData.files){
                            await rename(`./public/uploads/temp/${file}`, `./public/uploads/chat/${file}`);
                        }
                        if(userArray[data.receiverID]){
                            homeSocket.to(userArray[data.receiverID]).emit('directMessage', messageData);
                        }
                        return res(null, messageData)
                    }
                    else return res(err);
                })
            }
            catch(err) {
                // console.log(err)
                return res({msg: err.message})
            }
        })



        socket.on('loadActiveGroups', (res) => {
            //load only active friends...
        })

        socket.on('loadRecentGroupConversations', (data, res) => {
            
        })

        socket.on('createGroupConversation', (data, res) => {
            msgCtrl.createGroupConversation(socket, data, (err, newConversation) => {
                if(!err){
                    // homeSocket.to(newConversation.conversationID.toString()).emit('newGroupConversation', newConversation)
                    res(null, newConversation);
                }
                else {
                    return res(err)
                }
            })
        })

        socket.on('LoadGroupConversations', (res) => {
            msgCtrl.getGroupConversations(socket, (err, myConversations) => {
                if(!err) res(null, myConversations);
                else res(err)
            })
        })

        socket.on('getGmMessages', (data, res) => {
            msgCtrl.getGmMessages(socket, data, (err, dataToSend) => {
                if(!err){
                    res(null, dataToSend);
                }
                else res(err);
            })
        })

        socket.on('sendGmText', (data, res) => {
            msgCtrl.postGmText(socket, data, (err, messageData) => {
                if(!err){
                    homeSocket.to(data.conversationID).emit('groupMessage', messageData)
                    res(null);
                }
            })
        })

        socket.on('sendGmFiles', (data, res) => {
            try {
                msgCtrl.postGmFiles(socket, data, async (err, messageData) => {
                    if(!err){
                        const rename = util.promisify(fs.rename);
                        for(file of messageData.files){
                            await rename(`./public/uploads/temp/${file}`, `./public/uploads/chat/${file}`);
                        }
                        homeSocket.to(data.conversationID).emit('groupMessage', messageData);
                        return res(null)
                    }
                    else return res(err);
                })
            }
            catch(err) {
                // console.log(err)
                return res({msg: err.message})
            }
        })





        socket.on('loadNotifications', (data, res) => {
            try {
                userCtrl.loadNotifications(socket, data, (err, dataToSend) => {
                    if(!err){
                        res(null, dataToSend);
                    }
                    else res(err);
                })
            }
            catch(err) {
                // console.log(err)
            }
        })

        socket.on('seenNotification', (data, res) => {
            userCtrl.seenNotification(socket, data, (err) => {
                if(!err){
                    res(null);
                }else res(err);
            })
        })

        socket.on('addFriend', (data, res) => {
            try {
                userCtrl.addFriend(socket, data, (err, senderData) => {
                    if(!err){
                        if(userArray[data.receiverID]){
                            homeSocket.to(userArray[data.receiverID]).emit('notification', senderData);
                        }
                        res(null);
                    }
                    else res(err);
                });
            }
            catch(err){
                // console.log(err)
            }
        })

        socket.on('rejectFriend', (data, res) => {
            try {
                userCtrl.addFriend(socket, data, (err) => {
                    if(!err){
                        res(null);
                    }
                    else res(err);
                });
            }
            catch(err) {
                // console.log(err)
            }
        })

        socket.on('acceptFriend', (data, res) => {
            try {
                userCtrl.acceptFriend(socket, data, (err, receiverData) => {
                    if(!err){
                        if(userArray[data.senderID]){
                            homeSocket.to(userArray[data.senderID]).emit('notification', receiverData);
                        }
                        res(null);
                    }
                    else res(err);
                });
            }
            catch(err) {
                // console.log(err)
            }
        })

        socket.on('connectToCampaign', (data, res) => {
            try {
                campaignCtrl.connectToCampaign_v1(socket, data, (err, notificationArray) => {
                    if(!err){
                        notificationArray.forEach(notification => {
                            if(userArray[notification.receiverID]){
                                let receiverID = notification.receiverID;
                                delete notification.receiverID;
                                homeSocket.to(userArray[receiverID]).emit('notification', notification);
                            }
                        })
                        res(null);
                    }
                    else res(err);
                });
            }
            catch(err){
                // console.log(err)
            }
        })

        socket.on('connectToPost', (data, res) => {
            try {
                postCtrl.connectToPost_v1(socket, data, (err, notificationArray) => {
                    if(!err){
                        notificationArray.forEach(notification => {
                            if(userArray[notification.receiverID]){
                                let receiverID = notification.receiverID;
                                delete notification.receiverID;
                                homeSocket.to(userArray[receiverID]).emit('notification', notification);
                            }
                        })
                        res(null);
                    }
                    else res(err);
                });
            }
            catch(err){
                // console.log(err)
            }
        })

        socket.on('disconnect', () => {
            delete userArray[`${socket.userID}`];
        })
    })
}

module.exports = {
    rootSocket,
}
