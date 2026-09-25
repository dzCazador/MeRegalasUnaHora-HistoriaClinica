# Fase 1 — Setup Inicial de Repositorios

| | |
|---|---|
| **Estado** | `PENDIENTE` |
| **Depende de** | — |
| **Bloquea a** | Fases 2, 3, 4 |
| **Estimación** | 2 – 3 días |
| **Rama sugerida** | `feat/fase-1-setup-inicial` |
| **Documentos fuente** | `../02-arquitectura-tech.md` §2, §3, §4, §6, §10, §11, §12 · `../01-requerimientos-y-negocio.md` §12 |
| **Progreso** | **0 / 27 tareas · 0 / 17 verificaciones · 0 / 9 criterios de cierre** · 3 condiciones de entrada |

---

## 1. Objetivo

Dejar la base técnica: dos proyectos inicializados y arrancando, conectados a una base de datos
vacía, con las convenciones del proyecto escritas y verificadas.

**Al terminar:** `http://localhost:4000/api/health` responde `200`, Swagger está en `/api`,
`http://localhost:3000`Levanta la interfaz y el lint pasa limpio en ambos proyectos.

---

## 2. Condiciones de entrada (gate)

- [ ] Las 4 preguntas bloqueantes de `../01-requerimientos-y-negocio.md` §12 marcadas como
      resueltas en `specs/fases/ESTADO.md` §3, **o** al menos las que no bloquean el setup técnico.
- [ ] Node.js ≥ 20 LTS y MySQL 8 disponibles en la máquina.
- [ ] `git config user.name` y `user.email` definidos.

---

## 3. Contexto técnico

| Dato | Valor |
|---|---|
| Layout | Monorepo sin workspaces: `backend/` y `frontend/` con `node_modules` propios |
| Backend | NestJS 12, ESM (`"type": "module"`), puerto **4000** |
| Frontend | Next.js 16 App Router, puerto **3000** |
| Base | MySQL 8, `utf8mb4` / `utf8mb4_0900_ai_ci`, base `meregalasunahora_dev` |
| Lint backend | Oxlint · Lint frontend | ESLint + `eslint-config-next` |
| Variables obligatorias | `DATABASE_URL`, `JWT_SECRET` (mín. 32 chars), `CORS_ORIGINS` |
| Contrato de respuesta | `{ success, data, meta? }` / `{ success, error }` |

`specs/02-arquitectura-tech.md` §12.3 es obligatorio: los imports relativos del backend llevan `.js`.

---

## 4. Tareas

### 4.1 Documentación y decisiones

- [ ] **1.1.1** Revisar con la organización los 4 documentos de `specs/` y actualizar
      `ESTADO.md` §3 con el resultado de las 8 preguntas abiertas de `../01` §12.
      *Archivos: `specs/fases/ESTADO.md` · `../01-requerimientos-y-negocio.md` §12*
- [ ] **1.1.2** Redactar `AGENTS.md` en la raíz con las convenciones derivadas de `../02`
      §12 (si no existe, derivarlo de `00-protocolo-de-ejecucion.md`).
      *Archivo: `AGENTS.md`*
- [ ] **1.1.3** Redactar `README.md` con instrucciones de arranque: requisitos, creación de la base,
      variables de entorno, comandos de desarrollo y Troubleshooting.
      *Archivo: `README.md`*
- [ ] **1.1.4** Documentar en `../03-esquema-bd.md` §3.1 que `numero_historia` se deriva de `id`
      (DI-02) y las demás DI de `README.md` §5, si fueron resueltas.
      *Archivo: `specs/03-esquema-bd.md`*

### 4.2 Backend

- [ ] **1.2.1** `git init` en la raíz **con `.gitignore` escrito antes del primer commit**
      (ignorar `node_modules/`, `dist/`, `.next/`, `.env`, `.env.local`, `*.log`).
      *Archivo: `.gitignore`*
- [ ] **1.2.2** `nest new backend` y borrar el código de ejemplo que genera (`app.service.ts` de ejemplo,
      `Hello World` en el controller).
      *Archivos: `backend/`*
- [ ] **1.2.3** Configurar ESM: `"type": "module"` en `backend/package.json`, `module: "nodenext"`
      y `moduleResolution: "nodenext"` en `tsconfig.json`, y verificar que el build emite
      **`dist/main.js`** (no `dist/src/main.js`).
      *Archivos: `backend/package.json`, `backend/tsconfig.json`, `backend/nest-cli.json`*
