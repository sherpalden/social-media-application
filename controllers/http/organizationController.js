const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const util = require('util');
const Busboy = require('busboy');
const is = require('type-is');
var uuid = require('uuid-random');

const fileDeleter = require('../../helpers/http/deleteFiles');
const fileUploader = require('../../helpers/http/fileUploads');

const organizations = require('../../models/organizations/organizations');
const organizationProfile = require('../../models/organizations/organizationProfile');
const events = require('../../models/organizations/events');

//const members = require('../../models/campaigns/campaignComments');
//const replies = require('../../models/campaigns/campaignReplies');

const validationController = require('../validationController');

//error handler
const errObj = require('../../error/errorHandler');

const setCampaignThumbnail = async (req, res, next) => {
	try {
		const userID = req.userID;
		const campaignID = req.params.campaignID;
		const thumbnailImg = req.body.thumbnailImg;

		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));

		let campaign = await campaigns.findOne({
			$and: [
				{_id: campaignID},
				{userID: userID},
			]
		})
		if(!campaign) return next(new errObj.NotFoundError("Campaign Not Found"));
		if(!campaign.images.includes(thumbnailImg)) return next(new errObj.BadRequestError("Img name not in campaign Images List"))
		campaign.thumbnail = thumbnailImg;
		await campaign.save();
		next();
	}
	catch(err) {
		next(err);
	}
}

const organizationValidation = async (req, res, next) => {
	try {
		let organizationData = req.body;
		//const duration = JSON.parse(organizationData.duration);

		for(key in organizationData){
			if(validationController.notEmptyValidation(organizationData[key]) == false){
				await fileDeleter.deleteFile(`./public/uploads/temp/${req.image}`);
				return next(new errObj.BadRequestError(`${key} field is required!`));
			}
		}
		next();
	}
	catch(err) {
		try {
			await fileDeleter.deleteFile(`./public/uploads/temp/${req.image}`);
		}
		catch(err){
			next(err);
		}
		next(err);
	}
}

const uploadOrganizationFiles = async (req, res, next) => {
	let image;
	try {
		if(!is(req, ['multipart'])) return next(new errObj.BadRequestError("The content type must be form-data/multipart"));
        const busboy = new Busboy({headers: req.headers, highWaterMark: 2 * 1024 * 1024});
        busboy.on('field', (fieldname, val) => {
            req.body[fieldname] = val;
        });
        busboy.on('file', (key, file, name, encoding, mimetype) => {
            const fileExt = path.extname(name);
            const filename = name.split('.')[0] + '-' + Date.now() + fileExt;
            if(fileExt == '.jpeg' || fileExt == '.jpg' ||  fileExt == '.png' || fileExt == '.gif'){
                image = filename;
            	file.pipe(fs.createWriteStream(`./public/uploads/temp/${filename}`));
            }
            else {
                return next(new errObj.BadRequestError("Invalid file type!!!"));
            }
        });
        busboy.on('finish', (err) => {
            if (err) res.status(400).json({error: err});
            req.image = image;
            next();
        });
        req.pipe(busboy);
	}
    catch(err) {
    	try {
			await fileDeleter.deleteFile(`./public/uploads/temp/${image}`);
		}
		catch(err){
			next(err);
		}
        next(err)
    }
}

const getOrganization = () => {
	console.log('Organization Loaded.');
}

const postOrganization = async (req, res, next) => {
	try {
		let organizationData = req.body;
		//const duration = JSON.parse(organizationData.duration);
		let org = await organizations.create({ 
			userID: req.userID,
			name: organizationData.name,
			category: organizationData.category,
			country: organizationData.country,
			state: organizationData.state,
			province: organizationData.province,
			district: organizationData.district,
			location: organizationData.location,
			email: organizationData.email,
			website: organizationData.website,
			details: organizationData.details,
			image: req.image
		});

		if(req.image){
		const rename = util.promisify(fs.rename);
		await rename(`./public/uploads/temp/${req.image}`, `./public/uploads/organization/${req.image}`);
		}
		await organizationProfile.create({
				organizationID: org.id,
				description: null,
				website: null,
				email: null,
				goals: {},
				programs: {},
				notices: {},
				polls: {},
				circulars: {}
			});
		//await rename(`./public/uploads/temp/${req.video}`, `./public/uploads/campaign/${req.video}`);
		next();
	}
    catch(err) {
    	try {
			await fileDeleter.deleteFile(`./public/uploads/temp/${req.image}`);
		}
		catch(err){
			next(err);
		}
		next(err);
    }
}

