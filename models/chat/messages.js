//Require Mongoose
const mongoose = require('mongoose');

//Define a schema
const Schema = mongoose.Schema;

const MessageSchema = new Schema({
	conversationID: {
		type: mongoose.Schema.Types.ObjectId,
		required: true
	},
	senderID: {type: mongoose.Schema.Types.ObjectId, required: true},	
	text: {
		type: String,
	},
	files:[
		{
			type: String,
		}
	],
	date: { type: Date, default: Date.now, expires: 120000000},
});

const Messages = mongoose.model('Message', MessageSchema );

module.exports = Messages;
