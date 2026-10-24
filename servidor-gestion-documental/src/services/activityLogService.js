const mongoose = require("mongoose");
const ActivityLog = require("../models/ActivityLog");
const User = require("../models/User");
const File = require("../models/File");
const Folder = require("../models/Folder");

/**
 * Registra un nuevo evento de auditoría en la colección activity_logs
 * @param {object} params
 * @param {string|mongoose.Types.ObjectId} params.userId - Usuario ejecutor
 * @param {'crear'|'modificar'|'mover'|'eliminar'|'restaurar'|'compartir'|'descargar'} params.action - Acción realizada
 * @param {'archivo'|'carpeta'} params.resourceType - Tipo de recurso
 * @param {string|mongoose.Types.ObjectId} params.resourceId - ID del recurso
 * @param {object} [params.details={}] - Metadatos adicionales de la operación
 * @param {string} [params.ipAddress=null] - Dirección IP de origen si está disponible
 */
const logActivity = async ({
  userId,
  action,
  resourceType,
  resourceId,
  details = {},
  ipAddress = null,
}) => {
  try {
    if (!userId || !action || !resourceType || !resourceId) {
      return null;
    }

    const logEntry = await ActivityLog.create({
      userId: new mongoose.Types.ObjectId(userId),
      action,
      resourceType,
      resourceId: new mongoose.Types.ObjectId(resourceId),
      details,
      timestamp: new Date(),
      ipAddress: ipAddress || null,
    });

    return logEntry;
  } catch (error) {
    // El registro de auditoría no debe detener el flujo principal si ocurre un error secundario
    console.error("[ActivityLogService] Error al registrar actividad:", error.message);
    return null;
  }
};

/**
 * Obtiene los registros de actividad con soporte para filtros de categoría, acción,
 * usuario, fechas, búsqueda textual y enriquecimiento de metadatos.
 * @param {object} filters
 * @param {'all'|'archivo'|'carpeta'|'compartido'} [filters.category]
 * @param {string} [filters.action]
 * @param {string} [filters.userId]
 * @param {string} [filters.startDate]
 * @param {string} [filters.endDate]
 * @param {string} [filters.search]
 * @param {'desc'|'asc'} [filters.sortOrder='desc']
 * @returns {Promise<Array<object>>}
 */
