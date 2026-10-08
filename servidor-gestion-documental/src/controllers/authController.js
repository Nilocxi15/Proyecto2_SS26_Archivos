const authService = require('../services/authService');

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const resultado = await authService.login(email, password);

    return res.status(200).json({
      status: 'success',
      mensaje: 'Inicio de sesión exitoso',
      token: resultado.token,
      usuario: resultado.usuario
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/registro
 */
const registro = async (req, res, next) => {
  try {
    const resultado = await authService.registrarUsuario(req.body);

    return res.status(201).json({
      status: 'success',
      mensaje: 'Usuario registrado exitosamente',
      token: resultado.token,
      usuario: resultado.usuario
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/perfil
 */
const perfil = async (req, res, next) => {
  try {
    // req.user fue inyectado por el middleware protegerRuta
    return res.status(200).json({
      status: 'success',
      usuario: req.user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  registro,
  perfil
};
