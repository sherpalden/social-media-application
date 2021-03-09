//Require Mongoose
const mongoose = require('mongoose');

//Define a schema
const Schema = mongoose.Schema;

const EventSchema = new Schema({
  userID: {
    type:mongoose.Schema.Types.ObjectId
  },
  organizationID: {
    type:mongoose.Schema.Types.ObjectId
  },
  title: {
    type: String,
    required: true
  },
  location: 
  {
    type: String,
    required: true
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
  isExpressed: {type: Boolean, default: false},
});
// usersSchema.index({username: 1 });
// usersSchema.index({email: 1 });
const Events = mongoose.model('Event', EventSchema );

module.exports = Events;