const getActivityLogs = async (filters = {}) => {
  const {
    category = "all",
    action = "all",
    userId,
    startDate,
    endDate,
    search,
    sortOrder = "desc",
  } = filters;

  const mongoQuery = {};

  // Filtro por categoría principal
  if (category === "archivo") {
    mongoQuery.resourceType = "archivo";
  } else if (category === "carpeta") {
    mongoQuery.resourceType = "carpeta";
  } else if (category === "compartido") {
    mongoQuery.$or = [
      { action: "compartir" },
      { "details.sharedTo": { $exists: true } },
      { "details.sharedToUserId": { $exists: true } },
    ];
  }

  // Filtro por tipo de acción
  if (action && action !== "all") {
    mongoQuery.action = action;
  }

  // Filtro por usuario ejecutor
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    mongoQuery.userId = new mongoose.Types.ObjectId(userId);
  }

  // Filtro por rango de fechas
  if (startDate || endDate) {
    mongoQuery.timestamp = {};
    if (startDate) {
      mongoQuery.timestamp.$gte = new Date(`${startDate}T00:00:00.000Z`);
    }
    if (endDate) {
      mongoQuery.timestamp.$lte = new Date(`${endDate}T23:59:59.999Z`);
    }
  }

  const sortDirection = sortOrder === "asc" ? 1 : -1;

  // Consulta base poblando la información del usuario ejecutor
  const rawLogs = await ActivityLog.find(mongoQuery)
    .populate("userId", "name lastName email role")
    .sort({ timestamp: sortDirection })
    .lean();

  if (!rawLogs || rawLogs.length === 0) {
    return [];
  }

  // Recolectar IDs para resolución en lote de nombres de archivos, carpetas y destinatarios
  const missingFileIds = [];
  const missingFolderIds = [];
  const sharedUserIds = [];
  const folderIdsToLookup = [];

  for (const log of rawLogs) {
    const details = log.details || {};

    if (!details.name) {
      if (log.resourceType === "archivo") {
        missingFileIds.push(log.resourceId);
      } else if (log.resourceType === "carpeta") {
        missingFolderIds.push(log.resourceId);
      }
    }

    if (details.sharedTo && mongoose.Types.ObjectId.isValid(details.sharedTo)) {
      sharedUserIds.push(new mongoose.Types.ObjectId(details.sharedTo));
    }
    if (details.sharedToUserId && mongoose.Types.ObjectId.isValid(details.sharedToUserId)) {
      sharedUserIds.push(new mongoose.Types.ObjectId(details.sharedToUserId));
    }

    if (details.fromFolderId && mongoose.Types.ObjectId.isValid(details.fromFolderId)) {
      folderIdsToLookup.push(new mongoose.Types.ObjectId(details.fromFolderId));
    }
    if (details.toFolderId && mongoose.Types.ObjectId.isValid(details.toFolderId)) {
      folderIdsToLookup.push(new mongoose.Types.ObjectId(details.toFolderId));
    }
  }

  // Consultas complementarias en paralelo
  const [filesFound, foldersFound, sharedUsersFound, lookupFoldersFound] = await Promise.all([
    missingFileIds.length > 0
      ? File.find({ _id: { $in: missingFileIds } }).select("_id name extension sizeBytes").lean()
      : [],
    missingFolderIds.length > 0
      ? Folder.find({ _id: { $in: missingFolderIds } }).select("_id name").lean()
      : [],
    sharedUserIds.length > 0
      ? User.find({ _id: { $in: sharedUserIds } }).select("_id name lastName email").lean()
      : [],
    folderIdsToLookup.length > 0
      ? Folder.find({ _id: { $in: folderIdsToLookup } }).select("_id name").lean()
      : [],
  ]);

  const fileMap = new Map(filesFound.map((f) => [f._id.toString(), f]));
  const folderMap = new Map(foldersFound.map((f) => [f._id.toString(), f]));
  const userMap = new Map(sharedUsersFound.map((u) => [u._id.toString(), u]));
  const lookupFolderMap = new Map(lookupFoldersFound.map((f) => [f._id.toString(), f]));

  // Formatear y enriquecer cada registro para el frontend
  let formattedLogs = rawLogs.map((log) => {
    const details = { ...(log.details || {}) };
    const user = log.userId;

    const resourceIdStr = log.resourceId ? log.resourceId.toString() : "";
    let resourceName = details.name || details.newName || details.oldName || "";

    if (!resourceName) {
      if (log.resourceType === "archivo" && fileMap.has(resourceIdStr)) {
        const f = fileMap.get(resourceIdStr);
        resourceName = f.name;
        if (!details.extension && f.extension) {
          details.extension = f.extension;
        }
        if (!details.fileSizeBytes && f.sizeBytes) {
          details.fileSizeBytes = f.sizeBytes;
        }
      } else if (log.resourceType === "carpeta" && folderMap.has(resourceIdStr)) {
        resourceName = folderMap.get(resourceIdStr).name;
      } else {
        resourceName =
          log.resourceType === "carpeta" ? "Carpeta del sistema" : "Archivo del sistema";
      }
    }

    // Enriquecer destinatario de compartición
    const sharedTargetId = details.sharedTo || details.sharedToUserId;
    if (sharedTargetId && userMap.has(sharedTargetId.toString())) {
      const targetUser = userMap.get(sharedTargetId.toString());
      details.sharedToUserId = targetUser._id.toString();
      details.sharedToUserName = `${targetUser.name || ""} ${targetUser.lastName || ""}`.trim();
      details.sharedToUserEmail = targetUser.email || "";
    }

    // Enriquecer nombres de carpetas en traslados
    if (details.fromFolderId && lookupFolderMap.has(details.fromFolderId.toString())) {
      details.fromFolderName = lookupFolderMap.get(details.fromFolderId.toString()).name;
    }
    if (details.toFolderId && lookupFolderMap.has(details.toFolderId.toString())) {
      details.toFolderName = lookupFolderMap.get(details.toFolderId.toString()).name;
    }

    const userName = user
      ? `${user.name || ""} ${user.lastName || ""}`.trim()
      : "Usuario no disponible";
    const userEmail = user?.email || "";
    const userRole = user?.role || "usuario";

    return {
      _id: log._id.toString(),
      userId: user?._id ? user._id.toString() : (log.userId?.toString() || ""),
      userName,
      userEmail,
      userRole,
      action: log.action,
      resourceType: log.resourceType,
      resourceId: resourceIdStr,
      resourceName,
      details,
      timestamp: log.timestamp,
      ipAddress: log.ipAddress || "127.0.0.1",
    };
  });

  // Filtro de búsqueda textual flexible
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    formattedLogs = formattedLogs.filter((item) => {
      const matchUser =
        item.userName.toLowerCase().includes(term) ||
        item.userEmail.toLowerCase().includes(term) ||
        item.userRole.toLowerCase().includes(term);

      const matchResource =
        item.resourceName.toLowerCase().includes(term) ||
        item.resourceType.toLowerCase().includes(term) ||
        item.resourceId.toLowerCase().includes(term);

      const matchAction = item.action.toLowerCase().includes(term);

      const matchDetails = item.details
        ? JSON.stringify(item.details).toLowerCase().includes(term)
        : false;

      return matchUser || matchResource || matchAction || matchDetails;
    });
  }

  return formattedLogs;
};

module.exports = {
  logActivity,
  getActivityLogs,
};
