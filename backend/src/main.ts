import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { BigintInterceptor } from './common/interceptors/bigint.interceptor.js';
import { RespuestaInterceptor } from './common/interceptors/respuesta.interceptor.js';
import { FiltroExcepcion } from './common/filters/filtro-excepcion.filter.js';
import {
  PrismaDesconocidaExcepcionFilter,
  PrismaExcepcionFilter,
} from './common/filters/prisma-excepcion.filter.js';

const logger = new Logger('Bootstrap');

const METODOS_PERMITIDOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] as const;
const ENCABEZADOS_PERMITIDOS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'Origin',
] as const;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Lista blanca estricta: nunca `origin: true` ni el comodín `*`
  // (prohibición 3 de AGENTS.md y RNF-09). Joi yalauvalida y devuelve un array.
  const origenesPermitidos = config.getOrThrow<string[]>('CORS_ORIGINS');

  app.enableCors({
    origin: origenesPermitidos,
    credentials: true,
    methods: METODOS_PERMITIDOS,
    allowedHeaders: ENCABEZADOS_PERMITIDOS,
    maxAge: 3600,
  });

  // Orden de los interceptors: `Bigint` primero, porque la respuesta envuelta en
  // `{ success, data }` también tiene que bajar los ids a `number` (DI-03).
  app.useGlobalInterceptors(new BigintInterceptor(), new RespuestaInterceptor(new Reflector()));

  // Nest evalúa los filters globales en orden INVERSO al de registro, así que el
  // catch-all va primero y el de Prisma último: si fuera al revés, `FiltroExcepcion`
  // se quedaría con todos los P2002/P2025 y devolvería 500 en vez de 409/404.
  //
  // `PrismaDesconocidaExcepcionFilter` va al lado del de Prisma y por el mismo
  // motivo: captura lo que el driver no sabe nombrar (un id de catálogo inexistente
  // llega como `PrismaClientUnknownRequestError` con MySQL 1216) y lo traduce a un
  // `400` en vez de dejarlo caer en el `500` genérico.
  app.useGlobalFilters(
    new FiltroExcepcion(),
    new PrismaExcepcionFilter(),
    new PrismaDesconocidaExcepcionFilter(),
  );

  const configuracionSwagger = new DocumentBuilder()
    .setTitle('MeRegalasUnaHora — API de Historias Clínicas')
    .setDescription(
      'Sistema de registro de historias clínicas para población en situación de calle. ' +
        'Contiene datos personales sensibles de salud (Ley 25.326, art. 2 inc. f).',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  // El documento OpenAPI queda en /api-json (default de @nestjs/swagger).
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, configuracionSwagger));

  const puerto = config.getOrThrow<number>('PORT');

  await app.listen(puerto);

  logger.log(`API escuchando en http://localhost:${puerto}/api`);
  logger.log(`Swagger en http://localhost:${puerto}/api`);
  logger.log(`Orígenes permitidos: ${origenesPermitidos.join(', ')}`);
}

await bootstrap();
