const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const resourceRoutes = require("./resourceRoutes");
const userRoutes = require("./userRoutes");
const reportRoutes = require("./reportRoutes");

// Montaje de subrutas
router.use("/auth", authRoutes);
router.use("/resources", resourceRoutes);
router.use("/users", userRoutes);
router.use("/reports", reportRoutes);

module.exports = router;
