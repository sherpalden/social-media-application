const router =  require('express').Router();
// database models require
const staticData = require('../models/staticData');

//error handler
const errObj = require('../error/errorHandler');

router.post('/static-data', async (req, res, next) => {
	try {
		await staticData.create({
			country: req.body.country,
			category: req.body.category
		});
		res.status(200);
	    res.send({
	        "message": "Successful",
	    })
	}
	catch(err) {
		next(err)
	}
});

module.exports = router;