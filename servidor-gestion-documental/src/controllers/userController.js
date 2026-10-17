const userService = require("../services/userService");

/**
 * GET /api/users
 * Obtiene la lista de usuarios con filtros opcionales de búsqueda, rol y estado
 */
const getUsers = async (req, res, next) => {
  try {
    const users = await userService.getAllUsers(req.query);

    return res.status(200).json({
      status: "success",
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id
 * Obtiene el detalle de un usuario por su ID
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    return res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/users
 * Registra un nuevo usuario en la plataforma
 */
const createUser = async (req, res, next) => {
  try {
    const newUser = await userService.createUser(req.body);

    return res.status(201).json({
      status: "success",
      mensaje: "Usuario registrado exitosamente",
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id
 * Actualiza los datos de un usuario
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentAdminId = req.user._id || req.user.id;
    const updatedUser = await userService.updateUser(
      id,
      req.body,
      currentAdminId,
    );

    return res.status(200).json({
      status: "success",
      mensaje: "Usuario actualizado exitosamente",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:id/status
 * Alterna el estado activo/inactivo (borrado lógico o reactivación)
 */
const toggleUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentAdminId = req.user._id || req.user.id;
    const user = await userService.toggleUserStatus(id, currentAdminId);

    const accion = user.status === "activo" ? "reactivado" : "desactivado";
    return res.status(200).json({
      status: "success",
      mensaje: `Usuario ${accion} exitosamente`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/users/:id
 * Borrado lógico de usuario (establece status: 'inactivo' preservando sus recursos)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentAdminId = req.user._id || req.user.id;
    const user = await userService.softDeleteUser(id, currentAdminId);

    return res.status(200).json({
      status: "success",
      mensaje: "Usuario desactivado exitosamente (borrado lógico)",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
};
