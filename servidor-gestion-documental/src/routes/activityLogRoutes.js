const express = require("express");
const router = express.Router();
const activityLogController = require("../controllers/activityLogController");
const { protectRoutes, allowRoles } = require("../middlewares/authMiddleware");

// Todas las consultas del registro de auditoría requieren autenticación y rol de administrador
router.use(protectRoutes);
router.use(allowRoles("admin"));

// Listar historial de actividad con filtros opcionales
router.get("/", activityLogController.getActivityLogs);

// Registrar una actividad de forma explícita
router.post("/", activityLogController.createActivityLog);

module.exports = router;
