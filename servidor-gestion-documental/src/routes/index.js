const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const resourceRoutes = require("./resourceRoutes");
const userRoutes = require("./userRoutes");
const reportRoutes = require("./reportRoutes");
const activityLogRoutes = require("./activityLogRoutes");

// Montaje de subrutas
router.use("/auth", authRoutes);
router.use("/resources", resourceRoutes);
router.use("/users", userRoutes);
router.use("/reports", reportRoutes);
router.use("/admin/activity-logs", activityLogRoutes);
router.use("/activity-logs", activityLogRoutes);

module.exports = router;
