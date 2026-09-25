# Fase 2 — Modelo de BD, Seed, Autenticación y API de Pacientes

| | |
|---|---|
| **Estado** | `COMPLETADA` |
| **Depende de** | Fase 1 |
| **Bloquea a** | Fases 3, 4, 5 |
| **Estimación** | 5 – 7 días |
| **Rama** | `main` (decisión de dirección: sin rama por fase) |
| **Cerrada** | 2026-09-25 |
| **Documentos fuente** | `../03-esquema-bd.md` §1–§3, §7, §8, §10, §14 · `../02-arquitectura-tech.md` §5, §7, §8, §9 · `../01-requerimientos-y-negocio.md` §3.1.2, §3.3, §3.4, §4 (RN-01, RN-04, RN-07), §6 |
| **Requisitos cubiertos** | RF-03.1, RF-03.2, RF-03.6, RF-04.1, RF-04.2, RF-07.1 · RN-01, RN-04, RN-07 · CU-02, CU-06, CU-07 |
| **Progreso** | **44 / 44 tareas · 30 / 30 verificaciones · 15 / 15 criterios de cierre** · 5 / 5 condiciones de entrada |
| **Desviaciones** | 9 (DI-13 … DI-21) + 3 bugs corregidos — ver §10 |

---

## 1. Objetivo

Definir el modelo de datos en Prisma, aplicar la migración inicial y exponer la API REST completa
de pacientes, con autenticación funcionando y el guard global protegiendo todos los endpoints.

**Al terminar:** `POST /api/auth/login` emite un JWT y `GET /api/pacientes?q=jose` encuentra a
`José` detrás del guard, con paginación y metadatos.

### 1.1 Gate resuelto (2026-09-25)

Las 5 condiciones de entrada de §2 quedan cubiertas así:

| Condición | Estado |
|---|---|
| Fase 1 `COMPLETADA` y lint limpio | ✓ |
| `migrate status` sin errores, base con `utf8mb4_0900_ai_ci` | ✓ (verificar en 5.1) |
| **B-1** preguntas 1, 2 y 3 de `../01` §12 | ✓ `RESUELTA` por default documentado — ver `ESTADO.md` §3.1 |
| **B-2 / DI-08** estrategia de pruebas | ✓ `RESUELTA`: sin archivos de prueba, verificación manual |
| DI-02, DI-03 y DI-04 revisadas | ✓ DI-02 ya `RESUELTA` (B-4); DI-03 y DI-04 se aplican en §3.2 |

> **B-1 es un default, no una respuesta de la organización.** Si más adelante se responde distinto,
> se reabre y se escribe una migración nueva. Las preguntas 4 a 8 no bloquean esta fase.

---

## 2. Condiciones de entrada (gate)

- [x] Fase 1 `COMPLETADA` en `ESTADO.md` y `npm run lint` limpio en ambos proyectos.
- [x] `npx prisma migrate status` sin errores y base `meregalasunahora_dev` creada con el collation
      `utf8mb4_0900_ai_ci`.
- [x] **B-1** (preguntas abiertas 1, 2 y 3 de `../01` §12) resueltas: alcance del número de historia,
      tipos de documento aceptados y matriz de roles.
- [x] **B-2 / DI-08** (estrategia de pruebas) resuelta. Si sigue abierta: **no se generan archivos de
      prueba** y toda la verificación de esta fase es manual con `curl` + `npx prisma studio`.
- [x] DI-02, DI-03 y DI-04 de `README.md` §5 revisadas y aceptadas por dirección técnica.

---

## 3. Contexto técnico

### 3.1 Entidades de esta fase

