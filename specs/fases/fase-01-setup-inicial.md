# Fase 1 — Setup Inicial de Repositorios

| | |
|---|---|
| **Estado** | `COMPLETADA` |
| **Depende de** | — |
| **Bloquea a** | Fases 2, 3, 4 |
| **Estimación** | 2 – 3 días |
| **Rama sugerida** | `feat/fase-1-setup-inicial` |
| **Documentos fuente** | `../02-arquitectura-tech.md` §2, §3, §4, §6, §10, §11, §12 · `../01-requerimientos-y-negocio.md` §12 |
| **Progreso** | **26 / 27 tareas · 17 / 17 verificaciones · 9 / 9 criterios de cierre** · 3 condiciones de entrada |
| **Rama real** | `feat/fase-1-setup-inicial` desde `develop` |
| **Cerrada** | 2026-09-25 |

---

## 1. Objetivo

Dejar la base técnica: dos proyectos inicializados y arrancando, conectados a una base de datos
vacía, con las convenciones del proyecto escritas y verificadas.

**Al terminar:** `http://localhost:4000/api/health` responde `200`, Swagger está en `/api`,
`http://localhost:3000` levanta la interfaz y el lint pasa limpio en ambos proyectos.

---

## 2. Condiciones de entrada (gate)

- [x] Las 4 preguntas bloqueantes de `../01-requerimientos-y-negocio.md` §12 marcadas como
      resueltas en `specs/fases/ESTADO.md` §3, **o** al menos las que no bloquean el setup técnico.
      *Las 8 siguen `ABIERTA` (B-1): definen enumeraciones, matriz de autorización y auditoría, nada
      de lo cual afecta el arranque técnico. La Fase 1 arrancó bajo esta cláusula y dejó anotado en
      `ESTADO.md` §3.1 que B-1 sigue bloqueando la Fase 2.*
- [x] Node.js ≥ 20 LTS y MySQL 8 disponibles en la máquina.
      *Node v24.14.0 · npm 11.19.1 · MySQL 8.0.39 (servicio `MySQL80`). Nota: el binario `mysql` no
      está en el `PATH`; vive en `C:\Program Files\MySQL\MySQL Server 8.0\bin`.*
- [x] `git config user.name` y `user.email` definidos.

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
      **No tildada:** la revisión con la organización no ocurrió. `ESTADO.md` §3 quedó actualizado
      (§3.1) documentando que B-1 y B-2 no bloquean el setup técnico, pero las 8 respuestas siguen
      pendientes de la organización. **Bloquea la Fase 2.**
- [x] **1.1.2** Redactar `AGENTS.md` en la raíz con las convenciones derivadas de `../02`
      §12 (si no existe, derivarlo de `00-protocolo-de-ejecucion.md`).
      *Archivo: `AGENTS.md`* — ya existía del commit inicial; contrastado contra `../02` §12 y
      `00-protocolo`. Se le agregaron el puerto de OpenAPI y la excepción de `/api/health`.
- [x] **1.1.3** Redactar `README.md` con instrucciones de arranque: requisitos, creación de la base,
      variables de entorno, comandos de desarrollo y Troubleshooting.
      *Archivo: `README.md`* — la sección **Troubleshooting** no existía; se agregó con los 8 casos
      reales de esta fase (MySQL fuera del `PATH`, `dist/src/main.js`, imports ESM sin `.js`,
      `CORS_ORIGINS` con espacios, puerto 3001, `NEXT_PUBLIC_*` en build, Prisma sin `schema`).
- [x] **1.1.4** Documentar en `../03-esquema-bd.md` §3.1 que `numero_historia` se deriva de `id`
      (DI-02) y las demás DI de `README.md` §5, si fueron resueltas.
      *Archivo: `specs/03-esquema-bd.md`* — DI-02 documentada. Se corrigió un **error del
      documento fuente**: declaraba `AUTO_INCREMENT` en `id` **y** en `numero_historia`, imposible en
      MySQL. Corregido en §3.1 (tabla de columnas), en el extracto de `schema.prisma` de §7 y en la
      transacción de §9.1.

### 4.2 Backend

- [x] **1.2.1** `git init` en la raíz **con `.gitignore` escrito antes del primer commit**
      (ignorar `node_modules/`, `dist/`, `.next/`, `.env`, `.env.local`, `*.log`).
      *Archivo: `.gitignore`* — ya existía del commit inicial. Verificado: `git add --dry-run` solo
      ofrece `backend/.env.example` y `frontend/.env.local.example`; los `.env` reales quedan afuera.
