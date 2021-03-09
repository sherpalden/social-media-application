const path = require('path');
const mongoose = require('mongoose');
const sharp = require('sharp');
const fs = require('fs');

const fileDeleter = require('../../helpers/http/deleteFiles');
const validationRule = require('../validationController');

//database models
const userProfile = require('../../models/users/userProfile');
const users = require('../../models/users/users');

//error handler
const errObj = require('../../error/errorHandler');


const updateName = async (req, res, next) => {
	try {
		const name = req.body;
        Object.keys(name).forEach(key => {
            if(validationRule.notEmptyValidation(name[key]) === false){
                return next(new errObj.BadRequestError(`${key} field cannot be empty.`));
            }
            if(validationRule.noSpaceValidation(name[key]) === false){
                return next(new errObj.BadRequestError(`White spaces are not allowed for ${key} field.`));
            }
        })
		const userID = req.userID;
		const user = await users.findOne({_id: userID});
		if(!user) return next(new errObj.NotFoundError("User not found"));
		user.firstName = name.firstName;
		user.lastName = name.lastName;
		user.fullName = `${name.firstName} ${name.lastName}`;
		await user.save();
		req.firstName = user.firstName;
		req.lastName = user.lastName;
		next();
	}
	catch(err){
		next(err)
	}
}

const getProfile = async (req, res, next) => {
	const userID = req.userID;
	try {
		let profile = await userProfile.findOne({userID: userID});
		if(!profile) {
			let myProfile = await userProfile.create({
				userID: userID,
				bio: null,
				address: [],
				education: [],
				work: [],
				skills: [],
				hobbies: [],
				relationship: null,
			})
			myProfile = await userProfile.aggregate([
				{ $match: {userID: mongoose.Types.ObjectId(userID)} },
				{ $lookup: 
					{ 
						from: 'users', 
						pipeline: [
							{ $match: {_id: mongoose.Types.ObjectId(userID)} },
							{ $project: {
								firstName: 1, lastName: 1, category: 1, 
								country: 1, gender: 1, birthDate: 1, mobileNumber: 1,
								email: 1
							}}
						],
						as: 'userInfo'
					}
				},
				{$unwind: '$userInfo'},
			])
			req.profile = myProfile[0];
			next();
		}
		profile = await userProfile.aggregate([
			{ $match: {userID: mongoose.Types.ObjectId(userID)} },
			{ $lookup: 
				{ 
					from: 'users', 
					pipeline: [
						{ $match: {_id: mongoose.Types.ObjectId(userID)} },
						{$project: {
							firstName: 1, lastName: 1, category: 1, 
							country: 1, gender: 1, birthDate: 1, mobileNumber: 1,
							email: 1
						}}
					],
					as: 'userInfo',
				}
			},
	 		{$unwind: '$userInfo'},//convert lookup array to object
		])
		req.profile = profile[0];
		next();
	}
	catch(err) {
		next(err);
	}
}

const getUserProfile = async (req, res, next) => {
	const userID = req.userID;
	const user_id = req.params.user_id;

	if(user_id.split('').length != 24) return next(new errObj.BadRequestError("Invalid userID"));

	try {
		let profile = await userProfile.findOne({userID: mongoose.Types.ObjectId(user_id)});
		if(!profile) next(new errObj.NotFoundError("Profile Not Found!!!"))
		profile = await userProfile.aggregate([
			{ $match: {userID: mongoose.Types.ObjectId(user_id)} },
			{ $lookup: 
				{ 
					from: 'users', 
					pipeline: [
						{ $match: {_id: mongoose.Types.ObjectId(user_id)} },
						{$project: {
							firstName: 1, lastName: 1, category: 1, 
							country: 1, gender: 1, birthDate: 1, mobileNumber: 1,
							email: 1
						}}
					],
					as: 'userInfo',
				}
			},
	 		{$unwind: '$userInfo'},//convert lookup array to object
		])
		const loggedUser = await users.findOne(
            {_id: mongoose.Types.ObjectId(userID)}, 
            {links: 1, outLinkRequests: 1,inLinkRequests: 1}
        )
        profile[0].isLinked = false;
        profile[0].isLinkSent = false;
        profile[0].isLinkReceived = false;
        loggedUser.links.forEach(link => {
            if(profile[0].userID.equals(link.userID)){
                profile[0].isLinked = true;
                return;
            }
        })
        loggedUser.outLinkRequests.forEach(outLink => {
            if(profile[0].userID.equals(outLink.userID)){
                profile[0].isLinkSent = true;
                return;
            }
        })
        loggedUser.inLinkRequests.forEach(inLink => {
            if(profile[0].userID.equals(inLink.userID)){
                profile[0].isLinkReceived = true;
                return;
            }
        })
		req.profile = profile[0];
		next();
	}
	catch(err) {
		next(err);
	}
}

