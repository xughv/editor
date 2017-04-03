const router = require('express').Router();
const controller = require('./controller');

router.get('/ssh/:host?', controller.index);
router.get('/file', controller.readFile);
router.post('/file', controller.writeFile);

module.exports = router;