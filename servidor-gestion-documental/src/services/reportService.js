const mongoose = require("mongoose");
const File = require("../models/File");
const Folder = require("../models/Folder");
const User = require("../models/User");

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

/**
 * Reporte: Cantidad de archivos agrupados por tipo.
 * Agrupa los archivos activos por extensión normalizada, cuenta la cantidad de archivos,
 * suma el espacio total en bytes consumido por cada tipo y calcula el porcentaje sobre el total global.
 * @returns {Promise<Array<{extension: string, mimeType: string, fileCount: number, totalSizeBytes: number, percentage: number}>>}
 */
const getFilesGroupedByType = async () => {
  const pipeline = [
    { $match: { isTrash: false } },
    {
      $group: {
        _id: { $toLower: "$extension" },
        fileCount: { $sum: 1 },
        totalSizeBytes: { $sum: "$sizeBytes" },
      },
    },
    {
      $setWindowFields: {
        output: {
          grandTotalBytes: { $sum: "$totalSizeBytes" },
          grandTotalFiles: { $sum: "$fileCount" },
        },
      },
    },
    {
      $project: {
        _id: 0,
        extension: { $concat: [".", "$_id"] },
        mimeType: {
          $switch: {
            branches: [
              { case: { $eq: ["$_id", "txt"] }, then: "text/plain" },
              { case: { $eq: ["$_id", "md"] }, then: "text/markdown" },
            ],
            default: "text/plain",
          },
        },
        fileCount: 1,
        totalSizeBytes: 1,
        percentage: {
          $cond: [
            { $gt: ["$grandTotalBytes", 0] },
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ["$totalSizeBytes", "$grandTotalBytes"] },
                    100,
                  ],
                },
                2,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { fileCount: -1, totalSizeBytes: -1 } },
  ];

  return await File.aggregate(pipeline);
};

/**
 * Reporte: Archivos almacenados dentro de un rango de fechas.
 * Filtra los archivos activos cuyo createdAt se encuentre en el rango delimitado por startDate y endDate,
 * une los datos del propietario (User) y la carpeta contenedora (Folder) para resolver la ruta breadcrumb.
 * @param {string} [startDate] - Fecha inicial en formato YYYY-MM-DD
 * @param {string} [endDate] - Fecha final en formato YYYY-MM-DD
 * @returns {Promise<Array<{fileId: string, fileName: string, extension: string, sizeBytes: number, createdAt: Date, updatedAt: Date, ownerName: string, ownerEmail: string, folderPath: string}>>}
 */
const getFilesByDateRange = async (startDate, endDate) => {
  const matchCriteria = { isTrash: false };

  if (startDate || endDate) {
    const dateQuery = {};
    if (startDate) {
      const parsedStart = new Date(startDate);
      if (!isNaN(parsedStart.getTime())) {
        parsedStart.setUTCHours(0, 0, 0, 0);
        dateQuery.$gte = parsedStart;
      }
    }
    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedEnd.getTime())) {
        parsedEnd.setUTCHours(23, 59, 59, 999);
        dateQuery.$lte = parsedEnd;
      }
    }
    if (Object.keys(dateQuery).length > 0) {
      matchCriteria.createdAt = dateQuery;
    }
  }

  const pipeline = [
    { $match: matchCriteria },
    {
      $lookup: {
        from: "users",
        localField: "ownerId",
        foreignField: "_id",
        as: "ownerInfo",
      },
    },
    { $unwind: "$ownerInfo" },
    {
      $lookup: {
        from: "folders",
        localField: "folderId",
        foreignField: "_id",
        as: "folderInfo",
      },
    },
    {
      $unwind: {
        path: "$folderInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        fileId: "$_id",
        fileName: "$name",
        extension: "$extension",
        sizeBytes: "$sizeBytes",
        createdAt: 1,
        updatedAt: 1,
        ownerName: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ["$ownerInfo.name", ""] },
                " ",
                { $ifNull: ["$ownerInfo.lastName", ""] },
              ],
            },
          },
        },
        ownerEmail: "$ownerInfo.email",
        folderPath: {
          $cond: [
            { $ifNull: ["$folderInfo.path", false] },
            "$folderInfo.path",
            "/",
          ],
        },
      },
    },
    { $sort: { createdAt: -1, fileName: 1 } },
  ];

  return await File.aggregate(pipeline);
};

