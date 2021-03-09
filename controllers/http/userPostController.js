const mongoose = require('mongoose');
const fs = require('fs');

const userPosts = require('../../models/users/userPosts');
const users = require('../../models/users/users');
const comments = require('../../models/users/comments');
const replies = require('../../models/users/replies');

const userNotifications = require('../../models/notifications/userNotifications.js');
const notificationType = require('../../notificationType.js');

const fileDeleter = require('../../helpers/http/deleteFiles');
const fileUploader = require('../../helpers/http/fileUploads');

const validationRule = require('../validationController');

//error handler
const errObj = require('../../error/errorHandler');

const getSinglePost = async (req, res, next) => {
	try {
		const postID = req.params.postID;
		if(postID.split('').length != 24) return next(new errObj.BadRequestError("Invalid postID"));

		const postResults = await userPosts.aggregate([
			{$match: {_id: mongoose.Types.ObjectId(postID)}},
			{ $lookup: 
				{ 
					from: 'users', 
					let: { user_id: "$userID" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$_id", "$$user_id"] } } },
						{ $project: {firstName: 1, lastName: 1, category: 1 }}
					],
					as: 'userInfo'
				}
			},
			{$unwind: '$userInfo'},
			{ $lookup: 
				{ 
					from: 'user_profiles', 
					let: { user_id: "$userID" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$userID", "$$user_id"] } } },
						{ $project: { profilePic: 1 }}
					],
					as: 'profileInfo'
				}
			},
			{$unwind: '$profileInfo'},
		]);
		if(postResults.length < 1) return next(new errObj.NotFoundError("Post not found"));
		req.post = postResults[0];
		next();
	}
	catch(err) {
		console.log(err)
		next(err)
	}
}

const createPost = async (req, res, next) => {
	try {
		const userID = req.userID;
		const reachTo = JSON.parse(req.body.reachTo);
		if(reachTo.public == true) {reachTo.categories = null};
		let post = await userPosts.create({
			userID: userID,
			text: req.body.text || null,
			reachTo: reachTo,
			images: req.images || null,
			videos: req.videos || null,
			lastUpdated: Date()
		})
		const postID = post._id;
		post = await userPosts.aggregate(
		[
			{ $match: {_id: postID} },
			{ $project: {
				userID: 1, text: 1, reachTo: 1, images: 1, videos: 1, takeTotal: 1, commentTotal: 1,
				createdAt: 1
			}},
			{ $lookup: 
				{ 
					from: 'users', 
					pipeline: [
						{ $match: {_id: mongoose.Types.ObjectId(userID)} },
						{ $project: {firstName: 1, lastName: 1, category: 1 }}
					],
					as: 'userInfo'
				}
			},
			{$unwind: '$userInfo'},
			{ $lookup: 
				{ 
					from: 'user_profiles', 
					pipeline: [
						{ $match: {userID: mongoose.Types.ObjectId(userID)} },
						{ $project: { profilePic: 1 }}
					],
					as: 'profileInfo'
				}
			},
			{$unwind: '$profileInfo'},
		]);
		req.post = post[0];
		next();
	}
	catch(err){
		next(err)		
	}
}

const updatePost = async (req, res, next) => {
	try {
		const userID = req.userID;
		const postID = req.params.postID;

		if(postID.split('').length != 24) return next(new errObj.BadRequestError("Invalid postID"));

		let imagesToBeDeleted = [];
		let videosToBeDeleted = [];
		if(req.body.imagesToBeDeleted){
			imagesToBeDeleted = JSON.parse(req.body.imagesToBeDeleted);
		}
		if(req.body.videosToBeDeleted){
			videosToBeDeleted = JSON.parse(req.body.videosToBeDeleted);
		}
		
		let post = await userPosts.findOne({$and: [{_id: postID}, {userID: userID}]});
		if(!post) return next(new errObj.NotFoundError("Post not found"));

		if(req.body.text) {
			post.text = req.body.text;
		}
		let filesToBeDeleted = [];
		if(imagesToBeDeleted.length > 0) {
			imagesToBeDeleted.forEach(file => {
				filesToBeDeleted.push(`./public/uploads/userPost/${file}`);
				if(post.images.includes(file)) post.images.pull(file);
			})
		}
		if(videosToBeDeleted.length > 0) {
			videosToBeDeleted.forEach(file => {
				filesToBeDeleted.push(`./public/uploads/userPost/${file}`);
				if(post.videos.includes(file)) post.videos.pull(file);
			})
		}
		if(filesToBeDeleted.length > 0) await fileDeleter.deleteMultipleFiles(filesToBeDeleted);
		if(req.images.length > 0) {post.images =  post.images.concat(req.images); }
		if(req.videos.length > 0) {post.videos =  post.videos.concat(req.videos); }
		post.lastUpdated = Date();
		await post.save();

		post = await userPosts.aggregate(
		[
			{ $match: {_id: mongoose.Types.ObjectId(postID)} },
			{ $project: {
				userID: 1, text: 1, reachTo: 1, images: 1, videos: 1, takeTotal: 1, commentTotal: 1,
				createdAt: 1
			}},
		]);
		req.post = post[0];
		next();
	}
	catch(err) {
		next(err);
	}
}

