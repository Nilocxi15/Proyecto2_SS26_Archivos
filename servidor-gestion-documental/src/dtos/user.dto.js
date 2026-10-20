const { z } = require("zod");

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

/**
 * DTO para validar el parámetro :id en rutas de usuarios
 */
const UserIdParamDto = z.object({
  id: z
    .string({ required_error: "El identificador de usuario es obligatorio" })
    .regex(objectIdRegex, "Identificador de usuario inválido"),
});

/**
 * DTO para la creación de usuarios desde el panel de administración (POST /api/users)
 */
const CreateUserDto = z.object({
  name: z
    .string({ required_error: "El nombre es obligatorio" })
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  lastName: z
    .string({ required_error: "El apellido es obligatorio" })
    .trim()
    .min(1, "El apellido es obligatorio")
    .max(100, "El apellido no puede exceder 100 caracteres"),
  email: z
    .string({ required_error: "El correo electrónico es obligatorio" })
    .trim()
    .toLowerCase()
    .email("El correo electrónico no posee un formato válido"),
  password: z
    .string({ required_error: "La contraseña es obligatoria" })
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z
    .enum(["admin", "usuario"], {
      errorMap: () => ({ message: "El rol debe ser admin o usuario" }),
    })
    .optional()
    .default("usuario"),
  storageLimitBytes: z.coerce
    .number()
    .min(0, "El límite de almacenamiento no puede ser negativo")
    .optional()
    .default(524288000),
});

/**
 * DTO para la actualización de un usuario existente (PUT /api/users/:id)
 */
const UpdateUserDto = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre no puede estar vacío")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .optional(),
  lastName: z
    .string()
    .trim()
    .min(1, "El apellido no puede estar vacío")
    .max(100, "El apellido no puede exceder 100 caracteres")
    .optional(),
  role: z
    .enum(["admin", "usuario"], {
      errorMap: () => ({ message: "El rol debe ser admin o usuario" }),
    })
    .optional(),
  status: z
    .enum(["activo", "inactivo"], {
      errorMap: () => ({ message: "El estado debe ser activo o inactivo" }),
    })
    .optional(),
  storageLimitBytes: z.coerce
    .number()
    .min(0, "El límite de almacenamiento no puede ser negativo")
    .optional(),
});

module.exports = {
  UserIdParamDto,
  CreateUserDto,
  UpdateUserDto,
};
