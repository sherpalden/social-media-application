const bcrypt = require('bcrypt'); //for hashing passwords...
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

//require models
const staticData = require('../../models/staticData');
const users = require('../../models/users/users');
const userProfile = require('../../models/users/userProfile');
const userNotifications = require('../../models/notifications/userNotifications.js');


const validationRule = require('../validationController');

//error handler
const errObj = require('../../error/errorHandler');

//require models
// const tokens = require('../../models/users/tokens.js');

const getData = async (req, res, next) => {
    try {
        const data = await staticData.findOne({});
        if(!data) return next(new errObj.NotFoundError("Data not found"));
        req.data = {
            country: data.country,
            category: data.category
        }
        next();
    }
    catch(err) {
        next(err)
    }
}

const registerValidation = (req, res, next) => {
    try {
        const userData = req.body;
        const requiredFields = ['firstName', 'lastName', 'email', 'password', 'gender', 'country', 'birthDate', 'category', 'mobileNumber'];

        requiredFields.forEach(field => {
            if(!req.body[field]) return next(new errObj.BadRequestError(`${field} field is required.`));
        })

        Object.keys(userData).forEach(key => {
            if(validationRule.notEmptyValidation(userData[key]) === false){
                return next(new errObj.BadRequestError(`${key} field cannot be empty.`));
            }
        })
        if(validationRule.emailValidation(userData.email) === false){
            return next(new errObj.ForbiddenError("Invalid Email Address!!!"));
        }
        else if(validationRule.passwordValidation(userData.password) === false){
            return next(new errObj.ForbiddenError("Password must have atleast one smallcase letter, uppercase letter, digit and special characters and should be more than 8 characters!"));
        }
        else if(validationRule.dateValidation(userData.birthDate) === false){
            return next(new errObj.ForbiddenError("Invalid Date!"));
        }
        else
        {
            next();
        }
    }
    catch(err){
        next(err)
    }
}

const checkUniqueMobileNumber = (req, res, next) => {
    users.findOne({mobileNumber: req.body.mobileNumber})
    .then(user => {
        if(user){
            return next(new errObj.ForbiddenError("Mobile number already exits."));
        }else{
            next();
        }
    })
    .catch(err => {
        next(err);
    })
}

const checkUniqueEmail = (req, res, next) => {
    users.findOne({ email: req.body.email })
    .then(user => {
        if(user){
            return next(new errObj.ForbiddenError("Email already exits."));
        }else{
            next();
        }
    })
    .catch(err => {
        next(err);
    })
}

const hash = (req, res, next) => {
    bcrypt.hash(req.body.password, saltRounds)
    .then(hash => {
        req.hash = hash;
        next();
    })
    .catch(err => {
        next(err);
    })
}

const registerUser = (req, res, next) => {
    users.create({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        fullName: `${req.body.firstName} ${req.body.lastName}`,
        email: req.body.email,
        birthDate: req.body.birthDate,
        gender: req.body.gender,
        country: req.body.country,
        password: req.hash, 
        mobileNumber: req.body.mobileNumber,
        category: req.body.category,
    })
    .then( (user) => {
        req.userID = user._id;
        next();
    })
    .catch(err => {
        next(err);
    })
}

const createProfile = async (req, res, next) => {
    try {
        let profile = await userProfile.findOne({userID: req.userID});
        if(!profile) {
            await userProfile.create({
                userID: userID,
                bio: null,
                address: [],
                education: [],
                work: [],
                skills: [],
                hobbies: [],
                relationship: null,
            })
        }
        next();
    }
    catch(err) {
        next(err);
    }
}