/**
 * Reporte: Archivos compartidos con mayor cantidad de usuarios.
 * Identifica los archivos activos con colaboradores en sharedWith, calcula la cantidad de colaboradores,
 * ordena descendentemente y proyecta la información del propietario, ruta y detalle de colaboradores.
 * @returns {Promise<Array<{fileId: string, fileName: string, extension: string, sizeBytes: number, lastSharedAt: Date, collaboratorsCount: number, ownerName: string, ownerEmail: string, folderPath: string, collaborators: Array<{userId: string, permission: string, userName: string, userEmail: string}>}>>}
 */
const getMostSharedFiles = async () => {
  const pipeline = [
    {
      $match: {
        isTrash: false,
        "sharedWith.0": { $exists: true },
      },
    },
    {
      $addFields: {
        collaboratorsCount: { $size: "$sharedWith" },
      },
    },
    {
      $sort: {
        collaboratorsCount: -1,
        updatedAt: -1,
        name: 1,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "ownerId",
        foreignField: "_id",
        as: "ownerInfo",
      },
    },
    { $unwind: "$ownerInfo" },
    {
      $lookup: {
        from: "folders",
        localField: "folderId",
        foreignField: "_id",
        as: "folderInfo",
      },
    },
    {
      $unwind: {
        path: "$folderInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "sharedWith.userId",
        foreignField: "_id",
        as: "collabUsers",
      },
    },
    {
      $project: {
        _id: 0,
        fileId: "$_id",
        fileName: "$name",
        extension: "$extension",
        sizeBytes: "$sizeBytes",
        lastSharedAt: "$updatedAt",
        collaboratorsCount: 1,
        ownerName: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ["$ownerInfo.name", ""] },
                " ",
                { $ifNull: ["$ownerInfo.lastName", ""] },
              ],
            },
          },
        },
        ownerEmail: "$ownerInfo.email",
        folderPath: {
          $cond: [
            { $ifNull: ["$folderInfo.path", false] },
            "$folderInfo.path",
            "/",
          ],
        },
        collaborators: {
          $map: {
            input: "$sharedWith",
            as: "sw",
            in: {
              userId: "$$sw.userId",
              permission: "$$sw.permission",
              userName: {
                $let: {
                  vars: {
                    matchedUser: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$collabUsers",
                            as: "cu",
                            cond: { $eq: ["$$cu._id", "$$sw.userId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    $trim: {
                      input: {
                        $concat: [
                          { $ifNull: ["$$matchedUser.name", ""] },
                          " ",
                          { $ifNull: ["$$matchedUser.lastName", ""] },
                        ],
                      },
                    },
                  },
                },
              },
              userEmail: {
                $let: {
                  vars: {
                    matchedUser: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$collabUsers",
                            as: "cu",
                            cond: { $eq: ["$$cu._id", "$$sw.userId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: { $ifNull: ["$$matchedUser.email", ""] },
                },
              },
            },
          },
        },
      },
    },
  ];

  return await File.aggregate(pipeline);
};

/**
 * Reporte: Recursos compartidos por un usuario seleccionado.
 * Unifica archivos y carpetas activas compartidas donde el usuario es el propietario,
 * resolviendo la ruta del recurso y el listado de colaboradores con sus permisos.
 * @param {string} userId - ID del usuario propietario
 * @returns {Promise<Array<{resourceId: string, resourceName: string, resourceType: string, extension: string|null, sizeBytes: number|null, folderPath: string, collaboratorsCount: number, collaborators: Array<{userId: string, permission: string, userName: string, userEmail: string}>, sharedAt: Date}>>}
 */