- [ ] **1.2.4** Instalar dependencias: `@nestjs/config`, `@nestjs/swagger`, `@nestjs/jwt`,
      `@prisma/client`, `class-validator`, `class-transformer`, `joi`, `bcrypt`; dev: `prisma`,
      `oxlint`, `prettier`.
      *Archivo: `backend/package.json`*
- [ ] **1.2.5** `ConfigModule` con validación Joi y `fail-fast`: si falta `DATABASE_URL`,
      `JWT_SECRET` o `CORS_ORIGINS`, la aplicación **no arranca**.
      *Archivos: `backend/src/app.module.ts`, `backend/src/config/validacion.config.ts`*
- [ ] **1.2.6** `PrismaService extends PrismaClient` con `onModuleInit` y `onModuleDestroy`,
      registrado como provider exportable.
      *Archivo: `backend/src/prisma/prisma.service.ts`*
- [ ] **1.2.7** `main.ts`: prefijo global `api`, `ValidationPipe` global
      (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`), CORS con lista blanca
      desde `CORS_ORIGINS` (prohibido `origin: true` o `*`), Swagger en `/api`.
      *Archivo: `backend/src/main.ts`*
- [ ] **1.2.8** `GET /api/health` **público**: consulta `SELECT 1` a la base y devuelve
      `{ status, database, timestamp }`. Marcado con `@Public()`.
      *Archivos: `backend/src/app.controller.ts`, `backend/src/common/decorators/public.decorator.ts`*
- [ ] **1.2.9** `.env.example` con placeholders (`JWT_SECRET=cambiar-por-cadena-aleatoria`) y `.env`
      real con valores de desarrollo. Verificar que `.env` está en `.gitignore`.
      *Archivos: `backend/.env.example`, `backend/.env` (no versionado)*
- [ ] **1.2.10** Configurar Oxlint (`lint`) y Prettier (`format`) en scripts, con la stylistic
      desactivada si interfiere con Prettier.
      *Archivos: `backend/package.json`, `backend/.oxlintrc.json`, `backend/.prettierrc`*

### 4.3 Frontend

- [ ] **1.3.1** `create-next-app frontend` con App Router, TypeScript, `src/` deshabilitado
      (la estructura definida en `../02` §4.4 usa `app/` en la raíz del proyecto).
      *Archivos: `frontend/`*
- [ ] **1.3.2** Instalar: `tailwindcss@4`, `@tanstack/react-query`, `react-hook-form`, `zod`,
      `@hookform/resolvers`, `lucide-react`, `clsx`, `tailwind-merge`, `date-fns`.
      *Archivo: `frontend/package.json`*
- [ ] **1.3.3** `globals.css` con las variables de tema claro/oscuro y el conmutador de tema
      con persistencia en `localStorage`.
      *Archivos: `frontend/app/globals.css`, `frontend/app/layout.tsx`*
- [ ] **1.3.4** Utilidad `cn()` en `frontend/lib/cn.ts` con `clsx` + `tailwind-merge`.
      *Archivo: `frontend/lib/cn.ts`*
- [ ] **1.3.5** ESLint con `eslint-config-next` y script `lint`.
      *Archivos: `frontend/package.json`, `frontend/eslint.config.mjs`*
- [ ] **1.3.6** `.env.local.example` con `NEXT_PUBLIC_API_URL=http://localhost:4000`.
      *Archivo: `frontend/.env.local.example`*

### 4.4 Base de datos e infraestructura

- [ ] **1.4.1** Crear la base `meregalasunahora_dev` con `CHARACTER SET utf8mb4` y
      `COLLATE utf8mb4_0900_ai_ci`.
      *Comando: `CREATE DATABASE meregalasunahora_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`*
- [ ] **1.4.2** Crear el usuario de aplicación con permisos **solo** sobre ese esquema
      (`SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES`). Sin acceso global.
      *Comando: `CREATE USER 'app'@'localhost' IDENTIFIED BY '<clave-en-.env>';` + `GRANT`*
- [ ] **1.4.3** `schema.prisma` mínimo con `generator client` y `datasource db` (MySQL, `env("DATABASE_URL")`).
      La tabla de pacientes llega en la Fase 2.
      *Archivo: `backend/prisma/schema.prisma`*
- [ ] **1.4.4** `npx prisma generate` completa sin error.
      *Archivo: `backend/node_modules/.prisma/` (generado, no versionado)*

### 4.5 Cierre técnico

- [ ] **1.5.1** Ramas `main` y `develop` creadas, `develop` como rama por defecto de trabajo.
      *Comandos: `git branch main develop && git switch develop`*
- [ ] **1.5.2** Primer commit con la estructura inicial.
      *Commit: `chore: setup inicial del proyecto meRegalasUnaHora`*
- [ ] **1.5.3** `deploy/README.md` con la lista de tareas de despliegue de la Fase 7
      (respaldo, restauración, HTTPS, PM2, Nginx) aunque stays vacío en contenido.
      *Archivo: `deploy/README.md`*

---

## 5. Verificación

### 5.1 Comandos

- [ ] `npm run start:dev` (backend) → arranca sin errores en < 5 s.
- [ ] `curl -s http://localhost:4000/api/health` → `200` con
      `{"status":"ok","database":"up"}`.
- [ ] `npm run build` (backend) → compila y produce `dist/main.js`.
- [ ] `node dist/main.js` → arranca y responde en `/api/health` (prueba de que no es `dist/src/main.js`).
- [ ] Borrar `JWT_SECRET` del `.env` y arrancar → **falla con error explícito** mentioning el
      nombre de la variable. Restaurar después.
- [ ] Borrar `CORS_ORIGINS` y arrancar → **falla con error explícito**. Restaurar después.
- [ ] `npm run lint` (backend) → 0 errores, 0 warnings.
- [ ] `npm run lint` (frontend) → 0 errores, 0 warnings.
- [ ] `npx prisma generate` → sin error.
- [ ] `npm run dev` (frontend) → responde en `http://localhost:3000`.
- [ ] `git status` → `.env`, `.env.local` y `node_modules` **no** aparecen.
- [ ] `git branch` → existen `main` y `develop`.

### 5.2 Pruebas manuales

- [ ] Swagger en `http://localhost:4000/api` muestra al menos el endpoint de health.
- [ ] Un request con `Origin: http://evil.example` recibe el **cors headers ausente** o `403`.
- [ ] Un request con `Origin: http://localhost:3000` recibe los CORS headers correctos.
- [ ] Con `DATABASE_URL` inválida, el health check devuelve `database: "down"` y no revienta el proceso.
- [ ] El conmutador de tema claro/oscuro funciona y persiste al recargar.

---

## 6. Criterios de cierre

- [ ] `npm run start:dev` (backend) arranca sin errores.
- [ ] `npm run dev` (frontend) arranca sin errores.
- [ ] `GET /api/health` devuelve `200` y confirma conexión a MySQL.
- [ ] Swagger documenta al menos un endpoint.
- [ ] CORS rechaza un origen no autorizado y acepta uno de `CORS_ORIGINS`.
- [ ] La aplicación **falla al arrancar** si falta `DATABASE_URL`, `JWT_SECRET` o `CORS_ORIGINS`.
- [ ] `.env` y `.env.local` **no** aparecen en `git status`.
- [ ] `npm run lint` limpio en backend y frontend.
- [ ] `AGENTS.md` y `README.md` escritos.

---

## 7. Fuera de alcance

- Modelo de datos de pacientes e historias: es de la Fase 2.
- Autenticación: es de la Fase 2.
- Cualquier pantalla real del frontend: la Fase 4 define el shell; acá solo el arranque.
- Tailwind con componentes de UI: los componentes propios llegan en la Fase 4.

---

## 8. Errores frecuentes

| Trampa | Cómo evitarla |
|---|---|
| `dist/src/main.js` en vez de `dist/main.js` | Ajustar `rootDir`/`include` en `tsconfig.json` o el `sourceRoot` en `nest-cli.json` |
| Imports ESM sin `.js` | Compilan bien pero fallan al ejecutar `node dist/main.js`. Revisar con `rg "from '\./" backend/src` |
| `CORS_ORIGINS` como string con espacios | Joi debe transformarlo a array: `@Joi.string().required()` + split, o declararlo como lista separada por comas |
| Commitear `.env` | Escribir `.gitignore` **antes** del `git init` |
| `prisma generate` antes de tener `schema.prisma` | Crear el archivo en 1.4.3 antes de correr el comando |

---

## 9. Cierre

- [ ] Commit: `chore: setup inicial del proyecto meRegalasUnaHora`
- [ ] PR contra `develop` describiendo qué y por qué.
- [ ] `ESTADO.md` §1 actualizado: Fase 1 `COMPLETADA`, Fase actual = Fase 2.
- [ ] `ESTADO.md` §4 con una fila en el registro de ejecuciones.