const deletePost = async (req, res, next) => {
	try {
		const userID = req.userID;
		const postID = req.params.postID;

		if(postID.split('').length != 24) return next(new errObj.BadRequestError("Invalid postID"));

		const post = await userPosts.findOne({$and: [{_id: postID}, {userID: userID}]});
		if(!post) return next(new errObj.NotFoundError("Post not found"));

		const postFiles = post.images.concat(post.videos);
		let filesToBeDeleted = [];
		if(postFiles.length > 0){
			filesToBeDeleted = postFiles.map(file => {
				return `./public/uploads/userPost/${file}`;
			})
		}
		const postComments = await comments.find({postID: postID});
		postComments.forEach(comment => {
			if(comment.image){
				filesToBeDeleted.push(`./public/uploads/userPost/comments/${comment.image}`);
			}
		})

		const postReplies = await replies.find({postID: postID});
		postReplies.forEach(reply => {
			if(reply.image) {
				filesToBeDeleted.push(`./public/uploads/userPost/comments/${reply.image}`);
			}
		})

		if(filesToBeDeleted.length > 0) await fileDeleter.deleteMultipleFiles(filesToBeDeleted);
		await userPosts.deleteOne({$and: [{_id: postID}, {userID: userID}]});
		await comments.deleteMany({postID: postID});
		await replies.deleteMany({postID: postID});
		next();
	}
	catch(err) {
		next(err);
	}
}

const getProfilePosts = async (req, res, next) => {
	try {
		const userID = req.userID;
		let skips = 0, limit = 10;
        if(req.query.skips) {skips = parseInt(req.query.skips);}
        if(req.query.limit) {limit = parseInt(req.query.limit);}
		const nextSkips = skips + limit;
		if(validationRule.numberValidation(skips) == false){
			return next(new errObj.BadRequestError("Skips should be a number!!"));
		}
		if(validationRule.numberValidation(limit) == false){
			return next(new errObj.BadRequestError("limit should be a number!!"));
		}
		const posts = await userPosts.aggregate(
		[
			{ $match: {userID: mongoose.Types.ObjectId(userID)} },
			{ $sort: {_id: -1} },
			{ $skip: skips },
			{ $limit: limit },
			{ $project: {
				userID: 1, text: 1, reachTo: 1, images: 1, videos: 1, takeTotal: 1, commentTotal: 1,
				createdAt: 1,
				isTaken:
               {
                 $cond: { if: {$in: [mongoose.Types.ObjectId(userID), "$takenUsers"]}, then: true, else: false }
               }
			}},
			{ $lookup: 
				{ 
					from: 'users', 
					pipeline: [
						{ $match: {_id: mongoose.Types.ObjectId(userID)} },
						{ $project: {firstName: 1, lastName: 1, category: 1 }}
					],
					as: 'userInfo'
				}
			},
			{$unwind: '$userInfo'},
			{ $lookup: 
				{ 
					from: 'user_profiles', 
					pipeline: [
						{ $match: {userID: mongoose.Types.ObjectId(userID)} },
						{ $project: { profilePic: 1 }}
					],
					as: 'profileInfo'
				}
			},
			{$unwind: '$profileInfo'},
		]);
		req.posts = posts;
		const totalPost = await userPosts.countDocuments({userID: userID});
        req.total = totalPost;
        if(nextSkips >= totalPost) req.nextSkips = null;
    	else{
    		req.nextSkips = nextSkips;
    	}
		next();
	}
	catch(err) {
		next(err)
	}
}

