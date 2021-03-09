const mongoose = require('mongoose');
const ReplySchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId
  },
  campaignID: {
    type: mongoose.Schema.Types.ObjectId
  },
  commentID: {
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

const UserReply = mongoose.model('Campaign_Reply', ReplySchema);
module.exports = UserReply;