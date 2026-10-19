const resourceService = require("../services/resourceService");

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

    const data = await resourceService.getMyFiles(userId, folderId);

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

    const folder = await resourceService.createFolder(userId, {
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

    const file = await resourceService.createFile(userId, {
      name,
      extension,
      content,
      folderId,
      tags,
    });

    return res.status(201).json({
      status: "success",
      mensaje: "Archivo subido exitosamente",
      data: file,
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

    const data = await resourceService.getSharedWithMe(userId, folderId);

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

    const data = await resourceService.getTrash(userId, folderId);

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

    const updatedResource = await resourceService.moveToTrashOrRestore(
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

module.exports = {
  getMyFiles,
  getSharedWithMe,
  getTrash,
  toggleTrash,
  downloadFile,
  createFolder,
  createFile,
};