const getTimelinePosts = async (req, res, next) => {
	try {
		const userID = req.userID;

		const user_id = req.params.user_id;
		if(userID.split('').length != 24) return next(new errObj.BadRequestError("Invalid userID"));


		let skips = 0, limit = 10;
        if(req.query.skips) {skips = parseInt(req.query.skips);}
        if(req.query.limit) {limit = parseInt(req.query.limit);}
		const nextSkips = skips + limit;
		if(validationRule.numberValidation(skips) == false){
			return next(new errObj.BadRequestError("Skips should be a number!!"));
		}
		if(validationRule.numberValidation(limit) == false){
			return next(new errObj.BadRequestError("limit should be a number!!"));
		}
		const posts = await userPosts.aggregate(
		[
			{ $match: {userID: mongoose.Types.ObjectId(user_id)} },
			{ $sort: {_id: -1} },
			{ $skip: skips },
			{ $limit: limit },
			{ $project: {
				userID: 1, text: 1, reachTo: 1, images: 1, videos: 1, takeTotal: 1, commentTotal: 1,
				createdAt: 1,
				isTaken:
	               {
	                 $cond: { if: {$in: [mongoose.Types.ObjectId(userID), "$takenUsers"]}, then: true, else: false }
	               }
			}},
			{ $lookup: 
				{ 
					from: 'users', 
					pipeline: [
						{ $match: {_id: mongoose.Types.ObjectId(user_id)} },
						{ $project: {firstName: 1, lastName: 1, category: 1 }}
					],
					as: 'userInfo'
				}
			},
			{$unwind: '$userInfo'},
			{ $lookup: 
				{ 
					from: 'user_profiles', 
					pipeline: [
						{ $match: {userID: mongoose.Types.ObjectId(user_id)} },
						{ $project: { profilePic: 1 }}
					],
					as: 'profileInfo'
				}
			},
			{$unwind: '$profileInfo'},
		]);
		req.posts = posts;
		const totalPost = await userPosts.countDocuments({userID: user_id});
        req.total = totalPost;
        if(nextSkips >= totalPost) req.nextSkips = null;
    	else{
    		req.nextSkips = nextSkips;
    	}
		next();
	}
	catch(err) {
		next(err)
	}
}

const getNewsFeedPosts = async (req, res, next) => {
	try {
		const userID = req.userID;
		let skips = 0, limit = 10;
        if(req.query.skips) {skips = parseInt(req.query.skips);}
        if(req.query.limit) {limit = parseInt(req.query.limit);}
		const nextSkips = skips + limit;

		if(validationRule.numberValidation(skips) == false){
			return next(new errObj.BadRequestError("Skips should be a number!!"));
		}
		if(validationRule.numberValidation(limit) == false){
			return next(new errObj.BadRequestError("limit should be a number!!"));
		}
		const posts = await userPosts.aggregate(
		[
			{ $sort: {_id: -1} },
			{ $skip: skips },
			{ $limit: limit },
			{ $project: {
				userID: 1, text: 1, reachTo: 1, images: 1, videos: 1, takeTotal: 1, commentTotal: 1,
				createdAt: 1,
				isTaken:
	               {
	                 $cond: { if: {$in: [mongoose.Types.ObjectId(userID), "$takenUsers"]}, then: true, else: false }
	               }
			}},
			{ $lookup: 
				{ 
					from: 'users', 
					let: { user_id: "$userID" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$_id", "$$user_id"] } } },
						{ $project: {firstName: 1, lastName: 1, category: 1 }}
					],
					as: 'userInfo'
				}
			},
			{$unwind: '$userInfo'},
			{ $lookup: 
				{ 
					from: 'user_profiles', 
					let: { user_id: "$userID" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$userID", "$$user_id"] } } },
						{ $project: { profilePic: 1 }}
					],
					as: 'profileInfo'
				}
			},
			{$unwind: '$profileInfo'},
		]);
		req.posts = posts;
		const totalPost = await userPosts.countDocuments();
        req.total = totalPost;
        if(nextSkips >= totalPost) req.nextSkips = null;
    	else{
    		req.nextSkips = nextSkips;
    	}
		next();
	}
	catch(err) {
		next(err)
	}
}

const takePost = async (req, res, next) => {
	try {
		const userID = req.userID;
		const postID = req.params.postID;

		if(postID.split('').length != 24) return next(new errObj.BadRequestError("Invalid postID"));

		let post = await userPosts.findOne({
			$and: [
				{_id: postID},
				{takenUsers: {$in: userID}},
			]
		})
		if(post) return next(new errObj.BadRequestError("user cannot take a single post for multiple times"));
		post = await userPosts.findOne({_id: postID});
		if(!post) return next(new errObj.NotFoundError("Post not found"));
		post.takeTotal++;
		await post.takenUsers.push(userID);
		await post.save();
		req.takeTotal = post.takeTotal;
		next();
	}
	catch(err) {
		next(err);
	}
}

const untakePost = async (req, res, next) => {
	try {
		const userID = req.userID;
		const postID = req.params.postID;

		if(postID.split('').length != 24) return next(new errObj.BadRequestError("Invalid postID"));

		const post = await userPosts.findOne({
			$and: [
				{_id: postID},
				{takenUsers: {$in: userID}},
			]
		})
		if(!post) return next(new errObj.NotFoundError("Post not found"));
		post.takeTotal--;
		await post.takenUsers.pull(userID);
		await post.save();
		req.takeTotal = post.takeTotal;
		next();
	}
	catch(err) {
		next(err);
	}
}

