const File = require("../models/File");

/**
 * Reporte: Top 10 usuarios con mayor cantidad de archivos almacenados.
 * Utiliza el framework de agregación de MongoDB para agrupar por propietario,
 * contar archivos activos (isTrash: false), acumular espacio ocupado y ordenar.
 * @returns {Promise<Array<{userId: string, userName: string, userEmail: string, role: string, isActive: boolean, fileCount: number, totalSizeBytes: number, lastActivityAt: Date}>>}
 */
const getTopUsersByFiles = async () => {
  const pipeline = [
    { $match: { isTrash: false } },
    {
      $group: {
        _id: "$ownerId",
        fileCount: { $sum: 1 },
        totalSizeBytes: { $sum: "$sizeBytes" },
        lastActivityAt: { $max: "$updatedAt" },
      },
    },
    { $sort: { fileCount: -1, totalSizeBytes: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    { $unwind: "$userInfo" },
    {
      $project: {
        _id: 0,
        userId: "$userInfo._id",
        userName: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ["$userInfo.name", ""] },
                " ",
                { $ifNull: ["$userInfo.lastName", ""] },
              ],
            },
          },
        },
        userEmail: "$userInfo.email",
        role: "$userInfo.role",
        isActive: "$userInfo.isActive",
        fileCount: 1,
        totalSizeBytes: 1,
        lastActivityAt: 1,
      },
    },
  ];

  return await File.aggregate(pipeline);
};

/**
 * Reporte: Usuarios con mayor cantidad de recursos compartidos.
 * Realiza una agregación unificando archivos y carpetas compartidos mediante $unionWith,
 * calcula el desglose por tipo (archivos y carpetas), total de recursos compartidos
 * y cantidad de colaboradores únicos alcanzados mediante $setUnion y $reduce.
 * @returns {Promise<Array<{userId: string, userName: string, userEmail: string, totalSharedResources: number, sharedFilesCount: number, sharedFoldersCount: number, collaboratorsCount: number, lastSharedAt: Date}>>}
 */
const getTopUsersBySharedResources = async () => {
  const pipeline = [
    {
      $match: {
        isTrash: false,
        "sharedWith.0": { $exists: true },
      },
    },
    {
      $project: {
        ownerId: 1,
        isFolder: { $literal: 0 },
        isFile: { $literal: 1 },
        collaborators: "$sharedWith.userId",
        updatedAt: 1,
      },
    },
    {
      $unionWith: {
        coll: "folders",
        pipeline: [
          {
            $match: {
              isTrash: false,
              "sharedWith.0": { $exists: true },
            },
          },
          {
            $project: {
              ownerId: 1,
              isFolder: { $literal: 1 },
              isFile: { $literal: 0 },
              collaborators: "$sharedWith.userId",
              updatedAt: 1,
            },
          },
        ],
      },
    },
    {
      $group: {
        _id: "$ownerId",
        sharedFilesCount: { $sum: "$isFile" },
        sharedFoldersCount: { $sum: "$isFolder" },
        totalSharedResources: { $sum: 1 },
        allCollaborators: { $push: "$collaborators" },
        lastSharedAt: { $max: "$updatedAt" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "userInfo",
      },
    },
    { $unwind: "$userInfo" },
    {
      $project: {
        _id: 0,
        userId: "$userInfo._id",
        userName: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ["$userInfo.name", ""] },
                " ",
                { $ifNull: ["$userInfo.lastName", ""] },
              ],
            },
          },
        },
        userEmail: "$userInfo.email",
        totalSharedResources: 1,
        sharedFilesCount: 1,
        sharedFoldersCount: 1,
        collaboratorsCount: {
          $size: {
            $setUnion: {
              $reduce: {
                input: "$allCollaborators",
                initialValue: [],
                in: { $concatArrays: ["$$value", "$$this"] },
              },
            },
          },
        },
        lastSharedAt: 1,
      },
    },
    {
      $sort: {
        totalSharedResources: -1,
        collaboratorsCount: -1,
        sharedFoldersCount: -1,
      },
    },
  ];

  return await File.aggregate(pipeline);
};

module.exports = {
  getTopUsersByFiles,
  getTopUsersBySharedResources,
};
