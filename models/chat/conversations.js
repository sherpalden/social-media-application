const mongoose = require('mongoose');

//Define a schema
const Schema = mongoose.Schema;

const ConversationSchema = new Schema({
	type: {
		type: String, //dm(direct_messaging)/ gm(groupMessaging)
		required: true
	},
	room: {
		type: String, //exists only if type is gm
	},
	admin: {
		type: mongoose.Schema.Types.ObjectId //exists only if type is gm
	},
  	members: [
  		{
  			type: mongoose.Schema.Types.ObjectId, required: true
  		}
	],
	lastMessagedAt: { type: Date}
});

const Conversations = mongoose.model('Conversation', ConversationSchema );

module.exports = Conversations;
