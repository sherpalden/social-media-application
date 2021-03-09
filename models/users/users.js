//Require Mongoose
const mongoose = require('mongoose');
//Define a schema
const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  fullName: {
    type: String,
    required: true
  },
  email: {
  	type: String,
  	required: true,
    unique: true,
  },
  password: {
  	type: String,
  	required: true
  },
  mobileNumber: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    required: true
  },
  birthDate: {
    type: Date,
    required: true,
  },
  category: {
    type: String,
    required: true
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  links: [
    {
      userID: { type: mongoose.Schema.Types.ObjectId },
      fullName: { type: String }
    }
  ],
  outLinkRequests: [
    {
      userID: { type: mongoose.Schema.Types.ObjectId },
      fullName: { type: String },
    }
  ],
  inLinkRequests: [
    {
      userID: { type: mongoose.Schema.Types.ObjectId },
      fullName: { type: String },
    }
  ],
  notifications: [
    {
      type: { type: String }, 
      senderID: { type: mongoose.Schema.Types.ObjectId },
      postID: { type: mongoose.Schema.Types.ObjectId },
      campaignID: { type: mongoose.Schema.Types.ObjectId },
      commentID: { type: mongoose.Schema.Types.ObjectId },
      message: { type: String},
      date: { type: Date, default: Date.now},
      isSeen: { type: Boolean, default: false }
    }
  ]
});

UserSchema.index({fullName: "text"})
const Users = mongoose.model('User', UserSchema );
module.exports = Users;