const getUserCampaigns = async (req, res, next) => {
	try {
		const userID = req.userID;
		const skips = parseInt(req.query.skips);
		const limit = parseInt(req.query.limit);
		const nextSkips = skips + limit;
		const result = await campaigns.aggregate([
			{ $match: {userID: mongoose.Types.ObjectId(userID)}},
			{ $sort: {_id: -1} },
			{ $skip: skips },
			{ $limit: limit },
			{ $project: {
				userID: 1, title: 1, video: 1, images: 1, duration: 1, campaignType: 1, message: 1,
				objectives: 1, details: 1, targetGroup: 1, ageGroup:1, platform: 1, category: 1,
				country: 1, state: 1, district:1, localUnit: 1, location: 1, totalRating: 1,
				takeTotal: 1, commentTotal: 1, thumbnail:1, isExpressed: 1,
				avgRating:
	               {
	                 $cond: { if: {$eq: ["$totalRating", 0]}, then: 0, else: {$divide: ["$ratingSum", "$totalRating"]} }
	               },
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
		])
		req.organizationData = result;
        const totalCampaign = await campaigns.countDocuments({userID: mongoose.Types.ObjectId(userID)});
        req.total = totalCampaign;
        if(nextSkips >= totalCampaign) req.nextSkips = null;
    	else{
    		req.nextSkips = nextSkips;
    	}
    	next();
	}
	catch(err){
		next(err);        
	}
}

const getOrganizations = async (req, res, next) => {
	try {
		//const userID = req.userID;
		const skips = parseInt(req.query.skips);
		const limit = parseInt(req.query.limit);
		const nextSkips = skips + limit;
		const result = await organizations.aggregate([
			//{ $match: {isExpressed: true}},
			{ $sort: {_id: 1} },
			{ $skip: skips },
			{ $limit: limit },
			{ $project: {
				userID: 1, name: 1, category: 1, country: 1, state: 1, province: 1, district:1, location: 1, email: 1,
				website: 1, details: 1, image: 1, memberTotal: 1
			}}
		]);
		req.organizationData = result;
        const totalOrganizations = await organizations.countDocuments();
        req.total = totalOrganizations;
        if(nextSkips >= totalOrganizations) req.nextSkips = null;
    	else{
    		req.nextSkips = nextSkips;
    	}
    	next();
	}
	catch(err){
		next(err);        
	}
}

const displaySingleOrganization = async (req, res, next) => {
	try {
		const userID = req.userID;
		const organizationID = req.params.organizationID;
		const organization = await organizations.aggregate([
			{ $match: {_id: mongoose.Types.ObjectId(organizationID)}},
			{ $project: {
				userID: 1, name: 1, category: 1, country: 1, state: 1, province: 1, district:1, location: 1, email: 1,
				website: 1, details: 1, image: 1, memberTotal: 1
			}},
			{ $lookup: 
				{ 
					from: 'organizationprofiles', 
					pipeline: [
						{ $match: {organizationID: mongoose.Types.ObjectId(organizationID)} },
						//{ $project: { organizationID: 1 }}
					],
					as: 'profileInfo'
				}
			},
			{$unwind: '$profileInfo'}
			//{$unwind: "$userRating"}
		])
		if(!organization) return next(new errObj.NotFoundError(`Organization not found`));
		const singleorganizationData = organization[0];
		/*if(singleorganizationData.rating && singleorganizationData.rating.length > 0) {
			for(rating of singleorganizationData.rating){
				if(rating.userID == userID) {singleorganizationData.userRating = rating.ratingVal}
				else singleorganizationData.userRating = null;
			}
			delete singleorganizationData.rating;
		}
		else {singleorganizationData.userRating = null}*/
		req.singleOrganizationData = singleorganizationData;
		//console.log(singleorganizationData);
		next();
	}
	catch(err) {
		next(err);
	}
}

const viewDashboard = async (req, res, next) => {
	try {
		const userID = req.userID;
		const organizationID = req.params.organizationID;
		const organization = await organizations.aggregate([
			{ $match: {_id: mongoose.Types.ObjectId(organizationID)}},
			{ $project: {
				userID: 1, name: 1, category: 1, country: 1, state: 1, province: 1, district:1, location: 1, email: 1,
				website: 1, details: 1, image: 1, memberTotal: 1
			}},
			{ $lookup: 
				{ 
					from: 'organizationprofiles', 
					pipeline: [
						{ $match: {organizationID: mongoose.Types.ObjectId(organizationID)} },
						//{ $project: { organizationID: 1 }}
					],
					as: 'profileInfo'
				}
			},
			{$unwind: '$profileInfo'}
			//{$unwind: "$userRating"}
		])
		if(!organization) return next(new errObj.NotFoundError(`Organization not found`));
		if(organization[0].userID != userID) return next(new errObj.NotFoundError(`Access Denied.`));
		const singleorganizationData = organization[0];
		/*if(singleorganizationData.rating && singleorganizationData.rating.length > 0) {
			for(rating of singleorganizationData.rating){
				if(rating.userID == userID) {singleorganizationData.userRating = rating.ratingVal}
				else singleorganizationData.userRating = null;
			}
			delete singleorganizationData.rating;
		}
		else {singleorganizationData.userRating = null}*/
		req.singleOrganizationData = singleorganizationData;
		//console.log(singleorganizationData);
		next();
	}
	catch(err) {
		next(err);
	}
}
 
const deleteCampaign = async (req, res, next) => {
	try {
		const userID = req.userID;
		const campaignID = req.params.campaignID
		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));

		const campaign = await campaigns.findOne({$and: [{_id: campaignID}, {userID: userID}]})
		if(!campaign) return next(new errObj.NotFoundError(`Campaign not found`));
		let filesToBeDeleted = [];
		if(campaign.images.length > 0){
			campaign.images.forEach(image => {
				filesToBeDeleted.push(`./public/uploads/campaign/${image}`)
			})
		}
		if(campaign.video){
			filesToBeDeleted.push(`./public/uploads/campaign/${campaign.video}`);
		}
		if(filesToBeDeleted.length > 0){
			await fileDeleter.deleteFiles(filesToBeDeleted);
		}
		await campaigns.deleteOne({ _id: campaignID });
		next();
	}
	catch(err) {
		next(err)
	}
}

