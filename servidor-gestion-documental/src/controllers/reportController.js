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

module.exports = {
  getTopUsersByFiles,
  getTopUsersBySharedResources,
};
