const activityLogService = require("../services/activityLogService");

/**
 * GET /api/admin/activity-logs y /api/activity-logs
 * Obtiene el registro cronológico de actividad y auditoría con soporte para filtros
 */
const getActivityLogs = async (req, res, next) => {
  try {
    const data = await activityLogService.getActivityLogs(req.query);

    return res.status(200).json({
      status: "success",
      data,
      total: data.length,
      mensaje: "Historial de actividad obtenido exitosamente",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/activity-logs
 * Registra un evento de auditoría de manera explícita (opcional)
 */
const createActivityLog = async (req, res, next) => {
  try {
    const { action, resourceType, resourceId, details } = req.body;
    const userId = req.user ? req.user._id : req.body.userId;
    const ipAddress = req.ip || req.headers["x-forwarded-for"] || null;

    const data = await activityLogService.logActivity({
      userId,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress,
    });

    return res.status(201).json({
      status: "success",
      data,
      mensaje: "Actividad registrada exitosamente",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getActivityLogs,
  createActivityLog,
};