const getResourcesSharedByUser = async (userId) => {
  const ownerObjectId = new mongoose.Types.ObjectId(userId);

  const pipeline = [
    {
      $match: {
        ownerId: ownerObjectId,
        isTrash: false,
        "sharedWith.0": { $exists: true },
      },
    },
    {
      $lookup: {
        from: "folders",
        localField: "folderId",
        foreignField: "_id",
        as: "folderInfo",
      },
    },
    {
      $unwind: {
        path: "$folderInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        resourceId: "$_id",
        resourceName: "$name",
        resourceType: { $literal: "file" },
        extension: "$extension",
        sizeBytes: "$sizeBytes",
        folderPath: {
          $cond: [
            { $ifNull: ["$folderInfo.path", false] },
            "$folderInfo.path",
            "/",
          ],
        },
        collaboratorsCount: { $size: "$sharedWith" },
        sharedWith: "$sharedWith",
        sharedAt: "$updatedAt",
      },
    },
    {
      $unionWith: {
        coll: "folders",
        pipeline: [
          {
            $match: {
              ownerId: ownerObjectId,
              isTrash: false,
              "sharedWith.0": { $exists: true },
            },
          },
          {
            $project: {
              _id: 0,
              resourceId: "$_id",
              resourceName: "$name",
              resourceType: { $literal: "folder" },
              extension: { $literal: null },
              sizeBytes: { $literal: null },
              folderPath: "$path",
              collaboratorsCount: { $size: "$sharedWith" },
              sharedWith: "$sharedWith",
              sharedAt: "$updatedAt",
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "sharedWith.userId",
        foreignField: "_id",
        as: "collabUsers",
      },
    },
    {
      $project: {
        resourceId: 1,
        resourceName: 1,
        resourceType: 1,
        extension: 1,
        sizeBytes: 1,
        folderPath: 1,
        collaboratorsCount: 1,
        sharedAt: 1,
        collaborators: {
          $map: {
            input: "$sharedWith",
            as: "sw",
            in: {
              userId: "$$sw.userId",
              permission: "$$sw.permission",
              userName: {
                $let: {
                  vars: {
                    matchedUser: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$collabUsers",
                            as: "cu",
                            cond: { $eq: ["$$cu._id", "$$sw.userId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: {
                    $trim: {
                      input: {
                        $concat: [
                          { $ifNull: ["$$matchedUser.name", ""] },
                          " ",
                          { $ifNull: ["$$matchedUser.lastName", ""] },
                        ],
                      },
                    },
                  },
                },
              },
              userEmail: {
                $let: {
                  vars: {
                    matchedUser: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$collabUsers",
                            as: "cu",
                            cond: { $eq: ["$$cu._id", "$$sw.userId"] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: { $ifNull: ["$$matchedUser.email", ""] },
                },
              },
            },
          },
        },
      },
    },
    {
      $sort: {
        sharedAt: -1,
        resourceName: 1,
      },
    },
  ];

  return await File.aggregate(pipeline);
};

/**
 * Reporte: Recursos recibidos por un usuario seleccionado.
 * Unifica archivos y carpetas activas donde el usuario figura en sharedWith,
 * resolviendo el propietario original, el nivel de permiso otorgado, la ruta y detalles del recurso.
 * @param {string} userId - ID del usuario colaborador / receptor
 * @returns {Promise<Array<{resourceId: string, resourceName: string, resourceType: string, extension: string|null, sizeBytes: number|null, folderPath: string, ownerName: string, ownerEmail: string, permission: string, receivedAt: Date}>>}
 */
const getResourcesReceivedByUser = async (userId) => {
  const userObjectId = new mongoose.Types.ObjectId(userId);

  const pipeline = [
    {
      $match: {
        "sharedWith.userId": userObjectId,
        isTrash: false,
      },
    },
    {
      $lookup: {
        from: "folders",
        localField: "folderId",
        foreignField: "_id",
        as: "folderInfo",
      },
    },
    {
      $unwind: {
        path: "$folderInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "ownerId",
        foreignField: "_id",
        as: "ownerInfo",
      },
    },
    {
      $unwind: {
        path: "$ownerInfo",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        resourceId: "$_id",
        resourceName: "$name",
        resourceType: { $literal: "file" },
        extension: "$extension",
        sizeBytes: "$sizeBytes",
        folderPath: {
          $cond: [
            { $ifNull: ["$folderInfo.path", false] },
            "$folderInfo.path",
            "/",
          ],
        },
        ownerName: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ["$ownerInfo.name", ""] },
                " ",
                { $ifNull: ["$ownerInfo.lastName", ""] },
              ],
            },
          },
        },
        ownerEmail: "$ownerInfo.email",
        permission: {
          $let: {
            vars: {
              myShare: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$sharedWith",
                      as: "sw",
                      cond: { $eq: ["$$sw.userId", userObjectId] },
                    },
                  },
                  0,
                ],
              },
            },
            in: { $ifNull: ["$$myShare.permission", "lectura"] },
          },
        },
        receivedAt: "$updatedAt",
      },
    },
    {
      $unionWith: {
        coll: "folders",
        pipeline: [
          {
            $match: {
              "sharedWith.userId": userObjectId,
              isTrash: false,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "ownerId",
              foreignField: "_id",
              as: "ownerInfo",
            },
          },
          {
            $unwind: {
              path: "$ownerInfo",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 0,
              resourceId: "$_id",
              resourceName: "$name",
              resourceType: { $literal: "folder" },
              extension: { $literal: null },
              sizeBytes: { $literal: null },
              folderPath: "$path",
              ownerName: {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ["$ownerInfo.name", ""] },
                      " ",
                      { $ifNull: ["$ownerInfo.lastName", ""] },
                    ],
                  },
                },
              },
              ownerEmail: "$ownerInfo.email",
              permission: {
                $let: {
                  vars: {
                    myShare: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$sharedWith",
                            as: "sw",
                            cond: { $eq: ["$$sw.userId", userObjectId] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                  in: { $ifNull: ["$$myShare.permission", "lectura"] },
                },
              },
              receivedAt: "$updatedAt",
            },
          },
        ],
      },
    },
    {
      $sort: {
        receivedAt: -1,
        resourceName: 1,
      },
    },
  ];

  return await File.aggregate(pipeline);
};