const updateDescription = (req, res, next) => {
	if(!req.body.organizationID || !req.body.description) return next(new errObj.NotFoundError("Failed to Update."));
	const organizationID = req.body.organizationID;
	const description = req.body.description;
	organizationProfile.findOne({organizationID: organizationID})
	.then(organization => {
		if(!organization) return next(new errObj.NotFoundError("Organization not found"));
		organization.description = description;
		return organization.save();
	})
	.then(() => {
		next();
	})
	.catch(err => {
		next(err);
	})
}

const updateWebsite = (req, res, next) => {
	if(!req.body.organizationID || !req.body.website) return next(new errObj.NotFoundError("Failed to Update."));
	const organizationID = req.body.organizationID;
	const website = req.body.website;
	organizationProfile.findOne({organizationID: organizationID})
	.then(organization => {
		if(!organization) return next(new errObj.NotFoundError("Organization not found"));
		organization.website = website;
		return organization.save();
	})
	.then(() => {
		next();
	})
	.catch(err => {
		next(err);
	})
}

const updateEmail = (req, res, next) => {
	if(!req.body.organizationID || !req.body.email) return next(new errObj.NotFoundError("Failed to Update."));
	const organizationID = req.body.organizationID;
	const email = req.body.email;
	organizationProfile.findOne({organizationID: organizationID})
	.then(organization => {
		if(!organization) return next(new errObj.NotFoundError("Organization not found"));
		organization.email = email;
		return organization.save();
	})
	.then(() => {
		next();
	})
	.catch(err => {
		next(err);
	})
}

const addGoal = (req, res, next) => {
	if(!req.body.organizationID || !req.body.goal) return next(new errObj.NotFoundError("Failed to Update."));
	const organizationID = req.body.organizationID;
	const goal = {
		id: uuid(),
		payload: req.body.goal
	};
	// organizationProfile.findOne({organizationID: organizationID})
	// .then(organization => {
	// 	if(!organization) return next(new errObj.NotFoundError("Organization not found"));
	// 	organization.goals = goal;
	// 	return organization.save();
	// })
	organizationProfile.updateOne(
    { organizationID: organizationID }, 
    { $push: { goals: goal } }
).then(() => {
		next();
	})
	.catch(err => {
		next(err);
	})
}

