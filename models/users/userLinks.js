const mongoose = require('mongoose');
const LinkSchema = new mongoose.Schema({
  userID: {
    type: mongoose.Schema.Types.ObjectId
  },
  fullName: {
    type: String
  },
  links: [
    {
      userID: { type: mongoose.Schema.Types.ObjectId },
      fullName: { type: String}
    }
  ],
  outLinkRequests: [
    {
      userID: { type: mongoose.Schema.Types.ObjectId },
      fullName: { type: String},
      isAccepted: { type: Boolean}
    }
  ],
  inLinkRequests: [
    {
      userID: { type: mongoose.Schema.Types.ObjectId },
      fullName: { type: String},
      isAccepted: { type: Boolean}
    }
  ]
});

const UserLink = mongoose.model('User_Link', LinkSchema);
module.exports = UserLink;

/*















*/