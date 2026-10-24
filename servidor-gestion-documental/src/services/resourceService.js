const Folder = require("../models/Folder");
const File = require("../models/File");
const User = require("../models/User");
const mongoose = require("mongoose");
const { logActivity } = require("./activityLogService");

/**
 * Determina el nivel de acceso efectivo del usuario sobre un archivo
 * @param {mongoose.Types.ObjectId} userObjectId
 * @param {object} fileDoc
 * @returns {Promise<'propietario'|'edicion'|'comentar'|'lectura'|null>}
 */
const resolveFilePermission = async (userObjectId, fileDoc) => {
  const fileOwnerId = fileDoc.ownerId?._id || fileDoc.ownerId;
  if (fileOwnerId.toString() === userObjectId.toString()) {
    return "propietario";
  }

  // Permiso directo en el archivo
  const directShare = (fileDoc.sharedWith || []).find(
    (s) =>
      s.userId &&
      (s.userId._id || s.userId).toString() === userObjectId.toString(),
  );
  if (directShare) {
    return directShare.permission;
  }

  // Permiso heredado de carpeta contenedora o ancestros
  if (fileDoc.folderId) {
    const parentFolder = await Folder.findOne({
      _id: fileDoc.folderId,
      isTrash: false,
    }).lean();

    if (parentFolder) {
      if (parentFolder.ownerId.toString() === userObjectId.toString()) {
        return "propietario";
      }

      const directFolderShare = (parentFolder.sharedWith || []).find(
        (s) =>
          s.userId &&
          (s.userId._id || s.userId).toString() === userObjectId.toString(),
      );
      if (directFolderShare) {
        return directFolderShare.permission;
      }

      if (parentFolder.ancestors && parentFolder.ancestors.length > 0) {
        const ancestorFolders = await Folder.find({
          _id: { $in: parentFolder.ancestors },
          isTrash: false,
          "sharedWith.userId": userObjectId,
        }).lean();

        if (ancestorFolders.length > 0) {
          const ancestorMap = new Map(
            ancestorFolders.map((f) => [f._id.toString(), f]),
          );
          for (let i = parentFolder.ancestors.length - 1; i >= 0; i--) {
            const anc = ancestorMap.get(parentFolder.ancestors[i].toString());
            if (anc) {
              const entry = (anc.sharedWith || []).find(
                (s) =>
                  s.userId &&
                  (s.userId._id || s.userId).toString() ===
                    userObjectId.toString(),
              );
              if (entry) return entry.permission;
            }
          }
        }
      }
    }
  }

  return null;
};

/**
 * Determina el nivel de acceso efectivo del usuario sobre una carpeta
 * @param {mongoose.Types.ObjectId} userObjectId
 * @param {object} folderDoc
 * @returns {Promise<'propietario'|'edicion'|'comentar'|'lectura'|null>}
 */
const resolveFolderPermission = async (userObjectId, folderDoc) => {
  const folderOwnerId = folderDoc.ownerId?._id || folderDoc.ownerId;
  if (folderOwnerId && folderOwnerId.toString() === userObjectId.toString()) {
    return "propietario";
  }

  // Permiso directo en la carpeta
  const directShare = (folderDoc.sharedWith || []).find(
    (s) =>
      s.userId &&
      (s.userId._id || s.userId).toString() === userObjectId.toString(),
  );
  if (directShare) {
    return directShare.permission;
  }

  // Permiso heredado de ancestros
  if (folderDoc.ancestors && folderDoc.ancestors.length > 0) {
    const ancestorFolders = await Folder.find({
      _id: { $in: folderDoc.ancestors },
      isTrash: false,
      "sharedWith.userId": userObjectId,
    }).lean();

    if (ancestorFolders.length > 0) {
      const ancestorMap = new Map(
        ancestorFolders.map((f) => [f._id.toString(), f]),
      );
      for (let i = folderDoc.ancestors.length - 1; i >= 0; i--) {
        const anc = ancestorMap.get(folderDoc.ancestors[i].toString());
        if (anc) {
          const entry = (anc.sharedWith || []).find(
            (s) =>
              s.userId &&
              (s.userId._id || s.userId).toString() === userObjectId.toString(),
          );
          if (entry) return entry.permission;
        }
      }
    }
  }

  return null;
};

/**
 * Obtiene el detalle completo de una carpeta (metadatos, colaboradores y conteo de elementos)
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} folderId
 */
