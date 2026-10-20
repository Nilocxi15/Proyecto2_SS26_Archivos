const Folder = require("../models/Folder");
const File = require("../models/File");
const mongoose = require("mongoose");

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

module.exports = {
  getTrash,
  moveToTrashOrRestore,
  deleteResourcePermanently,
};
