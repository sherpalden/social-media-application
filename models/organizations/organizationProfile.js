//Require Mongoose
const mongoose = require('mongoose');

//Define a schema
const Schema = mongoose.Schema;

const OrganizationProfileSchema = new Schema({
  organizationID: {
    type:mongoose.Schema.Types.ObjectId
  },
  description: {
    type: String
  },
  website: {
    type: String
  },
  email: {
    type: String
  },
  goals: [{
    type: Object
  }],
  programs: [{
    type: String
  }],
  notices: {
    type: Object
  },
  polls: {
    type: Object
  },
  circulars: {
    type: Object
  }
});
// usersSchema.index({username: 1 });
// usersSchema.index({email: 1 });
const OrganizationProfile = mongoose.model('OrganizationProfile', OrganizationProfileSchema );

module.exports = OrganizationProfile;