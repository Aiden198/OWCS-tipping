var express = require('express');
var router = express.Router();
var matchesController = require('../../controllers/matchesController');


router.get('/', matchesController.getAllMatches);
router.get('/live', matchesController.getLiveMatches);
router.get('/upcoming', matchesController.getUpcomingMatches);
router.get('/completed', matchesController.getCompletedMatches);

router.post('/admin/sync', matchesController.syncMatchesNow);

module.exports = router;