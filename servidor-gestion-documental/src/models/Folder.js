const mongoose = require("mongoose");

/**
 * Esquema de Carpeta para el Sistema de Gestión Documental
 */
const folderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre de la carpeta es obligatorio"],
      trim: true,
      maxlength: [
        100,
        "El nombre de la carpeta no puede exceder los 100 caracteres",
      ],
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El ID del propietario es obligatorio"],
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null, // Permite que sea nulo para carpetas raíz
    },
    path: {
      type: String,
      required: [true, "La ruta de la carpeta es obligatoria"],
      trim: true,
    },
    ancestors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Folder",
      },
    ],
    sharedWith: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: [
            true,
            "El ID del usuario con quien se comparte es obligatorio",
          ],
        },
        permission: {
          type: String,
          enum: ["lectura", "edicion", "comentar"],
          default: "lectura",
          required: [true, "El nivel de acceso es obligatorio"],
        },
      },
    ],
    isTrash: {
      type: Boolean,
      default: false,
    },
    trashedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Genera automáticamente createdAt y updatedAt
  },
);

const Folder = mongoose.model("Folder", folderSchema);

module.exports = Folder;
