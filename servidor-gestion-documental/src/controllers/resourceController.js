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

module.exports = {
  getMyFiles,
  getMisArchivos: getMyFiles,
  createFolder,
  createFile,
};
