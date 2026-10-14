/**
 * Modelo representativo de un usuario gestionado en el panel administrativo
 */
export interface ManagedUser {
  _id: string;
  name: string;
  lastName: string;
  email: string;
  role: 'administrador' | 'usuario';
  status: 'activo' | 'inactivo';
  storageLimitBytes: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Datos requeridos para la creación de un nuevo usuario
 */
export interface CreateUserDto {
  name: string;
  lastName: string;
  email: string;
  password?: string;
  role: 'administrador' | 'usuario';
  storageLimitBytes: number;
}

/**
 * Datos para actualizar un usuario existente
 */
export interface UpdateUserDto {
  name: string;
  lastName: string;
  role: 'administrador' | 'usuario';
  storageLimitBytes: number;
  status?: 'activo' | 'inactivo';
}
