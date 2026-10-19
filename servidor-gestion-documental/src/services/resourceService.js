const Folder = require("../models/Folder");
const File = require("../models/File");
const mongoose = require("mongoose");

/**
 * Obtiene los archivos y carpetas del usuario según el directorio actual (raíz o dentro de una carpeta)
 * @param {string|mongoose.Types.ObjectId} userId - ID del usuario autenticado
 * @param {string|null} folderId - ID de la carpeta contenedora (opcional; null si es la raíz)
 * @returns {Promise<{currentFolder: object|null, breadcrumbs: Array, folders: Array, files: Array}>}
 */
const getMyFiles = async (userId, folderId = null) => {
  let targetFolderId = null;
  let currentFolder = null;
  let breadcrumbs = [];

  // Si se solicita navegar dentro de una carpeta específica, validamos que exista y pertenezca al usuario
  if (folderId && folderId !== "null" && folderId !== "root") {
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      const error = new Error("El identificador de la carpeta no es válido");
      error.statusCode = 400;
      throw error;
    }

    targetFolderId = new mongoose.Types.ObjectId(folderId);

    // Buscar la carpeta contenedora activa
    currentFolder = await Folder.findOne({
      _id: targetFolderId,
      ownerId: userId,
      isTrash: false,
    });

    if (!currentFolder) {
      const error = new Error(
        "Carpeta no encontrada o no tienes permisos para acceder a ella",
      );
      error.statusCode = 404;
      throw error;
    }

    // Construir la ruta de navegación (breadcrumbs) recuperando los ancestros
    if (currentFolder.ancestors && currentFolder.ancestors.length > 0) {
      const ancestorFolders = await Folder.find({
        _id: { $in: currentFolder.ancestors },
        ownerId: userId,
        isTrash: false,
      }).select("_id name");

      // Ordenar los ancestros según el orden exacto del array 'ancestors'
      const ancestorMap = new Map(
        ancestorFolders.map((f) => [f._id.toString(), f]),
      );
      breadcrumbs = currentFolder.ancestors
        .map((id) => ancestorMap.get(id.toString()))
        .filter(Boolean);
    }

    // Agregar la carpeta actual al final de los breadcrumbs
    breadcrumbs.push({
      _id: currentFolder._id,
      name: currentFolder.name,
    });
  }

  // Consultas en paralelo para optimizar el rendimiento
  const [folders, files] = await Promise.all([
    Folder.find({
      ownerId: userId,
      parentId: targetFolderId,
      isTrash: false,
    })
      .sort({ name: 1 })
      .lean(),

    File.find({
      ownerId: userId,
      folderId: targetFolderId,
      isTrash: false,
    })
      .select("-content") // No transferir el cuerpo del archivo en el listado general
      .sort({ name: 1 })
      .lean(),
  ]);

  return {
    currentFolder,
    breadcrumbs,
    folders,
    files,
  };
};

/**
 * Crea una nueva carpeta para el usuario
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {{name: string, parentId?: string|null}} data
 */
const createFolder = async (userId, { name, parentId = null }) => {
  if (!name || !name.trim()) {
    const error = new Error("El nombre de la carpeta es obligatorio");
    error.statusCode = 400;
    throw error;
  }

  const cleanName = name.trim();
  let cleanParentId = null;
  let path = `/${cleanName}`;
  let ancestors = [];

  if (parentId && parentId !== "null" && parentId !== "root") {
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      const error = new Error(
        "El identificador de la carpeta padre no es válido",
      );
      error.statusCode = 400;
      throw error;
    }

    cleanParentId = new mongoose.Types.ObjectId(parentId);
    const parentFolder = await Folder.findOne({
      _id: cleanParentId,
      ownerId: userId,
      isTrash: false,
    });
    if (!parentFolder) {
      const error = new Error(
        "La carpeta contenedora no existe o no tienes permisos",
      );
      error.statusCode = 404;
      throw error;
    }

    path = `${parentFolder.path}/${cleanName}`;
    ancestors = [...parentFolder.ancestors, parentFolder._id];
  }

  // Comprobar que no exista otra carpeta con el mismo nombre en el mismo nivel
  const existingFolder = await Folder.findOne({
    ownerId: userId,
    parentId: cleanParentId,
    name: cleanName,
    isTrash: false,
  });

  if (existingFolder) {
    const error = new Error(
      "Ya existe una carpeta con ese nombre en esta ubicación",
    );
    error.statusCode = 409;
    throw error;
  }

  const newFolder = await Folder.create({
    name: cleanName,
    ownerId: userId,
    parentId: cleanParentId,
    path,
    ancestors,
    sharedWith: [],
  });

  return newFolder;
};

/**
 * Registra y almacena un nuevo archivo .txt o .md en MongoDB
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {{name: string, extension?: string, content?: string, folderId?: string|null, tags?: Array}} data
 */
const createFile = async (
  userId,
  { name, extension, content = "", folderId = null, tags = [] },
) => {
  if (!name || !name.trim()) {
    const error = new Error("El nombre del archivo es obligatorio");
    error.statusCode = 400;
    throw error;
  }

  const cleanName = name.trim();
  let ext = extension
    ? extension.replace(".", "").toLowerCase()
    : cleanName.endsWith(".md")
      ? "md"
      : "txt";

  if (ext !== "txt" && ext !== "md") {
    const error = new Error(
      "Solo se permiten archivos con extensión .txt o .md",
    );
    error.statusCode = 400;
    throw error;
  }

  let cleanFolderId = null;
  if (folderId && folderId !== "null" && folderId !== "root") {
    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      const error = new Error("El identificador de la carpeta no es válido");
      error.statusCode = 400;
      throw error;
    }

    cleanFolderId = new mongoose.Types.ObjectId(folderId);
    const parentFolder = await Folder.findOne({
      _id: cleanFolderId,
      ownerId: userId,
      isTrash: false,
    });
    if (!parentFolder) {
      const error = new Error(
        "La carpeta contenedora no existe o no tienes permisos",
      );
      error.statusCode = 404;
      throw error;
    }
  }

  // Comprobar duplicado en la misma ubicación
  const existingFile = await File.findOne({
    ownerId: userId,
    folderId: cleanFolderId,
    name: cleanName,
    isTrash: false,
  });

  if (existingFile) {
    const error = new Error(
      "Ya existe un archivo con ese nombre en esta ubicación",
    );
    error.statusCode = 409;
    throw error;
  }

  const fileContent = String(content || "");
  const sizeBytes = Buffer.byteLength(fileContent, "utf8");

  const newFile = await File.create({
    name: cleanName,
    extension: ext,
    sizeBytes,
    content: fileContent,
    folderId: cleanFolderId,
    ownerId: userId,
    tags: Array.isArray(tags) ? tags : [],
    sharedWith: [],
  });

  return newFile;
};

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
  getMyFiles,
  getSharedWithMe,
  getTrash,
  moveToTrashOrRestore,
  getFileForDownload,
  createFolder,
  createFile,
};
