const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const resourceRoutes = require("./resourceRoutes");
const userRoutes = require("./userRoutes");

// Montaje de subrutas
router.use("/auth", authRoutes);
router.use("/resources", resourceRoutes);
router.use("/users", userRoutes);

module.exports = router;