const postComment = async (req, res, next) => {
	try {
		const userID = req.userID;
		const postID = req.params.postID;

		let text, image;
		if(req.body.text) {text = req.body.text};
		if(req.images.length > 0) {image = req.images[0]};

		if(postID.split('').length != 24) return next(new errObj.BadRequestError("Invalid postID"));

		if(!text && !image) return next(new errObj.BadRequestError("Empty comment cannot be posted"));

		const post = await userPosts.findOne({_id: postID});
		if(!post) return next(new errObj.NotFoundError("Post not found"));

		const newComment = await comments.create({
			postID: postID,
			userID: userID, 
			text: text || null,
			image: image || null,
			lastUpdated: Date()
		});

		const comment = await comments.aggregate([
			{ $match: { $and: [{_id: newComment._id}, {postID: newComment.postID}]}},
			{ $lookup:
				{
					from: 'users', 
					let: { user_id: "$userID" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$_id", "$$user_id"] } } },
						{ $project: {firstName: 1, lastName: 1, category: 1 }}
					],
					as: 'userInfo'							
				}
			},
			{$unwind: '$userInfo'},
			{ $lookup: 
				{ 
					from: 'user_profiles', 
					let: { user_id: "$userID" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$userID", "$$user_id"] } } },
						{ $project: { profilePic: 1 }}
					],
					as: 'profileInfo'
				}
			},
			{$unwind: '$profileInfo'},
		])

		if(image){
			const file = req.files['files'][0];
			const filePath = `./public/uploads/userPost/comments/${image}`;
			await fileUploader.uploadSingleFile(file, filePath);
		}


		post.commentTotal++;
		await post.save();
		req.commentTotal = post.commentTotal;
		req.comment = comment[0];

		req.data = {
			senderID: userID, 
			receiverID: post.userID, 
			postID: postID,
			commentID: newComment._id,
			senderName: `${comment[0].userInfo.firstName} ${comment[0].userInfo.lastName}`,
			senderProfilePic: `${comment[0].profileInfo.profilePic}`,
			text: newComment.text,
			image: newComment.image,
		};

		next();
	}
	catch (err) {
		next(err);
	}
}

const sendCommentNotificationOnPost = async (req, res, next) => {
	try {
		const notification = await userNotifications.create({
			senderID: req.data.senderID,
			receiverID: req.data.receiverID,
			postID: req.data.postID,
			commentID: req.data.commentID,
			message: `${req.data.senderName} commented on your post.`,
			type: notificationType.commentedOnPost,
		});
		const io = req.app.get('io');
	    const homeSocket = io.of('/');
	    homeSocket.sockets.forEach(soc => {
	        if(soc.userID == req.data.receiverID) {
	            homeSocket.to(soc.id).emit('commentedOnPost', {
	            	notificationID: notification._id,
	            	postID: req.data.postID,
					commentID: req.data.commentID,
					commentatorName: req.data.senderName,
					commentatorProfilePic: req.data.senderProfilePic,
					message: notification.message,
					text: req.data.text,
					image: req.data.image,
	            })
	            return;
	        }
	    })
	    next();
	}
	catch(err) {
		next(err);
	}
}

const editComment = async (req, res, next) => {
	try {
		const userID = req.userID;
		const postID = req.params.postID;
		const commentID = req.params.commentID;

		if(postID.split('').length != 24) return next(new errObj.BadRequestError("Invalid postID"));
		if(commentID.split('').length != 24) return next(new errObj.BadRequestError("Invalid commentID"));

		const post = await userPosts.findOne({_id: postID});
		if(!post) return next(new errObj.NotFoundError("Post not found"));

		const comment = await comments.findOne({
			$and: [
				{postID: postID},
				{_id: commentID},
			]
		})
		if(!comment) return next(new errObj.NotFoundError("Comment not found"));

		if(userID != post.userID && userID != comment.userID){
			return next(new errObj.NotAuthorizedError("User not authorised to edit comment"));
		}
		if(req.body.text){
			comment.text = req.body.text;
		}
		if(req.body.image && comment.image){
			if(req.body.image == comment.image){
				await fileDeleter.deleteSingleFile(`./public/uploads/userPost/comments/${comment.image}`);
				comment.image = null;
				if(validationRule.notEmptyValidation(comment.text) == false) {
					await comments.deleteOne({_id: commentID});
					post.commentTotal--;
				}
			}
		}
		await post.save();
		await comment.save();
		req.commentTotal = post.commentTotal;
		if(req.body.text) {req.text = comment.text};
		next();
	}
	catch(err) {
		next(err);
	}
}