| Modelo Prisma | Tabla | Notas |
|---|---|---|
| `MedicoVoluntario` | `medicos_voluntarios` | Doble función: entidad **y** tabla de usuarios. `passwordHash` `VARCHAR(255)` |
| `Paciente` | `pacientes` | Bloque B del formulario. `documento` anulable y único |
| `Representante` | `representantes` | Persona, organización o efector (RN-03) |
| `EstadoCivil` | `estados_civiles` | Catálogo con `orden` y `activo` |
| `Nacionalidad` | `nacionalidades` | Catálogo con `codigoIso` único |
| `TipoDocumento` | `tipos_documento` | Catálogo: incluye *"Sin documento"* (RN-01) |
| `Operativo` | `operativos` | **Se crea acá** (DI-04) porque la FK de `historias_clinicas` lo necesita en la Fase 3. Sin API en esta fase |

Enums: `Sexo` (`F`, `M`, `X`, `SIN_DATOS`) · `Rol` (`MEDICO`, `COORDINADOR`, `ADMIN`) ·
`TipoRepresentante` (`PERSONA`, `ORGANIZACION`, `EFECTOR`).

### 3.2 Decisiones de implementación a aplicar

| ID | Qué hacer |
|---|---|
| **DI-02** | MySQL admite una sola columna `AUTO_INCREMENT` por tabla y `pacientes.id` ya la usa. El correlativo `numero_historia` **se deriva de `id`**: en la misma transacción del alta, `UPDATE pacientes SET numero_historia = id WHERE id = ?`. Cumple RN-04 (monótono creciente, vitalicio, inmutable) con la salvedad de que puede haber saltos si una transacción se revierte. **Dejar `numero_historia` nullable en el esquema y documentarlo** |
| **DI-03** | Prisma devuelve `BigInt` y `JSON.stringify` **lanza excepción**. Crear `common/interceptors/bigint.interceptor.ts` (global) que convierta `BigInt` → `Number`. Registrar el límite de seguridad: los ids no superan `2^53 - 1` |
| **DI-04** | `operativos` entra en el esquema y en el seed en esta fase. La API y el filtro por puesto se exponen en la Fase 6 |
| **DI-06** | Prisma **no declara `CHECK`**. Generar la migración con `--create-only` y **editar el SQL** para agregar `ck_pacientes_edad`, `ck_pacientes_documento_largo` y los que falten |
| **DI-08** | Sin archivos de prueba mientras la decisión esté abierta |

### 3.3 Contrato de respuesta

```jsonc
// OK con paginación
{ "success": true, "data": [ /* … */ ], "meta": { "total": 120, "page": 1, "limit": 20, "totalPages": 6 } }

// Error
{ "success": false, "error": { "code": "P2002", "message": "Ya existe un registro con ese valor",
  "path": "/api/pacientes", "timestamp": "2026-01-01T00:00:00.000Z" } }
```

| Código Prisma | Excepción NestJS | HTTP | Mensaje al usuario |
|---|---|---|---|
| `P2002` | `ConflictException` | 409 | Ya existe un registro con ese valor |
| `P2003` | `ConflictException` | 409 | No se puede eliminar: el registro tiene datos asociados |
| `P2025` | `NotFoundException` | 404 | El registro solicitado no existe |
| `P2014` | `BadRequestException` | 400 | Falta un dato obligatorio relacionado |

---

## 4. Tareas

### 4.1 Modelo de datos

- [x] **2.1.1** Escribir `schema.prisma` con `generator client`, `datasource db` (MySQL,
      `env("DATABASE_URL")`) y los 7 modelos + 3 enums de §3.1, con `@@map` a `snake_case` y
      `@map` en cada campo.
      *Archivo: `backend/prisma/schema.prisma`*
- [x] **2.1.2** Declarar en `Paciente`: `documento String? @unique @db.VarChar(20)`,
      `edad Int @db.TinyInt`, `sexo Sexo @default(SIN_DATOS)`, `fechaNacimiento DateTime? @db.Date`,
      `sinDomicilioFijo Boolean @default(false)`, `observaciones String? @db.Text`,
      `activo Boolean @default(true)`, `createdAt`/`updatedAt` con `@db.DateTime(3)`,
      `createdBy BigInt?` con `onDelete: SetNull`.
      *Archivo: `backend/prisma/schema.prisma`*