const editGoal = async (req, res, next) => {
	try{
	if(!req.body.organizationID || !req.body.goalID ||!req.body.goal) return next(new errObj.NotFoundError("Failed to Update."));
	const organizationID = req.body.organizationID;
	// const goal = {
	// 	id: uuid(),
	// 	payload: req.body.goal
	// };
	const organization = await organizationProfile.findOne({organizationID: organizationID});
	
		if(!organization) return next(new errObj.NotFoundError("Organization not found"));
		let orgGoals = Array();
		organization.goals.forEach(key => {
			key.id == req.body.goalID ? key.payload = req.body.goal : key.payload = key.payload;
			orgGoals.push(key);
		});
		//organization.goals = orgGoals;
		console.log(organization.goals);
		await organization.updateOne({goals : orgGoals});
		next();
	} catch(err){
		console.log(err);
		next(err);
	}
}

const deleteGoal = async (req, res, next) => {
	try{
	if(!req.body.organizationID || !req.body.goalID) return next(new errObj.NotFoundError("Failed to Update."));
	const organizationID = req.body.organizationID;
	// const goal = {
	// 	id: uuid(),
	// 	payload: req.body.goal
	// };
	const organization = await organizationProfile.findOne({organizationID: organizationID});
	
		if(!organization) return next(new errObj.NotFoundError("Organization not found"));
		let orgGoals = Array();
		organization.goals.forEach(key => {
			key.id !== req.body.goalID ? orgGoals.push(key) : null;
		});
		//organization.goals = orgGoals;
		console.log(organization.goals);
		await organization.updateOne({goals : orgGoals});
		next();
	} catch(err){
		console.log(err);
		next(err);
	}
}

const addEvent = async (req, res, next) => {
	if(!req.body.organizationID) return next(new errObj.NotFoundError("Failed to Create."));
	const userID = req.userID;
	const organizationID = req.body.organizationID;
	let event = await events.create({
		userID: userID,
		organizationID: organizationID,
		title: req.body.title,
		location: req.body.location,
		details: req.body.details,
		image: req.image
	});
 
	if(req.image){
		const rename = util.promisify(fs.rename);
		await rename(`./public/uploads/temp/${req.image}`, `./public/uploads/organization/events/${req.image}`);
		}
	// organizationProfile.findOne({organizationID: organizationID})
	// .then(organization => {
	// 	if(!organization) return next(new errObj.NotFoundError("Organization not found"));
	// 	organization.goals = goal;
	// 	return organization.save();
	// })
	await organizationProfile.updateOne(
    { organizationID: organizationID }, 
    { $push: { progarms: event.id } }
).then(() => {
		next();
	})
	.catch(err => {
		next(err);
	})
}

const updateOrganizationFields = async (req, res, next) => {
	const campaignFields = ['title', 'objectives','details','targetGroup','ageGroup','campaignType',
			'location','country','state','district','localUnit','category','message','platform']
	try {
		const userID = req.userID;
		const campaignID = req.params.campaignID;
		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));

		const campaign = await campaigns.findOne({$and: [{_id: campaignID}, {userID: userID}]});
		if(!campaign) return next(new errObj.NotFoundError("Campaign Not Found!!!"));

		const organizationData = req.body;
		if(organizationData.startDate) {
			if(validationController.dateValidation(startDate) == false){
				return next(new errObj.BadRequestError("Invalid Start date format"));
			}
			else campaign.duration.startDate = organizationData.startDate;
		}
		if(organizationData.endDate) {
			if(validationController.dateValidation(endDate) == false){
				return next(new errObj.BadRequestError("Invalid Start date format"));
			}
			else campaign.duration.endDate = organizationData.endDate;
		}
		Object.keys(organizationData).forEach(key => {
			if(campaignFields.includes(key)){
				if(validationController.notEmptyValidation(organizationData[key]) == false){
					return next(new errObj.BadRequestError(`${key} field cannot be empty`));
				}
				campaign[key] = organizationData[key];
			}
		})
		await campaign.save();
		next();
	}
	catch(err) {
		next(err);
	}
}