const deleteComment = async (req, res, next) => {
	try {
		const userID = req.userID;
		const postID = req.params.postID;
		const commentID = req.params.commentID;

		if(postID.split('').length != 24) return next(new errObj.BadRequestError("Invalid postID"));
		if(commentID.split('').length != 24) return next(new errObj.BadRequestError("Invalid commentID"));

		const post = await userPosts.findOne({_id: postID});
		if(!post) return next(new errObj.NotFoundError("Post not found"));

		const comment = await comments.findOne({
			$and: [
				{postID: postID},
				{_id: commentID},
			]
		})
		if(!comment) return next(new errObj.NotFoundError("Comment not found"));

		if(userID != post.userID && userID != comment.userID){
			return next(new errObj.NotAuthorizedError("User not authorised to delete comment"));
		}

		let commentImages = [];
		if(comment.image){
				commentImages.push(`./public/uploads/userPost/comments/${comment.image}`);
		}

		const postReplies = await replies.find({
			$and: [
				{postID: postID},
				{commentID: commentID},
			]
		})
		postReplies.forEach(reply => {
			if(reply.image) {
				commentImages.push(`./public/uploads/userPost/comments/${reply.image}`);
			}
		})
		await fileDeleter.deleteMultipleFiles(commentImages);
		await comments.deleteOne({_id: commentID});
		const noOfReplyToDelete = await replies.countDocuments({
			$and: [
				{postID: postID},
				{commentID: commentID},
			]
		})
		await replies.deleteMany({
			$and: [
				{postID: postID},
				{commentID: commentID},
			]
		});
		post.commentTotal = post.commentTotal - noOfReplyToDelete - 1;
		await post.save();
		req.commentTotal = post.commentTotal;
		next();
	}
	catch(err) {
		next(err);
	}
}

const postReply = async (req, res, next) => {
	try {
		const userID = req.userID;
		const postID = req.params.postID;
		const commentID = req.params.commentID;

		let text, image;
		if(req.body.text) {text = req.body.text};
		if(req.images.length > 0) {image = req.images[0]};

		if(postID.split('').length != 24) return next(new errObj.BadRequestError("Invalid postID"));
		if(commentID.split('').length != 24) return next(new errObj.BadRequestError("Invalid commentID"));

		if(!text && !image) return next(new errObj.BadRequestError("Empty reply cannot be posted"));

		const post = await userPosts.findOne({_id: postID});
		if(!post) return next(new errObj.NotFoundError("Post not found"));

		const comment = await comments.findOne({_id: commentID});
		if(!comment) return next(new errObj.NotFoundError("Comment not found"));

		const newReply = await replies.create({
			postID: postID,
			userID: userID, 
			commentID: commentID, 
			text: text || null,
			image: image || null,
			lastUpdated: Date()
		});

		const reply = await replies.aggregate([
			{ $match: { $and: [{_id: newReply._id}, {commentID: newReply.commentID}, {postID: newReply.postID}]}},
			{ $lookup:
				{
					from: 'users', 
					let: { user_id: "$userID" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$_id", "$$user_id"] } } },
						{ $project: {firstName: 1, lastName: 1, category: 1 }}
					],
					as: 'userInfo'							
				}
			},
			{$unwind: '$userInfo'},
			{ $lookup: 
				{ 
					from: 'user_profiles', 
					let: { user_id: "$userID" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$userID", "$$user_id"] } } },
						{ $project: { profilePic: 1 }}
					],
					as: 'profileInfo'
				}
			},
			{$unwind: '$profileInfo'},
		])

		if(image){
			const file = req.files['files'][0];
			const folderPath = './public/uploads/userPost/comments';
			fs.open(`${folderPath}/${req.images[0]}`, 'a', (err, fd) => { 
			    if(!err) {
			        fs.write(fd, file.data, (err) => {
			            if (err) next(err)
			        })
			    }
			})
		}
		post.commentTotal++;
		await post.save();
		req.commentTotal = post.commentTotal;
		req.reply = reply[0];

		req.data = {
			senderID: userID, 
			postReceiverID: post.userID, 
			commentReceiverID: comment.userID, 
			postID: postID,
			commentID: commentID,
			replyID: newReply._id,
			senderName: `${reply[0].userInfo.firstName} ${reply[0].userInfo.lastName}`,
			senderProfilePic: `${reply[0].profileInfo.profilePic}`,
			text: newReply.text,
			image: newReply.image,
		};

		next();
	}
	catch (err) {
		next(err);
	}
}

