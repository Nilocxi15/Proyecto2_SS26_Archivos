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

// Listar archivos y carpetas en la papelera del usuario autenticado
router.get("/papelera", protectRoutes, resourceController.getTrash);

// Mover un archivo o carpeta a la papelera o restaurarlo desde la papelera
router.put("/:id/trash", protectRoutes, resourceController.toggleTrash);

// Eliminar permanentemente un archivo o carpeta de la papelera
router.delete("/:id", protectRoutes, resourceController.deleteResource);

// Crear una nueva carpeta
router.post("/folders", protectRoutes, resourceController.createFolder);

// Subir/Crear un nuevo archivo .txt o .md
router.post("/files", protectRoutes, resourceController.createFile);

// Descargar un archivo activo (no en papelera)
router.get(
  "/files/:id/download",
  protectRoutes,
  resourceController.downloadFile,
);

module.exports = router;