- [x] **2.1.3** Declarar índices con `map:` explícito según `../03` §3.1–§3.4:
      `ix_pacientes_apellido_nombre` (compuesto, orden de la consulta), `ix_pacientes_activo`,
      `ix_pacientes_nacionalidad`, `ix_mv_apellido`, `ix_mv_activo`, `ix_representantes_nombre`,
      `ix_representantes_documento`, y los `UNIQUE` de catálogos.
      *Archivo: `backend/prisma/schema.prisma`*
- [x] **2.1.4** Declarar las relaciones con `onDelete` explícito: `Restrict` donde el dato es clínico
      o de autoría, `SetNull` donde la referencia es accesoria.
      *Archivo: `backend/prisma/schema.prisma`*
- [x] **2.1.5** Generar la migración inicial en modo edición manual:
      `npx prisma migrate dev --name init --create-only`.
      *Archivo: `backend/prisma/migrations/0*_init/migration.sql`*
- [x] **2.1.6** Editar `migration.sql` y **agregar los `CHECK`** que Prisma no declara:
      `ck_pacientes_edad` (`edad BETWEEN 0 AND 120`). Verificar también que la tabla y las columnas
      quedan en `utf8mb4` con el collation de la base.
      *Archivo: `backend/prisma/migrations/0*_init/migration.sql`*
- [x] **2.1.7** Aplicar la migración: `npx prisma migrate dev` y `npx prisma generate`.
      *Archivos: `backend/prisma/migrations/` · generado en `node_modules/.prisma`*
- [x] **2.1.8** Verificar el esquema en `npx prisma studio` y con `SHOW CREATE TABLE pacientes`.
      *Comando: `mysql -u root -p -e "SHOW CREATE TABLE meregalasunahora_dev.pacientes\G"`*

### 4.2 Seed

- [x] **2.2.1** Configurar el seed en `package.json` con `"prisma": { "seed": "…" }` y
      `tsx prisma/seed.ts` (o `node --loader ts-node/esm`, según lo instalado).
      *Archivo: `backend/package.json`*
- [x] **2.2.2** `seed.ts` con `estados_civiles`: Soltero/a, Casado/a, Unión libre, Separado/a,
      Divorciado/a, Viudo/a, **Sin datos** (con su `orden`).
      *Archivo: `backend/prisma/seed.ts`*
- [x] **2.2.3** `seed.ts` con `nacionalidades`: lista de países con **`Argentina` primero**
      y `codigoIso` ISO 3166-1 alfa-3.
      *Archivo: `backend/prisma/seed.ts`*
- [x] **2.2.4** `seed.ts` con `tipos_documento`: DNI, Cédula, Pasaporte, Documento de emergencia,
      **Sin documento** (`requiereNumero: false`).
      *Archivo: `backend/prisma/seed.ts`*
- [x] **2.2.5** `seed.ts` con `operativos`: **vacío o con un único ítem genérico**. Los puestos
      reales los define la organización (B-7). Sin datos inventados.
      *Archivo: `backend/prisma/seed.ts`*
- [x] **2.2.6** `seed.ts` con el usuario `ADMIN`: email y nombre desde `ADMIN_EMAIL` /
      `ADMIN_NOMBRE`, **contraseña leída de `ADMIN_PASSWORD` y hasheada con bcrypt en tiempo de
      ejecución**. Prohibido cualquier valor por defecto hardcodeado.
      *Archivo: `backend/prisma/seed.ts`*
- [x] **2.2.7** Todo el seed con `upsert` (o `findUnique` + create) para que sea **idempotente**.
      *Archivo: `backend/prisma/seed.ts`*
- [x] **2.2.8** Confirmar que el seed **no inserta pacientes, médicos ni historias ficticias**.
      *Archivo: `backend/prisma/seed.ts`*

### 4.3 Capa común (`common/`)

- [x] **2.3.1** `dto/paginacion.dto.ts` con `page` (default 1, mín. 1) y `limit` (default 20,
      máx. 100), con `@Type(() => Number)` y `@Transform` para coerción desde query string.
      *Archivo: `backend/src/common/dto/paginacion.dto.ts`*