const sendReplyNotificationOnPost = async (req, res, next) => {
	try {
		const io = req.app.get('io');
		const homeSocket = io.of('/');
		const postNotification = await userNotifications.create({
			senderID: req.data.senderID,
			receiverID: req.data.postReceiverID,
			postID: req.data.postID,
			commentID: req.data.commentID,
			message: `${req.data.senderName} replied on a comment of your post.`,
			type: notificationType.repliedOnPost,
		});
		homeSocket.sockets.forEach(soc => {
	        if(soc.userID == req.data.postReceiverID) {
	            homeSocket.to(soc.id).emit('repliedOnPost', {
	            	notificationID: postNotification._id,
	            	postID: req.data.postID,
					commentID: req.data.commentID,
					replyID: req.data.replyID,
					commentatorName: req.data.senderName,
					commentatorProfilePic: req.data.senderProfilePic,
					text: req.data.text,
					image: req.data.image,
					message: postNotification.message,
	            })
	            return;
	        }
	    })
		if(req.data.postReceiverID !== req.data.commentReceiverID){
			const commentNotification = await userNotifications.create({
				senderID: req.data.senderID,
				receiverID: req.data.commentReceiverID,
				postID: req.data.postID,
				commentID: req.data.commentID,
				message: `${req.data.senderName} replied on your comment on a post.`,
				type: notificationType.repliedToCommentOnPost,
			});
		    homeSocket.sockets.forEach(soc => {
		        if(soc.userID == req.data.commentReceiverID) {
		            homeSocket.to(soc.id).emit('repliedToCommentOnPost', {
		            	notificationID: commentNotification._id,
		            	postID: req.data.postID,
						commentID: req.data.commentID,
						replyID: req.data.replyID,
						commentatorName: req.data.senderName,
						commentatorProfilePic: req.data.senderProfilePic,
						text: req.data.text,
						image: req.data.image,
						message: commentNotification.message,
		            })
		            return;
		        }
		    })
		}
	    next();
	}
	catch(err) {
		next(err);
	}
}

const editReply = async (req, res, next) => {
	try {
		const userID = req.userID;
		const postID = req.params.postID;
		const commentID = req.params.commentID;
		const replyID = req.params.replyID;

		if(postID.split('').length != 24) return next(new errObj.BadRequestError("Invalid postID"));
		if(commentID.split('').length != 24) return next(new errObj.BadRequestError("Invalid commentID"));
		if(replyID.split('').length != 24) return next(new errObj.BadRequestError("Invalid replyID"));

		const post = await userPosts.findOne({_id: postID});
		if(!post) return next(new errObj.NotFoundError("Post not found"));

		const comment = await comments.findOne({
			$and: [
				{postID: postID},
				{_id: commentID},
			]
		})
		if(!comment) return next(new errObj.NotFoundError("Comment not found"));

		const reply = await replies.findOne({
			$and: [
				{postID: postID},
				{_id: replyID},
				{commentID: commentID},
			]
		})
		if(!reply) return next(new errObj.NotFoundError("Reply not found"));

		if(userID != post.userID && userID != reply.userID){
			return next(new errObj.NotAuthorizedError("User not authorised to edit reply"));
		}
		if(req.body.text){
			reply.text = req.body.text;
		}
		if(req.body.image && reply.image){
			if(req.body.image == reply.image){
				await fileDeleter.deleteSingleFile(`./public/uploads/userPost/comments/${reply.image}`);
				reply.image = null;
				if(validationRule.notEmptyValidation(reply.text) == false) {
					await replies.deleteOne({_id: replyID});
					post.commentTotal--;
				}
			}
		}
		await post.save();
		await reply.save();
		req.commentTotal = post.commentTotal;
		if(req.body.text) {req.text = reply.text};
		next();
	}
	catch(err) {
		next(err);
	}
}

const deleteReply = async (req, res, next) => {
	try {
		const userID = req.userID;
		const postID = req.params.postID;
		const commentID = req.params.commentID;
		const replyID = req.params.replyID;

		if(postID.split('').length != 24) return next(new errObj.BadRequestError("Invalid postID"));
		if(commentID.split('').length != 24) return next(new errObj.BadRequestError("Invalid commentID"));
		if(replyID.split('').length != 24) return next(new errObj.BadRequestError("Invalid replyID"));

		const post = await userPosts.findOne({_id: postID});
		if(!post) return next(new errObj.NotFoundError("Post not found"));

		const comment = await comments.findOne({
			$and: [
				{postID: postID},
				{_id: commentID},
			]
		})
		if(!comment) return next(new errObj.NotFoundError("Comment not found"));

		const reply = await replies.findOne({
			$and: [
				{postID: postID},
				{_id: replyID},
				{commentID: commentID},
			]
		})
		if(!reply) return next(new errObj.NotFoundError("Reply not found"));

		if(userID != post.userID && userID != reply.userID){
			return next(new errObj.NotAuthorizedError("User not authorised to delete reply"));
		}

		if(reply.image){
			await fileDeleter.deleteSingleFile(`./public/uploads/userPost/comments/${reply.image}`);
		}
		await replies.deleteOne({_id: replyID});
		post.commentTotal--;
		await post.save();
		req.commentTotal = post.commentTotal;
		next();
	}
	catch(err) {
		next(err);
	}
}

