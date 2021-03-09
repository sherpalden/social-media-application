const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
  },
  coverPic: {
    type: String,
    default: null
  },
  profilePic: {
    type: String,
    default: null
  },
  frameType: {
    type: String,
    default: "circular",
  },
  //bio should have a character limit...5000 characeter
  bio: {
    type: String
  },
  address: [
    {
      type: {type: String},//current/home/workingAddress
      state: {type: String},
      city: {type: String},
      localUnit: {type: String}
    }
  ],
  education: [
    {
      level: {type: String},//school/high school/diploma/bachelor/master/phd
      institute: {type: String},
      faculty: {type: String},
      currentState: {type: Boolean},
      from: {type: Date},
      to: {type: Date}
    }
  ],
  work: [
    {
      company: {type: String},
      department: {type: String},
      position: {type: String},
      currentState: {type: Boolean},//working/worked
      from: {type: Date},
      to: {type: Date}
    }
  ],
  skills: [
    {
      type: {type: String},//industry/tools and technology/others
      name: {type: String},
      field: {type: String}
    }
  ],
  hobbies: [
    {
       type: String
    }
  ],
  relationship: { //single or married
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const UserProfile = mongoose.model('User_Profile', ProfileSchema);;
module.exports = UserProfile;