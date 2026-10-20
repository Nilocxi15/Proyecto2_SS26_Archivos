const User = require("../models/User");
const mongoose = require("mongoose");

/**
 * Obtiene la lista de usuarios con filtros opcionales de búsqueda, rol y estado
 * @param {object} query - Parámetros de consulta (search, role, status, sort)
 * @returns {Promise<Array>} Lista de usuarios
 */
const getAllUsers = async (query = {}) => {
  const filter = {};

  // Filtro por término de búsqueda (nombre, apellido o email)
  if (query.search && query.search.trim()) {
    const searchRegex = new RegExp(query.search, "i");
    filter.$or = [
      { name: searchRegex },
      { lastName: searchRegex },
      { email: searchRegex },
    ];
  }

  // Filtro por rol
  if (query.role && query.role !== "all") {
    filter.role = query.role;
  }

  // Filtro por estado (activo / inactivo)
  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }

  // Ordenamiento
  let sortOption = { createdAt: -1 };
  if (query.sort === "name") {
    sortOption = { name: 1, lastName: 1 };
  } else if (query.sort === "storage") {
    sortOption = { storageLimitBytes: -1 };
  } else if (query.sort === "date") {
    sortOption = { createdAt: -1 };
  }

  const users = await User.find(filter)
    .select("-password")
    .sort(sortOption)
    .lean();

  return users;
};

/**
 * Obtiene un usuario específico por su ID
 * @param {string} userId - ID del usuario
 * @returns {Promise<object>}
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId).select("-password").lean();
  if (!user) {
    const error = new Error("Usuario no encontrado");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

/**
 * Registra un nuevo usuario en la base de datos
 * @param {object} userData - Datos del usuario a crear
 * @returns {Promise<object>}
 */
const createUser = async (userData) => {
  const { name, lastName, email, password, role, storageLimitBytes } = userData;

  const cleanEmail = email;

  // Comprobar existencia previa de email
  const existingUser = await User.findOne({ email: cleanEmail });
  if (existingUser) {
    const error = new Error(
      "Ya existe un usuario registrado con este correo electrónico",
    );
    error.statusCode = 409;
    throw error;
  }

  const userRole = role === "admin" ? "admin" : "usuario";
  const limitBytes = storageLimitBytes ? Number(storageLimitBytes) : 524288000; // 500 MB por defecto

  const newUser = await User.create({
    name: name,
    lastName: lastName,
    email: cleanEmail,
    password,
    role: userRole,
    status: "activo",
    storageLimitBytes: limitBytes,
  });

  const userObject = newUser.toObject();
  delete userObject.password;

  return userObject;
};

/**
 * Actualiza los datos de un usuario existente
 * @param {string} userId - ID del usuario a modificar
 * @param {object} updateData - Campos a actualizar
 * @param {string} currentAdminId - ID del administrador en sesión
 * @returns {Promise<object>}
 */
const updateUser = async (userId, updateData, currentAdminId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("Usuario no encontrado");
    error.statusCode = 404;
    throw error;
  }

  // Regla de seguridad: Un administrador no puede desactivar su propia cuenta activa
  if (
    updateData.status === "inactivo" &&
    currentAdminId &&
    userId.toString() === currentAdminId.toString()
  ) {
    const error = new Error(
      "No puedes desactivar tu propia cuenta mientras tienes la sesión activa",
    );
    error.statusCode = 400;
    throw error;
  }

  if (updateData.name) user.name = updateData.name;
  if (updateData.lastName) user.lastName = updateData.lastName;

  if (updateData.role && ["admin", "usuario"].includes(updateData.role)) {
    user.role = updateData.role;
  }

  if (updateData.status && ["activo", "inactivo"].includes(updateData.status)) {
    user.status = updateData.status;
  }

  if (updateData.storageLimitBytes !== undefined) {
    user.storageLimitBytes = Math.max(0, Number(updateData.storageLimitBytes));
  }

  await user.save();

  const userObject = user.toObject();
  delete userObject.password;

  return userObject;
};

/**
 * Realiza el borrado lógico (desactivación) de un usuario o lo reactiva
 * Preserva íntegramente sus archivos, carpetas e historial de auditoría
 * @param {string} userId - ID del usuario
 * @param {string} currentAdminId - ID del administrador en sesión
 * @returns {Promise<object>}
 */
const toggleUserStatus = async (userId, currentAdminId) => {
  // Regla de seguridad: No auto-desactivarse
  if (currentAdminId && userId.toString() === currentAdminId.toString()) {
    const error = new Error(
      "No puedes desactivar tu propia cuenta mientras tienes la sesión activa",
    );
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("Usuario no encontrado");
    error.statusCode = 404;
    throw error;
  }

  // Alternar estado: activo <-> inactivo (Borrado Lógico)
  user.status = user.status === "activo" ? "inactivo" : "activo";
  await user.save();

  const userObject = user.toObject();
  delete userObject.password;

  return userObject;
};

/**
 * Borrado lógico explícito (marcar como inactivo)
 * @param {string} userId
 * @param {string} currentAdminId
 * @returns {Promise<object>}
 */
const softDeleteUser = async (userId, currentAdminId) => {
  if (currentAdminId && userId.toString() === currentAdminId.toString()) {
    const error = new Error(
      "No puedes desactivar tu propia cuenta mientras tienes la sesión activa",
    );
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("Usuario no encontrado");
    error.statusCode = 404;
    throw error;
  }

  user.status = "inactivo";
  await user.save();

  const userObject = user.toObject();
  delete userObject.password;

  return userObject;
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  softDeleteUser,
};