const loadComments = async (req, res, next) => {
	try {
		let skips = 0, limit = 10;
        if(req.query.skips) {skips = parseInt(req.query.skips);}
        if(req.query.limit) {limit = parseInt(req.query.limit);}
		const nextSkips = skips + limit;
		const userID = req.userID;
		const postID = req.params.postID;

		if(postID.split('').length != 24) return next(new errObj.BadRequestError("Invalid postID"));

		const post = await userPosts.findOne({_id: postID});
		if(!post) return next(new errObj.NotFoundError("Post not found"));

		const postComments = await comments.aggregate([
			{ $match: {postID: mongoose.Types.ObjectId(postID)}},
			{ $skip: skips},
			{ $limit: limit},
			{ $lookup: 
				{ 
					from: 'post_replies', 
					let: { cmntID: "$_id" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$commentID", "$$cmntID"] } } },
						{ $skip: 0},
						{ $limit: 2},
						{ $lookup:
							{
								from: 'users', 
								let: { user_id: "$userID" },
								pipeline: [
									{ $match: { $expr: { $eq: ["$_id", "$$user_id"] } } },
									{ $project: {firstName: 1, lastName: 1, category: 1 }}
								],
								as: 'userInfo'							
							}
						},
						{$unwind: '$userInfo'},
						{ $lookup: 
							{ 
								from: 'user_profiles', 
								let: { user_id: "$userID" },
								pipeline: [
									{ $match: { $expr: { $eq: ["$userID", "$$user_id"] } } },
									{ $project: { profilePic: 1 }}
								],
								as: 'profileInfo'
							}
						},
						{$unwind: '$profileInfo'},
					],
					as: 'replies'
				},
			},
			{ $lookup: 
				{ 
					from: 'users', 
					let: { user_id: "$userID" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$_id", "$$user_id"] } } },
						{ $project: {firstName: 1, lastName: 1, category: 1 }}
					],
					as: 'userInfo'
				},
			},
			{$unwind: '$userInfo'},
			{ $lookup: 
				{ 
					from: 'user_profiles', 
					let: { user_id: "$userID" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$userID", "$$user_id"] } } },
						{ $project: { profilePic: 1 }}
					],
					as: 'profileInfo'
				}
			},
			{$unwind: '$profileInfo'},
		])
		req.comments = postComments;
		const totalComment = await comments.countDocuments({postID: postID});
		const totalReplies = await replies.countDocuments({postID: postID});
		post.commentTotal = totalReplies + totalComment;
		await post.save();
        req.total = totalComment;
        if(nextSkips >= totalComment) req.nextSkips = null;
    	else{
    		req.nextSkips = nextSkips;
    	}
		next();
	}
	catch(err) {
		next(err);
	}
}

const loadReplies = async (req, res, next) => {
	try {
		let skips = 0, limit = 10;
        if(req.query.skips) {skips = parseInt(req.query.skips);}
        if(req.query.limit) {limit = parseInt(req.query.limit);}
		const nextSkips = skips + limit;
		const userID = req.userID;
		const postID = req.params.postID;
		const commentID = req.params.commentID;

		if(postID.split('').length != 24) return next(new errObj.BadRequestError("Invalid postID"));
		if(commentID.split('').length != 24) return next(new errObj.BadRequestError("Invalid commentID"));

		const post = await userPosts.findOne({_id: postID});
		if(!post) return next(new errObj.NotFoundError("Post not found"));

		const comment = await comments.findOne({_id: commentID});
		if(!comment) return next(new errObj.NotFoundError("comment not found"));

		const postReplies = await replies.aggregate([
			{ $match: {commentID: mongoose.Types.ObjectId(commentID)}},
			{ $skip: skips},
			{ $limit: limit},
			{ $lookup: 
				{ 
					from: 'users', 
					let: { user_id: "$userID" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$_id", "$$user_id"] } } },
						{ $project: {firstName: 1, lastName: 1, category: 1 }}
					],
					as: 'userInfo'
				},
			},
			{$unwind: '$userInfo'},
			{ $lookup: 
				{ 
					from: 'user_profiles', 
					let: { user_id: "$userID" },
					pipeline: [
						{ $match: { $expr: { $eq: ["$userID", "$$user_id"] } } },
						{ $project: { profilePic: 1 }}
					],
					as: 'profileInfo'
				}
			},
			{$unwind: '$profileInfo'},
		])
		req.replies = postReplies;
		const totalReply = await replies.countDocuments({$and: [
			{postID: postID}, {commentID: commentID}
		]});
        req.total = totalReply;
        if(nextSkips >= totalReply) req.nextSkips = null;
    	else{
    		req.nextSkips = nextSkips;
    	}
		next();
	}
	catch(err) {
		next(err);
	}
}

