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

/**
 * Obtiene los archivos y carpetas en la papelera (isTrash: true) del usuario autenticado
 * @param {string|mongoose.Types.ObjectId} userId - ID del usuario autenticado
 * @param {string|null} folderId - ID de una carpeta en papelera si se navega dentro de ella
 * @returns {Promise<{currentFolder: object|null, breadcrumbs: Array, folders: Array, files: Array}>}
 */
const getTrash = async (userId, folderId = null) => {
  let currentFolder = null;
  let breadcrumbs = [];

  // Formateo de dirección original de archivos en papelera
  const formatTrashedFile = (file) => ({
    ...file,
    folderId: file.folderId?._id || file.folderId || null,
    path: file.folderId?.path || "Raíz (/)",
  });

  // Si se navega dentro de una carpeta específica de la papelera
  if (folderId && folderId !== "null" && folderId !== "root") {
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      const error = new Error("El identificador de la carpeta no es válido");
      error.statusCode = 400;
      throw error;
    }

    const targetFolderId = new mongoose.Types.ObjectId(folderId);

    currentFolder = await Folder.findOne({
      _id: targetFolderId,
      ownerId: userId,
      isTrash: true,
    }).lean();

    if (!currentFolder) {
      const error = new Error(
        "Carpeta no encontrada en la papelera o no tienes permisos para acceder a ella",
      );
      error.statusCode = 404;
      throw error;
    }

    // Construir breadcrumbs con ancestros que también estén en la papelera
    if (currentFolder.ancestors && currentFolder.ancestors.length > 0) {
      const ancestorFolders = await Folder.find({
        _id: { $in: currentFolder.ancestors },
        ownerId: userId,
        isTrash: true,
      })
        .select("_id name")
        .lean();

      const ancestorMap = new Map(
        ancestorFolders.map((f) => [f._id.toString(), f]),
      );
      breadcrumbs = currentFolder.ancestors
        .map((id) => ancestorMap.get(id.toString()))
        .filter(Boolean);
    }

    breadcrumbs.push({
      _id: currentFolder._id,
      name: currentFolder.name,
    });

    const [folders, files] = await Promise.all([
      Folder.find({
        ownerId: userId,
        parentId: targetFolderId,
      })
        .sort({ name: 1 })
        .lean(),

      File.find({
        ownerId: userId,
        folderId: targetFolderId,
      })
        .select("-content")
        .populate("folderId", "name path")
        .sort({ trashedAt: -1, name: 1 })
        .lean(),
    ]);

    return {
      currentFolder,
      breadcrumbs,
      folders,
      files: files.map(formatTrashedFile),
    };
  }

  // Nivel raíz de la papelera: todos los recursos del usuario con isTrash: true
  const [trashedFolders, trashedFiles] = await Promise.all([
    Folder.find({
      ownerId: userId,
      isTrash: true,
    })
      .sort({ trashedAt: -1, name: 1 })
      .lean(),

    File.find({
      ownerId: userId,
      isTrash: true,
    })
      .select("-content")
      .populate("folderId", "name path")
      .sort({ trashedAt: -1, name: 1 })
      .lean(),
  ]);

  // Evitar duplicar en la raíz elementos cuyo contenedor padre ya está listado en la papelera
  const trashedFolderIds = new Set(trashedFolders.map((f) => f._id.toString()));

  const rootTrashFolders = trashedFolders.filter(
    (f) => !f.parentId || !trashedFolderIds.has(f.parentId.toString()),
  );
  const rootTrashFiles = trashedFiles
    .map(formatTrashedFile)
    .filter(
      (file) =>
        !file.folderId || !trashedFolderIds.has(file.folderId.toString()),
    );

  return {
    currentFolder: null,
    breadcrumbs: [],
    folders: rootTrashFolders,
    files: rootTrashFiles,
  };
};

/**
 * Cambia el estado de un archivo o carpeta a "papelera" (isTrash: true) o lo restaura (isTrash: false)
 * @param {string|mongoose.Types.ObjectId} userId - ID del usuario autenticado
 * @param {string} resourceId - ID del archivo o carpeta a mover a la papelera o restaurar
 * @param {boolean} moveToTrash - true para mover a la papelera, false para restaurar
 */
const moveToTrashOrRestore = async (userId, resourceId, moveToTrash) => {
  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    const error = new Error("El identificador del archivo no es válido");
    error.statusCode = 400;
    throw error;
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Intentar encontrar el recurso como carpeta
  const folder = await Folder.findOne({
    _id: resourceId,
    ownerId: userObjectId,
  });

  const isTrashBool = Boolean(moveToTrash);
  const trashedAtDate = isTrashBool ? new Date() : null;

  if (folder) {
    folder.isTrash = moveToTrash;
    folder.trashedAt = moveToTrash ? new Date() : null;
    await folder.save();

    // Obtener todas las subcarpetas descendientes de esta carpeta
    const subFolders = await Folder.find({
      ownerId: userObjectId,
      ancestors: folder._id,
    }).select("_id");

    const allFoldersIds = [folder._id, ...subFolders.map((sf) => sf._id)];

    // Aplicar el mismo estado a subcarpetas y archivos contenidos
    await Promise.all([
      Folder.updateMany(
        { _id: { $in: allFoldersIds }, ownerId: userObjectId },
        { $set: { isTrash: isTrashBool, trashedAt: trashedAtDate } },
      ),
      File.updateMany(
        { folderId: { $in: allFoldersIds }, ownerId: userObjectId },
        { $set: { isTrash: isTrashBool, trashedAt: trashedAtDate } },
      ),
    ]);

    return { type: "folder", resource: folder };
  }

  // Si no se encuentra como carpeta, intentar encontrarlo como archivo
  const file = await File.findOne({
    _id: resourceId,
    ownerId: userObjectId,
  }).select("-content");

  if (file) {
    file.isTrash = moveToTrash;
    file.trashedAt = moveToTrash ? new Date() : null;
    await file.save();
    return { type: "file", resource: file };
  }

  const error = new Error("El recurso no existe o no pertenece al usuario");
  error.statusCode = 404;
  throw error;
};