const searchFriend = async (req, res, next) => {
    try {
        let skips = 0, limit = 10;
        if(req.query.skips) {skips = parseInt(req.query.skips);}
        if(req.query.limit) {limit = parseInt(req.query.limit);}
        const nextSkips = skips + limit;

        if(!req.query.searchKey){
            return next(new errObj.BadRequestError("Search Keyword is required"));
        }
        let searchKey = req.query.searchKey.replace(/\s/g,'').toUpperCase();
        const userID = req.userID;

        const userLinks = await users.aggregate([
            {$match: {_id: mongoose.Types.ObjectId(userID)}},
            {$project: {links: 1}},
        ])
        const searchUsers = [];
        for(link of userLinks[0].links) {
            let nameKey = link.fullName.replace(/\s/g,'').toUpperCase();
            
            if(nameKey.length > searchKey.length){
                nameKey = nameKey.split('').splice(0,searchKey.length).join('');
            }
            else if(nameKey.length < searchKey.length) {
                searchKey = searchKey.split('').splice(0,nameKey.length).join('');
            }
            if(nameKey == searchKey){
                const userData = await users.aggregate([
                    { $match: {_id: mongoose.Types.ObjectId(link.userID)}},
                    { $project: {fullName: 1}},
                    { $lookup: 
                        { 
                            from: 'user_profiles', 
                            pipeline: [
                                { $match: {userID: mongoose.Types.ObjectId(link.userID)} },
                                { $project: { profilePic: 1, _id: 0 }}
                            ],
                            as: 'profileInfo'
                        }
                    },
                    { $unwind: '$profileInfo'},
                ])
                if(userData.length > 0){
                    searchUsers.push({
                        userID: userData[0]._id, 
                        fullName: userData[0].fullName, 
                        profilePic: userData[0].profileInfo.profilePic
                    });
                }
            } 
        }

        const userList = [];
        const totalUsers = searchUsers.length;
        let overFlow = 0;
        if(nextSkips >= totalUsers){
            req.nextSkips = null;
            overFlow = nextSkips - totalUsers;
        } 
        else{
            req.nextSkips = nextSkips;
        }
        for(let i = skips; i < (nextSkips - overFlow); i++){
            userList.push({
                userID: searchUsers[i].userID,
                fullName: searchUsers[i].fullName,
                profilePic: searchUsers[i].profilePic,
            })
        }
        req.searchResults = userList;
        req.total = totalUsers;
        next();
    }
    catch(err) {
        next(err);
    }
}

const loadFriends_v1 = async (req, res, next) => {
    try {
        let skips = 0, limit = 10;
        if(req.query.skips) {skips = parseInt(req.query.skips);}
        if(req.query.limit) {limit = parseInt(req.query.limit);}
        const nextSkips = skips + limit;

        const userID = req.userID;
        const friends = await users.aggregate([
            { $match: {_id: mongoose.Types.ObjectId(userID)}},
            { $project: {links: 1, _id: 0}},
        ])
        const friendList = friends[0].links;
        for( friend of friendList) {
            const profilePic = await userProfile.find({_id: mongoose.Types.ObjectId(friend.userID)});
            if(!profilePic.profilePic) {friend.profilePic = null}    
            else {friend.profilePic = profilePic.profilePic}
        }

        const myFriends = [];
        const totalFriend = friendList.length;
        let overFlow = 0;
        if(nextSkips >= totalFriend){
            req.nextSkips = null;
            overFlow = nextSkips - totalFriend;
        } 
        else{
            req.nextSkips = nextSkips;
        }
        for(let i = skips; i < (nextSkips - overFlow); i++){
            myFriends.push({
                userID: friendList[i].userID,
                fullName: friendList[i].fullName,
                profilePic: friendList[i].profilePic,
            })
        }
        req.myFriends = myFriends;
        req.total = totalFriend;
        req.nextSkips = nextSkips;
        next();
    }
    catch(err) {
        next(err);
    }
}

const loadFriends = async (req, res, next) => {
    try {
        const userID = req.userID;
        const friends = await users.aggregate([
            { $match: {_id: mongoose.Types.ObjectId(userID)}},
            { $project: {links: 1, _id: 0}},
        ])
        const friendList = friends[0].links;
        for( friend of friendList) {
            delete friend._id;
            const profile = await userProfile.findOne({userID: mongoose.Types.ObjectId(friend.userID)}, {profilePic: 1, _id: 0 });
            if(!profile){
                friend.profilePic = null;
                continue;
            } 
            if(!profile.profilePic) {
                friend.profilePic = null
            }    
            else {
                friend.profilePic = profile.profilePic
            }
        }
        req.myFriends = friendList;
        next();
    }
    catch(err) {
        console.log(err)
        next(err);
    }
}

