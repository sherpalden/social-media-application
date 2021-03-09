const mongoose = require('mongoose');
const CommentSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId
  },
  postID: {
    type: mongoose.Schema.Types.ObjectId
  },
  text: {
    type: String,
  },
  image: {
    type: String,
  },
  lastUpdated: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const UserComment = mongoose.model('Post_Comment', CommentSchema);
module.exports = UserComment;