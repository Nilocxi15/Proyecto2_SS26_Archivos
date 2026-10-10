const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware para proteger rutas mediante verificación de JWT
 */
const protectRoutes = async (req, res, next) => {
  let token;

  // Extraer el token del header Authorization (Bearer <token>)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      status: 'error',
      mensaje: 'Acceso no autorizado: No se proporcionó un token de autenticación'
    });
  }

  try {
    // Verificar firma y expiración del token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar el usuario asociado al token en MongoDB
    const usuario = await User.findById(decoded.id);

    if (!usuario) {
      return res.status(401).json({
        status: 'error',
        mensaje: 'El usuario perteneciente a este token ya no existe'
      });
    }

    // Validar regla de negocio: Si el usuario fue desactivado, rechazar la petición
    const userStatus = usuario.status || usuario.estado;
    if (userStatus && userStatus !== 'activo') {
      return res.status(403).json({
        status: 'error',
        mensaje: 'Cuenta inactiva. No tiene permisos para realizar esta acción'
      });
    }

    // Inyectar el usuario autenticado en la solicitud para los siguientes controladores
    req.user = usuario;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      mensaje: 'Token inválido o expirado. Inicie sesión nuevamente'
    });
  }
};

/**
 * Middleware para restringir acceso por roles
 * @param  {...string} rolesPermitidos - Lista de roles autorizados
 */
const allowRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    const userRole = req.user?.role || req.user?.rol;
    if (!req.user || !rolesPermitidos.includes(userRole)) {
      return res.status(403).json({
        status: 'error',
        mensaje: 'No tienes permisos suficientes para realizar esta acción'
      });
    }
    next();
  };
};

module.exports = {
  protectRoutes,
  protegerRuta: protectRoutes,
  allowRoles,
  permitirRoles: allowRoles
};