const updateCampaignFiles = async (req, res, next) => {
	try{
		const userID = req.userID;
		const campaignID = req.params.campaignID;
		if(campaignID.split('').length != 24){
			await fileDeleter.deleteFiles(req.filesUploaded);
			return next(new errObj.BadRequestError("Invalid campaignID"));
		} 

		const campaign = await campaigns.findOne({$and: [{_id: campaignID}, {userID: userID}]});
		if(!campaign){
			await fileDeleter.deleteFiles(req.filesUploaded);
			return next(new errObj.NotFoundError(`Campaign not found`));	
		} 

		let noOfImagesToBeDeleted = 0;
		let filesToBeDeleted = [];

		if(req.body.imagesToBeDeleted){
			let imagesToBeDeleted = JSON.parse(req.body.imagesToBeDeleted);
			if(Array.isArray(imagesToBeDeleted) == false){
				await fileDeleter.deleteFiles(req.filesUploaded);
				return next(new errObj.BadRequestError("imagesToBeDeleted variable should be array."));
			}
			imagesToBeDeleted.forEach(image => {
				if(campaign.images.includes(image)){
					noOfImagesToBeDeleted++;
					filesToBeDeleted.push(`./public/uploads/campaign/${image}`);
					campaign.images.pull(image);
				} 
			})
		}
		if(req.body.videoToBeDeleted && req.body.videoToBeDeleted == campaign.video){
			filesToBeDeleted.push(`./public/uploads/campaign/${req.body.videoToBeDeleted}`);
			campaign.video = null;
		}

		if(campaign.video && (req.body.videoToBeDeleted != campaign.video) && req.video){
			await fileDeleter.deleteFiles(req.filesUploaded);
			return next(new errObj.BadRequestError("Only one video is allowed for each campaign"));
		}
		if((campaign.images.length - noOfImagesToBeDeleted + req.images.length) > 4){
			await fileDeleter.deleteFiles(req.filesUploaded);
			return next(new errObj.BadRequestError("Only four images are allowed for each campaign"))
		}

		if(req.video){
			campaign.video = req.video;
		}
		if(req.images.length > 0){
			req.images.forEach(image => {
				campaign.images.push(image);
			})
		}
		await fileDeleter.deleteFiles(filesToBeDeleted);
		const rename = util.promisify(fs.rename);
		if(req.images.length > 0) {
			for(file of req.images){
				await rename(`./public/uploads/temp/${file}`, `./public/uploads/campaign/${file}`);
			}
		}
		if(req.video) {
			await rename(`./public/uploads/temp/${req.video}`, `./public/uploads/campaign/${req.video}`);
		}
        await campaign.save();
        next();
	}
	catch(err){
		try {
			await fileDeleter.deleteFiles(req.filesUploaded);
		}
		catch(err){
			next(err);
		}
		next(err)
	}
}

const rateCampaign = async (req, res, next) => {
	try {
		const userID = req.userID;
		const campaignID = req.params.campaignID;
		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));
		if(validationController.notEmptyValidation(req.body.ratingVal) == false){
			return next(new errObj.BadRequestError("ratingVal field is required"));
		}
		const inputRatingVal = parseInt(req.body.ratingVal);
		if(inputRatingVal < 0 || inputRatingVal > 5) return next(new errObj.BadRequestError("Rating value should be in range of [0, 5]"));
		const campaign = await campaigns.findOne({_id: campaignID});
		if(!campaign) return next(new errObj.NotFoundError("Campaign Not Found!!!"));

		let hasUserRatedCampaign = false;
		for(eachRating of campaign.rating){
			if(eachRating.userID == userID){
				if(inputRatingVal == 0) {
					let ratingID = eachRating._id;
					campaign.ratingSum -= eachRating.ratingVal;
					campaign.rating.pull(ratingID);
					campaign.totalRating--;
					hasUserRatedCampaign = true;
					break;
				}
				campaign.ratingSum = campaign.ratingSum - eachRating.ratingVal + inputRatingVal;
				eachRating.ratingVal = inputRatingVal;
				hasUserRatedCampaign = true;
				break;
			}
		}

		if(!hasUserRatedCampaign){
			campaign.rating.push({userID: userID, ratingVal: inputRatingVal});
			campaign.ratingSum += inputRatingVal;
			campaign.totalRating++;
		}
		await campaign.save();
		req.avgRating = campaign.ratingSum / campaign.totalRating;
		next();
	}
	catch(err) {
		next(err);
	}
}

