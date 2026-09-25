import Joi from 'joi';

const ORIGEN_VALIDO = /^https?:\/\/[^/\s]+$/;

export const configuracionValidacion = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),

  PORT: Joi.number().port().default(4000),

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

  // Nomenclatura en revisión: el spec (fase-02, tarea 2.2.6) usa ADMIN_EMAIL /
  // ADMIN_NOMBRE / ADMIN_PASSWORD y login por email. Ver bloqueo B-8 en
  // specs/fases/ESTADO.md. La Fase 1 no lee estas variables.
  AUTH_USERNAME: Joi.string().optional(),
  AUTH_PASSWORD: Joi.string().optional(),
  ADMIN_EMAIL: Joi.string().email().optional(),
  ADMIN_NOMBRE: Joi.string().optional(),
  ADMIN_PASSWORD: Joi.string().optional(),
});
