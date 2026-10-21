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
  UpdateFileDto,
  AddCommentDto,
  CommentParamDto,
  ShareResourceDto,
  ShareUserParamDto,
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

// Compartir un archivo o carpeta con un usuario asignando permisos
router.post(
  "/:id/share",
  protectRoutes,
  validarDto(ResourceIdParamDto, "params"),
  validarDto(ShareResourceDto, "body"),
  resourceController.shareResource,
);

// Revocar acceso a un usuario compartido en un archivo o carpeta
router.delete(
  "/:id/share/:userId",
  protectRoutes,
  validarDto(ShareUserParamDto, "params"),
  resourceController.removeSharedUser,
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

// Obtener detalle completo de un archivo (contenido, comentarios, permisos y compartidos)
router.get(
  "/files/:id",
  protectRoutes,
  validarDto(ResourceIdParamDto, "params"),
  resourceController.getFileDetails,
);

// Actualizar contenido, nombre y/o etiquetas de un archivo existente
router.put(
  "/files/:id",
  protectRoutes,
  validarDto(ResourceIdParamDto, "params"),
  validarDto(UpdateFileDto, "body"),
  resourceController.updateFile,
);

// Agregar un comentario a un archivo
router.post(
  "/files/:id/comments",
  protectRoutes,
  validarDto(ResourceIdParamDto, "params"),
  validarDto(AddCommentDto, "body"),
  resourceController.addComment,
);

// Eliminar un comentario de un archivo
router.delete(
  "/files/:id/comments/:commentId",
  protectRoutes,
  validarDto(CommentParamDto, "params"),
  resourceController.deleteComment,
);

// Descargar un archivo activo (no en papelera)
router.get(
  "/files/:id/download",
  protectRoutes,
  validarDto(ResourceIdParamDto, "params"),
  resourceController.downloadFile,
);

module.exports = router;