- [x] **2.3.2** `filters/prisma-exception.filter.ts` que traduzca `P2002`, `P2003`, `P2014`, `P2025`
      a las excepciones de la tabla de §3.3, y un `filtro-excepcion.filter.ts` que.ensure la forma
      `{ success: false, error: { code, message, details?, path, timestamp } }` en **todos** los
      errores, incluidos los no controlados (sin filtrar stack al cliente).
      *Archivos: `backend/src/common/filters/`*
- [x] **2.3.3** `interceptors/bigint.interceptor.ts` (DI-03): registra globalmente y convierte
      `BigInt` a `Number` en la respuesta.
      *Archivo: `backend/src/common/interceptors/bigint.interceptor.ts` · `backend/src/main.ts`*
- [x] **2.3.4** `interceptors/respuesta.interceptor.ts` o helper único que envuelva la respuesta en
      `{ success: true, data, meta? }`.
      *Archivo: `backend/src/common/interceptors/`*
- [x] **2.3.5** `decorators/public.decorator.ts` (`@Public()`) y `decorators/current-user.decorator.ts`
      (`@CurrentUser()`).
      *Archivos: `backend/src/common/decorators/`*
- [x] **2.3.6** `utils/texto.ts` con `normalizarDocumento()` (`''` → `null`, solo dígitos) y
      `esDocumentoDuplicado()`.
      *Archivo: `backend/src/common/utils/texto.ts`*

### 4.4 Autenticación

- [x] **2.4.1** `nest g resource auth --no-spec` y borrar el código muerto generado.
      *Archivos: `backend/src/auth/`*
- [x] **2.4.2** `dto/login.dto.ts`: `email` (`@IsEmail()`) y `password` (`@IsString()`,
      `@MinLength(8)`), con trim.
      *Archivo: `backend/src/auth/dto/login.dto.ts`*
- [x] **2.4.3** `AuthService.login()`: busca por `email`, compara con `bcrypt.compare`, y si falla
      devuelve un **mensaje genérico** (nunca revela si el email existe).
      *Archivo: `backend/src/auth/auth.service.ts`*
- [x] **2.4.4** Emitir el JWT con los claims `sub`, `usuario`, `nombre`, `rol`, `iss`, `aud`, `iat`, `exp`,
      usando `JWT_SECRET` y `JWT_EXPIRES_IN`. Actualizar `ultimoAcceso` del médico.
      *Archivo: `backend/src/auth/auth.service.ts`*
- [x] **2.4.5** `JwtAuthGuard` registrado **globalmente** con `APP_GUARD`, respetando `@Public()`.
      *Archivos: `backend/src/auth/jwt-auth.guard.ts`, `backend/src/app.module.ts`*
- [x] **2.4.6** `RolesGuard` global con `@Roles()` para los endpoints de gestión.
      *Archivos: `backend/src/auth/roles.guard.ts`, `backend/src/common/decorators/roles.decorator.ts`*
- [x] **2.4.7** `GET /api/auth/me` (protegido): devuelve el usuario del token.
      *Archivo: `backend/src/auth/auth.controller.ts`*
- [x] **2.4.8** Marcar `POST /api/auth/login` con `@Public()` y documentar ambos endpoints en Swagger.
      *Archivo: `backend/src/auth/auth.controller.ts`*

### 4.5 Módulo de pacientes

- [x] **2.5.1** `nest g resource pacientes --no-spec` y limpiar los archivos generados.
      *Archivos: `backend/src/pacientes/`*
- [x] **2.5.2** `CreatePacienteDto` con los campos del **Bloque B** y las validaciones de `../01` §6:
      `apellido` y `nombre` (2–80, obligatorios), `documento` (opcional, 3–20, solo dígitos),
      `edad` (`@IsInt()`, `@Min(0)`, `@Max(120)`), `sexo` (`@IsEnum(Sexo)`),
      `estadoCivilId` y `nacionalidadId` (obligatorios, `number`),
      `tipoDocumentoId` (opcional), `fechaNacimiento` (`@IsDateString()`, opcional),
      `domicilio` (≤200, opcional), `telefono` (3–30, opcional), `sinDomicilioFijo`, `observaciones`.
      *Archivo: `backend/src/pacientes/dto/create-paciente.dto.ts`*