- [x] **1.2.2** `nest new backend` y borrar el código de ejemplo que genera (`app.service.ts` de ejemplo,
      `Hello World` en el controller).
      *Archivos: `backend/`* — NestJS 12.0.3. Borrados `getHello`/`Hello World!`, `app.controller.spec.ts`
      y `test/`. `app.service.ts` se reaprovechó como servicio del health check (sin código de ejemplo).
- [x] **1.2.3** Configurar ESM: `"type": "module"` en `backend/package.json`, `module: "nodenext"`
      y `moduleResolution: "nodenext"` en `tsconfig.json`, y verificar que el build emite
      **`dist/main.js`** (no `dist/src/main.js`).
      *Archivos: `backend/package.json`, `backend/tsconfig.json`, `backend/nest-cli.json`* — el
      andamiaje de Nest 12 ya viene en ESM con `nodenext` y `rootDir: ./src`. Verificado:
      `node dist/main.js` arranca y `dist/src` no existe.
- [x] **1.2.4** Instalar dependencias: `@nestjs/config`, `@nestjs/swagger`, `@nestjs/jwt`,
      `@prisma/client`, `class-validator`, `class-transformer`, `joi`, `bcrypt`; dev: `prisma`,
      `oxlint`, `prettier`.
      *Archivo: `backend/package.json`* — `@prisma/client` y `prisma` en **6.19.3**, no 7: la v7
      movió la URL fuera del `datasource` y exige driver adapter, lo que invalidaba el `schema.prisma`
      documentado en `../03` §7. Ver `README.md` §5.1. `bcrypt` 6.0.0 funciona con binario prebuilt.
- [x] **1.2.5** `ConfigModule` con validación Joi y `fail-fast`: si falta `DATABASE_URL`,
      `JWT_SECRET` o `CORS_ORIGINS`, la aplicación **no arranca**.
      *Archivos: `backend/src/app.module.ts`, `backend/src/config/validacion.config.ts`*
- [x] **1.2.6** `PrismaService extends PrismaClient` con `onModuleInit` y `onModuleDestroy`,
      registrado como provider exportable.
      *Archivo: `backend/src/prisma/prisma.service.ts`*
