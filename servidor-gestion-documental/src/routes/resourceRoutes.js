const express = require("express");
const router = express.Router();
const resourceController = require("../controllers/resourceController");
const { protectRoutes } = require("../middlewares/authMiddleware");

/**
 * Rutas para la gestión de recursos (Archivos y Carpetas)
 * Todas requieren autenticación JWT
 */

// Listar archivos y carpetas del usuario (raíz o dentro de una subcarpeta)
router.get("/mis-archivos", protectRoutes, resourceController.getMyFiles);

// Listar archivos y carpetas compartidos con el usuario autenticado
router.get(
  "/compartido-conmigo",
  protectRoutes,
  resourceController.getSharedWithMe,
);

// Crear una nueva carpeta
router.post("/folders", protectRoutes, resourceController.createFolder);

// Subir/Crear un nuevo archivo .txt o .md
router.post("/files", protectRoutes, resourceController.createFile);

module.exports = router;
