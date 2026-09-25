# Backend — API de Historias Clínicas

NestJS 12 en ESM sobre MySQL 8, con Prisma como ORM. **Contiene datos personales sensibles de
salud** (Ley 25.326, art. 2 inc. f): aplica las prohibiciones de [`AGENTS.md`](../AGENTS.md) §5.

Las instrucciones de arranque, la creación de la base y el troubleshooting están en el
[README de la raíz](../README.md). Este archivo es la referencia rápida del servicio.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | Servidor de desarrollo en `:4000` (con watch) |
| `npm run build` | Compila a `dist/main.js` |
| `npm run start:prod` | Corre el build |
| `npm run lint` | Oxlint. Debe dar 0 errores y 0 warnings |
| `npm run format` | Prettier |
| `npx prisma generate` | Regenera el cliente desde `prisma/schema.prisma` |
| `npx prisma migrate dev --name <desc>` | Crea y aplica una migración versionada |
| `npx prisma studio` | Inspeccionar datos |
| `npx prisma db seed` | Catálogos + admin. **Idempotente, sin pacientes** (Fase 2) |

## Estructura

```text
prisma/schema.prisma     Fuente de verdad del modelo de datos
src/main.ts              Prefijo /api, ValidationPipe, CORS, Swagger
src/app.module.ts        ConfigModule con validación Joi (fail-fast)
src/app.controller.ts    GET /api/health
src/app.service.ts       Sondeo de disponibilidad
src/config/              Esquema Joi de variables de entorno
src/prisma/              PrismaService: único punto que instancia Prisma
src/common/              Decorators · dto · utils
```

## Contrato

| Aspecto | Regla |
|---|---|
| Prefijo | Todas las rutas bajo `/api` |
| Respuesta OK | `{ success: true, data, meta? { total, page, limit, totalPages } }` |
| Respuesta error | `{ success: false, error: { code, message, details?, path, timestamp } }` |
| Excepción | `GET /api/health` devuelve `{ status, database, timestamp }` plano, con `503` si MySQL no responde |
| Swagger | UI en `/api` · documento OpenAPI en `/api-json` |
| Endpoints públicos | Solo `POST /api/auth/login` (Fase 2) y `GET /api/health` |
| Paginación | `skip`/`take` con `orderBy` estable, desempate por `id` |

## Variables de entorno

`DATABASE_URL`, `JWT_SECRET` (mín. 32 caracteres) y `CORS_ORIGINS` son **obligatorias**: si falta
alguna, la aplicación no arranca. Copiar `.env.example` a `.env` y completarlo. `.env` no se versiona.

`CORS_ORIGINS` es una lista separada por comas **sin espacios** y nunca admite el comodín `*`.

## Trampas

| Trampa | Cómo se maneja |
|---|---|
| `BigInt` de Prisma no se serializa a JSON | Interceptor global en la Fase 2 (DI-03) |
| Imports ESM sin `.js` | Compilan bien y fallan en runtime. Todos los relativos llevan `.js` |
| `dist/src/main.js` en vez de `dist/main.js` | `rootDir: ./src` en `tsconfig.build.json` |
| MySQL caído tumba el proceso | `onModuleInit` de `PrismaService` es tolerante: loguea y sigue |
| Errores de Prisma con `message` vacía | Pasar siempre por `describirError()` de `common/utils` |
