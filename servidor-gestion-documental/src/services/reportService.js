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

module.exports = {
  getTopUsersByFiles,
};
