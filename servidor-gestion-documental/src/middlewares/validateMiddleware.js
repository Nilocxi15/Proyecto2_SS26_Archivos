const { ZodError } = require('zod');

/**
 * Middleware genérico para validar DTOs
 * 
 * @param {import('zod').ZodSchema} schema - Esquema Zod (DTO) a validar
 * @param {'body' | 'query' | 'params'} origen - Propiedad de la petición a validar (por defecto 'body')
 */
const validarDto = (schema, origen = 'body') => {
  return (req, res, next) => {
    try {
      // parse valida y retorna solo los campos especificados en el DTO (limpieza de Mass Assignment)
      req[origen] = schema.parse(req[origen]);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: 'error',
          mensaje: 'Error de validación en los datos enviados',
          errores: error.errors.map((err) => ({
            campo: err.path.join('.'),
            mensaje: err.message
          }))
        });
      }
      next(error);
    }
  };
};

module.exports = {
  validarDto
};