- [x] **2.5.3** `UpdatePacienteDto` con `PartialType(CreatePacienteDto)`, sin campos de auditoría ni
      de estado.
      *Archivo: `backend/src/pacientes/dto/update-paciente.dto.ts`*
- [x] **2.5.4** `QueryPacienteDto` extends `PaginacionDto`: `q`, `sexo`, `nacionalidadId`,
      `estadoCivilId`, `activo`, `desde`, `hasta`, `ordenarPor`, `orden`.
      *Archivo: `backend/src/pacientes/dto/query-paciente.dto.ts`*
- [x] **2.5.5** `PacienteResponseDto` con la forma de salida documentada en Swagger (incluye
      `numeroHistoria` como `number`).
      *Archivo: `backend/src/pacientes/dto/paciente-response.dto.ts`*
- [x] **2.5.6** `GET /api/pacientes`: listado paginado con `q` buscando en `apellido`, `nombre`,
      `documento` y `numeroHistoria`, **`orderBy` estable** (`apellido`, luego `id`), filtro por
      `activo` por defecto y `meta` con `total`, `page`, `limit`, `totalPages`.
      *Archivo: `backend/src/pacientes/pacientes.service.ts`*
- [x] **2.5.7** `GET /api/pacientes/:id`: detalle con `Prisma.ParseIntPipe`-equivalente para `BigInt`
      (`@Param('id', ParseBigIntPipe)`) y `404` con `P2025` si no existe.
      *Archivo: `backend/src/pacientes/pacientes.controller.ts`*
- [x] **2.5.8** `POST /api/pacientes` — **en esta fase solo el paciente**, en `$transaction`:
      crear el paciente y completar `numeroHistoria` con su `id` (DI-02). Resolver
      `createdBy` desde `@CurrentUser()`, **nunca** desde el body.
      *Archivo: `backend/src/pacientes/pacientes.service.ts`*
- [x] **2.5.9** Normalizar `documento = ''` → `null` **antes** de insertar (RN-01) y dejar que el
      `UNIQUE` devuelva `409` en duplicados.
      *Archivo: `backend/src/pacientes/pacientes.service.ts` · `backend/src/common/utils/texto.ts`*
- [x] **2.5.10** `PATCH /api/pacientes/:id`: solo datos de identificación. Sin `DELETE`.
      *Archivo: `backend/src/pacientes/pacientes.controller.ts`*
- [x] **2.5.11** Swagger completo en los 4 endpoints (`@ApiTags`, `@ApiOperation`, `@ApiResponse`,
      `@ApiBearerAuth`, `@ApiQuery`, `@ApiParam`).
      *Archivo: `backend/src/pacientes/pacientes.controller.ts`*

### 4.6 Catálogos

- [x] **2.6.1** `nest g resource catalogos --no-spec`.
      *Archivos: `backend/src/catalogos/`*
- [x] **2.6.2** `GET /api/catalogos/estados-civiles`, `GET /api/catalogos/nacionalidades` y
      `GET /api/catalogos/tipos-documento`: solo ítems `activo`, ordenados por `orden`.
      *Archivo: `backend/src/catalogos/catalogos.controller.ts`*
- [x] **2.6.3** Registrar `CatalogosModule` y `AuthModule` en `app.module.ts`.
      *Archivo: `backend/src/app.module.ts`*

---

## 5. Verificación

### 5.1 Base de datos

- [x] `npx prisma migrate status` → la base está al día, sin migraciones pendientes.
- [x] `DROP DATABASE meregalasunahora_dev;` + recrear + `npx prisma migrate deploy` → **migración
      limpia desde cero**, sin warnings.
- [x] `npx prisma db seed` seguido de `npx prisma db seed` → la segunda corrida no duplica filas
      (contar con `SELECT COUNT(*)` en cada catálogo).