const expressCampaign = async (req, res, next) => {
	try {
		const userID = req.userID;
		const campaignID = req.params.campaignID;

		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));

		let campaign = await campaigns.findOne({
			$and: [
				{_id: campaignID},
				{isExpressed: true},
			]
		})
		if(campaign) return next(new errObj.BadRequestError("campaign already expressed"));
		campaign = await campaigns.findOne({$and: [
				{_id: campaignID},
				{userID: mongoose.Types.ObjectId(userID)},
			]});
		if(!campaign) return next(new errObj.NotFoundError("campaign not found"));
		campaign.isExpressed = true;
		await campaign.save();
		next();
	}
	catch(err) {
		next(err);
	}
}

const takeCampaign = async (req, res, next) => {
	try {
		const userID = req.userID;
		const campaignID = req.params.campaignID;

		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));

		let campaign = await campaigns.findOne({
			$and: [
				{_id: campaignID},
				{takenUsers: {$in: userID}},
			]
		})
		if(campaign) return next(new errObj.BadRequestError("user cannot take a single campaign for multiple times"));
		campaign = await campaigns.findOne({_id: campaignID});
		if(!campaign) return next(new errObj.NotFoundError("campaign not found"));
		campaign.takeTotal++;
		await campaign.takenUsers.push(userID);
		await campaign.save();
		req.takeTotal = campaign.takeTotal;
		next();
	}
	catch(err) {
		next(err);
	}
}

const untakeCampaign = async (req, res, next) => {
	try {
		const userID = req.userID;
		const campaignID = req.params.campaignID;

		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));

		const campaign = await campaigns.findOne({
			$and: [
				{_id: campaignID},
				{takenUsers: {$in: userID}},
			]
		})
		if(!campaign) return next(new errObj.NotFoundError("campaign not found"));
		campaign.takeTotal--;
		await campaign.takenUsers.pull(userID);
		await campaign.save();
		req.takeTotal = campaign.takeTotal;
		next();
	}
	catch(err) {
		next(err);
	}
}

const postComment = async (req, res, next) => {
	try {
		const userID = req.userID;
		const campaignID = req.params.campaignID;

		let text, image;
		if(req.body.text) {text = req.body.text};
		if(req.images.length > 0) {image = req.images[0]};

		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));

		if(!text && !image) return next(new errObj.BadRequestError("Empty comment cannot be posted"));

		const campaign = await campaigns.findOne({_id: campaignID});
		if(!campaign) return next(new errObj.NotFoundError("campaign not found"));

		const newComment = await comments.create({
			campaignID: campaignID,
			userID: userID, 
			text: text || null,
			image: image || null,
			lastUpdated: Date()
		});

		const comment = await comments.aggregate([
			{ $match: { $and: [{_id: newComment._id}, {campaignID: newComment.campaignID}]}},
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
			const filePath = `./public/uploads/campaign/comments/${image}`;
			await fileUploader.uploadSingleFile(file, filePath);
		}

		campaign.commentTotal++;
		await campaign.save();
		req.commentTotal = campaign.commentTotal;
		req.comment = comment[0];
		next();
	}
	catch (err) {
		next(err);
	}
}