const getProfilePic = async (req, res, next) => {
	try {
		const originalImg = req.params.imgName;
		if(!originalImg) return next(new errObj.BadRequestError("Image name required!"));
		const imgPath = `./public/uploads/userProfile/${originalImg}`;
		if (!fs.existsSync(imgPath)) return next(new errObj.BadRequestError("Image not found"));
		const readStream = fs.createReadStream(`./public/uploads/userProfile/${originalImg}`);
		const format = req.query.format;
		if(format){
			if(!(format == 'png' || format == 'jpeg' || format == 'gif')){
				return next(new errObj.BadRequestError("Invalid image format"));
			}
		}
		const width = parseInt(req.query.width);
		const height = parseInt(req.query.height);
		const transformer = sharp()
		.toFormat(`${format || 'jpeg'}`)
		.resize({
			width: width || null,
			height: height || null,
			fit: sharp.fit.fill,
			position: sharp.strategy.entropy
		});
		if(format){
  			res.type(`image/${format}`)
		}
		else {
			res.type(`image/jpeg`);
		}
  		readStream.pipe(transformer).pipe(res);
	}
	catch(err) {
		next(err)
	}
}

const updateFrameType = async (req, res, next) => {
	try {
		const userID = req.userID;
		const frameType = req.body.frameType;
		if(validationRule.notEmptyValidation(frameType) == false){
			return next(new errObj.BadRequestError("frameType cannot be empty"));
		}
		// if(frameType != "c0" && frameType != "r0" && frameType != "h0"){
		// 	return next(new errObj.BadRequestError(`${frameType} is not a valid frame type!!!`));
		// }
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return next(new errObj.NotFoundError("Profile not found!!!"));
		profile.frameType = frameType;
		await profile.save();
		req.frameType = profile.frameType;
		next();
	}
	catch(err) {
		next(err);
	}
}

const updateProfilePic = async (req, res, next) => {
	try{
		const userID = req.userID;
		const picName = req.files['files'][0].filename;
		const extName = path.extname(picName);
		if(extName != '.jpeg' && extName != '.jpg' &&  extName != '.png'){
			return next(new errObj.BadRequestError("Image file required of format .jpeg/.jpg/.png"));
		}
		const user = await userProfile.findOne({userID: userID});
		if(!user) return next(new errObj.NotFoundError("User not found"));
		if(!user.profilePic){
			user.profilePic = picName;
			await user.save();
			next();
		}
		else {
			oldPic = user.profilePic;
			await fileDeleter.deleteSingleFile(`./public/uploads/userProfile/${oldPic}`);
			user.profilePic = picName;
			await user.save();
			req.profilePic = picName;
			next();
		}
	}
	catch(err) {
		next(err);
	}
}

const deleteProfilePic = async (req, res, next) => {
	const userID = req.userID;
	try {
		const user = await userProfile.findOne({userID: userID});
		if(!user) return next(new errObj.NotFoundError("User not found"));
		const picName = user.profilePic;
		if(!picName) return next(new errObj.NotFoundError("No picture"));
		user.profilePic = null;
		await fileDeleter.deleteSingleFile(`./public/uploads/userProfile/${picName}`);
		await user.save();
		next();
	}
	catch(err){
		next(err);
	}
}

const updateCoverPic = async (req, res, next) => {
	try{
		const userID = req.userID;
		const picName = req.files['files'][0].filename;
		const extName = path.extname(picName);
		if(extName != '.jpeg' && extName != '.jpg' &&  extName != '.png'){
			return next(new errObj.BadRequestError("Image file required of format .jpeg/.jpg/.png"));
		}
		const user = await userProfile.findOne({userID: userID});
		if(!user) return next(new errObj.NotFoundError("User not found"));
		if(!user.coverPic){
			user.coverPic = picName;
			await user.save();
			next();
		}
		else {
			oldPic = user.coverPic;
			await fileDeleter.deleteSingleFile(`./public/uploads/userProfile/${oldPic}`);
			user.coverPic = picName;
			await user.save();
			req.coverPic = picName;
			next();
		}
	}
	catch(err) {
		next(err)
	}
}

const deleteCoverPic = async (req, res, next) => {
	const userID = req.userID;
	try {
		const user = await userProfile.findOne({userID: userID});
		if(!user) return next(new errObj.NotFoundError("User not found"));
		const picName = user.coverPic;
		if(!picName) return res.status(400).json({error: "No picture"});
		user.coverPic = null;
		await fileDeleter.deleteSingleFile(`./public/uploads/userProfile/${picName}`);
		await user.save();
		next();
	}
	catch(err){
		next(err);
	}
}

