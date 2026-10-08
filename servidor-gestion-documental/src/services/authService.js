const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Servicio de Autenticación y Usuarios
 * Contiene la lógica de negocio pura, independiente del protocolo HTTP (req/res).
 */

/**
 * Genera un token JWT firmado para el usuario
 * @param {string} userId - ID del usuario en MongoDB
 * @param {string} rol - Rol del usuario
 * @returns {string} Token JWT
 */
const generarToken = (userId, rol) => {
  return jwt.sign(
    { id: userId, rol },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
};

/**
 * Autentica un usuario con email y contraseña
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{token: string, usuario: object}>}
 */
const login = async (email, password) => {
  if (!email || !password) {
    const error = new Error('Debe ingresar el correo electrónico y la contraseña');
    error.statusCode = 400;
    throw error;
  }

  // Buscar usuario incluyendo explícitamente el campo password (+password)
  const usuario = await User.findOne({ email }).select('+password');

  if (!usuario) {
    const error = new Error('Credenciales inválidas (usuario o contraseña incorrectos)');
    error.statusCode = 401;
    throw error;
  }

  // Regla de negocio: Validar estado activo
  if (usuario.estado !== 'activo') {
    const error = new Error('La cuenta se encuentra inactiva. Comuníquese con el administrador del sistema');
    error.statusCode = 403;
    throw error;
  }

  // Comparar contraseñas
  const esPasswordValido = await usuario.compararPassword(password);
  if (!esPasswordValido) {
    const error = new Error('Credenciales inválidas (usuario o contraseña incorrectos)');
    error.statusCode = 401;
    throw error;
  }

  const token = generarToken(usuario._id, usuario.rol);

  return {
    token,
    usuario
  };
};

/**
 * Registra un nuevo usuario en el sistema
 * @param {object} datosUsuario 
 * @returns {Promise<{token: string, usuario: object}>}
 */
const registrarUsuario = async ({ nombre, email, password, rol }) => {
  if (!nombre || !email || !password) {
    const error = new Error('Nombre, correo electrónico y contraseña son obligatorios');
    error.statusCode = 400;
    throw error;
  }

  const existeUsuario = await User.findOne({ email });
  if (existeUsuario) {
    const error = new Error('El correo electrónico ya se encuentra registrado');
    error.statusCode = 409;
    throw error;
  }

  const nuevoUsuario = await User.create({
    nombre,
    email,
    password,
    rol: rol || 'usuario',
    estado: 'activo'
  });

  const token = generarToken(nuevoUsuario._id, nuevoUsuario.rol);

  return {
    token,
    usuario: nuevoUsuario
  };
};

/**
 * Obtiene la información del usuario por su identificador
 * @param {string} userId 
 * @returns {Promise<object>}
 */
const obtenerPerfilPorId = async (userId) => {
  const usuario = await User.findById(userId);
  if (!usuario) {
    const error = new Error('Usuario no encontrado');
    error.statusCode = 404;
    throw error;
  }
  return usuario;
};

module.exports = {
  generarToken,
  login,
  registrarUsuario,
  obtenerPerfilPorId
};