const getSelfTimelinePhotos = async (req, res, next) => {
	try {
		const userID = req.userID;
		let skips = 0, limit = 10;
        if(req.query.skips) {skips = parseInt(req.query.skips);}
        if(req.query.limit) {limit = parseInt(req.query.limit);}
		const nextSkips = skips + limit;

		let photos = await userPosts.aggregate([
			{$match: {userID: mongoose.Types.ObjectId(userID)}},
			{$project: {image: "$images"}},
			{$unwind: '$image'},
		])

        req.total = photos.length;
        let overFlow = 0;
        if(nextSkips >= req.total){
        	req.nextSkips = null;
        	overFlow = nextSkips - req.total;
        } 
    	else{
    		req.nextSkips = nextSkips;
    	}
  		req.photos = photos.slice(skips, (nextSkips - overFlow));
		next();
	}
	catch(err) {
		console.log(err)
		next(err);
	}
}

const getTimelinePhotos = async (req, res, next) => {
	try {
		const userID = req.params.user_id;
		let skips = 0, limit = 10;
        if(req.query.skips) {skips = parseInt(req.query.skips);}
        if(req.query.limit) {limit = parseInt(req.query.limit);}
		const nextSkips = skips + limit;

		let photos = await userPosts.aggregate([
			{$match: {userID: mongoose.Types.ObjectId(userID)}},
			{$project: {image: "$images"}},
			{$unwind: '$image'},
		])

        req.total = photos.length;
        let overFlow = 0;
        if(nextSkips >= req.total){
        	req.nextSkips = null;
        	overFlow = nextSkips - req.total;
        } 
    	else{
    		req.nextSkips = nextSkips;
    	}
  		req.photos = photos.slice(skips, (nextSkips - overFlow));
		next();
	}
	catch(err) {
		next(err);
	}
}

const getSelfTimelineVideos = async (req, res, next) => {
	try {
		const userID = req.userID;
		let skips = 0, limit = 10;
        if(req.query.skips) {skips = parseInt(req.query.skips);}
        if(req.query.limit) {limit = parseInt(req.query.limit);}
		const nextSkips = skips + limit;

		let videos = await userPosts.aggregate([
			{$match: {userID: mongoose.Types.ObjectId(userID)}},
			{$project: {video: "$videos"}},
			{$unwind: '$video'},
		])

        req.total = videos.length;
        let overFlow = 0;
        if(nextSkips >= req.total){
        	req.nextSkips = null;
        	overFlow = nextSkips - req.total;
        } 
    	else{
    		req.nextSkips = nextSkips;
    	}
  		req.videos = videos.slice(skips, (nextSkips - overFlow));
		next();
	}
	catch(err) {
		next(err);
	}
}

const getTimelineVideos = async (req, res, next) => {
	try {
		const userID = req.params.user_id;
		let skips = 0, limit = 10;
        if(req.query.skips) {skips = parseInt(req.query.skips);}
        if(req.query.limit) {limit = parseInt(req.query.limit);}
		const nextSkips = skips + limit;

		let videos = await userPosts.aggregate([
			{$match: {userID: mongoose.Types.ObjectId(userID)}},
			{$project: {video: "$videos"}},
			{$unwind: '$video'},
		])

        req.total = videos.length;
        let overFlow = 0;
        if(nextSkips >= req.total){
        	req.nextSkips = null;
        	overFlow = nextSkips - req.total;
        } 
    	else{
    		req.nextSkips = nextSkips;
    	}
  		req.videos = videos.slice(skips, (nextSkips - overFlow));
		next();
	}
	catch(err) {
		next(err);
	}
}

module.exports = {
	getSinglePost,
	createPost,
	updatePost,
	deletePost,

	getProfilePosts,
	getTimelinePosts,
	getNewsFeedPosts,

	takePost,
	untakePost,

	postComment,
	sendCommentNotificationOnPost,

	editComment,
	deleteComment,

	postReply,
	sendReplyNotificationOnPost,
	
	editReply,
	deleteReply,

	loadComments,
	loadReplies,

	getSelfTimelineVideos,
	getTimelineVideos,

	getSelfTimelinePhotos,
	getTimelinePhotos,
}