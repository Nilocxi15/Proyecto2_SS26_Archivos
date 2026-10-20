const { ZodError } = require("zod");

/**
 * Middleware genérico para validar DTOs
 *
 * @param {import('zod').ZodSchema} schema - Esquema Zod (DTO) a validar
 * @param {'body' | 'query' | 'params'} origen - Propiedad de la petición a validar (por defecto 'body')
 */
const validarDto = (schema, origen = "body") => {
  return (req, res, next) => {
    try {
      // parse valida y retorna solo los campos especificados en el DTO (limpieza de Mass Assignment)
      const parsedData = schema.parse(req[origen] || {});
      if (origen === "query") {
        Object.keys(req.query).forEach((key) => delete req.query[key]);
        Object.assign(req.query, parsedData);
      } else {
        req[origen] = parsedData;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues || error.errors || [];
        return res.status(400).json({
          status: "error",
          mensaje:
            issues[0]?.message ||
            "Error de validación en los datos enviados",
          errores: issues.map((err) => ({
            campo: err.path.join("."),
            mensaje: err.message,
          })),
        });
      }
      next(error);
    }
  };
};

module.exports = {
  validarDto,
};
