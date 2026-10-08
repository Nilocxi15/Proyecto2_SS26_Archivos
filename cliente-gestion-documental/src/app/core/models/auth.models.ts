export interface Usuario {
  _id: string;
  nombre: string;
  email: string;
  rol: 'administrador' | 'usuario';
  estado: 'activo' | 'inactivo';
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Petición de Inicio de Sesión
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Respuesta del endpoint de Login (/api/auth/login)
 */
export interface LoginResponse {
  status: string;
  mensaje: string;
  token: string;
  usuario: Usuario;
}

/**
 * Petición para registrar un nuevo usuario
 */
export interface RegistroRequest {
  nombre: string;
  email: string;
  password: string;
  rol?: 'administrador' | 'usuario';
}