const updateCategory = async (req, res, next) => {
	try {
		const userID = req.userID;
		const category = req.body.category;
		const user = await users.findOne({_id: userID})
		if(!user) return next(new errObj.NotFoundError("User not found"));
		user.category = category;
		await user.save();
		next();
	}
	catch(err) {
		next(err)
	}
}

const updateBio = (req, res, next) => {
	const userID = req.userID;
	const bio = req.body.bio;
	userProfile.findOne({userID: userID})
	.then(user => {
		if(!user) return next(new errObj.NotFoundError("User not found"));
		user.bio = bio;
		return user.save();
	})
	.then(() => {
		next();
	})
	.catch(err => {
		next(err);
	})
}

const updatePersonalDetails = async (req, res, next) => {
	try {
		if(validationRule.numberValidation(req.body.mobileNumber) === false){
        	return next(new errObj.ForbiddenError("Mobile number should be a number!!!"));
	    }
	    else if(validationRule.notEmptyValidation(req.body.gender) === false){
	        return next(new errObj.ForbiddenError("Gender field cannot be empty!"));
	    }
	    else if(validationRule.notEmptyValidation(req.body.country) === false){
	        return next(new errObj.ForbiddenError("Country field cannot be empty!"));
	    }
	    else if(validationRule.notEmptyValidation(req.body.category) === false){
	        return next(new errObj.ForbiddenError("Category field cannot be empty"));
	    }
		const userID = req.userID;
		const user = await users.findOne({_id: userID});
		if(!user) return next(new errObj.NotFoundError("User not found"));
		user.birthDate = req.body.birthDate;
		user.gender = req.body.gender;
		user.country = req.body.country;
		user.mobileNumber = req.body.mobileNumber;
		user.category = req.body.category;
		await user.save();
		req.personalDetails = {
			birthDate: user.birthDate,
			gender: user.gender,
			country: user.country,
			mobileNumber: user.mobileNumber,
			category: user.category,
		}
		next();
	}
	catch(err) {
		next(err);
	}
}

const addAddress = async (req, res, next) => {
	try {
		const userID = req.userID;
		const address = req.body;
		Object.keys(address).forEach(key => {
			if(validationRule.notEmptyValidation(address[key]) === false){
				return next(new errObj.BadRequestError(`${key} field is required!`));
			}
		})
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return next(new errObj.NotFoundError("Profile not found"));
		profile.address.push({
			type: address.type,
			state: address.state,
			city: address.city,
			localUnit: address.localUnit
		});
		await profile.save();
		req.addressArray = profile.address;
		next();
	}
	catch(err) {
		next(err);
	}
}

const updateAddress = async (req, res, next) => {
	try {
		const userID = req.userID;
		const addressID = req.params.addressID;
		const address = req.body;
		if(validationRule.notEmptyValidation(addressID) === false){
			return next(new errObj.BadRequestError("Invalid addressID!"));
		}
		Object.keys(address).forEach(key => {
			if(validationRule.notEmptyValidation(address[key]) === false){
				return next(new errObj.BadRequestError(`${key} field is required!`));
			}
		})
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return next(new errObj.NotFoundError("Profile not found"));
		const addressToUpdate = await profile.address.id(addressID);
		if(!addressToUpdate) return next(new errObj.NotFoundError("Address not found"));
		addressToUpdate.type = address.type;
		addressToUpdate.city = address.city;
		addressToUpdate.state = address.state;
		addressToUpdate.localUnit = address.localUnit;
		await profile.save();
		req.updatedAddress = addressToUpdate;
		next();
 	}
	catch(err){
		next(err);
	}
}

const deleteAddress = async (req, res, next) => {
	try {
		const userID = req.userID;
		const addressID = req.params.addressID;
		if(validationRule.notEmptyValidation(addressID) === false){
			return next(new errObj.BadRequestError("Invalid addressID!"));
		}
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return next(new errObj.NotFoundError("Profile not found"));
		const addressToDelete = await profile.address.id(addressID);
		if(!addressToDelete) return next(new errObj.NotFoundError("Address not found"));
		await addressToDelete.remove();
		await profile.save();
		next();
 	}
	catch(err){
		next(err);
	}
}