const editComment = async (req, res, next) => {
	try {
		const userID = req.userID;
		const campaignID = req.params.campaignID;
		const commentID = req.params.commentID;

		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));
		if(commentID.split('').length != 24) return next(new errObj.BadRequestError("Invalid commentID"));

		const campaign = await campaigns.findOne({_id: campaignID});
		if(!campaign) return next(new errObj.NotFoundError("campaign not found"));

		const comment = await comments.findOne({
			$and: [
				{campaignID: campaignID},
				{_id: commentID},
			]
		})
		if(!comment) return next(new errObj.NotFoundError("Comment not found"));

		if(userID != campaign.userID && userID != comment.userID){
			return next(new errObj.NotAuthorizedError("User not authorised to edit comment"));
		}
		if(req.body.text){
			comment.text = req.body.text;
		}
		if(req.body.image && comment.image){
			if(req.body.image == comment.image){
				await fileDeleter.deleteSingleFile(`./public/uploads/campaign/comments/${comment.image}`);
				comment.image = null;
				if(validationController.notEmptyValidation(comment.text) == false) {
					await comments.deleteOne({_id: commentID});
					campaign.commentTotal--;
				}
			}
		}
		await campaign.save();
		await comment.save();
		req.commentTotal = campaign.commentTotal;
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
		const campaignID = req.params.campaignID;
		const commentID = req.params.commentID;

		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));
		if(commentID.split('').length != 24) return next(new errObj.BadRequestError("Invalid commentID"));

		const campaign = await campaigns.findOne({_id: campaignID});
		if(!campaign) return next(new errObj.NotFoundError("campaign not found"));

		const comment = await comments.findOne({
			$and: [
				{campaignID: campaignID},
				{_id: commentID},
			]
		})
		if(!comment) return next(new errObj.NotFoundError("Comment not found"));

		if(userID != campaign.userID && userID != comment.userID){
			return next(new errObj.NotAuthorizedError("User not authorised to delete comment"));
		}

		let commentImages = [];
		if(comment.image){
				commentImages.push(`./public/uploads/campaign/comments/${comment.image}`);
		}

		const campaignReplies = await replies.find({
			$and: [
				{campaignID: campaignID},
				{commentID: commentID},
			]
		})
		campaignReplies.forEach(reply => {
			if(reply.image) {
				commentImages.push(`./public/uploads/campaign/comments/${reply.image}`);
			}
		})
		await fileDeleter.deleteMultipleFiles(commentImages);
		await comments.deleteOne({_id: commentID});
		const noOfReplyToDelete = await replies.countDocuments({
			$and: [
				{campaignID: campaignID},
				{commentID: commentID},
			]
		})
		await replies.deleteMany({
			$and: [
				{campaignID: campaignID},
				{commentID: commentID},
			]
		});
		campaign.commentTotal = campaign.commentTotal - noOfReplyToDelete - 1;
		await campaign.save();
		req.commentTotal = campaign.commentTotal;
		next();
	}
	catch(err) {
		next(err);
	}
}

const postReply = async (req, res, next) => {
	try {
		const userID = req.userID;
		const campaignID = req.params.campaignID;
		const commentID = req.params.commentID;

		let text, image;
		if(req.body.text) {text = req.body.text};
		if(req.images.length > 0) {image = req.images[0]};

		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));
		if(commentID.split('').length != 24) return next(new errObj.BadRequestError("Invalid commentID"));

		if(!text && !image) return next(new errObj.BadRequestError("Empty reply cannot be posted"));

		const campaign = await campaigns.findOne({_id: campaignID});
		if(!campaign) return next(new errObj.NotFoundError("campaign not found"));

		const comment = await comments.findOne({_id: commentID});
		if(!comment) return next(new errObj.NotFoundError("Comment not found"));

		const newReply = await replies.create({
			campaignID: campaignID,
			userID: userID, 
			commentID: commentID, 
			text: text || null,
			image: image || null,
			lastUpdated: Date()
		});

		const reply = await replies.aggregate([
			{ $match: { $and: [{_id: newReply._id}, {commentID: newReply.commentID}, {campaignID: newReply.campaignID}]}},
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
			const folderPath = './public/uploads/campaign/comments';
			fs.open(`${folderPath}/${req.images[0]}`, 'a', (err, fd) => { 
			    if(!err) {
			        fs.write(fd, file.data, (err) => {
			            if (err) next(err)
			        })
			    }
			})
		}
		campaign.commentTotal++;
		await campaign.save();
		req.commentTotal = campaign.commentTotal;
		req.reply = reply[0];
		next();
	}
	catch (err) {
		next(err);
	}
}

