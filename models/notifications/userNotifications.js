const mongoose = require('mongoose');
const NotificationSchema = new mongoose.Schema({
  receiverID: { type: mongoose.Schema.Types.ObjectId },
  senderID: { type: mongoose.Schema.Types.ObjectId },
  type: { type: String }, 
  postID: { type: mongoose.Schema.Types.ObjectId },
  campaignID: { type: mongoose.Schema.Types.ObjectId },
  commentID: { type: mongoose.Schema.Types.ObjectId },
  message: { type: String},
  date: { type: Date, default: Date.now, expires: 120000000000},
  isSeen: { type: Boolean, default: false },
});

const UserNotification = mongoose.model('User_Notification', NotificationSchema);
module.exports = UserNotification;