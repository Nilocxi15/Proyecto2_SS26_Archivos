const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { protectRoutes, allowRoles } = require("../middlewares/authMiddleware");

// Todos los reportes del sistema requieren autenticación y rol de administrador
router.use(protectRoutes);
router.use(allowRoles("admin"));

// Reporte: Top 10 usuarios con mayor cantidad de archivos almacenados
router.get("/users/top-files", reportController.getTopUsersByFiles);

// Reporte: Usuarios con mayor cantidad de recursos compartidos
router.get("/users/top-shared", reportController.getTopUsersBySharedResources);

// Reporte: Cantidad de archivos agrupados por tipo
router.get("/storage/by-type", reportController.getFilesGroupedByType);

// Reporte: Archivos almacenados dentro de un rango de fechas
router.get("/storage/by-date-range", reportController.getFilesByDateRange);

// Reporte: Archivos compartidos con mayor cantidad de usuarios
router.get("/sharing/most-shared-files", reportController.getMostSharedFiles);

module.exports = router;
