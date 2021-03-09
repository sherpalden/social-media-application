const express = require('express');
const router =  express.Router();
const fs = require('fs');

// controllers require
const authCtrl = require('../controllers/http/authenticationController');
const userCtrl = require('../controllers/http/userController');
const userProfileCtrl = require('../controllers/http/userProfileController');
const userPostCtrl = require('../controllers/http/userPostController');

//middlewares required
const fileUploader = require('../middleware/fileUploads');

// @route    GET user/static-data
// @desc     Get static data for user registration form
// @access   Public
router.get('/static-data', 
    userCtrl.getData, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Successful",
        "data": req.data
    })
});


// @route    POST user/register
// @desc     Register a new user
// @access   Public
router.post('/register', 
	userCtrl.registerValidation, 
	userCtrl.checkUniqueEmail, 
	userCtrl.hash, 
	userCtrl.registerUser,
    userCtrl.createProfile,
	(req, res) => {
	res.status(201);
    res.send({
        "message": "Registration Successful.",
    })
});

// @route    POST user/login
// @desc     Aunthenticate the user for login into the system.
// @access   Public
router.post('/login',
    authCtrl.authValidation, 
	authCtrl.checkUser, 
	authCtrl.matchPassword,
	authCtrl.getToken,
	(req, res) => {
    res.status(202);
    res.send({
        "message": "Login Successful",
        "accessToken": req.accessToken,
    })
});




/*user profile routes starts here*/





// @route    PUT user/profile/name
// @desc     change  user name in  profile
// @access   Private
router.put('/profile/name', 
    authCtrl.tokenVerification, 
    userProfileCtrl.updateName, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User name updated successfully",
        "firstName": req.firstName,
        "lastName": req.lastName,
    })
});


// @route    GET user/profile
// @desc     Get user profile
// @access   Private
router.get('/profile', 
	authCtrl.tokenVerification, 
	userProfileCtrl.getProfile, 
	(req, res) => {
    res.status(200);
    res.send({
        "message": "Successful",
        "profile": req.profile,
    })
});


// @route    GET user/profile/user_id
// @desc     Get profile of particular user id
// @access   Private
router.get('/profile/:user_id', 
    authCtrl.tokenVerification, 
    userProfileCtrl.getUserProfile, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Successful",
        "profile": req.profile,
    })
});


// @route    GET user/profile/profilePic
// @desc     Get user profile picture of dynamic sizes
// @access   Public
router.get('/profile/profilePic/:imgName', 
    // authCtrl.tokenVerification, 
    userProfileCtrl.getProfilePic, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Successful",
    })
});


// @route    PUT user/profile/frameType
// @desc     Change or update the frame type of the profile picture
// @access   Private
router.put('/profile/frameType', 
    authCtrl.tokenVerification, 
    userProfileCtrl.updateFrameType, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Frame Type Update Successful",
        "frameType": req.frameType
    })
});


// @route    PUT user/profile/profilePic
// @desc     Create or update profile picture of user profile
// @access   Private
router.put('/profile/profilePic',
    authCtrl.tokenVerification,
    fileUploader.parseFormData,
    userProfileCtrl.updateProfilePic,
    fileUploader.uploadFiles('./public/uploads/userProfile'),
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Profile Picture Upload Successful",
        "profilePic": req.profilePic
    }) 
})

// @route    DELETE user/profile/profilePic
// @desc     delete profile picture of user profile
// @access   Private
router.delete('/profile/profilePic',
    authCtrl.tokenVerification,
    userProfileCtrl.deleteProfilePic,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Profile Picture Delete Successful",
    }) 
})

// @route    PUT user/profile/coverPic
// @desc     Create or update cover picture of user profile
// @access   Private
router.put('/profile/coverPic',
    authCtrl.tokenVerification,
    fileUploader.parseFormData,
    userProfileCtrl.updateCoverPic,
    fileUploader.uploadFiles('./public/uploads/userProfile'),
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Cover Picture Upload Successful",
        "coverPic": req.coverPic    
    }) 
})

// @route    DELETE user/profile/coverPic
// @desc     delete cover picture of user profile
// @access   Private
router.delete('/profile/coverPic',
    authCtrl.tokenVerification,
    userProfileCtrl.deleteCoverPic,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Cover Picture Delete Successful",
    }) 
})

// @route    PUT user/profile/bio
// @desc     Create or update bio section of user profile
// @access   Private
router.put('/profile/bio',
    authCtrl.tokenVerification,
    userProfileCtrl.updateBio,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Bio Update Successful",
    })
})


// @route    PUT user/profile/personalDetails
// @desc     Update users personal details
// @access   Private
router.put('/profile/personalDetails',
    authCtrl.tokenVerification,
    userProfileCtrl.updatePersonalDetails,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Personal details Update Successful",
        "personalDetails": req.personalDetails
    })
})


