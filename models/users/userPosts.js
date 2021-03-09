const mongoose = require('mongoose');
const PostSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId,
  },
  text: {
    type: String,
  },
  reachTo : {
    public: {type: Boolean, default: false},
    categories: [
      {type: String}
    ],
    location: [
      {
        country: {type: String},
        state: {type: String},
      }
    ]
  },
  images: [
    {
      type: String
    }
  ],
  videos: [
    {
      type: String
    }
  ],
  commentTotal: {type: Number, default: 0},
  takeTotal: {type: Number, default: 0},
  takenUsers: [
      {type: mongoose.Schema.Types.ObjectId},
  ],
  lastUpdated: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const UserPost = mongoose.model('User_Post', PostSchema);
module.exports = UserPost;