const searchUser = async (req, res, next) => {
    try {
        let skips = 0, limit = 10;
        if(req.query.skips) {skips = parseInt(req.query.skips);}
        if(req.query.limit) {limit = parseInt(req.query.limit);}
        const nextSkips = skips + limit;

        const userID = req.userID;
        const searchKey = req.query.searchKey;
        const searchResults = await users.aggregate([
            { $match: { $text: { $search: searchKey } } },
            { $project: { fullName: 1}},
            { $sort: { score: { $meta: "textScore" } } },
            { $skip: 0},
            { $limit: 500},
            { $lookup: 
                {
                    from: 'user_profiles', 
                    let: { user_id: "$_id" },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$userID", "$$user_id"] } } },
                        { $project: { profilePic: 1, _id: 0}}
                    ],
                    as: 'profileInfo'
                }
            },
            {$unwind: "$profileInfo"},
        ])
        const userList = [];
        const totalUsers = searchResults.length;
        let overFlow = 0;
        if(nextSkips >= totalUsers){
            req.nextSkips = null;
            overFlow = nextSkips - totalUsers;
        } 
        else{
            req.nextSkips = nextSkips;
        }
        for(let i = skips; i < (nextSkips - overFlow); i++){
            userList.push({
                userID: searchResults[i]._id,
                fullName: searchResults[i].fullName,
                profilePic: searchResults[i].profileInfo.profilePic,
            })
        }
        const userLinks = await users.findOne(
            {_id: mongoose.Types.ObjectId(userID)}, 
            {links: 1, outLinkRequests: 1,inLinkRequests: 1}
        )
        userList.forEach( user => {
            user.isLinked = false;
            user.isLinkSent = false;
            user.isLinkReceived = false;
            userLinks.links.forEach(link => {
                if(user.userID.equals(link.userID)){
                    user.isLinked = true;
                    return;
                }
            })
            userLinks.outLinkRequests.forEach(outLink => {
                if(user.userID.equals(outLink.userID)){
                    user.isLinkSent = true;
                    return;
                }
            })
            userLinks.inLinkRequests.forEach(inLink => {
                if(user.userID.equals(inLink.userID)){
                    user.isLinkReceived = true;
                    return;
                }
            })
        })
        req.total = totalUsers;
        req.searchResults = userList;
        next();
    }
    catch(err){
        next(err);
    }
}

const loadNotifications = async (req, res, next) => {
    try {
        let skips = 0, limit = 10;
        if(req.query.skips) {skips = parseInt(req.query.skips);}
        if(req.query.limit) {limit = parseInt(req.query.limit);}
        const nextSkips = skips + limit;

        const userID = req.userID;
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
        ])
        const totalNotification = await userNotifications.countDocuments({receiverID: mongoose.Types.ObjectId(userID)});

        const newNotifications = await userNotifications.countDocuments({
            $and: [
                {receiverID: mongoose.Types.ObjectId(userID)},
                {isSeen: false}
            ]
        });
        
        if(nextSkips >= totalNotification){
            req.nextSkips = null;
        } 
        else{
            req.nextSkips = nextSkips;
        }

        req.notifications = notificationArray;
        req.total = totalNotification;
        req.nextSkips = nextSkips;
        req.unSeenNotifications = newNotifications;
        next();
    }
    catch(err) {
        next(err);
    }
}

module.exports = {   
    getData, 
    registerValidation, 
    checkUniqueMobileNumber,
    checkUniqueEmail,
    hash,
    registerUser,

    searchFriend,
    loadFriends,
    searchUser,

    loadNotifications,
    createProfile,
}
