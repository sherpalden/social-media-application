const express = require('express');
const router =  express.Router();
const fs = require('fs');
const campaignController = require('../controllers/http/campaignController');

const authenticationController = require('../controllers/http/authenticationController');
const fileUploader = require('../middleware/fileUploads');

// @route    POST /campaign/set-thumbnail
// @desc     Set a thumbnail to a campaign
// @access   Private
router.put('/set-thumbnail/:campaignID',
    authenticationController.tokenVerification, 
    campaignController.setCampaignThumbnail, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Campaign thumbnail setup Successful",
    });
});

// @route    POST /campaign
// @desc     Create a new campaign
// @access   Private
router.post('/',
    authenticationController.tokenVerification, 
    campaignController.uploadCampaignFiles,
    campaignController.campaignValidation,
    campaignController.postCampaign, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Campaign Create Successful",
    });
});

// @route    GET /campaign/user-campaigns
// @desc     Retrieve all campaigns of logged user.
// @access   Private
router.get('/user-campaigns', 
	authenticationController.tokenVerification,
	campaignController.getUserCampaigns, 
	(req, res) => {
    res.status(200);
    res.send({
    	"message": "Campaigns Retrieval Successful",
    	"campaignData": req.campaignData,
    	"total": req.total,
    	"nextSkips": req.nextSkips,
    })
});

// @route    GET /campaign/express
// @desc     Retrieve all expressed campaigns
// @access   Private
router.get('/expressed-campaigns', 
    authenticationController.tokenVerification,
    campaignController.getExpressedCampaigns, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Campaigns Retrieval Successful",
        "campaignData": req.campaignData,
        "total": req.total,
        "nextSkips": req.nextSkips,
    })
});

// @route    GET /campaign/all-campaigns
// @desc     Retrieve all campaigns
// @access   Private
router.get('/all-campaigns', 
    authenticationController.tokenVerification,
    campaignController.getAllCampaigns, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Campaigns Retrieval Successful",
        "campaignData": req.campaignData,
        "total": req.total,
        "nextSkips": req.nextSkips,
    })
});

// @route    GET /campaign/details/campaignID
// @desc     Retrieve details of a campaign
// @access   Private
router.get('/details/:campaignID', 
	authenticationController.tokenVerification,
	campaignController.displaySingleCampaign, 
	(req, res) => {
    res.status(200);
    res.send({
    	"message": "Campaign Retrieval Successful",
    	"details": req.singleCampaignData,
        "rating": req.rating,
    })
});

// @route    PUT /campaign/fields/campaignID
// @desc     Update campaign fields
// @access   Private
router.put('/fields/:campaignID', 
	authenticationController.tokenVerification,
	campaignController.updateCampaignFields, 
	(req, res) => {
    res.status(200);
    res.send({
    	"message": "Updated successfully!!!",
    })
});

// @route    PUT /campaign/files/campaignID
// @desc     Update campaign files
// @access   Private
router.put('/files/:campaignID', 
    authenticationController.tokenVerification,
    campaignController.uploadCampaignFiles,
    campaignController.updateCampaignFiles, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Campaign Files Updated successfully!!!",
    })
});

// @route    DELETE /campaign/campaignID
// @desc     Delete a campaign
// @access   Private
router.delete('/:campaignID', 
	authenticationController.tokenVerification,
	campaignController.deleteCampaign, 
	(req, res) => {
    res.status(200);
    res.send({
    	"message": "Campaign Delete Successful",
    })
});


// @route    POST /campaign/rating/campaignID
// @desc     Rate a campaign
// @access   Private
router.post('/rating/:campaignID',
    authenticationController.tokenVerification, 
    campaignController.rateCampaign,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Campaign Rating Successful",
        "avgRating": req.avgRating,
    });
});

// @route    POST /campaign/rating/campaignID
// @desc     Rate a campaign
// @access   Private
router.post('/rating/:campaignID',
    authenticationController.tokenVerification, 
    campaignController.rateCampaign,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Campaign Rating Successful",
        "avgRating": req.avgRating,
    });
});

// @route    POST camapign/expressTo/campaignID    
// @desc     Add a take on a campaign
// @access   Private
router.post('/express/:campaignID',
    authenticationController.tokenVerification,
    campaignController.expressCampaign,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Express on a campaign Successful",
    }) 
})

