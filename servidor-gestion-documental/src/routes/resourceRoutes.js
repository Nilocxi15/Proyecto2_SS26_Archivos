const express = require("express");
const router = express.Router();
const resourceController = require("../controllers/resourceController");
const { protectRoutes } = require("../middlewares/authMiddleware");
const { validarDto } = require("../middlewares/validateMiddleware");
const {
  ResourceIdParamDto,
  FolderQueryDto,
  CreateFolderDto,
  CreateFileDto,
  ToggleTrashDto,
} = require("../dtos/resource.dto");

/**
 * Rutas para la gestión de recursos (Archivos y Carpetas)
 * Todas requieren autenticación JWT y validación mediante DTOs
 */

// Listar archivos y carpetas del usuario (raíz o dentro de una subcarpeta)
router.get(
  "/mis-archivos",
  protectRoutes,
  validarDto(FolderQueryDto, "query"),
  resourceController.getMyFiles,
);

// Listar archivos y carpetas compartidos con el usuario autenticado
router.get(
  "/compartido-conmigo",
  protectRoutes,
  validarDto(FolderQueryDto, "query"),
  resourceController.getSharedWithMe,
);

// Listar archivos y carpetas en la papelera del usuario autenticado
router.get(
  "/papelera",
  protectRoutes,
  validarDto(FolderQueryDto, "query"),
  resourceController.getTrash,
);

// Mover un archivo o carpeta a la papelera o restaurarlo desde la papelera
router.put(
  "/:id/trash",
  protectRoutes,
  validarDto(ResourceIdParamDto, "params"),
  validarDto(ToggleTrashDto, "body"),
  resourceController.toggleTrash,
);

// Eliminar permanentemente un archivo o carpeta de la papelera
router.delete(
  "/:id",
  protectRoutes,
  validarDto(ResourceIdParamDto, "params"),
  resourceController.deleteResource,
);

// Crear una nueva carpeta
router.post(
  "/folders",
  protectRoutes,
  validarDto(CreateFolderDto, "body"),
  resourceController.createFolder,
);

// Subir/Crear un nuevo archivo .txt o .md
router.post(
  "/files",
  protectRoutes,
  validarDto(CreateFileDto, "body"),
  resourceController.createFile,
);

// Descargar un archivo activo (no en papelera)
router.get(
  "/files/:id/download",
  protectRoutes,
  validarDto(ResourceIdParamDto, "params"),
  resourceController.downloadFile,
);

module.exports = router;