// @route    PUT user/profile/category
// @desc     Update category of user profile
// @access   Private
router.put('/profile/category',
    authCtrl.tokenVerification,
    userProfileCtrl.updateCategory,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Category Update Successful",
    })
})

// @route    POST user/profile/address
// @desc     Add address section of user profile
// @access   Private
router.post('/profile/address',
    authCtrl.tokenVerification,
    userProfileCtrl.addAddress,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Address Addition Successful",
        "addressArray": req.addressArray
    }) 
})

// @route    PUT user/profile/address/addressID
// @desc     Create or update address section of user profile
// @access   Private
router.put('/profile/address/:addressID',
    authCtrl.tokenVerification,
    userProfileCtrl.updateAddress,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Address Update Successful",
        "updatedAddress": req.updatedAddress
    }) 
})

// @route    DELETE user/profile/address/addressID
// @desc     Delete address section of user profile
// @access   Private
router.delete('/profile/address/:addressID',
    authCtrl.tokenVerification,
    userProfileCtrl.deleteAddress,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Address Delete Successful",
    }) 
})

// @route    POST user/profile/work
// @desc     Add work section of user profile
// @access   Private
router.post('/profile/work',
    authCtrl.tokenVerification,
    userProfileCtrl.addWork,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Work Addition Successful",
        "workArray": req.workArray
    }) 
})

// @route    PUT user/profile/work/workID
// @desc     update work section of user profile
// @access   Private
router.put('/profile/work/:workID',
    authCtrl.tokenVerification,
    userProfileCtrl.updateWork,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Work Update Successful",
        "updatedWork": req.updatedWork
    }) 
})

// @route    DELETE user/profile/work/workID
// @desc     delete work of user profile
// @access   Private
router.delete('/profile/work/:workID',
    authCtrl.tokenVerification,    
    userProfileCtrl.deleteWork,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Work Delete Successful",
    }) 
})

// @route    POST user/profile/education
// @desc     Add education of user profile
// @access   Private
router.post('/profile/education',
    authCtrl.tokenVerification,
    userProfileCtrl.addEducation,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Education Addition Successful",
        "educationArray": req.educationArray
    }) 
})

// @route    PUT user/profile/education/educationID
// @desc     update education of user profile
// @access   Private
router.put('/profile/education/:educationID',
    authCtrl.tokenVerification,
    userProfileCtrl.updateEducation,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Education Update Successful",
        "updatedEducation": req.updatedEducation
    }) 
})

// @route    DELETE user/profile/education/educationID
// @desc     delete education of user profile
// @access   Private
router.delete('/profile/education/:educationID',
    authCtrl.tokenVerification,    
    userProfileCtrl.deleteEducation,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Education Delete Successful",
    }) 
})

// @route    POST user/profile/skill
// @desc     Add skill of user profile
// @access   Private
router.post('/profile/skill',
    authCtrl.tokenVerification,
    userProfileCtrl.addSkill,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Skill Addition Successful",
        "skillArray": req.skillArray
    }) 
})

// @route    PUT user/profile/skill/skillID
// @desc     update skill of user profile
// @access   Private
router.put('/profile/skill/:skillID',
    authCtrl.tokenVerification,
    userProfileCtrl.updateSkill,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Skill Update Successful",
        "updatedSkill": req.updatedSkill
    }) 
})

// @route    DELETE user/profile/skill/skillID
// @desc     delete skill of user profile
// @access   Private
router.delete('/profile/skill/:skillID',
    authCtrl.tokenVerification,    
    userProfileCtrl.deleteSkill,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Skill Delete Successful",
    }) 
})

// @route    PUT user/profile/hobby
// @desc     update hobby of user profile
// @access   Private
router.put('/profile/hobby',
    authCtrl.tokenVerification,
    userProfileCtrl.updateHobby,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Hobby Update Successful",
        "hobbies": req.hobbies
    }) 
})

// @route    PUT user/profile/relationship
// @desc     update relationship of user profile
// @access   Private
router.put('/profile/relationship',
    authCtrl.tokenVerification,
    userProfileCtrl.updateRelationship,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Relationship Update Successful",
        "relationship": req.relationship
    }) 
})













/*user profile routes ends here*/

/*User Post Section Starts*/









// @route    POST user/post/
// @desc     create user post or expression
// @access   Private
router.post('/post',
    authCtrl.tokenVerification,
    fileUploader.parseFormData,
    fileUploader.processFileNames,
    userPostCtrl.createPost,
    fileUploader.uploadFiles('./public/uploads/userPost'),
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Posts Creation Successful",
        "post": req.post
    }) 
})

