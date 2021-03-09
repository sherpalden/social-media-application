//Require Mongoose
const mongoose = require('mongoose');

//Define a schema
const Schema = mongoose.Schema;

const CampaignSchema = new Schema({
  userID: {
    type:mongoose.Schema.Types.ObjectId
  },
  title: {
    type: String,
    required: true
  },
  duration: {
  	startDate: {
      type: String,
      required: true
    },
  	endDate: {
      type: String,
      required: true
    }
  },
  objectives: 
  {
    type: String,
    required: true
  },
  details: {
    type: String,
    required: true
  },
  targetGroup: {
    type: String,
    required: true
  },
  ageGroup: {
    type: String,
    required: true
  },
  campaignType: {
    type: String,
    required: true
  },
  country: { type: String, required: true },
  state: { type: String, required: true },
  district: { type: String, required: true },
  localUnit: { type: String, required: true },
  location: {type: String, required:true},
  category: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  platform: {
    type: String,
    required: true,
  },
  images: [
    {
      type: String
    }
  ],
  thumbnail: {
    type: String,
    default: null
  },
  video: {
    type:String
  },
  rating: [
    {
      userID: {type: mongoose.Schema.Types.ObjectId},
      ratingVal: {type: Number}
    }
  ],
  ratingSum: {
    type: Number, default: 0,
  },
  totalRating: {
    type: Number, default: 0,
  },
  takeTotal: {type: Number, default: 0},
  takenUsers: [
      {type: mongoose.Schema.Types.ObjectId},
  ],
  commentTotal: {type: Number, default: 0},
  isExpressed: {type: Boolean, default: false},
});
// usersSchema.index({username: 1 });
// usersSchema.index({email: 1 });
const Campaigns = mongoose.model('Campaign', CampaignSchema );

module.exports = Campaigns;