const addWork = async (req, res, next) => {
	try {
		const userID = req.userID;
		const work = req.body;
		Object.keys(work).forEach(key => {
			if(key !== "to"){
				if(validationRule.notEmptyValidation(work[key]) === false ){
					return next(new errObj.BadRequestError(`${key} field is required!`));
				}
			}
		})
		if(validationRule.dateValidation(work.from) === false){
			return next(new errObj.BadRequestError("Invalid Date!"));
		}
		if(work.currentState == false){
			if(validationRule.dateValidation(work.to) === false){
				return next(new errObj.BadRequestError("Invalid Date!"));
			}
		}
		else if(work.currentState == true){
			work.to = null;
		}
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return res.status(400).json({error: "Profile not found"})
		profile.work.push({
			company: work.company,
			department: work.department,
			position: work.position,
			currentState: work.currentState,
			from: work.from,
			to: work.to,
		});
		await profile.save();
		req.workArray = profile.work;
		next();
	}
	catch(err) {
		next(err);
	}
}

const updateWork = async (req, res, next) => {
	try {
		const userID = req.userID;
		const workID = req.params.workID;
		const work = req.body;
		if(validationRule.notEmptyValidation(workID) === false){
			return next(new errObj.BadRequestError("Invalid workID!"));
		}
		Object.keys(work).forEach(key => {
			if(key !== "to"){
				if(validationRule.notEmptyValidation(work[key]) === false ){
					return next(new errObj.BadRequestError(`${key} field is required!`));
				}
			}
		})
		if(validationRule.dateValidation(work.from) === false){
			return next(new errObj.BadRequestError("Invalid Date!"));
		}
		if(work.currentState == false){
			if(validationRule.dateValidation(work.to) === false){
				return next(new errObj.BadRequestError("Invalid Date!"));
			}
		}
		else if(work.currentState == true){
			work.to = null;
		}
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return next(new errObj.NotFoundError("Profile not found"));
		const workToUpdate = await profile.work.id(workID);
		if(!workToUpdate) return next(new errObj.NotFoundError("work not found"));
		workToUpdate.company = work.company;
		workToUpdate.department = work.department;
		workToUpdate.position = work.position;
		workToUpdate.currentState = work.currentState;
		workToUpdate.from = work.from;
		workToUpdate.to = work.to;
		await profile.save();
		req.updatedWork = workToUpdate;
		next();
 	}
	catch(err){
		next(err);
	}
}

const deleteWork = async (req, res, next) => {
	try {
		const userID = req.userID;
		const workID = req.params.workID;
		if(validationRule.notEmptyValidation(workID) == false){
			return res.status(400).json({error: "Invalid workID!"})
		}
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return next(new errObj.NotFoundError("Profile not found"));
		const workToDelete = await profile.work.id(workID);
		if(!workToDelete) return next(new errObj.NotFoundError("Work not found"));
		await workToDelete.remove();
		await profile.save();
		next();
 	}
	catch(err){
		next(err);
	}
}

const addEducation = async (req, res, next) => {
	try {
		const userID = req.userID;
		const education = req.body;
		Object.keys(education).forEach(key => {
			if(key !== "to"){
				if(validationRule.notEmptyValidation(education[key]) == false ){
					return next(new errObj.BadRequestError(`${key} field is required!`));
				}
			}
		})
		if(validationRule.dateValidation(education.from) == false){
			return next(new errObj.BadRequestError("Invalid Date!"));
		}
		if(education.currentState == false){
			if(validationRule.dateValidation(education.to) == false){
				return next(new errObj.BadRequestError("Invalid Date!"));
			}
		}
		else if(education.currentState == true){
			education.to = null;
		}
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return next(new errObj.NotFoundError("Profile not found"));
		profile.education.push({
			level: education.level,
			institute: education.institute,
			faculty: education.faculty,
			currentState: education.currentState,
			from: education.from,
			to: education.to,
		});
		await profile.save();
		req.educationArray = profile.education;
		next();
	}
	catch(err) {
		next(err);
	}
}

const updateEducation = async (req, res, next) => {
	try {
		const userID = req.userID;
		const educationID = req.params.educationID;
		const education = req.body;
		if(validationRule.notEmptyValidation(educationID) == false){
			return next(new errObj.BadRequestError("Invalid educationID!"));
		}
		Object.keys(education).forEach(key => {
			if(key !== "to"){
				if(validationRule.notEmptyValidation(education[key]) == false ){
					return next(new errObj.BadRequestError(`${key} field is required!`));
				}
			}
		})
		if(validationRule.dateValidation(education.from) == false){
			return next(new errObj.BadRequestError("Invalid Date!"));
		}
		if(education.currentState == false){
			if(validationRule.dateValidation(education.to) == false){
				return next(new errObj.BadRequestError("Invalid Date!"));
			}
		}
		else if(education.currentState == true){
			education.to = null;
		}
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return next(new errObj.NotFoundError("Profile not found"));
		const educationToUpdate = await profile.education.id(educationID);
		if(!educationToUpdate) return next(new errObj.NotFoundError("Education not found"));
		educationToUpdate.level = education.level;
		educationToUpdate.institute = education.institute;
		educationToUpdate.faculty = education.faculty;
		educationToUpdate.currentState = education.currentState;
		educationToUpdate.from = education.from;
		educationToUpdate.to = education.to;
		await profile.save();
		req.updatedEducation = educationToUpdate;
		next();
 	}
	catch(err){
		next(err);
	}
}

