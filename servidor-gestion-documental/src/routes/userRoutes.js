const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protectRoutes, allowRoles } = require("../middlewares/authMiddleware");
const { validarDto } = require("../middlewares/validateMiddleware");
const {
  UserIdParamDto,
  CreateUserDto,
  UpdateUserDto,
} = require("../dtos/user.dto");

// Todas las rutas de administración de usuarios requieren autenticación y rol de admin
router.use(protectRoutes);
router.use(allowRoles("admin"));

// Listar usuarios con filtros opcionales (búsqueda, rol, estado)
router.get("/", userController.getUsers);

// Obtener un usuario por su ID
router.get(
  "/:id",
  validarDto(UserIdParamDto, "params"),
  userController.getUserById,
);

// Crear nuevo usuario
router.post(
  "/",
  validarDto(CreateUserDto, "body"),
  userController.createUser,
);

// Actualizar información de un usuario
router.put(
  "/:id",
  validarDto(UserIdParamDto, "params"),
  validarDto(UpdateUserDto, "body"),
  userController.updateUser,
);

// Alternar estado activo / inactivo
router.patch(
  "/:id/status",
  validarDto(UserIdParamDto, "params"),
  userController.toggleUserStatus,
);

// Borrado lógico (marcar como inactivo)
router.delete(
  "/:id",
  validarDto(UserIdParamDto, "params"),
  userController.deleteUser,
);

module.exports = router;