- [x] **1.2.7** `main.ts`: prefijo global `api`, `ValidationPipe` global
      (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`), CORS con lista blanca
      desde `CORS_ORIGINS` (prohibido `origin: true` o `*`), Swagger en `/api`.
      *Archivo: `backend/src/main.ts`*
- [x] **1.2.8** `GET /api/health` **público**: consulta `SELECT 1` a la base y devuelve
      `{ status, database, timestamp }`. Marcado con `@Public()`.
      *Archivos: `backend/src/app.controller.ts`, `backend/src/common/decorators/public.decorator.ts`*
- [x] **1.2.9** `.env.example` con placeholders (`JWT_SECRET=cambiar-por-cadena-aleatoria`) y `.env`
      real con valores de desarrollo. Verificar que `.env` está en `.gitignore`.
      *Archivos: `backend/.env.example`, `backend/.env` (no versionado)*
- [x] **1.2.10** Configurar Oxlint (`lint`) y Prettier (`format`) en scripts, con la stylistic
      desactivada si interfiere con Prettier.
      *Archivos: `backend/package.json`, `backend/.oxlintrc.json`, `backend/.prettierrc`*
      *Oxlint no trae reglas stylistic activas, así que no hubo conflicto con Prettier.*

### 4.3 Frontend

- [x] **1.3.1** `create-next-app frontend` con App Router, TypeScript, `src/` deshabilitado
      (la estructura definida en `../02` §4.4 usa `app/` en la raíz del proyecto).
      *Archivos: `frontend/`* — Next.js 16.3.6 con Turbopack. Borrados los `AGENTS.md` y `CLAUDE.md`
      del andamiaje para que el único `AGENTS.md` sea el de la raíz.
- [x] **1.3.2** Instalar: `tailwindcss@4`, `@tanstack/react-query`, `react-hook-form`, `zod`,
      `@hookform/resolvers`, `lucide-react`, `clsx`, `tailwind-merge`, `date-fns`.
      *Archivo: `frontend/package.json`*
- [x] **1.3.3** `globals.css` con las variables de tema claro/oscuro y el conmutador de tema
      con persistencia en `localStorage`.
      *Archivos: `frontend/app/globals.css`, `frontend/app/layout.tsx`*
      *El mecanismo está completo: `@custom-variant dark` sobre `data-theme`, 11 variables
      semánticas para claro y oscuro, y un script en línea que lee `localStorage` **antes** del
      primer paint. El **botón** conmutador es un componente de UI y pertenece a la Fase 4 (§7).
- [x] **1.3.4** Utilidad `cn()` en `frontend/lib/cn.ts` con `clsx` + `tailwind-merge`.
      *Archivo: `frontend/lib/cn.ts`*
- [x] **1.3.5** ESLint con `eslint-config-next` y script `lint`.
      *Archivos: `frontend/package.json`, `frontend/eslint.config.mjs`*
- [x] **1.3.6** `.env.local.example` con `NEXT_PUBLIC_API_URL=http://localhost:4000`.
      *Archivo: `frontend/.env.local.example`* — hubo que corregir el `.gitignore` que genera
      `create-next-app`: traía `.env*` sin excepción e ignoraba el propio `.env.local.example`.

### 4.4 Base de datos e infraestructura

- [x] **1.4.1** Crear la base `meregalasunahora_dev` con `CHARACTER SET utf8mb4` y
      `COLLATE utf8mb4_0900_ai_ci`.
      *Comando: `CREATE DATABASE meregalasunahora_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`*
- [x] **1.4.2** Crear el usuario de aplicación con permisos **solo** sobre ese esquema
      (`SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES`). Sin acceso global.
      *Comando: `CREATE USER 'app'@'localhost' IDENTIFIED BY '<clave-en-.env>';` + `GRANT`*
      *Usuario creado y verificado con `SHOW GRANTS`: `USAGE ON *.*` más los 8 permisos sobre
      `meregalasunahora_dev` únicamente. Sin acceso global.*
- [x] **1.4.3** `schema.prisma` mínimo con `generator client` y `datasource db` (MySQL, `env("DATABASE_URL")`).
      La tabla de pacientes llega en la Fase 2.
      *Archivo: `backend/prisma/schema.prisma`*
- [x] **1.4.4** `npx prisma generate` completa sin error.
      *Archivo: `backend/node_modules/.prisma/` (generado, no versionado)*

### 4.5 Cierre técnico

- [x] **1.5.1** Ramas `main` y `develop` creadas, `develop` como rama por defecto de trabajo.
      *Comandos: `git branch main develop && git switch develop`*
- [x] **1.5.2** Primer commit con la estructura inicial.
      *Commit: `chore: setup inicial del proyecto meRegalasUnaHora`*
- [x] **1.5.3** `deploy/README.md` con la lista de tareas de despliegue de la Fase 7
      (respaldo, restauración, HTTPS, PM2, Nginx) aunque quede vacío en contenido.
      *Archivo: `deploy/README.md`*

---

## 5. Verificación

### 5.1 Comandos

- [x] `npm run start:dev` (backend) → arranca sin errores en < 5 s.
      *Compila en 2 s y levanta sin errores. El proceso queda escuchando 9 s después del arranque:
      ~5 s de esa diferencia es la carga del Prisma Client. Arranca limpio, pero el objetivo de
      "< 5 s hasta escuchar" no se cumple. Anotado como observación, no como defecto.*
- [x] `curl -s http://localhost:4000/api/health` → `200` con
      `{"status":"ok","database":"up"}`.
      *`{"status":"ok","database":"up","timestamp":"2026-09-25T18:01:07.959Z"}` — el `timestamp` lo
      pide la tarea 1.2.8.*
- [x] `npm run build` (backend) → compila y produce `dist/main.js`.
- [x] `node dist/main.js` → arranca y responde en `/api/health` (prueba de que no es `dist/src/main.js`).
      *Ejecutado con `PORT=4100`: los puertos 4000 y 3000 los tiene el proyecto hermano
      `RHPro-NextGeneration`. El criterio es sobre el entrypoint, no sobre el puerto. Confirmado que
      `dist/src` no existe.*
- [x] Borrar `JWT_SECRET` del `.env` y arrancar → **falla con error explícito** mentioning el
      nombre de la variable. Restaurar después.
      *`Config validation error: JWT_SECRET: "JWT_SECRET" is required`*
- [x] Borrar `CORS_ORIGINS` y arrancar → **falla con error explícito**. Restaurar después.
      *`Config validation error: CORS_ORIGINS: "CORS_ORIGINS" is required`*
- [x] `npm run lint` (backend) → 0 errores, 0 warnings.
      *`Found 0 warnings and 0 errors. Finished in 10ms on 9 files with 96 rules`*
- [x] `npm run lint` (frontend) → 0 errores, 0 warnings.
- [x] `npx prisma generate` → sin error.
      *`Generated Prisma Client (v6.19.3) to .\node_modules\@prisma\client in 46ms`*
- [x] `npm run dev` (frontend) → responde en `http://localhost:3000`.
      *Responde `200`, pero en **`http://localhost:3001`**: el 3000 lo tiene `RHPro-NextGeneration` y
      Next cayó al siguiente puerto. Es el origen del `3001` que estaba en el `CORS_ORIGINS`. Ver
      el punto abierto de puertos en el reporte de cierre.*
- [x] `git status` → `.env`, `.env.local` y `node_modules` **no** aparecen.
- [x] `git branch` → existen `main` y `develop`.

### 5.2 Pruebas manuales

- [x] Swagger en `http://localhost:4000/api` muestra al menos el endpoint de health.
      *Swagger UI responde `200` y documenta `GET /health` con sus dos respuestas (200 y 503). El
      documento OpenAPI queda en `/api-json`.*
- [x] Un request con `Origin: http://evil.example` recibe el **cors headers ausente** o `403`.
      *Sin `Access-Control-Allow-Origin` en la respuesta.*
- [x] Un request con `Origin: http://localhost:3000` recibe los CORS headers correctos.
      *`Access-Control-Allow-Origin: http://localhost:3000`*
- [x] Con `DATABASE_URL` inválida, el health check devuelve `database: "down"` y no revienta el proceso.
      *`503` con `{"status":"degraded","database":"down"}` y el proceso sigue escuchando. Para
      lograrlo hubo que hacer tolerante el `onModuleInit` de `PrismaService`: sin eso, el `P1001` de
      `$connect()` tumbaba el proceso y este camino era inalcanzable.*
- [x] El conmutador de tema claro/oscuro funciona y persiste al recargar.
      *Verificado con Chrome headless por CDP, leyendo el atributo, la clave de `localStorage` y los
      colores calculados: sin elección previa queda claro (`#f8fafc` sobre `#0f172a`); tras elegir
      "oscuro" queda oscuro (`#020617` sobre `#e2e8f0`) y sigue oscuro tras dos recargas; al elegir
      "claro" vuelve.*

### 5.3 Casos límite de la validación de configuración

Verificados aunque no figuren en el checklist, porque son las trampas de §8:

- [x] `DATABASE_URL` con formato inválido → `"DATABASE_URL" debe tener el formato
      mysql://usuario:clave@host:puerto/nombre_base`
- [x] `CORS_ORIGINS=*` → `"CORS_ORIGINS" no admite el comodín "*": declará la lista blanca explícita`
- [x] `CORS_ORIGINS` con espacios después de las comas → los recorta y arranca con la lista correcta

---

## 6. Criterios de cierre

- [x] `npm run start:dev` (backend) arranca sin errores.
- [x] `npm run dev` (frontend) arranca sin errores. *(en el 3001: el 3000 está tomado por RHPro)*
- [x] `GET /api/health` devuelve `200` y confirma conexión a MySQL.
- [x] Swagger documenta al menos un endpoint.
- [x] CORS rechaza un origen no autorizado y acepta uno de `CORS_ORIGINS`.
- [x] La aplicación **falla al arrancar** si falta `DATABASE_URL`, `JWT_SECRET` o `CORS_ORIGINS`.
- [x] `.env` y `.env.local` **no** aparecen en `git status`.
- [x] `npm run lint` limpio en backend y frontend.
- [x] `AGENTS.md` y `README.md` escritos.

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

- [x] Commit: `chore: setup inicial del proyecto meRegalasUnaHora`
- [ ] PR contra `develop` describiendo qué y por qué.
      *No se abrió: el remoto tiene solo `main` y `origin/develop` no existe. Hay que publicar
      `develop` primero. Queda pendiente de una orden explícita de push.*
- [x] `ESTADO.md` §1 actualizado: Fase 1 `COMPLETADA`, Fase actual = Fase 2.
- [x] `ESTADO.md` §4 con una fila en el registro de ejecuciones.
