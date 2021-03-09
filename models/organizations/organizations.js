//Require Mongoose
const mongoose = require('mongoose');

//Define a schema
const Schema = mongoose.Schema;

const OrganizationSchema = new Schema({
  userID: {
    type:mongoose.Schema.Types.ObjectId
  },
  name: {
    type: String,
    required: true
  },
  category: 
  {
    type: String,
    required: true
  },
  country: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  province: {
    type: String,
    required: true
  },
  district: {
    type: String,
    required: true
  },
  location: {type: String, required:true},
  email: {
    type: String,
    required: true,
  },
  website: {
    type: String,
  },
  details: {
    type: String,
    required: true,
  },
  image: {
      type: String
    },
  memberTotal: {type: Number, default: 0},
  memberUsers: [
      {type: mongoose.Schema.Types.ObjectId},
  ],
  isApproved: {type: Boolean, default: false},
});
// usersSchema.index({username: 1 });
// usersSchema.index({email: 1 });
const Organizations = mongoose.model('Organization', OrganizationSchema );

module.exports = Organizations;