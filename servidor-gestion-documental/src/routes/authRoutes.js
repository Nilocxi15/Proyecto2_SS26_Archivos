const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protegerRuta } = require('../middlewares/authMiddleware');
const { validarDto } = require('../middlewares/validateMiddleware');
const { LoginDto, RegistroDto } = require('../dtos/auth.dto');

// Rutas públicas con validación de DTO
router.post('/login', validarDto(LoginDto), authController.login);
router.post('/registro', validarDto(RegistroDto), authController.registro);

// Rutas protegidas (requieren token Bearer)
router.get('/perfil', protegerRuta, authController.perfil);

module.exports = router;