const getFolderDetails = async (userId, folderId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const folder = await Folder.findById(folderId)
    .populate("ownerId", "name lastName email")
    .populate("sharedWith.userId", "name lastName email");

  if (!folder) {
    const error = new Error("La carpeta solicitada no existe");
    error.statusCode = 404;
    throw error;
  }

  if (folder.isTrash) {
    const error = new Error(
      "No es posible acceder a una carpeta que se encuentra en la papelera",
    );
    error.statusCode = 400;
    throw error;
  }

  const permission = await resolveFolderPermission(userObjectId, folder);
  if (!permission) {
    const error = new Error("No tienes permisos para acceder a esta carpeta");
    error.statusCode = 403;
    throw error;
  }

  const [subfolderCount, fileCount] = await Promise.all([
    Folder.countDocuments({ parentId: folder._id, isTrash: false }),
    File.countDocuments({ folderId: folder._id, isTrash: false }),
  ]);

  const ownerObj = folder.ownerId;
  const ownerName = ownerObj
    ? `${ownerObj.name || ""} ${ownerObj.lastName || ""}`.trim()
    : "Propietario";
  const ownerEmail = ownerObj ? ownerObj.email : "";

  const formattedSharedWith = (folder.sharedWith || []).map((s) => ({
    userId: s.userId?._id || s.userId,
    userName: s.userId
      ? `${s.userId.name || ""} ${s.userId.lastName || ""}`.trim()
      : "Usuario",
    userEmail: s.userId?.email || "",
    permission: s.permission,
  }));

  return {
    _id: folder._id,
    name: folder.name,
    path: folder.path,
    parentId: folder.parentId,
    ownerId: ownerObj?._id || folder.ownerId,
    ownerName,
    ownerEmail,
    myPermission: permission,
    sharedWith: formattedSharedWith,
    itemCount: subfolderCount + fileCount,
    subfolderCount,
    fileCount,
    isTrash: folder.isTrash,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
};

/**
 * Obtiene el detalle completo de un archivo (contenido, comentarios y usuarios compartidos)
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} fileId
 */
const getFileDetails = async (userId, fileId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const file = await File.findById(fileId)
    .populate("ownerId", "name lastName email")
    .populate("sharedWith.userId", "name lastName email")
    .populate("comments.authorId", "name lastName email");

  if (!file) {
    const error = new Error("El archivo solicitado no existe");
    error.statusCode = 404;
    throw error;
  }

  if (file.isTrash) {
    const error = new Error(
      "No es posible acceder a un archivo que se encuentra en la papelera",
    );
    error.statusCode = 400;
    throw error;
  }

  const permission = await resolveFilePermission(userObjectId, file);
  if (!permission) {
    const error = new Error("No tienes permisos para acceder a este archivo");
    error.statusCode = 403;
    throw error;
  }

  const ownerObj = file.ownerId || {};
  const ownerName = `${ownerObj.name || ""} ${ownerObj.lastName || ""}`.trim();

  const formattedSharedWith = (file.sharedWith || []).map((s) => ({
    userId: s.userId?._id || s.userId,
    userName: s.userId
      ? `${s.userId.name || ""} ${s.userId.lastName || ""}`.trim()
      : "Usuario",
    userEmail: s.userId?.email || "",
    permission: s.permission,
  }));

  const formattedComments = (file.comments || []).map((c) => ({
    _id: c._id,
    authorId: c.authorId?._id || c.authorId,
    authorName: c.authorId
      ? `${c.authorId.name || ""} ${c.authorId.lastName || ""}`.trim()
      : "Usuario",
    authorEmail: c.authorId?.email || "",
    content: c.content,
    createdAt: c.createdAt,
  }));

  return {
    _id: file._id,
    name: file.name,
    extension: file.extension,
    sizeBytes: file.sizeBytes,
    content: file.content,
    folderId: file.folderId,
    ownerId: ownerObj._id || file.ownerId,
    ownerName,
    ownerEmail: ownerObj.email || "",
    myPermission: permission,
    tags: file.tags || [],
    sharedWith: formattedSharedWith,
    comments: formattedComments,
    isTrash: file.isTrash,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
};

/**
 * Actualiza el nombre, contenido y/o etiquetas de un archivo según los permisos del usuario
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} fileId
 * @param {{ name?: string, content?: string, tags?: string[] }} updateData
 */
const updateFile = async (userId, fileId, { name, content, tags }) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const file = await File.findById(fileId);

  if (!file) {
    const error = new Error("El archivo solicitado no existe");
    error.statusCode = 404;
    throw error;
  }

  if (file.isTrash) {
    const error = new Error(
      "No es posible modificar un archivo que se encuentra en la papelera",
    );
    error.statusCode = 400;
    throw error;
  }

  const permission = await resolveFilePermission(userObjectId, file);
  if (
    !permission ||
    (permission !== "propietario" && permission !== "edicion")
  ) {
    const error = new Error("No tienes permisos de edición sobre este archivo");
    error.statusCode = 403;
    throw error;
  }

  const isOwner = permission === "propietario";

  // Actualizar contenido (permitido a propietario y usuario con permiso de edición)
  if (content !== undefined) {
    file.content = String(content);
    file.sizeBytes = Buffer.byteLength(file.content, "utf8");
  }

  // Renombrar (exclusivo para el propietario)
  if (name !== undefined) {
    if (!isOwner) {
      const error = new Error(
        "Solo el propietario del archivo puede cambiar su nombre",
      );
      error.statusCode = 403;
      throw error;
    }

    const cleanName = name.trim();
    if (cleanName && cleanName !== file.name) {
      const existing = await File.findOne({
        _id: { $ne: file._id },
        ownerId: file.ownerId,
        folderId: file.folderId,
        name: cleanName,
        isTrash: false,
      });

      if (existing) {
        const error = new Error(
          "Ya existe otro archivo con ese nombre en esta ubicación",
        );
        error.statusCode = 409;
        throw error;
      }

      file.name = cleanName;
    }
  }

  // Actualizar etiquetas (exclusivo para el propietario)
  if (tags !== undefined) {
    if (!isOwner) {
      const error = new Error(
        "Solo el propietario del archivo puede modificar las etiquetas",
      );
      error.statusCode = 403;
      throw error;
    }

    if (Array.isArray(tags)) {
      file.tags = tags
        .map((t) => String(t).trim().replace(/^#/, ""))
        .filter(Boolean);
    }
  }

  await file.save();

  logActivity({
    userId,
    action: "modificar",
    resourceType: "archivo",
    resourceId: file._id,
    details: {
      name: file.name,
      field: name !== undefined ? "name" : "content",
      comment: "Actualización de archivo",
    },
  });

  return await getFileDetails(userId, file._id);
};

/**
 * Agrega un comentario a un archivo
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} fileId
 * @param {string} content
 */
const addComment = async (userId, fileId, content) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const file = await File.findById(fileId);

  if (!file) {
    const error = new Error("El archivo solicitado no existe");
    error.statusCode = 404;
    throw error;
  }

  if (file.isTrash) {
    const error = new Error(
      "No es posible comentar en un archivo que se encuentra en la papelera",
    );
    error.statusCode = 400;
    throw error;
  }

  const permission = await resolveFilePermission(userObjectId, file);
  if (!permission || permission === "lectura") {
    const error = new Error(
      "No tienes permisos para agregar comentarios a este archivo",
    );
    error.statusCode = 403;
    throw error;
  }

  const newComment = {
    authorId: userObjectId,
    content: content.trim(),
    createdAt: new Date(),
  };

  file.comments.push(newComment);
  await file.save();

  const author = await User.findById(userObjectId).select(
    "name lastName email",
  );
  const authorName = author
    ? `${author.name || ""} ${author.lastName || ""}`.trim()
    : "Usuario";

  const savedComment = file.comments[file.comments.length - 1];

  return {
    _id: savedComment._id,
    authorId: userObjectId,
    authorName,
    authorEmail: author ? author.email : "",
    content: savedComment.content,
    createdAt: savedComment.createdAt,
  };
};

/**
 * Elimina un comentario de un archivo (solo el autor o el propietario del archivo)
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} fileId
 * @param {string} commentId
 */
const deleteComment = async (userId, fileId, commentId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);
  const file = await File.findById(fileId);

  if (!file) {
    const error = new Error("El archivo solicitado no existe");
    error.statusCode = 404;
    throw error;
  }

  const comment = file.comments.id(commentId);
  if (!comment) {
    const error = new Error("El comentario no existe o ya fue eliminado");
    error.statusCode = 404;
    throw error;
  }

  const isAuthor = comment.authorId.toString() === userObjectId.toString();
  const isFileOwner = file.ownerId.toString() === userObjectId.toString();

  if (!isAuthor && !isFileOwner) {
    const error = new Error("No tienes permisos para eliminar este comentario");
    error.statusCode = 403;
    throw error;
  }

  file.comments.pull({ _id: comment._id });
  await file.save();

  return {
    mensaje: "Comentario eliminado exitosamente",
    commentId,
  };
};

/**
 * Obtiene un archivo para su descarga verificando permisos y que no esté en la papelera (isTrash: false)
 * @param {string|mongoose.Types.ObjectId} userId - ID del usuario autenticado
 * @param {string} fileId - ID del archivo a descargar
 * @returns {Promise<{fileName: string, extension: string, content: string, mimeType: string}>}
 */
const getFileForDownload = async (userId, fileId) => {
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

  const permission = await resolveFilePermission(userObjectId, file);
  if (!permission) {
    const error = new Error("No tienes permisos para descargar este archivo");
    error.statusCode = 403;
    throw error;
  }

  const ext = (file.extension || "txt").replace(".", "");
  const suffix = `.${ext}`;
  const cleanName = file.name || "documento";
  const fileName = cleanName.toLowerCase().endsWith(suffix)
    ? cleanName
    : `${cleanName}${suffix}`;

  const mimeType =
    ext === "md" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8";

  logActivity({
    userId,
    action: "descargar",
    resourceType: "archivo",
    resourceId: file._id,
    details: {
      name: fileName,
      extension: ext,
    },
  });

  return {
    fileName,
    extension: ext,
    content: file.content || "",
    mimeType,
  };
};

module.exports = {
  getFileDetails,
  getFolderDetails,
  updateFile,
  addComment,
  deleteComment,
  getFileForDownload,
  resolveFilePermission,
  resolveFolderPermission,
};
