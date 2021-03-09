//Require Mongoose
const mongoose = require('mongoose');
//Define a schema
const StaticDataSchema = new mongoose.Schema({
  country: [{type: String}],
  // gender: [{type: String}],
  category: [{type: String}]
});

const StaticData = mongoose.model('StaticData', StaticDataSchema );
module.exports = StaticData;