/**
 * Borrado permanente de un archivo o carpeta (y sus descendientes) en la papelera
 * @param {string|mongoose.Types.ObjectId} userId - ID del usuario autenticado
 * @param {string} resourceId - ID del archivo o carpeta a eliminar permanentemente
 */

const deleteResourcePermanently = async (userId, resourceId) => {
  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    const error = new Error("El identificador del recurso no es válido");
    error.statusCode = 400;
    throw error;
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);

  // Intentar encontrar el recurso como carpeta
  const folder = await Folder.findOne({
    _id: resourceId,
    ownerId: userObjectId,
  });

  if (folder) {
    if (!folder.isTrash) {
      const error = new Error(
        "La carpeta debe estar en la papelera para poder eliminarla permanentemente",
      );
      error.statusCode = 400;
      throw error;
    }

    // Obtener todas las subcarpetas descendientes de esta carpeta
    const subFolders = await Folder.find({
      ownerId: userObjectId,
      ancestors: folder._id,
    }).select("_id");

    const allFoldersIds = [folder._id, ...subFolders.map((sf) => sf._id)];

    // Eliminar físicamente los archivos contenidos y las carpetas (raíz + descendientes)
    await Promise.all([
      File.deleteMany({
        folderId: { $in: allFoldersIds },
        ownerId: userObjectId,
      }),
      Folder.deleteMany({
        _id: { $in: allFoldersIds },
        ownerId: userObjectId,
      }),
    ]);

    return { type: "folder", name: folder.name };
  }

  // Si no se encuentra como carpeta, intentar encontrarlo como archivo
  const file = await File.findOne({
    _id: resourceId,
    ownerId: userObjectId,
  }).select("-content");

  if (file) {
    if (!file.isTrash) {
      const error = new Error(
        "El archivo debe estar en la papelera para poder eliminarlo permanentemente",
      );
      error.statusCode = 400;
      throw error;
    }

    // Eliminar físicamente el archivo
    await File.deleteOne({ _id: file._id, ownerId: userObjectId });

    return { type: "file", name: file.name };
  }

  const error = new Error("El recurso no existe o no pertenece al usuario");
  error.statusCode = 404;
  throw error;
};

/**
 * Obtiene un archivo para su descarga verificando permisos y que no esté en la papelera (isTrash: false)
 * @param {string|mongoose.Types.ObjectId} userId - ID del usuario autenticado
 * @param {string} fileId - ID del archivo a descargar
 * @returns {Promise<{fileName: string, extension: string, content: string, mimeType: string}>}
 */
const getFileForDownload = async (userId, fileId) => {
  if (!fileId || !mongoose.Types.ObjectId.isValid(fileId)) {
    const error = new Error("El identificador del archivo no es válido");
    error.statusCode = 400;
    throw error;
  }

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const file = await File.findById(fileId).lean();

  if (!file) {
    const error = new Error("El archivo solicitado no existe");
    error.statusCode = 404;
    throw error;
  }

  if (file.isTrash) {
    const error = new Error(
      "No es posible descargar un archivo que se encuentra en la papelera",
    );
    error.statusCode = 400;
    throw error;
  }

  // Verificar permisos: propietario directo, compartido en el archivo, o compartido en carpeta contenedora/ancestro
  const isOwner = file.ownerId.toString() === userObjectId.toString();
  const isDirectlyShared = (file.sharedWith || []).some(
    (s) => s.userId && s.userId.toString() === userObjectId.toString(),
  );

  let isFolderShared = false;
  if (!isOwner && !isDirectlyShared && file.folderId) {
    const parentFolder = await Folder.findOne({
      _id: file.folderId,
      isTrash: false,
    })
      .select("_id sharedWith ancestors")
      .lean();

    if (parentFolder) {
      const directFolderShare = (parentFolder.sharedWith || []).some(
        (s) => s.userId && s.userId.toString() === userObjectId.toString(),
      );

      if (directFolderShare) {
        isFolderShared = true;
      } else if (parentFolder.ancestors && parentFolder.ancestors.length > 0) {
        const sharedAncestorCount = await Folder.countDocuments({
          _id: { $in: parentFolder.ancestors },
          isTrash: false,
          "sharedWith.userId": userObjectId,
        });
        isFolderShared = sharedAncestorCount > 0;
      }
    }
  }

  if (!isOwner && !isDirectlyShared && !isFolderShared) {
    const error = new Error("No tienes permisos para descargar este archivo");
    error.statusCode = 403;
    throw error;
  }

  const ext = (file.extension || "txt").replace(".", "").toLowerCase();
  const suffix = `.${ext}`;
  const cleanName = (file.name || "documento").trim();
  const fileName = cleanName.toLowerCase().endsWith(suffix)
    ? cleanName
    : `${cleanName}${suffix}`;

  const mimeType =
    ext === "md" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8";

  return {
    fileName,
    extension: ext,
    content: file.content || "",
    mimeType,
  };
};

module.exports = {
  getSharedWithMe,
  getTrash,
  moveToTrashOrRestore,
  deleteResourcePermanently,
  getFileForDownload,  
};
