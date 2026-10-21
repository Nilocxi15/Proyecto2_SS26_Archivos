const resourceService = require("../services/resourceService");
const myResourcesService = require("../services/myResourcesService");
const sharedResourcesService = require("../services/sharedResourcesService");
const recycleBinResourcesService = require("../services/recycleBinResourcesService");

/**
 * GET /api/resources/mis-archivos
 * Obtiene el contenido (carpetas y archivos) del usuario autenticado en la ubicación especificada.
 * Query params opcionales:
 * - folderId: ID de la carpeta contenedora (si no se proporciona o es null, lista la raíz)
 */
const getMyFiles = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { folderId } = req.query;

    const data = await myResourcesService.getMyFiles(userId, folderId);

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/resources/folders
 * Crea una nueva carpeta
 */
const createFolder = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, parentId } = req.body;

    const folder = await myResourcesService.createFolder(userId, {
      name,
      parentId,
    });

    return res.status(201).json({
      status: "success",
      mensaje: "Carpeta creada exitosamente",
      data: folder,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/resources/files
 * Registra y sube un nuevo archivo .txt o .md
 */
const createFile = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { name, extension, content, folderId, tags } = req.body;

    const file = await myResourcesService.createFile(userId, {
      name,
      extension,
      content,
      folderId,
      tags,
    });

    return res.status(201).json({
      status: "success",
      mensaje: "Archivo creado exitosamente",
      data: file,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/resources/files/:id
 * Obtiene el detalle completo de un archivo (contenido, comentarios, personas con acceso y permisos)
 */
const getFileDetails = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const file = await resourceService.getFileDetails(userId, id);

    return res.status(200).json({
      status: "success",
      data: file,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/resources/files/:id
 * Guarda cambios en el nombre, contenido y/o etiquetas de un archivo según permisos
 */
const updateFile = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { name, content, tags } = req.body;

    const updated = await resourceService.updateFile(userId, id, {
      name,
      content,
      tags,
    });

    return res.status(200).json({
      status: "success",
      mensaje: "Documento actualizado exitosamente",
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/resources/files/:id/comments
 * Agrega un nuevo comentario al archivo
 */
const addComment = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { content } = req.body;

    const comment = await resourceService.addComment(userId, id, content);

    return res.status(201).json({
      status: "success",
      mensaje: "Comentario agregado exitosamente",
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/resources/files/:id/comments/:commentId
 * Elimina un comentario (solo el autor o el propietario del archivo)
 */
const deleteComment = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id, commentId } = req.params;

    const result = await resourceService.deleteComment(userId, id, commentId);

    return res.status(200).json({
      status: "success",
      mensaje: result.mensaje,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/resources/:id/share
 * Comparte un archivo o carpeta con un usuario asignando permisos (lectura, comentar o edicion)
 */
const shareResource = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { email, permission } = req.body;

    const result = await sharedResourcesService.shareResource(userId, id, {
      email,
      permission,
    });

    return res.status(200).json({
      status: "success",
      mensaje: `Recurso compartido exitosamente con ${result.targetUser.userEmail}`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/resources/:id/share/:userId
 * Revoca el acceso a un colaborador en un archivo o carpeta
 */
const removeSharedUser = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id, userId: targetUserId } = req.params;

    const result = await sharedResourcesService.removeSharedUser(
      userId,
      id,
      targetUserId,
    );

    return res.status(200).json({
      status: "success",
      mensaje: "Acceso revocado exitosamente",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/resources/compartido-conmigo
 * Obtiene las carpetas y archivos compartidos con el usuario autenticado.
 * Query params opcionales:
 * - folderId: ID de la carpeta compartida (si se navega dentro de una carpeta compartida)
 */
const getSharedWithMe = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { folderId } = req.query;

    const data = await sharedResourcesService.getSharedWithMe(userId, folderId);

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/resources/papelera
 * Obtiene las carpetas y archivos en la papelera (isTrash: true) del usuario autenticado.
 * Query params opcionales:
 * - folderId: ID de la carpeta en papelera a explorar
 */
const getTrash = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { folderId } = req.query;

    const data = await recycleBinResourcesService.getTrash(userId, folderId);

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/resources/:id/trash
 * Mueve un recurso (carpeta o archivo) a la papelera (isTrash: true) o lo restaura (isTrash: false).
 * Body params:
 * - moveToTrash: booleano que indica si mover a papelera (true) o restaurar (false)
 */
const toggleTrash = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const { moveToTrash } = req.body;

    const updatedResource =
      await recycleBinResourcesService.moveToTrashOrRestore(
        userId,
        id,
        moveToTrash,
      );

    return res.status(200).json({
      status: "success",
      mensaje: moveToTrash
        ? "Recurso movido a la papelera"
        : "Recurso restaurado",
      data: updatedResource,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/resources/:id
 * Elimina permanentemente un recurso (carpeta o archivo) de la papelera (isTrash: true).
 * Solo se permite eliminar recursos que estén en la papelera.
 */
const deleteResource = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const deletedInfo =
      await recycleBinResourcesService.deleteResourcePermanently(userId, id);

    return res.status(200).json({
      status: "success",
      mensaje:
        deletedInfo.type === "folder"
          ? `Carpeta "${deletedInfo.name}" y su contenido eliminados permanentemente`
          : `Archivo "${deletedInfo.name}" eliminado permanentemente`,
      data: deletedInfo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/resources/files/:id/download
 * Descarga un archivo activo (isTrash: false) con su nombre, extensión y contenido
 */
const downloadFile = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;

    const fileData = await resourceService.getFileForDownload(userId, id);

    return res.status(200).json({
      status: "success",
      data: fileData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/resources/folders
 * Obtiene todas las carpetas activas del usuario para selectores y traslados
 */
const getAllFolders = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const folders = await myResourcesService.getAllFolders(userId);

    return res.status(200).json({
      status: "success",
      data: folders,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/resources/files/:id/move
 * Mueve un archivo a otra carpeta de destino o a la raíz
 */
const moveFile = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { id } = req.params;
    const { targetFolderId } = req.body;

    const file = await myResourcesService.moveFile(userId, id, targetFolderId);

    return res.status(200).json({
      status: "success",
      mensaje: `Archivo "${file.name}" movido exitosamente`,
      data: file,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyFiles,
  getSharedWithMe,
  getTrash,
  toggleTrash,
  deleteResource,
  downloadFile,
  createFolder,
  createFile,
  getFileDetails,
  updateFile,
  addComment,
  deleteComment,
  shareResource,
  removeSharedUser,
  getAllFolders,
  moveFile,
};