const deleteEducation = async (req, res, next) => {
	try {
		const userID = req.userID;
		const educationID = req.params.educationID;
		if(validationRule.notEmptyValidation(educationID) == false){
			return next(new errObj.BadRequestError("Invalid educationID!"));
		}
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return res.status(400).json({error: "Profile not found"});
		const educationToDelete = await profile.education.id(educationID);
		if(!educationToDelete) return next(new errObj.NotFoundError("education not found"));
		await educationToDelete.remove();
		await profile.save();
		next();
 	}
	catch(err){
		next(err);
	}
}

const addSkill = async (req, res, next) => {
	try {
		const userID = req.userID;
		const skill = req.body;
		Object.keys(skill).forEach(key => {
			if(validationRule.notEmptyValidation(skill[key]) == false){
				return next(new errObj.BadRequestError(`${key} field is required!`));
			}
		})
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return next(new errObj.NotFoundError("Profile not found"));
		profile.skills.push({
			type: skill.type,
			name: skill.name,
			field: skill.field
		});
		await profile.save();
		req.skillArray = profile.skills;
		next();
	}
	catch(err) {
		next(err)
	}
}

const updateSkill = async (req, res, next) => {
	try {
		const userID = req.userID;
		const skillID = req.params.skillID;
		const skill = req.body;
		if(validationRule.notEmptyValidation(skillID) == false){
			return next(new errObj.BadRequestError("Invalid skillID!"));
		}
		Object.keys(skill).forEach(key => {
			if(validationRule.notEmptyValidation(skill[key]) == false){
				return next(new errObj.BadRequestError(`${key} field is required!`));
			}
		})
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return next(new errObj.NotFoundError("Profile not found"));
		const skillToUpdate = await profile.skills.id(skillID);
		if(!skillToUpdate) return next(new errObj.NotFoundError("skill not found"));
		skillToUpdate.type = skill.type;
		skillToUpdate.name = skill.name;
		skillToUpdate.field = skill.field;
		await profile.save();
		req.updatedSkill = skillToUpdate;
		next();
 	}
	catch(err){
		next(err)
	}
}

const deleteSkill = async (req, res, next) => {
	try {
		const userID = req.userID;
		const skillID = req.params.skillID;
		if(validationRule.notEmptyValidation(skillID) == false){
			return next(new errObj.BadRequestError("Invalid skillID!"));
		}
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return next(new errObj.NotFoundError("Profile not found"));
		const skillToDelete = await profile.skills.id(skillID);
		if(!skillToDelete) return next(new errObj.NotFoundError("skill not found"));
		await skillToDelete.remove();
		await profile.save();
		next();
 	}
	catch(err){
		next(err)
	}
}

const updateHobby = async (req, res, next) => {
	try {
		const userID = req.userID;
		const hobbies = req.body.hobbies;
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return next(new errObj.NotFoundError("Profile not found"));
		profile.hobbies = hobbies;
		await profile.save();
		req.hobbies = profile.hobbies;
		next();
 	}
	catch(err){
		next(err);
	}
}

const updateRelationship = async (req, res, next) => {
	try {
		const userID = req.userID;
		const relationship = req.body.relationship;
		const profile = await userProfile.findOne({userID: userID});
		if(!profile) return next(new errObj.NotFoundError("Profile not found"));
		profile.relationship = relationship;
		await profile.save();
		req.relationship = profile.relationship;
		next();
 	}
	catch(err){
		next(err)
	}
}



module.exports = {
	updateName, 

	getProfile,
	getUserProfile,
	getProfilePic,

	updateFrameType,

	updateProfilePic,
	deleteProfilePic,

	updateCoverPic,
	deleteCoverPic,

	updateCategory,
	updateBio,

	updatePersonalDetails,

	addAddress,
	updateAddress,
	deleteAddress,

	addWork,
	updateWork,
	deleteWork,

	addEducation,
	updateEducation,
	deleteEducation,

	addSkill,
	updateSkill,
	deleteSkill,
	
	updateHobby,
	updateRelationship
}