// @route    GET user/post/postID
// @desc     retrieve user post or expression
// @access   Private
router.get('/post/:postID',
    authCtrl.tokenVerification,
    userPostCtrl.getSinglePost,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Post Retrieve Successful",
        "post": req.post
    }) 
})

// @route    PUT user/post/postID
// @desc     update user post or expression
// @access   Private
router.put('/post/:postID',
    authCtrl.tokenVerification,
    fileUploader.parseFormData,
    fileUploader.processFileNames,
    userPostCtrl.updatePost,
    fileUploader.uploadFiles('./public/uploads/userPost'),
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Post Update Successful",
        "post": req.post
    }) 
})

// @route    DELETE user/post/postID
// @desc     delete user post or expression
// @access   Private
router.delete('/post/:postID',
    authCtrl.tokenVerification,
    userPostCtrl.deletePost,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Post Delete Successful",
    }) 
})

// @route    GET user/timeline/posts
// @desc     Retrieve all user post or expression in profile page
// @access   Private
router.get('/timeLine/posts',
    authCtrl.tokenVerification,
    userPostCtrl.getProfilePosts,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Posts Retrieval Successful",
        "posts": req.posts,
        "total": req.total,
        "nextSkips": req.nextSkips,
    }) 
})


// @route    GET user/timeline/posts
// @desc     Retrieve the timeline posts of particular user.
// @access   Private
router.get('/timeLine/posts/:user_id',
    authCtrl.tokenVerification,
    userPostCtrl.getTimelinePosts,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Posts Retrieval Successful",
        "posts": req.posts,
        "total": req.total,
        "nextSkips": req.nextSkips,
    }) 
})


// @route    GET user/timeline/photos/user_id
// @desc     Retrieve the timeline photos of particular user.
// @access   Private
router.get('/timeLine/photos/:user_id',
    authCtrl.tokenVerification,
    userPostCtrl.getTimelinePhotos,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Timeline Photos Retrieval Successful",
        "photos": req.photos,
        "total": req.total,
        "nextSkips": req.nextSkips,
    }) 
})


// @route    GET user/timeline/photos
// @desc     Retrieve the timeline photos of logged user.
// @access   Private
router.get('/timeLine/photos',
    authCtrl.tokenVerification,
    userPostCtrl.getSelfTimelinePhotos,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Self Timeline Photos Retrieval Successful",
        "photos": req.photos,
        "total": req.total,
        "nextSkips": req.nextSkips,
    }) 
})

// @route    GET user/timeline/videos/user_id
// @desc     Retrieve the timeline videos of particular user.
// @access   Private
router.get('/timeLine/videos/:user_id',
    authCtrl.tokenVerification,
    userPostCtrl.getTimelineVideos,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Timeline videos Retrieval Successful",
        "videos": req.videos,
        "total": req.total,
        "nextSkips": req.nextSkips,
    }) 
})


// @route    GET user/timeline/videos
// @desc     Retrieve the timeline videos of logged user.
// @access   Private
router.get('/timeLine/videos',
    authCtrl.tokenVerification,
    userPostCtrl.getSelfTimelineVideos,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Self Timeline videos Retrieval Successful",
        "videos": req.videos,
        "total": req.total,
        "nextSkips": req.nextSkips,
    }) 
})

// @route    GET user/newsFeed/posts
// @desc     Retrieve most suitable posts in newsfeed page of user
// @access   Private
router.get('/newsFeed/posts',
    authCtrl.tokenVerification,
    userPostCtrl.getNewsFeedPosts,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Newsfeed Posts Retrieval Successful",
        "posts": req.posts,
        "total": req.total,
        "nextSkips": req.nextSkips,
    }) 
})

// @route    PUT user/post/take/postID    
// @desc     Add a take on a post
// @access   Private
router.put('/post/take/:postID',
    authCtrl.tokenVerification,
    userPostCtrl.takePost,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Take on a Post Successful",
        "takeTotal": req.takeTotal,
        "isTaken": true
    }) 
})


// @route    PUT user/post/untake/postID
// @desc     untake on a taken post
// @access   Private
router.put('/post/untake/:postID',
    authCtrl.tokenVerification,
    userPostCtrl.untakePost,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Untake on a Post Successful",
        "takeTotal": req.takeTotal,
        "isTaken": false
    }) 
})



// @route    POST user/post/comment/postID
// @desc     post a comment on a post or expression
// @access   Private
router.post('/post/comment/:postID',
    authCtrl.tokenVerification,
    fileUploader.parseFormData,
    fileUploader.processFileNames,
    userPostCtrl.postComment,
    userPostCtrl.sendCommentNotificationOnPost,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Comment on a post Successful",
        "commentTotal": req.commentTotal,
        "comment": req.comment,
        "replies": [],
    }) 
})

