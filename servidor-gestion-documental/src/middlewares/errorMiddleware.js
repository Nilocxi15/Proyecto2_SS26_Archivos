/**
 * Middleware para capturar endpoints 404 no definidos
 */
const noEncontrado = (req, res, next) => {
  const error = new Error(`Ruta no encontrada - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Manejador global de errores de Express
 */
const manejadorErrores = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  if (err.statusCode) {
    statusCode = err.statusCode;
  }

  // Manejo de errores específicos de Mongoose / MongoDB
  let mensaje = err.message || 'Error interno del servidor';

  // Error de Cast de ObjectId inválido
  if (err.name === 'CastError') {
    statusCode = 400;
    mensaje = `Identificador de recurso no válido (${err.value})`;
  }

  // Error de Clave Duplicada
  if (err.code === 11000) {
    statusCode = 409;
    const campo = Object.keys(err.keyValue || {})[0] || 'campo';
    mensaje = `El valor ingresado para '${campo}' ya se encuentra en uso`;
  }

  // Error de validación de campos de Mongoose
  if (err.name === 'ValidationError') {
    statusCode = 400;
    mensaje = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // Error de validación de DTOs con Zod
  if (err.name === 'ZodError') {
    statusCode = 400;
    return res.status(statusCode).json({
      status: 'error',
      mensaje: 'Error de validación en los datos enviados',
      errores: err.errors.map((e) => ({
        campo: e.path.join('.'),
        mensaje: e.message
      }))
    });
  }

  // Error de JsonWebToken
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    mensaje = 'Token de autenticación inválido';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    mensaje = 'El token de autenticación ha expirado';
  }

  return res.status(statusCode).json({
    status: 'error',
    mensaje,
    ...(process.env.NODE_ENV === 'development' && { pila: err.stack })
  });
};

module.exports = {
  noEncontrado,
  manejadorErrores
};
