const express = require('express');
const router =  express.Router();
const fs = require('fs');
const organizationController = require('../controllers/http/organizationController');

const authenticationController = require('../controllers/http/authenticationController');
const fileUploader = require('../middleware/fileUploads');


// @route    POST /organization
// @desc     Create a new organization
// @access   Private
router.post('/',
    authenticationController.tokenVerification, 
    organizationController.uploadOrganizationFiles,
    organizationController.organizationValidation,
    organizationController.postOrganization, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Organization Create Successful",
    });
});

// @route    GET /organization/details/organizationID
// @desc     Retrieve details of a organization
// @access   Private
router.get('/details/:organizationID', 
    authenticationController.tokenVerification,
    organizationController.displaySingleOrganization, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Organization Retrieval Successful",
        "details": req.singleOrganizationData,
        //"rating": req.rating,
    })
});

// @route    GET /organization/dashboard/organizationID
// @desc     Retrieve dashboard of a organization
// @access   Private
router.get('/dashboard/:organizationID', 
    authenticationController.tokenVerification,
    organizationController.viewDashboard, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Organization Retrieval Successful",
        "details": req.singleOrganizationData,
        //"rating": req.rating,
    })
});

// @route    POST /organization/updateDescription
// @desc     Update Description of a organization
// @access   Private
router.post('/updateDescription', 
    authenticationController.tokenVerification,
    organizationController.organizationValidation,
    organizationController.updateDescription, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Organization Description Update Successful"
    })
});

// @route    POST /organization/updateWebsite
// @desc     Update Website of a organization
// @access   Private
router.post('/updateWebsite', 
    authenticationController.tokenVerification,
    organizationController.organizationValidation,
    organizationController.updateWebsite, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Organization Website Update Successful"
    })
});

// @route    POST /organization/updateEmail
// @desc     Update Email of a organization
// @access   Private
router.post('/updateEmail', 
    authenticationController.tokenVerification,
    organizationController.organizationValidation,
    organizationController.updateEmail, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Organization Email Update Successful"
    })
});

// @route    POST /organization/addGoal
// @desc     Add Goal of a organization
// @access   Private
router.post('/addGoal', 
    authenticationController.tokenVerification,
    organizationController.organizationValidation,
    organizationController.addGoal, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Organization Goal Added"
    })
});

// @route    POST /organization/editGoal
// @desc     Edit Goal of a organization
// @access   Private
router.post('/editGoal', 
    authenticationController.tokenVerification,
    organizationController.organizationValidation,
    organizationController.editGoal, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Organization Goal Edited"
    })
});

// @route    POST /organization/deleteGoal
// @desc     Delete Goal of a organization
// @access   Private
router.post('/deleteGoal', 
    authenticationController.tokenVerification,
    organizationController.organizationValidation,
    organizationController.deleteGoal, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Organization Goal Deleted"
    })
});

// @route    POST /organization/addEvent
// @desc     Create a new organization event
// @access   Private
router.post('/addEvent',
    authenticationController.tokenVerification, 
    organizationController.uploadOrganizationFiles,
    organizationController.organizationValidation,
    organizationController.addEvent, 
    (req, res) => {
    res.status(200);
    res.send({
        "message": "Organization Event Created Successful",
    });
});

router.get('/', 
   // authenticationController.tokenVerification,
    organizationController.getOrganizations, 
    (req, res) => {
     //res.send({"message": "Organization Load Successful."});
    res.status(200);
    res.send({
        "message": "Organization Load Successful.",
        "organizationData": req.organizationData,
        "total": req.total,
        "nextSkips": req.nextSkips
    })
});

module.exports = router;