// @route    PUT user/post/comment/postID/commentID
// @desc     edit a comment on a post or expression
// @access   Private
router.put('/post/comment/:postID/:commentID',
    authCtrl.tokenVerification,
    userPostCtrl.editComment,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Successful",
        "commentTotal": req.commentTotal,
        "text": req.text || null
    }) 
})

/*User can edit and delete only its own comments or comments of its own post*/

// @route    DELETE user/post/comment/postID/commentID
// @desc     delete a comment on a post or expression
// @access   Private
router.delete('/post/comment/:postID/:commentID',
    authCtrl.tokenVerification,
    userPostCtrl.deleteComment,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Comment Delete Successful",
        "commentTotal": req.commentTotal
    }) 
})

// @route    POST user/post/reply/postID/commentID
// @desc     post a reply to a comment on a post or expression
// @access   Private
router.post('/post/reply/:postID/:commentID',
    authCtrl.tokenVerification,
    fileUploader.parseFormData,
    fileUploader.processFileNames,
    userPostCtrl.postReply,
    userPostCtrl.sendReplyNotificationOnPost,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Reply on a comment on a post Successful",
        "commentTotal": req.commentTotal,
        "reply": req.reply
    }) 
})

// @route    PUT user/post/reply/postID/commentID/replyID
// @desc     edit a reply to a comment on a post or expression
// @access   Private
router.put('/post/reply/:postID/:commentID/:replyID',
    authCtrl.tokenVerification,
    userPostCtrl.editReply,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Successful",
        "commentTotal": req.commentTotal,
        "text": req.text || null
    }) 
})

// @route    DELETE user/post/reply/postID/commentID/replyID
// @desc     delete a reply to a comment on a post or expression
// @access   Private
router.delete('/post/reply/:postID/:commentID/:replyID',
    authCtrl.tokenVerification,
    userPostCtrl.deleteReply,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Reply on a comment delete Successful",
        "commentTotal": req.commentTotal
    }) 
})


// @route    GET user/comment/postID
// @desc     Load comments of post
// @access   Private
router.get('/post/comment/:postID',
    authCtrl.tokenVerification,
    userPostCtrl.loadComments,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Comment loading successful.",
        "comments": req.comments,
        "total": req.total,
        "nextSkips": req.nextSkips,
    }) 
})


// @route    GET user/comment/postID/commentID
// @desc     Load replies of a comment of a post
// @access   Private
router.get('/post/comment/:postID',
    authCtrl.tokenVerification,
    userPostCtrl.loadReplies,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Comment loading successful.",
        "replies": req.replies,
        "total": req.total,
        "nextSkips": req.nextSkips,
    }) 
})

// @route    GET user/search-friend
// @desc     Search a user who is your friend
// @access   Private
router.get('/search-friend',
    authCtrl.tokenVerification,
    userCtrl.searchFriend,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User Friend Search Successful",
        "friend": req.searchResults,
        "total": req.total,
        "nextSkips": req.nextSkips
    }) 
})

// @route    GET user/friends
// @desc     Retrieve a friends data.
// @access   Private
router.get('/friends',
    authCtrl.tokenVerification,
    userCtrl.loadFriends,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Friend list Retrieval Successful",
        "friends": req.myFriends,
    }) 
})

// @route    GET user/search-user
// @desc     Retrieve a search results on user
// @access   Private
router.get('/search-user',
    authCtrl.tokenVerification,
    userCtrl.searchUser,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User search successful",
        "users": req.searchResults,
        "total": req.total,
        "nextSkips": req.nextSkips,
    }) 
})

// @route    GET user/notifications
// @desc     Retrieve a notifications of a user
// @access   Private
router.get('/notifications',
    authCtrl.tokenVerification,
    userCtrl.loadNotifications,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "User notifications retrieval successful",
        "notifications": req.notifications,
        "newNotifications": req.unSeenNotifications,
        "total": req.total,
        "nextSkips": req.nextSkips,
    }) 
})

// @route    GET user/video/videoFileName
// @desc     Stream video
// @access   Public
router.get('/post/video/:fileName',
    (req, res, next) => {
    try {
        const path = `./public/uploads/userPost/${req.params.fileName}`;
        const stat = fs.statSync(path)
        const fileSize = stat.size
        const range = req.headers.range
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-")
            const start = parseInt(parts[0], 10)
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1
            const chunksize = (end-start)+1
            const file = fs.createReadStream(path, {start, end})
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            }
            res.writeHead(206, head)
            file.pipe(res)
        } 
        else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        }
        res.writeHead(200, head)
        fs.createReadStream(path).pipe(res)
        }
    }
    catch(err){
        next(err);
    }
});




module.exports = router;

