const Folder = require("../models/Folder");
const File = require("../models/File");
const mongoose = require("mongoose");

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

  const ext = (file.extension || "txt").replace(".", "");
  const suffix = `.${ext}`;
  const cleanName = (file.name || "documento");
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
  getFileForDownload,
};
