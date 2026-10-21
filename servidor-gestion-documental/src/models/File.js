const mongoose = require("mongoose");

/**
 * Esquema de comentario embebido en archivos
 */
const commentSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El ID del autor del comentario es obligatorio"],
    },
    content: {
      type: String,
      required: [true, "El contenido del comentario es obligatorio"],
      trim: true,
      maxlength: [1000, "El comentario no puede exceder los 1000 caracteres"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);

/**
 * Esquema de archivo para el Sistema de Gestión Documental
 */
const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "El nombre del archivo es obligatorio"],
      trim: true,
      maxlength: [
        100,
        "El nombre del archivo no puede exceder los 100 caracteres",
      ],
    },
    extension: {
      type: String,
      enum: ["txt", "md"],
      required: [true, "La extensión del archivo es obligatoria"],
    },
    sizeBytes: {
      type: Number,
      required: [true, "El tamaño del archivo en bytes es obligatorio"],
      min: [0, "El tamaño del archivo no puede ser negativo"],
    },
    content: {
      type: String,
      default: "",
    },
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      default: null, // Permite que sea nulo para archivos en la raíz
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El ID del propietario es obligatorio"],
    },
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
    comments: [commentSchema],
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [50, "La etiqueta no puede exceder los 50 caracteres"],
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

const File = mongoose.model("File", fileSchema);

module.exports = File;
