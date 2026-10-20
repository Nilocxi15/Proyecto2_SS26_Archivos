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
        !val ||
        val === "null" ||
        val === "root" ||
        objectIdRegex.test(val),
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
        !val ||
        val === "null" ||
        val === "root" ||
        objectIdRegex.test(val),
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
    .max(200, "El nombre del archivo no puede exceder 200 caracteres"),
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
        !val ||
        val === "null" ||
        val === "root" ||
        objectIdRegex.test(val),
      { message: "El identificador de la carpeta no es válido" },
    ),
  tags: z.array(z.string().trim()).optional().default([]),
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

module.exports = {
  ResourceIdParamDto,
  FolderQueryDto,
  CreateFolderDto,
  CreateFileDto,
  ToggleTrashDto,
};