- [x] `SHOW CREATE TABLE pacientes` → confirma `UNIQUE(documento)`, `UNIQUE(numero_historia)`,
      los índices compuestos, `DATETIME(3)` en auditoría y el `CHECK` de edad.
- [x] `npx prisma studio` → los catálogos aparecen con `Argentina` primero y *"Sin documento"*
      en `tipos_documento`.
- [x] `SELECT * FROM medicos_voluntarios` → existe **1** admin y su `password_hash` es un hash bcrypt
      de 60 caracteres, no texto plano.

### 5.2 Autenticación

- [x] `curl -s http://localhost:4000/api/pacientes` **sin** cabecera `Authorization` → `401` con
      `{ "success": false, "error": { ... } }`.
- [x] `curl -s -X POST .../api/auth/login` con contraseña incorrecta → `401` con mensaje genérico
      que **no** revela si el email existe.
- [x] `curl -s -X POST .../api/auth/login` con credenciales de `ADMIN_EMAIL`/`ADMIN_PASSWORD` → `200`
      con `accessToken` y los claims `sub`, `usuario`, `nombre`, `rol`, `iss`, `aud`, `exp`.
- [x] `curl -s -H "Authorization: Bearer <token>" .../api/auth/me` → devuelve el usuario del token.
- [x] `curl -s -H "Authorization: Bearer token.invalido" .../api/pacientes` → `401`.
- [x] Recorrer Swagger: **solo** `POST /api/auth/login` y `GET /api/health` están sin candado.

### 5.3 Pacientes

- [x] `POST /api/pacientes` con los 10 campos del Bloque B → `201` con `numeroHistoria` asignado.
- [x] `GET /api/pacientes?q=jose` → encuentra al paciente `José`.
- [x] `GET /api/pacientes?q=JOSE` → **mismo resultado** que el anterior (collation).
- [x] `GET /api/pacientes?q=0998` (documento `998`) → encuentra al paciente.
- [x] `GET /api/pacientes` → la respuesta incluye `meta: { total, page, limit, totalPages }`.
- [x] `GET /api/pacientes?page=999` → `meta.totalPages` correcto y `data: []` sin error.
- [x] `POST /api/pacientes` **dos veces** con `documento: ""` → **no** hay conflicto de duplicado
      (RN-01: `''` se normalizó a `NULL`).
- [x] `POST /api/pacientes` con un `documento` ya existente → `409` con mensaje claro.
- [x] `PATCH /api/pacientes/:id` con `edad: 200` → `400` (validación del DTO).
- [x] `POST /api/pacientes` con `edad: 130` esperando el `400` del DTO y, si pasa, `500` por el
      `CHECK` de MySQL → en cualquier caso **no** se inserta el registro.
- [x] `POST /api/pacientes` enviando `createdBy: 999` en el body → `400` (campo no declarado en el
      DTO) y el registro creado tiene el `created_by` **del token**.
- [x] `GET /api/pacientes` con 30 pacientes de prueba → el orden es estable entre páginas
      (mismo `id` desempate, sin repetidos ni saltados al paginar).
- [x] Un `GET` con `page` negativo o `limit: 1000` → `400`.

### 5.4 Calidad

- [x] `npm run lint` (backend) → 0 errores, 0 warnings.
- [x] `npm run build` (backend) → `dist/main.js` generado.
- [x] `node dist/main.js` → responde en `/api/health` (confirma que no es `dist/src/main.js`).
- [x] Revisar la salida del server en consola: **ningún dato de paciente** (nombre, documento,
      domicilio) aparece en los logs.
- [x] `git status` → ningún `.env` ni credencial en el índice.

---

## 6. Criterios de cierre

