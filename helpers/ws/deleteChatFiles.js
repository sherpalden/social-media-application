const fs = require('fs'); 
const path = require('path');
const util = require('util');
const mongoose = require('mongoose');

const messages = require('../../models/chat/messages.js')

const readDirAsync = util.promisify(fs.readdir);
const statAsync = util.promisify(fs.stat);

const deleteFile =  (filePath) => {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(filePath)) {
            fs.unlink(filePath, err => {
                if(err){
                    reject(err);
                }
            });
        }
    resolve();
    })
}

const delChatFiles = async () => {
	try {
		const dirpath = './public/uploads/chat';
		const chatMessages = await messages.find({}, {files:1, date:1});
		const date = Date.now();
		for(message of chatMessages){
			const diff = date - message.date; 
			if(diff > 10*24*60*60*1000){
				if(message.files.length > 0){
					for(file of message.files){
						await deleteFile(`dirpath/${file}`);
					}
				}
				await messages.deleteOne({_id: message._id});
			}
			else break;
		}
	}
	catch (err) {
		console.error(err);
	}
}

module.exports = {
	delChatFiles,
}