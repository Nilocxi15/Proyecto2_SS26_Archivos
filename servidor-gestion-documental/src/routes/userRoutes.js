const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protectRoutes, allowRoles } = require("../middlewares/authMiddleware");

// Todas las rutas de administración de usuarios requieren autenticación y rol de admin
router.use(protectRoutes);
router.use(allowRoles('admin'));

// Listar usuarios con filtros opcionales (búsqueda, rol, estado)
router.get("/", userController.getUsers);

// Obtener un usuario por su ID
router.get("/:id", userController.getUserById);

// Crear nuevo usuario
router.post("/", userController.createUser);

// Actualizar información de un usuario
router.put("/:id", userController.updateUser);

// Alternar estado activo / inactivo
router.patch("/:id/status", userController.toggleUserStatus);

// Borrado lógico (marcar como inactivo)
router.delete("/:id", userController.deleteUser);

module.exports = router;
