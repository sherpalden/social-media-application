const router =  require('express').Router();

//swagger docs routes
const yaml = require('yamljs');
const swaggerUi = require('swagger-ui-express');
const swagOpt = {
  // explorer: true,
  swaggerOptions: {
    validatorUrl: null,
    // urls: [
    //   {
    //     url: 'http://localhost:5000/api-docs/userAPI.yaml',
    //     name: 'Spec1'
    //   },
    // ]
  }
};
const userAPI = yaml.load('./api-docs/userAPI.yaml');
const campaignAPI = yaml.load('./api-docs/campaignAPI.yaml');
const webSocketAPI = yaml.load('./api-docs/webSocketAPI.yaml');

router.use('/campaign-api', swaggerUi.serve, swaggerUi.setup(campaignAPI, swagOpt));
router.use('/ws-api', swaggerUi.serve, swaggerUi.setup(webSocketAPI, swagOpt));
router.use('/user-api', swaggerUi.serve, swaggerUi.setup(userAPI, swagOpt));


module.exports = router;