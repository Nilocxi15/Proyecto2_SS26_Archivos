const Folder = require("../models/Folder");
const File = require("../models/File");
const User = require("../models/User");
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
  const cleanName = name;
  let cleanParentId = null;
  let path = `/${cleanName}`;
  let ancestors = [];

  if (parentId && parentId !== "null" && parentId !== "root") {
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
  const userObjectId = new mongoose.Types.ObjectId(userId);

  let ext = extension
    ? extension.replace(".", "").toLowerCase()
    : name.toLowerCase().endsWith(".md")
      ? "md"
      : "txt";

  if (ext !== "txt" && ext !== "md") {
    ext = "txt";
  }

  let cleanName = name.trim();
  const suffix = `.${ext}`;
  if (!cleanName.toLowerCase().endsWith(suffix)) {
    cleanName = `${cleanName}${suffix}`;
  }

  let cleanFolderId = null;
  if (folderId && folderId !== "null" && folderId !== "root") {
    cleanFolderId = new mongoose.Types.ObjectId(folderId);
    const parentFolder = await Folder.findOne({
      _id: cleanFolderId,
      ownerId: userObjectId,
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
    ownerId: userObjectId,
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
    ownerId: userObjectId,
    tags: Array.isArray(tags) ? tags : [],
    sharedWith: [],
    comments: [],
  });

  const owner = await User.findById(userObjectId)
    .select("name lastName email")
    .lean();

  return {
    _id: newFile._id,
    name: newFile.name,
    extension: newFile.extension,
    sizeBytes: newFile.sizeBytes,
    content: newFile.content,
    folderId: newFile.folderId,
    tags: newFile.tags || [],
    sharedWith: [],
    comments: [],
    isTrash: false,
    myPermission: "propietario",
    ownerId: userObjectId,
    ownerName: owner
      ? `${owner.name || ""} ${owner.lastName || ""}`.trim()
      : "Propietario",
    ownerEmail: owner ? owner.email : "",
    createdAt: newFile.createdAt,
    updatedAt: newFile.updatedAt,
  };
};


/**
 * Obtiene todas las carpetas activas del usuario ordenadas jerárquicamente por ruta
 * @param {string|mongoose.Types.ObjectId} userId
 */
const getAllFolders = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const folders = await Folder.find({
    ownerId: userObjectId,
    isTrash: false,
  })
    .select("_id name path parentId")
    .sort({ path: 1 })
    .lean();

  return folders;
};

/**
 * Mueve un archivo a otra carpeta de destino o a la raíz
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} fileId
 * @param {string|null} targetFolderId
 */
const moveFile = async (userId, fileId, targetFolderId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const fileObjectId = new mongoose.Types.ObjectId(fileId);

  const file = await File.findOne({
    _id: fileObjectId,
    ownerId: userObjectId,
    isTrash: false,
  });

  if (!file) {
    const error = new Error("El archivo no existe o no tienes permisos sobre él");
    error.statusCode = 404;
    throw error;
  }

  let cleanTargetFolderId = null;
  let targetPathText = "la raíz (/)";

  if (targetFolderId && targetFolderId !== "null" && targetFolderId !== "root") {
    cleanTargetFolderId = new mongoose.Types.ObjectId(targetFolderId);
    const targetFolder = await Folder.findOne({
      _id: cleanTargetFolderId,
      ownerId: userObjectId,
      isTrash: false,
    });

    if (!targetFolder) {
      const error = new Error(
        "La carpeta de destino no existe o no tienes permisos sobre ella",
      );
      error.statusCode = 404;
      throw error;
    }
    targetPathText = targetFolder.path || targetFolder.name;
  }

  // Verificar si ya está en esa ubicación
  const currentFolderStr = file.folderId ? file.folderId.toString() : null;
  const targetFolderStr = cleanTargetFolderId
    ? cleanTargetFolderId.toString()
    : null;
  if (currentFolderStr === targetFolderStr) {
    const error = new Error(
      "El archivo ya se encuentra en la carpeta de destino seleccionada",
    );
    error.statusCode = 400;
    throw error;
  }

  // Verificar colisión de nombres en la carpeta destino
  const existingFile = await File.findOne({
    _id: { $ne: file._id },
    ownerId: userObjectId,
    folderId: cleanTargetFolderId,
    name: file.name,
    isTrash: false,
  });

  if (existingFile) {
    const error = new Error(
      `Ya existe un archivo con el nombre "${file.name}" en ${targetPathText}`,
    );
    error.statusCode = 409;
    throw error;
  }

  file.folderId = cleanTargetFolderId;
  await file.save();

  return file;
};

module.exports = {
  getMyFiles,
  createFolder,
  createFile,
  getAllFolders,
  moveFile,
};

