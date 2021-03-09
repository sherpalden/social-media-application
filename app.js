const express = require('express');
const path = require('path');
const cors = require('cors')
const mongoose = require('mongoose')
//connect to database
mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true})
mongoose.connection.on('connected', () => {
    console.log('Database connected')
})
mongoose.connection.on('error', err => {
    console.error('Mongo_Connection_Error: ' + err)
})
mongoose.connection.on('disconnected', () => {
    console.log('Database disconnected')
})

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'ws-client')));



app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'content-type,X-Requested-With,authorization');
    next();
});

//load all the database models so that you can migrate through the code of autoload...
//database models
require('./models/campaigns/campaigns.js');
require('./models/campaigns/campaignComments.js');
require('./models/campaigns/campaignReplies.js');

require('./models/users/comments.js');
require('./models/users/replies.js');
require('./models/users/userPosts.js');
require('./models/users/userProfile.js');
require('./models/users/users.js');

require('./models/notifications/userNotifications.js');
require('./models/staticData.js');




const campaignRoutes = require('./routes/campaignRoutes.js');
app.use('/api/campaign', campaignRoutes);

const organizationRoutes = require('./routes/organizationRoutes.js');
app.use('/api/organization', organizationRoutes);

const userRoutes = require('./routes/userRoutes.js');
app.use('/api/user', userRoutes);

const adminRoutes = require('./routes/adminRoutes.js');
app.use('/api/admin', adminRoutes);

const swaggerRoutes = require('./routes/swaggerRoutes.js');
app.use('/api/swagger', swaggerRoutes);

const videoRoutes = require('./routes/videoRoutes.js');
app.use('/api/video', videoRoutes);


// const deleteChatFiles = require('./helper/chat/deleteChatFiles.js');
// setInterval(()=>{deleteChatFiles.delChatFiles()}, 86400000);


// error handler middleware
const { UserFacingError } = require('./error/errorHandler.js');
app.use( (err, req, res, next) => {
	if(err instanceof UserFacingError){
		res.status(err.statusCode).send({"error": err.message})
		return;
	}
	res.status(err.status || 500);
	res.json(err.message);
});

const server = require('http').createServer(app);

//socket connection initialization...
const options = { 
	perMessageDeflate: false, 
	cors: {
	    origin: "*",
	    methods: ["GET", "POST"],
	    allowedHeaders: ["my-custom-header"],
	    credentials: true
  	}
};
const io = require('socket.io')(server, options);

const wsServer = require('./wsServer.js');
wsServer.rootSocket(io);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

const app_1 = express();
app_1.use(express.static('../ap-frontend-master/build'))
app_1.listen(8000, () => console.log(`Server running on port 8000`));

app_1.get('/*',(req, res) => {
	// res.sendFile(path.join(__dirname, 'build', 'index.html'));
	res.sendFile('../ap-frontend-master/build/index.html');
});

