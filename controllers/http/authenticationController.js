const bcrypt = require('bcrypt'); //for hashing passwords...
const saltRounds = 10;
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

//require models
const users = require('../../models/users/users');
const validationRule = require('../validationController');

//error handler
const errObj = require('../../error/errorHandler');

//check email and get password

const authValidation = (req, res, next) => {
    try {
        const userData = req.body;
        Object.keys(userData).forEach(key => {
            if(validationRule.notEmptyValidation(userData[key]) === false){
                return next(new errObj.BadRequestError(`${key} field cannot be empty.`));
            }
            if(validationRule.noSpaceValidation(userData[key]) === false){
                return next(new errObj.BadRequestError(`White spaces are not allowed for ${key} field.`));
            }
        })
        if(validationRule.emailValidation(userData.email) === false){
            return next(new errObj.ForbiddenError("Invalid Email Address!!!"));
        }
        next();
    }
    catch(err) {
        next(err)
    }
}

const checkUser = (req, res, next) => {
    users.findOne({ email: req.body.email })
    .then(user => {
        if(!user) return next(new errObj.NotFoundError("User not found with this email!"));
        // if(!user.isVerified) return next( new errObj.NotAuthorizedError("User email not verified"));
        req.passwordVal = user.password;
        req.userID = user._id;
        next();
    })
    .catch(err => {
        next(err);
    })
}

const matchPassword = (req, res, next) => {
    bcrypt.compare(req.body.password, req.passwordVal, (err, result) => {
        if (result == true) {
            next();
        } 
        else if (result == false) {
            return next(new errObj.NotAuthorizedError("Incorrect Password"));
        }
    });
}

const getToken = async (req, res, next) => {
    try {
        req.accessToken = await jwt.sign({ email: req.body.email, userID: req.userID },
                                     process.env.ACCESS_TOKEN_SECRET, { expiresIn: '5000m' });
        next();
    }
    catch(err){
        next(err);
    }
}

const tokenVerification = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        if(!authHeader) return next(new errObj.NotAuthorizedError("Token Required for authorization"))
        const token = authHeader && authHeader.split(' ');
        const accessToken = token[1];
        const userInfo = await jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        req.userID = userInfo.userID;
        req.email = userInfo.email;
        next();
    }
    catch(err) {
        if(err.message == "jwt expired") next(new errObj.NotAuthorizedError("Unauthorised!!!"));
        next(new errObj.BadRequestError(err.message));
    }
}


module.exports = {
    authValidation,
    checkUser,
    matchPassword,
    getToken,
    tokenVerification,
}