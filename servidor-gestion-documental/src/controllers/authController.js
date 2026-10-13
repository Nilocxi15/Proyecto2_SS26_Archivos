const authService = require("../services/authService");

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const resultado = await authService.login(email, password);

    return res.status(200).json({
      status: "success",
      mensaje: "Inicio de sesión exitoso",
      token: resultado.token,
      usuario: resultado.usuario,
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
      status: "success",
      mensaje: "Usuario registrado exitosamente",
      token: resultado.token,
      usuario: resultado.usuario,
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
    const userId = req.user._id || req.user.id;
    const data = await authService.getUserProfile(userId);

    return res.status(200).json({
      status: "success",
      usuario: data.usuario,
      storage: data.storage,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/cambiar-password
 */
const cambiarPassword = async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const { currentPassword, newPassword } = req.body;

    const resultado = await authService.changePassword(
      userId,
      currentPassword,
      newPassword,
    );

    return res.status(200).json({
      status: "success",
      mensaje: resultado.mensaje,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  registro,
  perfil,
  getProfile: perfil,
  cambiarPassword,
  changePassword: cambiarPassword,
};