- [x] `npx prisma migrate status` indica la base al día.
- [x] `npx prisma migrate dev` genera una migración limpia desde cero.
- [x] El seed es idempotente: ejecutarlo dos veces no duplica registros.
- [x] Sin endpoints de datos accesibles sin token (verificado con `curl` sin `Authorization` → `401`).
- [x] `POST /api/auth/login` con credenciales incorrectas devuelve `401` con mensaje genérico.
- [x] `GET /api/pacientes?q=jose` encuentra a un paciente `José`.
- [x] `GET /api/pacientes?q=JOSE` devuelve el mismo resultado.
- [x] `POST /api/pacientes` con `documento` vacío **no** genera conflicto de duplicado.
- [x] `POST /api/pacientes` con `documento` repetido devuelve `409`.
- [x] `PATCH /api/pacientes/:id` con `edad = 200` devuelve `400`.
- [x] La respuesta de los listados incluye `meta: { total, page, limit, totalPages }`.
- [x] `createdBy` y la autoría provienen del token, no del cuerpo de la petición.
- [x] Los ids se serializan como `number` (sin `TypeError: Do not know how to serialize a BigInt`).
- [x] `npm run lint` limpio y `dist/main.js` compila.
- [x] Ningún dato sensible en los logs del servidor.

---

## 7. Fuera de alcance

- **Historias clínicas y evoluciones**: Fase 3. `POST /api/pacientes` todavía crea solo el paciente.
- **CRUD de médicos voluntarios** (`/api/medicos-voluntarios`): llega con la Fase 5; el rol ya
  existe para el login.
- **`operativos` en la API**: la tabla y el seed existen (DI-04), el endpoint llega en la Fase 6.
- **Auditoría de escrituras**: Fase 7. En esta fase la trazabilidad se apoya en
  `created_at`, `created_by` y los logs.
- **Tests automatizados**: bloqueados por B-2 / DI-08.
- **Búsqueda `FULLTEXT`**: fuera del MVP (`../03` §7.2).

---

## 8. Errores frecuentes

| Trampa | Cómo evitarla |
|---|---|
| `TypeError: Do not know how to serialize a BigInt` en la primera respuesta | Registrar el interceptor de DI-03 en `main.ts` **antes** del primer endpoint con ids |
| `number_historia` con dos `AUTO_INCREMENT` | MySQL lo rechaza. Ver DI-02 en §3.2 |
| Los `CHECK` no aparecen en `SHOW CREATE TABLE` | Prisma no los genera: editar `migration.sql` a mano (DI-06) |
| Búsqueda que no encuentra `José` con `q=jose` | La base no está en `utf8mb4_0900_ai_ci`. Verificar el collation de tabla y columnas |
| `''` en documento devuelve `409` en el segundo alta | Normalizar `''` → `null` antes del `create` (tarea 2.5.9) |
| `edad: 200` devuelve `500` en vez de `400` | Falta `@Max(120)` en el DTO |
| Seed corre dos veces y duplica | Usar `upsert`, nunca `create` directo |
| Páginas inconsistentes al paginar | Falta el desempate por `id` en el `orderBy` |
| Imports relativos sin `.js` | Compilan y fallan en runtime. Revisar con `rg "from '\./" backend/src` |
| El `GET /api/pacientes` sin token devuelve `200` | El guard no está registrado con `APP_GUARD`, o el controller no pide el token |

---

## 9. Cierre

- [x] Actualizar `../03-esquema-bd.md` con la resolución de DI-02, DI-03, DI-04 y DI-06. → §15
- [x] Commit: `feat: modelo de datos, seed, autenticacion JWT y API de pacientes`
- [x] ~~PR contra `develop`~~ → **desviación**: por decisión de dirección (2026-09-25) el trabajo se
      hace directo sobre `main`, sin rama por fase ni PR. `develop` se sincroniza al cerrar.
- [x] `ESTADO.md` §1: Fase 2 `COMPLETADA`, fase actual = Fase 3 (o Fase 4, que puede solaparse).
- [x] `ESTADO.md` §3: cerrar B-1, B-2, B-4 y §4 con una fila de registro.

---

## 10. Desviaciones del playbook

Todo lo que se hizo distinto de lo que dice este documento, y por qué. Regla de precedencia: cuando
el playbook contradice a un documento fuente, **manda el documento fuente** (`../01`, `../02`,
`../03`).

