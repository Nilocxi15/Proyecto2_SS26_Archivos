const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { protectRoutes, allowRoles } = require("../middlewares/authMiddleware");

// Todos los reportes del sistema requieren autenticación y rol de administrador
router.use(protectRoutes);
router.use(allowRoles("admin"));

// Reporte: Top 10 usuarios con mayor cantidad de archivos almacenados
router.get("/users/top-files", reportController.getTopUsersByFiles);

module.exports = router;
