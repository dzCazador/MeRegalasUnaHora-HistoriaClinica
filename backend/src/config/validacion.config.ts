import Joi from 'joi';

const ORIGEN_VALIDO = /^https?:\/\/[^/\s]+$/;

export const configuracionValidacion = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),

  PORT: Joi.number().port().default(4001),

  DATABASE_URL: Joi.string()
    .pattern(/^mysql:\/\/[^@]+@[^:]*(?::\d+)?\/[^?]+/)
    .required()
    .messages({
      'string.pattern.base':
        '"DATABASE_URL" debe tener el formato mysql://usuario:clave@host:puerto/nombre_base',
    }),

  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.empty': '"JWT_SECRET" no puede estar vacío',
    'string.min': '"JWT_SECRET" debe tener al menos 32 caracteres',
  }),

  JWT_EXPIRES_IN: Joi.string().default('8h'),

  CORS_ORIGINS: Joi.string()
    .required()
    .custom((valor: string, helpers) => {
      const lista = valor
        .split(',')
        .map((origen) => origen.trim())
        .filter((origen) => origen.length > 0);

      if (lista.length === 0) {
        return helpers.error('cors.vacia');
      }

      if (lista.includes('*')) {
        return helpers.error('cors.comodin');
      }

      const invalido = lista.find((origen) => !ORIGEN_VALIDO.test(origen));

      if (invalido) {
        return helpers.error('cors.invalido', { origen: invalido });
      }

      return lista;
    })
    .messages({
      'cors.vacia': '"CORS_ORIGINS" debe traer al menos un origen',
      'cors.comodin': '"CORS_ORIGINS" no admite el comodín "*": declará la lista blanca explícita',
      'cors.invalido': '"CORS_ORIGINS" contiene un origen inválido: "{{#origen}}"',
    }),

  ADMIN_EMAIL: Joi.string().email().required().messages({
    'string.empty': '"ADMIN_EMAIL" no puede estar vacío',
    'string.email': '"ADMIN_EMAIL" debe ser un email válido',
    'any.required': '"ADMIN_EMAIL" es obligatoria: es el login del usuario ADMIN',
  }),

  ADMIN_NOMBRE: Joi.string().min(2).max(80).required().messages({
    'string.empty': '"ADMIN_NOMBRE" no puede estar vacío',
    'any.required': '"ADMIN_NOMBRE" es obligatoria',
  }),

  ADMIN_PASSWORD: Joi.string().min(8).required().messages({
    'string.empty': '"ADMIN_PASSWORD" no puede estar vacía',
    'string.min': '"ADMIN_PASSWORD" debe tener al menos 8 caracteres',
    'any.required': '"ADMIN_PASSWORD" es obligatoria: el seed no tiene valor por defecto',
  }),
});