/**
 * Obtiene los usuarios activos con formato optimizado para selectores de reportes
 * @returns {Promise<Array<{userId: string, userName: string, userEmail: string}>>}
 */
const getUsersForSelect = async () => {
  const users = await User.find({ status: "activo" })
    .select("_id name lastName email")
    .sort({ name: 1, lastName: 1 })
    .lean();

  return users.map((u) => ({
    userId: u._id.toString(),
    userName: `${u.name || ""} ${u.lastName || ""}`.trim(),
    userEmail: u.email,
  }));
};

/**
 * Reporte: Archivos con mayor cantidad de operaciones registradas.
 * Agrupa la colección activity_logs por archivo, contabilizando el total de operaciones acumuladas
 * y recuperando la información del archivo, propietario y última acción efectuada.
 * @returns {Promise<Array<{fileId: string, fileName: string, extension: string, ownerName: string, operationsCount: number, lastOperationType: string, lastOperationAt: Date}>>}
 */
const getFilesByOperations = async () => {
  const ActivityLog = require("../models/ActivityLog");

  const pipeline = [
    { $match: { resourceType: "archivo" } },
    { $sort: { timestamp: 1 } },
    {
      $group: {
        _id: "$resourceId",
        operationsCount: { $sum: 1 },
        lastOperationType: { $last: "$action" },
        lastOperationAt: { $max: "$timestamp" },
        details: { $last: "$details" },
      },
    },
    { $sort: { operationsCount: -1, lastOperationAt: -1 } },
    {
      $lookup: {
        from: "files",
        localField: "_id",
        foreignField: "_id",
        as: "file",
      },
    },
    { $unwind: { path: "$file", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "users",
        localField: "file.ownerId",
        foreignField: "_id",
        as: "owner",
      },
    },
    { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        fileId: { $toString: "$_id" },
        fileName: { $ifNull: ["$file.name", "$details.name", "Archivo"] },
        extension: {
          $ifNull: ["$file.extension", "$details.extension", "txt"],
        },
        ownerName: {
          $let: {
            vars: {
              fullName: {
                $trim: {
                  input: {
                    $concat: [
                      { $ifNull: ["$owner.name", ""] },
                      " ",
                      { $ifNull: ["$owner.lastName", ""] },
                    ],
                  },
                },
              },
            },
            in: {
              $cond: [
                { $gt: [{ $strLenCP: "$$fullName" }, 0] },
                "$$fullName",
                "Usuario del sistema",
              ],
            },
          },
        },
        operationsCount: 1,
        lastOperationType: 1,
        lastOperationAt: 1,
      },
    },
  ];

  return await ActivityLog.aggregate(pipeline);
};

module.exports = {
  getTopUsersByFiles,
  getTopUsersBySharedResources,
  getFilesGroupedByType,
  getFilesByDateRange,
  getFilesByOperations,
  getMostSharedFiles,
  getResourcesSharedByUser,
  getResourcesReceivedByUser,
  getUsersForSelect,
};
