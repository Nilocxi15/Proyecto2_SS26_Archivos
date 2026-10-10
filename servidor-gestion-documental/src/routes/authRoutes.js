const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protectRoutes } = require('../middlewares/authMiddleware');
const { validarDto } = require('../middlewares/validateMiddleware');
const { LoginDto, RegistroDto } = require('../dtos/auth.dto');

// Rutas públicas con validación de DTO
router.post('/login', validarDto(LoginDto), authController.login);
router.post('/registro', validarDto(RegistroDto), authController.registro);

// Rutas protegidas (requieren token Bearer)
router.get('/perfil', protectRoutes, authController.perfil);

module.exports = router;
