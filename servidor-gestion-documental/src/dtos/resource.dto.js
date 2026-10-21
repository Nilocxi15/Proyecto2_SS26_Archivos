const { z } = require("zod");

/**
 * Expresión regular para validar identificadores ObjectId de MongoDB (24 caracteres hexadecimales)
 */
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * DTO para validar el parámetro :id en rutas de recursos
 */
const ResourceIdParamDto = z.object({
  id: z
    .string({ required_error: "El identificador del recurso es obligatorio" })
    .regex(objectIdRegex, "El identificador del recurso no es válido"),
});

/**
 * DTO para validar el query param opcional folderId en listados de recursos
 */
const FolderQueryDto = z.object({
  folderId: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) =>
        !val || val === "null" || val === "root" || objectIdRegex.test(val),
      { message: "El identificador de la carpeta no es válido" },
    ),
});

/**
 * DTO para la creación de una nueva carpeta (POST /api/resources/folders)
 */
const CreateFolderDto = z.object({
  name: z
    .string({ required_error: "El nombre de la carpeta es obligatorio" })
    .trim()
    .min(1, "El nombre de la carpeta es obligatorio")
    .max(150, "El nombre de la carpeta no puede exceder 150 caracteres"),
  parentId: z
    .string()
    .trim()
    .nullable()
    .optional()
    .default(null)
    .refine(
      (val) =>
        !val || val === "null" || val === "root" || objectIdRegex.test(val),
      { message: "El identificador de la carpeta padre no es válido" },
    ),
});

/**
 * DTO para la creación/subida de un archivo .txt o .md (POST /api/resources/files)
 */
const CreateFileDto = z.object({
  name: z
    .string({ required_error: "El nombre del archivo es obligatorio" })
    .trim()
    .min(1, "El nombre del archivo es obligatorio")
    .max(100, "El nombre del archivo no puede exceder 100 caracteres"),
  extension: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val ? val.replace(".", "").toLowerCase() : undefined))
    .refine((val) => !val || val === "txt" || val === "md", {
      message: "Solo se permiten archivos con extensión .txt o .md",
    }),
  content: z.string().optional().default(""),
  folderId: z
    .string()
    .trim()
    .nullable()
    .optional()
    .default(null)
    .refine(
      (val) =>
        !val || val === "null" || val === "root" || objectIdRegex.test(val),
      { message: "El identificador de la carpeta no es válido" },
    ),
  tags: z
    .union([z.array(z.string().trim()), z.string().trim()])
    .optional()
    .default([])
    .transform((val) => {
      if (Array.isArray(val)) {
        return val.map((t) => t.replace(/^#/, "")).filter(Boolean);
      }
      if (typeof val === "string") {
        return val
          .split(",")
          .map((t) => t.trim().replace(/^#/, ""))
          .filter(Boolean);
      }
      return [];
    }),
});

/**
 * DTO para mover un recurso a la papelera o restaurarlo (PUT /api/resources/:id/trash)
 */
const ToggleTrashDto = z.object({
  moveToTrash: z.boolean({
    required_error: "El campo moveToTrash es obligatorio",
    invalid_type_error: "El campo moveToTrash debe ser un valor booleano",
  }),
});

/**
 * DTO para actualizar el contenido o metadatos de un archivo (PUT /api/resources/files/:id)
 */
const UpdateFileDto = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre del archivo no puede estar vacío")
    .max(200, "El nombre del archivo no puede exceder 200 caracteres")
    .optional(),
  content: z.string().optional(),
  tags: z.array(z.string().trim()).optional(),
});

/**
 * DTO para agregar un comentario a un archivo (POST /api/resources/files/:id/comments)
 */
const AddCommentDto = z.object({
  content: z
    .string({ required_error: "El contenido del comentario es obligatorio" })
    .trim()
    .min(1, "El comentario no puede estar vacío")
    .max(1000, "El comentario no puede exceder los 1000 caracteres"),
});

/**
 * DTO para validar parámetros de ruta con recurso y comentario (DELETE /api/resources/files/:id/comments/:commentId)
 */
const CommentParamDto = z.object({
  id: z
    .string({ required_error: "El identificador del archivo es obligatorio" })
    .regex(objectIdRegex, "El identificador del archivo no es válido"),
  commentId: z
    .string({
      required_error: "El identificador del comentario es obligatorio",
    })
    .regex(objectIdRegex, "El identificador del comentario no es válido"),
});

/**
 * DTO para compartir un recurso con un usuario por correo electrónico (POST /api/resources/:id/share)
 */
const ShareResourceDto = z.object({
  email: z
    .string({ required_error: "El correo electrónico es obligatorio" })
    .trim()
    .toLowerCase()
    .email("El formato del correo electrónico es inválido"),
  permission: z.enum(["lectura", "comentar", "edicion"], {
    errorMap: () => ({
      message: "El nivel de acceso debe ser lectura, comentar o edicion",
    }),
  }),
});

/**
 * DTO para validar parámetros al revocar acceso a un usuario (DELETE /api/resources/:id/share/:userId)
 */
const ShareUserParamDto = z.object({
  id: z
    .string({ required_error: "El identificador del recurso es obligatorio" })
    .regex(objectIdRegex, "El identificador del recurso no es válido"),
  userId: z
    .string({ required_error: "El identificador del usuario es obligatorio" })
    .regex(objectIdRegex, "El identificador del usuario no es válido"),
});

module.exports = {
  ResourceIdParamDto,
  FolderQueryDto,
  CreateFolderDto,
  CreateFileDto,
  ToggleTrashDto,
  UpdateFileDto,
  AddCommentDto,
  CommentParamDto,
  ShareResourceDto,
  ShareUserParamDto,
};
