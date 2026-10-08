const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');

// Montaje de subrutas
router.use('/auth', authRoutes);

module.exports = router;
