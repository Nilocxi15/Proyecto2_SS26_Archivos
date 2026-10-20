const jwt = require("jsonwebtoken");
const User = require("../models/User");
const File = require("../models/File");
const Folder = require("../models/Folder");
const mongoose = require("mongoose");

/**
 * Genera un token JWT firmado para el usuario
 * @param {string} userId - ID del usuario en MongoDB
 * @param {string} role - Rol del usuario ('admin' o 'usuario')
 * @returns {string} Token JWT
 */
const generarToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
  });
};

/**
 * Autentica un usuario con email y contraseña
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, usuario: object}>}
 */
const login = async (email, password) => {
  // Buscar usuario incluyendo explícitamente el campo password (+password)
  const usuario = await User.findOne({ email }).select("+password");

  if (!usuario) {
    const error = new Error(
      "Credenciales inválidas (usuario o contraseña incorrectos)",
    );
    error.statusCode = 401;
    throw error;
  }

  // Regla de negocio: Validar estado activo
  const userStatus = usuario.status;
  if (userStatus && userStatus !== "activo") {
    const error = new Error(
      "La cuenta se encuentra inactiva. Comuníquese con el administrador del sistema",
    );
    error.statusCode = 403;
    throw error;
  }

  // Comparar contraseñas
  const esPasswordValido = await usuario.compararPassword(password);
  if (!esPasswordValido) {
    const error = new Error(
      "Credenciales inválidas (usuario o contraseña incorrectos)",
    );
    error.statusCode = 401;
    throw error;
  }

  const userRole = usuario.role;
  const token = generarToken(usuario._id, userRole);

  return {
    token,
    usuario,
  };
};

/**
 * Registra un nuevo usuario en el sistema
 * @param {object} datosUsuario
 * @returns {Promise<{token: string, usuario: object}>}
 */
const registrarUsuario = async ({
  name,
  lastName,
  nombre,
  email,
  password,
  role,
  rol,
}) => {
  const finalName = (name || nombre || "").trim();
  const finalLastName = (lastName || "").trim();
  const finalRole = role || rol || "usuario";

  if (!finalName || !email || !password) {
    const error = new Error(
      "Nombre, correo electrónico y contraseña son obligatorios",
    );
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email.trim().toLowerCase();
  const existeUsuario = await User.findOne({ email: cleanEmail });
  if (existeUsuario) {
    const error = new Error("El correo electrónico ya se encuentra registrado");
    error.statusCode = 409;
    throw error;
  }

  const nuevoUsuario = await User.create({
    name: finalName,
    lastName: finalLastName,
    email: cleanEmail,
    password,
    role: finalRole === "admin" ? "admin" : "usuario",
    status: "activo",
  });

  const token = generarToken(nuevoUsuario._id, nuevoUsuario.role);

  return {
    token,
    usuario: nuevoUsuario,
  };
};

/**
 * Obtiene la información del usuario por su identificador, incluyendo estadísticas de almacenamiento
 * @param {string|mongoose.Types.ObjectId} userId
 * @returns {Promise<{usuario: object, storage: object}>}
 */
const getUserProfile = async (userId) => {
  const objectId = new mongoose.Types.ObjectId(userId);
  const usuario = await User.findById(objectId);

  if (!usuario) {
    const error = new Error("Usuario no encontrado");
    error.statusCode = 404;
    throw error;
  }

  // Agregación de MongoDB para calcular el almacenamiento ocupado en tiempo real
  const [activeStorage, trashStorage, folderCount] = await Promise.all([
    File.aggregate([
      { $match: { ownerId: objectId, isTrash: false } },
      {
        $group: {
          _id: null,
          totalBytes: { $sum: "$sizeBytes" },
          count: { $sum: 1 },
        },
      },
    ]),
    File.aggregate([
      { $match: { ownerId: objectId, isTrash: true } },
      {
        $group: {
          _id: null,
          totalBytes: { $sum: "$sizeBytes" },
          count: { $sum: 1 },
        },
      },
    ]),
    Folder.countDocuments({ ownerId: objectId, isTrash: false }),
  ]);

  const usedBytes = activeStorage.length > 0 ? activeStorage[0].totalBytes : 0;
  const activeFilesCount =
    activeStorage.length > 0 ? activeStorage[0].count : 0;
  const trashBytes = trashStorage.length > 0 ? trashStorage[0].totalBytes : 0;
  const trashFilesCount = trashStorage.length > 0 ? trashStorage[0].count : 0;

  const limitBytes = usuario.storageLimitBytes || 524288000; // 500 MB por defecto
  const availableBytes = Math.max(0, limitBytes - (usedBytes + trashBytes));
  const usedPercentage = Math.min(
    100,
    Number((((usedBytes + trashBytes) / limitBytes) * 100).toFixed(1)),
  );

  return {
    usuario,
    storage: {
      usedBytes,
      trashBytes,
      totalUsedBytes: usedBytes + trashBytes,
      limitBytes,
      availableBytes,
      usedPercentage,
      activeFilesCount,
      trashFilesCount,
      folderCount,
    },
  };
};

/**
 * Permite a un usuario autenticado cambiar su propia contraseña
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} currentPassword
 * @param {string} newPassword
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  // Buscar el usuario trayendo el campo oculto password (+password)
  const usuario = await User.findById(userId).select("+password");
  if (!usuario) {
    const error = new Error("Usuario no encontrado");
    error.statusCode = 404;
    throw error;
  }

  // Validar contraseña actual
  const esPasswordValido = await usuario.compararPassword(currentPassword);
  if (!esPasswordValido) {
    const error = new Error("La contraseña actual ingresada es incorrecta");
    error.statusCode = 400;
    throw error;
  }

  if (currentPassword === newPassword) {
    const error = new Error(
      "La nueva contraseña no puede ser idéntica a la contraseña actual",
    );
    error.statusCode = 400;
    throw error;
  }

  // Actualizar contraseña (el middleware pre-save se encargará del hash bcrypt)
  usuario.password = newPassword;
  await usuario.save();

  return {
    mensaje: "Contraseña actualizada exitosamente",
  };
};

module.exports = {
  generarToken,
  login,
  registrarUsuario,
  obtenerPerfilPorId: getUserProfile,
  getUserProfile,
  changePassword,
};