const editReply = async (req, res, next) => {
	try {
		const userID = req.userID;
		const campaignID = req.params.campaignID;
		const commentID = req.params.commentID;
		const replyID = req.params.replyID;

		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));
		if(commentID.split('').length != 24) return next(new errObj.BadRequestError("Invalid commentID"));
		if(replyID.split('').length != 24) return next(new errObj.BadRequestError("Invalid replyID"));

		const campaign = await campaigns.findOne({_id: campaignID});
		if(!campaign) return next(new errObj.NotFoundError("campaign not found"));

		const comment = await comments.findOne({
			$and: [
				{campaignID: campaignID},
				{_id: commentID},
			]
		})
		if(!comment) return next(new errObj.NotFoundError("Comment not found"));

		const reply = await replies.findOne({
			$and: [
				{campaignID: campaignID},
				{_id: replyID},
				{commentID: commentID},
			]
		})
		if(!reply) return next(new errObj.NotFoundError("Reply not found"));

		if(userID != campaign.userID && userID != reply.userID){
			return next(new errObj.NotAuthorizedError("User not authorised to edit reply"));
		}
		if(req.body.text){
			reply.text = req.body.text;
		}
		if(req.body.image && reply.image){
			if(req.body.image == reply.image){
				await fileDeleter.deleteSingleFile(`./public/uploads/campaign/comments/${reply.image}`);
				reply.image = null;
				if(validationRule.notEmptyValidation(reply.text) == false) {
					await replies.deleteOne({_id: replyID});
					campaign.commentTotal--;
				}
			}
		}
		await campaign.save();
		await reply.save();
		req.commentTotal = campaign.commentTotal;
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
		const campaignID = req.params.campaignID;
		const commentID = req.params.commentID;
		const replyID = req.params.replyID;

		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));
		if(commentID.split('').length != 24) return next(new errObj.BadRequestError("Invalid commentID"));
		if(replyID.split('').length != 24) return next(new errObj.BadRequestError("Invalid replyID"));

		const campaign = await campaigns.findOne({_id: campaignID});
		if(!campaign) return next(new errObj.NotFoundError("campaign not found"));

		const comment = await comments.findOne({
			$and: [
				{campaignID: campaignID},
				{_id: commentID},
			]
		})
		if(!comment) return next(new errObj.NotFoundError("Comment not found"));

		const reply = await replies.findOne({
			$and: [
				{campaignID: campaignID},
				{_id: replyID},
				{commentID: commentID},
			]
		})
		if(!reply) return next(new errObj.NotFoundError("Reply not found"));

		if(userID != campaign.userID && userID != reply.userID){
			return next(new errObj.NotAuthorizedError("User not authorised to delete reply"));
		}

		if(reply.image){
			await fileDeleter.deleteSingleFile(`./public/uploads/campaign/comments/${reply.image}`);
		}
		await replies.deleteOne({_id: replyID});
		campaign.commentTotal--;
		await campaign.save();
		req.commentTotal = campaign.commentTotal;
		next();
	}
	catch(err) {
		next(err);
	}
}

const loadComments = async (req, res, next) => {
	try {
		const skips = parseInt(req.query.skips);
		const limit = parseInt(req.query.limit);
		const nextSkips = skips + limit;
		const userID = req.userID;
		const campaignID = req.params.campaignID;

		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));

		const campaign = await campaigns.findOne({_id: campaignID});
		if(!campaign) return next(new errObj.NotFoundError("campaign not found"));

		const campaignComments = await comments.aggregate([
			{ $match: {campaignID: mongoose.Types.ObjectId(campaignID)}},
			{ $skip: skips},
			{ $limit: limit},
			{ $lookup: 
				{ 
					from: 'campaign_replies', 
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
		req.comments = campaignComments;
		const totalComment = await comments.countDocuments({campaignID: campaignID});
		const totalReplies = await replies.countDocuments({campaignID: campaignID});
		campaign.commentTotal = totalComment + totalReplies;
		await campaign.save();
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
		const skips = parseInt(req.query.skips);
		const limit = parseInt(req.query.limit);
		const nextSkips = skips + limit;
		const userID = req.userID;
		const campaignID = req.params.campaignID;
		const commentID = req.params.commentID;

		if(campaignID.split('').length != 24) return next(new errObj.BadRequestError("Invalid campaignID"));
		if(commentID.split('').length != 24) return next(new errObj.BadRequestError("Invalid commentID"));

		const campaign = await campaigns.findOne({_id: campaignID});
		if(!campaign) return next(new errObj.NotFoundError("campaign not found"));

		const comment = await comments.findOne({_id: commentID});
		if(!comment) return next(new errObj.NotFoundError("comment not found"));

		const campaignReplies = await replies.aggregate([
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
		req.replies = campaignReplies;
		const totalReply = await replies.countDocuments({$and: [
			{campaignID: campaignID}, {commentID: commentID}
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

module.exports = {
	setCampaignThumbnail,

	organizationValidation,
	
	uploadOrganizationFiles,

	postOrganization,

	displaySingleOrganization,

	viewDashboard,

	getOrganizations,

	updateDescription,

	updateWebsite,

	updateEmail,

	addGoal, 

	editGoal,

	deleteGoal,

	addEvent
}