export interface Usuario {
  _id: string;
  name: string;
  lastName: string;
  email: string;
  role: 'admin' | 'usuario';
  status: 'activo' | 'inactivo';
  storageLimitBytes: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StorageStats {
  usedBytes: number;
  trashBytes: number;
  totalUsedBytes: number;
  limitBytes: number;
  availableBytes: number;
  usedPercentage: number;
  activeFilesCount: number;
  trashFilesCount: number;
  folderCount: number;
}

export interface UserProfileResponse {
  status: string;
  usuario: Usuario;
  storage: StorageStats;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  status: string;
  mensaje: string;
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
  name: string;
  lastName?: string;
  email: string;
  password: string;
  role?: 'admin' | 'usuario';
}
