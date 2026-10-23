const reportService = require("../services/reportService");

/**
 * GET /api/reports/users/top-files
 * Retorna los 10 usuarios con mayor cantidad de archivos almacenados
 */
const getTopUsersByFiles = async (req, res, next) => {
  try {
    const data = await reportService.getTopUsersByFiles();

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/users/top-shared
 * Retorna el ranking de usuarios con mayor cantidad de recursos compartidos
 */
const getTopUsersBySharedResources = async (req, res, next) => {
  try {
    const data = await reportService.getTopUsersBySharedResources();

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/storage/by-type
 * Retorna la cantidad de archivos y volumen de almacenamiento agrupados por tipo
 */
const getFilesGroupedByType = async (req, res, next) => {
  try {
    const data = await reportService.getFilesGroupedByType();

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/storage/by-date-range
 * Retorna los archivos almacenados dentro de un intervalo temporal delimitado
 */
const getFilesByDateRange = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const data = await reportService.getFilesByDateRange(startDate, endDate);

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/sharing/most-shared-files
 * Retorna los archivos compartidos con mayor cantidad de usuarios
 */
const getMostSharedFiles = async (req, res, next) => {
  try {
    const data = await reportService.getMostSharedFiles();

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/sharing/by-user
 * Retorna los recursos compartidos por un usuario seleccionado
 */
const getResourcesSharedByUser = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({
        status: "error",
        mensaje: "El parámetro userId es obligatorio",
      });
    }

    const data = await reportService.getResourcesSharedByUser(userId);

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reports/users/select-options
 * Retorna el listado ligero de usuarios activos para los selectores de los reportes
 */
const getUsersForSelect = async (req, res, next) => {
  try {
    const data = await reportService.getUsersForSelect();

    return res.status(200).json({
      status: "success",
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTopUsersByFiles,
  getTopUsersBySharedResources,
  getFilesGroupedByType,
  getFilesByDateRange,
  getMostSharedFiles,
  getResourcesSharedByUser,
  getUsersForSelect,
};
