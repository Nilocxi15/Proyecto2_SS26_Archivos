const { z } = require('zod');

/**
 * DTO para la petición de inicio de sesión (Login)
 */
const LoginDto = z.object({
  email: z
    .string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .email('El formato del correo electrónico es inválido'),
  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(1, 'La contraseña no puede estar vacía')
});

/**
 * DTO para el registro de nuevos usuarios
 */
const RegistroDto = z.object({
  name: z
    .string({ required_error: 'El nombre es obligatorio' })
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .optional(),
  nombre: z.string().trim().optional(),
  lastName: z.string().trim().optional().default(''),
  email: z
    .string({ required_error: 'El correo electrónico es obligatorio' })
    .trim()
    .email('El formato del correo electrónico es inválido'),
  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(6, 'La contraseña debe contener al menos 6 caracteres'),
  role: z
    .enum(['admin', 'usuario'], {
      errorMap: () => ({ message: 'El rol debe ser admin o usuario' })
    })
    .optional()
    .default('usuario'),
  rol: z.enum(['admin', 'usuario']).optional()
});

module.exports = {
  LoginDto,
  RegistroDto
};
