const Folder = require("../models/Folder");
const File = require("../models/File");
const mongoose = require("mongoose");

/**
 * Formatea un recurso compartido extrayendo datos del propietario y el permiso asignado al usuario
 * @param {object} item - Documento de carpeta o archivo
 * @param {mongoose.Types.ObjectId} userObjectId - ID del usuario autenticado
 * @param {string} fallbackPermission - Permiso heredado en caso de navegar dentro de una subcarpeta
 */
const formatSharedResource = (
  item,
  userObjectId,
  fallbackPermission = "lectura",
) => {
  if (!item) return null;

  const ownerObj =
    item.ownerId && typeof item.ownerId === "object" && item.ownerId._id
      ? item.ownerId
      : null;

  const ownerId = ownerObj ? ownerObj._id : item.ownerId;
  const ownerName = ownerObj
    ? `${ownerObj.name || ""} ${ownerObj.lastName || ""}`.trim()
    : undefined;
  const ownerEmail = ownerObj ? ownerObj.email : undefined;

  const shareEntry = (item.sharedWith || []).find(
    (s) => s.userId && s.userId.toString() === userObjectId.toString(),
  );
  const myPermission = shareEntry ? shareEntry.permission : fallbackPermission;

  return {
    ...item,
    ownerId,
    ownerName,
    ownerEmail,
    myPermission,
  };
};

/**
 * Obtiene las carpetas y archivos compartidos con el usuario autenticado
 * Permite listar la raíz de compartidos o explorar dentro de una carpeta compartida
 * @param {string|mongoose.Types.ObjectId} userId - ID del usuario autenticado
 * @param {string|null} folderId - ID de la carpeta compartida a explorar (opcional)
 * @returns {Promise<{currentFolder: object|null, breadcrumbs: Array, folders: Array, files: Array}>}
 */
const getSharedWithMe = async (userId, folderId = null) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  let currentFolder = null;
  let breadcrumbs = [];

  // Si se solicita explorar dentro de una carpeta compartida específica
  if (folderId && folderId !== "null" && folderId !== "root") {
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      const error = new Error("El identificador de la carpeta no es válido");
      error.statusCode = 400;
      throw error;
    }

    const targetFolderId = new mongoose.Types.ObjectId(folderId);

    const folderDoc = await Folder.findOne({
      _id: targetFolderId,
      isTrash: false,
    })
      .populate("ownerId", "name lastName email")
      .lean();

    if (!folderDoc) {
      const error = new Error(
        "La carpeta solicitada no existe o fue eliminada",
      );
      error.statusCode = 404;
      throw error;
    }

    // Verificar si el usuario tiene acceso directo a la carpeta o a través de una carpeta ancestro compartida
    const directShare = (folderDoc.sharedWith || []).find(
      (s) => s.userId && s.userId.toString() === userObjectId.toString(),
    );

    let ancestorFolders = [];
    if (folderDoc.ancestors && folderDoc.ancestors.length > 0) {
      ancestorFolders = await Folder.find({
        _id: { $in: folderDoc.ancestors },
        isTrash: false,
      })
        .select("_id name sharedWith")
        .lean();
    }

    const ancestorMap = new Map(
      ancestorFolders.map((f) => [f._id.toString(), f]),
    );
    const orderedAncestors = (folderDoc.ancestors || [])
      .map((id) => ancestorMap.get(id.toString()))
      .filter(Boolean);

    const firstSharedAncestorIndex = orderedAncestors.findIndex((anc) =>
      (anc.sharedWith || []).some(
        (s) => s.userId && s.userId.toString() === userObjectId.toString(),
      ),
    );

    if (!directShare && firstSharedAncestorIndex === -1) {
      const error = new Error(
        "No tienes permisos para acceder a esta carpeta compartida",
      );
      error.statusCode = 403;
      throw error;
    }

    // Determinar el permiso efectivo heredado o directo
    let effectivePermission = directShare ? directShare.permission : "lectura";
    if (!directShare && firstSharedAncestorIndex !== -1) {
      for (
        let i = orderedAncestors.length - 1;
        i >= firstSharedAncestorIndex;
        i--
      ) {
        const entry = (orderedAncestors[i].sharedWith || []).find(
          (s) => s.userId && s.userId.toString() === userObjectId.toString(),
        );
        if (entry) {
          effectivePermission = entry.permission;
          break;
        }
      }
    }

    // Construir breadcrumbs desde el primer ancestro compartido accesible
    if (firstSharedAncestorIndex !== -1) {
      breadcrumbs = orderedAncestors
        .slice(firstSharedAncestorIndex)
        .map((anc) => ({
          _id: anc._id,
          name: anc.name,
        }));
    }

    breadcrumbs.push({
      _id: folderDoc._id,
      name: folderDoc.name,
    });

    currentFolder = formatSharedResource(
      folderDoc,
      userObjectId,
      effectivePermission,
    );

    const [rawFolders, rawFiles] = await Promise.all([
      Folder.find({
        parentId: targetFolderId,
        isTrash: false,
      })
        .populate("ownerId", "name lastName email")
        .sort({ name: 1 })
        .lean(),

      File.find({
        folderId: targetFolderId,
        isTrash: false,
      })
        .select("-content")
        .populate("ownerId", "name lastName email")
        .sort({ name: 1 })
        .lean(),
    ]);

    return {
      currentFolder,
      breadcrumbs,
      folders: rawFolders.map((f) =>
        formatSharedResource(f, userObjectId, effectivePermission),
      ),
      files: rawFiles.map((file) =>
        formatSharedResource(file, userObjectId, effectivePermission),
      ),
    };
  }

  // Nivel raíz de "Compartido conmigo": recursos donde el usuario figura en sharedWith
  const [rawFolders, rawFiles] = await Promise.all([
    Folder.find({
      "sharedWith.userId": userObjectId,
      isTrash: false,
    })
      .populate("ownerId", "name lastName email")
      .sort({ name: 1 })
      .lean(),

    File.find({
      "sharedWith.userId": userObjectId,
      isTrash: false,
    })
      .select("-content")
      .populate("ownerId", "name lastName email")
      .sort({ name: 1 })
      .lean(),
  ]);

  return {
    currentFolder: null,
    breadcrumbs: [],
    folders: rawFolders.map((f) => formatSharedResource(f, userObjectId)),
    files: rawFiles.map((file) => formatSharedResource(file, userObjectId)),
  };
};

module.exports = {
  getSharedWithMe,
};