| # | Qué se hizo distinto | Por qué |
|---|---|---|
| **DI-13** | `ck_hc_fecha_no_futura` y `ck_ev_fecha_no_futura` **no** seorlaron. | MySQL 8 rechaza funciones no deterministas dentro de un `CHECK`: `An expression of a check constraint contains disallowed function: now` (error 3814). `../03` §3.2 y §3.3 los proponen. La fecha no futura se valida en el DTO, en la capa de aplicación |
| **DI-14** | El `COLLATE` de las 9 tablas se fijó a mano en `utf8mb4_0900_ai_ci`. | Prisma emite `utf8mb4_unicode_ci`, que no es equivalente. Sin este cambio, la búsqueda `q=jose` **no** encuentra `José` (RF-03.2). `../03` §7.2 pide `0900_ai_ci` |
| **DI-15** | Se añadió `shadowDatabaseUrl` al `datasource` y la variable `SHADOW_DATABASE_URL`. | `prisma migrate dev` necesita crear una base sombra. El usuario `app` está acotado a su esquema (RNF-09) y no puede. Se le dio un esquema propio, `meregalasunahora_shadow`, en vez de abrirle `CREATE`/`DROP` globales |
| **DI-16** | Nombres de `UNIQUE` y de FK los genera Prisma (`pacientes_documento_key`), no los de `../03` §3.1 (`uq_pacientes_documento`). | Prisma no permite renombrar una FK desde el esquema, y un nombre distinto en la migración que en el esquema produce *drift* en el próximo `migrate dev`. Se prefirió un esquema sin drift |
| **DI-17** | `id` es `BIGINT` con signo, no `BIGINT UNSIGNED`. | Prisma no emite tipos `UNSIGNED` en MySQL. El rango practical es el mismo (hasta 2^63-1). `edad` y `orden` son `TINYINT` con signo: el rango 0–120 lo impone `ck_pacientes_edad` |
| **DI-18** | `numero_historia` queda **nullable** en el esquema. | Es lo que ya pedía la tarea 2.1.2 / DI-02. MySQL no permite escribir el `id` en la misma columna `AUTO_INCREMENT` dentro del `INSERT`, así que se completa en un segundo paso de la misma transacción |
| **DI-19** | La búsqueda `q` tolera ceros a la izquierda en el documento. | La verificación §5.3 pide que `q=0998` encuentre el documento `998`. Un DNI se recuerda con o sin ceros. Sólo aplica a consultas numéricas puras |
| **DI-20** | `JwtAuthGuard` valida con `JwtService` en vez de Passport. | `../02` §41 sólo declara `@nestjs/jwt`; no está Passport en el stack. Un token ya firmado no necesita el middleware de sesión que aporta Passport |
| **DI-21** | `GET /api/health` se marca con un decorador `@Crudo()` nuevo. | El interceptor de `{ success, data }` lo envolvía y rompía el contrato plano de DI-11. No había decorador para la excepción |

### 10.1 Bugs encontrados y corregidos durante la verificación

Ninguno estaba en el playbook; los tres habrían pasado inadvertidos sin probar de verdad.

| Bug | Síntoma | Causa | Corrección |
|---|---|---|---|
| Doble envoltorio | `GET /api/pacientes` devolvía `data.data` y `meta` enterrado | El service devuelve `{ data, meta }` y el interceptor lo envolvía otra vez | `respuesta.interceptor.ts` detecta el par `{ data, meta }` y lo promueve |
| `409`/`404` salían `500` | Documento repetido y paciente inexistente respondían error interno | Nest evalúa los filters globales en **orden inverso** al de registro: el catch-all se quedaba con todos los `P2002`/`P2025` | Se invirtió el orden en `main.ts`, con el motivo anotado |
| `POST` con documento de 2 dígitos devolvía `400` | — | **No era un bug**: el DTO exige 3 caracteres mínimo (`../01` §6). El script de verificación usaba datos de prueba inválidos | Se corrigieron los datos de prueba, no la aplicación |