// @route    PUT camapign/take/campaignID    
// @desc     Add a take on a campaign
// @access   Private
router.put('/take/:campaignID',
    authenticationController.tokenVerification,
    campaignController.takeCampaign,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Take on a campaign Successful",
        "takeTotal": req.takeTotal,
        "isTaken": true
    }) 
})

// @route    PUT camapign/untake/campaignID    
// @desc     Add a untake on a campaign
// @access   Private
router.put('/untake/:campaignID',
    authenticationController.tokenVerification,
    campaignController.untakeCampaign,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Untake on a Campaign Successful",
        "takeTotal": req.takeTotal,
        "isTaken": false
    }) 
})

// @route    POST campaign/comment/campaignID
// @desc     post a comment on a campaign
// @access   Private
router.post('/comment/:campaignID',
    authenticationController.tokenVerification,
    fileUploader.parseFormData,
    fileUploader.processFileNames,
    campaignController.postComment,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Comment on a post Successful",
        "commentTotal": req.commentTotal,
        "comment": req.comment,
        "replies": [],
    }) 
})

// @route    PUT campaign/comment/campaignID/commentID
// @desc     edit a comment on a campaign
// @access   Private
router.put('/comment/:campaignID/:commentID',
    authenticationController.tokenVerification,
    campaignController.editComment,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Successful",
        "commentTotal": req.commentTotal,
        "text": req.text || null
    }) 
})

/*User can edit and delete only its own comments or comments of its campaign*/

// @route    DELETE campaign/comment/campaignID/commentID
// @desc     delete a comment on a campaign
// @access   Private
router.delete('/comment/:campaignID/:commentID',
    authenticationController.tokenVerification,
    campaignController.deleteComment,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Comment Delete Successful",
        "commentTotal": req.commentTotal
    }) 
})

// @route    POST campaign/reply/campaignID/commentID
// @desc     post a reply to a comment on a campaign
// @access   Private
router.post('/reply/:campaignID/:commentID',
    authenticationController.tokenVerification,
    fileUploader.parseFormData,
    fileUploader.processFileNames,
    campaignController.postReply,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Reply on a comment of a campaign Successful",
        "commentTotal": req.commentTotal,
        "reply": req.reply
    }) 
})

// @route    PUT campaign/reply/campaignID/commentID/replyID
// @desc     edit a reply to a comment on a campaign
// @access   Private
router.put('/reply/:campaignID/:commentID/:replyID',
    authenticationController.tokenVerification,
    campaignController.editReply,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Successful",
        "commentTotal": req.commentTotal,
        "text": req.text || null
    }) 
})

// @route    DELETE campaign/reply/campaignID/commentID/replyID
// @desc     delete a reply to a comment on a campaign
// @access   Private
router.delete('/reply/:campaignID/:commentID/:replyID',
    authenticationController.tokenVerification,
    campaignController.deleteReply,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Reply on a comment delete Successful",
        "commentTotal": req.commentTotal
    }) 
})


// @route    GET campaign/comment/campaignID
// @desc     Load comments of campaign
// @access   Private
router.get('/comment/:campaignID',
    authenticationController.tokenVerification,
    campaignController.loadComments,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Comment loading successful.",
        "comments": req.comments,
        "total": req.total,
        "nextSkips": req.nextSkips,
    }) 
})


// @route    GET campaign/comment/campaignID/commentID
// @desc     Load replies of a comment of a campaign
// @access   Private
router.get('/comment/:campaignID',
    authenticationController.tokenVerification,
    campaignController.loadReplies,
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Comment loading successful.",
        "replies": req.replies,
        "total": req.total,
        "nextSkips": req.nextSkips,
    }) 
})

// @route    GET /campaign/video/fileName
// @desc     Stream campaign video
// @access   Public
router.get('/video/:fileName',
	(req, res) => {
	try {
        const path = `./public/uploads/campaign/${req.params.fileName}`;
        const stat = fs.statSync(path)
        const fileSize = stat.size
        const range = req.headers.range
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-")
            const start = parseInt(parts[0], 10)
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1
            const chunksize = (end-start)+1
            const file = fs.createReadStream(path, {start, end})
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            }
            res.writeHead(206, head)
            file.pipe(res)
        } 
        else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        }
        res.writeHead(200, head)
        fs.createReadStream(path).pipe(res)
        }
    }
    catch(err){
        next(err);
    }
});

module.exports = router;