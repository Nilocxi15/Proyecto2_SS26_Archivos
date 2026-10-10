const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const resourceRoutes = require('./resourceRoutes');

// Montaje de subrutas
router.use('/auth', authRoutes);
router.use('/resources', resourceRoutes);

module.exports = router;
