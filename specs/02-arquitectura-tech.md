# 02 - Arquitectura Tecnológica

> Este documento fija las decisiones técnicas del proyecto **meRegalasUnaHora** antes de escribir la primera línea de código.
> Las decisiones se toman siguiendo la arquitectura de referencia del proyecto **RHPro-NextGeneration**.

---

## 1. Resumen de Decisiones

| # | Decisión | Elección | Fundamento |
|---|---|---|---|
| D-01 | Layout de repositorios | **Monorepo** único | Ver §3 |
| D-02 | Backend | **NestJS** (Node.js + TypeScript) | Requisito del proyecto |
| D-03 | Frontend | **Next.js** (App Router) | Requisito del proyecto |
| D-04 | Base de datos | **MySQL 8** | Requisito del proyecto |
| D-05 | ORM en NestJS | **Prisma** (NO TypeORM) | Ver §5 |
| D-06 | Patrón de capas | **Desacoplado**: frontend consume API REST | Ver §7 |
| D-07 | Autenticación | **JWT** + guard global | Ver §8 |
| D-08 | Validación de entrada | `class-validator` + `ValidationPipe` global | Ver §9 |
| D-09 | Estilo visual | **Tailwind CSS v4** + tema oscuro/claro | Ver §10 |
| D-10 | Estado remoto en frontend | **TanStack Query** | Ver §10 |
| D-11 | Documentación de API | **Swagger** en `/api` | Ver §7 |
| D-12 | Generación de código | **Snippets oficiales** de NestJS + Prisma CLI | Ver §11 |
| D-13 | Lenguaje de módulos | **ESM** (`"type": "module"`) | Ver §12 |
| D-14 | Linter backend | **Oxlint** | Ver §12 |

---

## 2. Stack Tecnológico

### 2.1 Backend

| Paquete | Versión | Rol |
|---|---|---|
| `node` | ≥ 20 LTS | Runtime |
| `@nestjs/common` | `^12` | Framework base, decoradores, módulos |
| `@nestjs/core` | `^12` | Contenedor de dependencias |
| `@nestjs/platform-express` | `^12` | Servidor HTTP |
| `@nestjs/config` | `^12` | Variables de entorno tipadas |
| `@nestjs/swagger` | `^12` | Documentación OpenAPI |
| `@nestjs/jwt` | `^12` | Emisión y validación de tokens |
| `@prisma/client` | `^5.22` | Cliente ORM tipado |
| `prisma` (dev) | `^5.22` | Migraciones y generación de cliente |
| `class-validator` | `^0.15` | Validación declarativa de DTOs |
| `class-transformer` | `^0.5` | Transformación y sanitización |
| `joi` | `^18` | Validación de configuración |
| `bcrypt` (o `argon2`) | `^6` | Hash de contraseñas |
| `reflect-metadata` | `^0.2` | Requerido por los decoradores de NestJS |
| `rxjs` | `^7` | Programación reactiva interna |
| `typescript` | `^5.6` | Lenguaje tipado |
| `oxlint` | `^1` | Linter de alto rendimiento |
| `prettier` | `^3` | Formateador de código |

### 2.2 Frontend

| Paquete | Versión | Rol |
|---|---|---|
| `next` | `16.x` | Framework React con App Router |
| `react` / `react-dom` | `19.x` | Biblioteca de UI |
| `typescript` | `^5` | Lenguaje tipado |
| `tailwindcss` | `^4` | Utilidades CSS |
| `@tanstack/react-query` | `^5` | Estado remoto, caché, revalidación |
| `react-hook-form` | `^7` | Manejo de formularios |
| `zod` | `^3` | Validación de formularios en cliente |
| `@hookform/resolvers` | `^3` | Puente RHF ↔ Zod |
| `lucide-react` | `^1` | Íconos |
| `clsx` + `tailwind-merge` | `^2` / `^3` | Utilidad para clases condicionales |
| `recharts` | `^3` | Gráficos del dashboard |
| `jspdf` + `jspdf-autotable` | `^4` / `^5` | Exportación a PDF de la historia clínica |
| `xlsx` | `^0.18` | Exportación a Excel de listados |
| `date-fns` | `^4` | Manipulación y formateo de fechas |
| `eslint` + `eslint-config-next` | `^9` / `16` | Linting |

### 2.3 Base de datos

| Componente | Versión | Rol |
|---|---|---|
| MySQL Community / Server | `8.0+` | Almacenamiento relacional |
| `utf8mb4` | — | Charset (obligatorio: permite acentos y emojis) |
| `utf8mb4_0900_ai_ci` | — | Collation case-insensitive y accent-insensitive |

> **Requisito crítico:** el charset debe ser `utf8mb4` y el collation `utf8mb4_0900_ai_ci`. MySQL 8 con collation `utf8mb4_0900_ai_ci` resuelve insensible a mayúsculas **y acentos** de forma nativa, cubriendo el requisito RF-03.6 sin trucos de aplicación.

---

## 3. Layout de Repositorios: Monorepo (D-01)

### 3.1 Decisión

Se adopta un **monorepo con dos paquetes independientes** (`backend/` y `frontend/`), sin workspaces de npm.

```
meregalasunahora/              ← raíz del proyecto
├── backend/                   ← NestJS (API REST)
├── frontend/                  ← Next.js (App Router)
├── specs/                     ← documentación técnica (este directorio)
├── deploy/                    ← scripts de despliegue
├── AGENTS.md                  ← convenciones y protocolo del agente
├── README.md
└── .gitignore
```

### 3.2 Justificación

| Criterio | Monorepo | Repos separados |
|---|---|---|
| Consistencia de contratos API | **Ventaja**: un solo commit coordina backend y frontend | Requiere versionado y coordinación externa |
| Revisión de cambios (code review) | **Ventaja**: diff unificado en un PR | Un cambio de contrato se divide en dos PR |
| Despliegue independiente | Desacoplo por directorios y procesos | Nativo |
| Aislamiento de dependencias | Suficiente con `node_modules` separados | Superior |
| Soporte de CI/CD | **Ventaja**: un pipeline | Dos pipelines |
| Overhead operativo | Menor | Mayor (dos repos, dos CI) |

**Conclusión:** el proyecto tiene un equipo pequeño, un solo producto y contratos de API que evolucionan rápido. El costo de sincronización de un monorepo es menor que el costo de coordinación de dos repositorios. Se adoptan **repositorios separados** solo si en el futuro aparece un segundo consumidor con ciclo de vida propio.

### 3.3 Reglas de acoplamiento

1. `backend/` y `frontend/` **no comparten código fuente** (no hay paquete `shared/`).
2. El **contrato de API es la frontera**: se documenta en Swagger y se respeta en ambos lados.
3. Cada proyecto mantiene su propio `package.json` y su propio `node_modules`.
4. Los tipos TypeScript **no se comparten por importación directa**: el frontend define sus propios tipos alineados con el contrato REST.
5. La especificación (`specs/`) sí es compartida y es la fuente de verdad funcional.

---

## 4. Estructura de Carpetas

### 4.1 Backend (`backend/`)

```
backend/
├── prisma/
│   ├── schema.prisma              ← definición del modelo de datos
│   ├── migrations/                ← migraciones versionadas
│   └── seed.ts                    ← datos iniciales (roles, catálogos)
├── src/
│   ├── main.ts                    ← bootstrap: CORS, ValidationPipe, Swagger
│   ├── app.module.ts              ← módulo raíz
│   ├── app.controller.ts          ← health check
│   ├── prisma/
│   │   └── prisma.service.ts      ← PrismaService (extends PrismaClient)
│   ├── common/
│   │   ├── decorators/            ← @Public(), @CurrentUser(), @Roles()
│   │   ├── filters/               ← filtros de excepción
│   │   ├── interceptors/          ← interceptor de transform de respuesta
│   │   ├── guards/                ← JwtAuthGuard, RolesGuard
│   │   ├── dto/                   ← DTOs compartidos (paginación)
│   │   └── utils/                 ← normalización, acentos, fechas
│   ├── auth/                      ← MÓDULO: autenticación
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   ├── public.decorator.ts
│   │   ├── current-user.decorator.ts
│   │   └── dto/
│   ├── medicos-voluntarios/       ← MÓDULO: médicos voluntarios (CRUD)
│   ├── pacientes/                 ← MÓDULO: pacientes (CRUD + búsqueda)
│   ├── historias-clinicas/        ← MÓDULO: ingresos + evoluciones
│   ├── catalogos/                 ← MÓDULO: estados civiles, nacionalidades
│   ├── dashboard/                 ← MÓDULO: agregaciones e indicadores
│   └── index.ts                   ← barrel de módulos del dominio
├── test/                          ← pruebas e2e
├── .env.example
├── nest-cli.json
├── package.json
├── tsconfig.json
└── eslint.config.mjs
```

### 4.2 Módulos del dominio

Los módulos son **verticales**: cada uno agrupa todo lo necesario de su entidad.

| Módulo | Responsabilidad | Entidades |
|---|---|---|
| `AuthModule` | Login, emisión de JWT | — |
| `MedicosVoluntariosModule` | CRUD de médicos voluntarios | `medicos_voluntarios` |
| `PacientesModule` | CRUD, búsqueda, filtros | `pacientes` |
| `HistoriasClinicasModule` | Ingresos, cierre, evoluciones | `historias_clinicas`, `evoluciones` |
| `CatalogosModule` | Estados civiles, nacionalidades | `estados_civiles`, `nacionalidades` |
| `DashboardModule` | Indicadores y agregaciones | agregación de las 3 tablas |

### 4.3 Estructura interna de un módulo de dominio

Cada módulo de entidad sigue **exactamente** esta convención:

```
pacientes/
├── dto/
│   ├── create-paciente.dto.ts        ← CreatePacienteDto
│   ├── update-paciente.dto.ts        ← UpdatePacienteDto (extends PartialType)
│   ├── query-paciente.dto.ts         ← QueryPacienteDto (page, limit, q, filtros)
│   ├── paciente-response.dto.ts      ← formas de la API (Swagger)
│   └── index.ts
├── pacientes.controller.ts           ← rutas /api/pacientes
├── pacientes.service.ts              ← lógica de negocio + acceso a Prisma
├── pacientes.module.ts               ← @Module()
└── index.ts                          ← exporta controller, service, module
```

**Reglas del módulo:**

- El `controller` no contiene lógica de negocio: solo validación, decorators HTTP y delegation al `service`.
- El `service` es el **único** que instancia Prisma. Nunca se usa `PrismaService` desde un controller.
- La lógica de negocio que cruza entidades vive en el `service` del dominio dueño; los demás dominios se comunican por inyección (no por consultas cruzadas en cascada).
- `index.ts` es un barrel: exporta el módulo y lo consume `app.module.ts`.

### 4.4 Frontend (`frontend/`)

```
frontend/
├── app/                          ← App Router (rutas)
│   ├── layout.tsx                ← layout raíz: AuthProvider + AppShell
│   ├── page.tsx                  ← home / redirección
│   ├── globals.css               ← estilos globales + variables de tema
│   ├── proxy.ts                  ← middleware: protección de rutas (archivo raíz del proyecto)
│   ├── (auth)/
│   │   └── login/page.tsx        ← única página pública
│   ├── (app)/                    ← rutas protegidas (layout con sidebar)
│   │   ├── dashboard/page.tsx    ← panel de seguimiento
│   │   ├── pacientes/
│   │   │   ├── page.tsx          ← listado con toolbar
│   │   │   ├── nuevo/page.tsx    ← formulario de admisión
│   │   │   └── [id]/page.tsx     ← detalle del paciente
│   │   │       └── [historiaId]/page.tsx   ← detalle de historia + evoluciones
│   │   └── medicos/page.tsx      ← gestión de médicos (coordinador)
│   ├── services/                 ← capa de acceso a la API
│   │   ├── api.ts                ← instancia de fetch base con JWT
│   │   ├── auth.ts
│   │   ├── pacientes.ts
│   │   ├── historias-clinicas.ts
│   │   ├── medicos.ts
│   │   └── dashboard.ts
│   ├── components/
│   │   ├── ui/                   ← primitivos: Button, Input, Select, Modal, Table…
│   │   ├── layout/               ← AppShell, Sidebar, Topbar
│   │   ├── pacientes/            ← formularios y tarjetas del dominio
│   │   └── shared/               ← ConfirmDialog, Toast, EmptyState, Skeleton
│   ├── hooks/                    ← hooks reutilizables
│   ├── lib/                      ← utilidades puras: validación, formato, cn()
│   ├── types/                    ← tipos TypeScript alineados con la API
│   ├── auth-context.tsx          ← contexto de sesión
│   ├── sidebar.tsx               ← navegación lateral
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
```

**Convenciones de rutas:**

- Los nombres de carpeta son **kebab-case**: `historias-clinicas`, `nuevo`, `medicos-voluntarios`.
- Las rutas dinámicas usan corchetes: `[id]`, `[historiaId]`.
- Los **route groups** `(auth)` y `(app)` organizan layouts sin afectar la URL.
- Los servicios viven en `app/services/` y son el **único** lugar que hace `fetch` a la API.

---

## 5. Decisión de ORM: Prisma (D-05)

### 5.1 Elección

Se utiliza **Prisma** como ORM. **TypeORM queda descartado.**

### 5.2 Comparación

| Criterio | **Prisma** | TypeORM |
|---|---|---|
| Seguridad por defecto | Type-safe end-to-end; genera TypeScript desde el esquema | Tipado débil en tiempo de ejecución; muchos errores solo aparecen en ejecución |
| Migraciones | `prisma migrate` con diff declarativo y reproducible | CLI de migraciones menos confiable; `synchronize` genera DDL en runtime |
| Productividad en desarrollo | `npx prisma studio` para inspeccionar y editar datos | Requiere herramienta externa o SQL manual |
| Consultas raw | `$queryRaw` parametrizado (tagged template) | `query()` con SQL manual; alto riesgo de inyección si no se parametriza |
| Relaciones | `include`/`select` tipado y estricto | `relations` decorator, más verboso y propenso a errores |
| Documentación del modelo | El `schema.prisma` es la documentación legible | Las entidades se declaran en varias clases TS |
| Curva de aprendizaje | Baja | Media-alta |
| Soporte multi-motor | Excelente | Bueno |
| Ecosistema con NestJS | `PrismaService` inyectado como provider nativo | Requiere integración extra |

### 5.3 Motivos de la decisión

1. **Esquema como fuente de verdad única:** el modelo de datos se define una vez en `schema.prisma` y de ahí se derivan tipos, validaciones y cliente. Esto reduce la divergencia entre documentación y código, un riesgo crítico en un sistema de salud.
2. **Migraciones declarativas:** `prisma migrate dev` genera migraciones versionadas y reproducibles, esencial para poder auditar cambios en la base de datos clínica.
3. **Errores de tipo en la base de datos del paciente:** los datos clínicos no admiten corrupciones silenciosas. El tipado fuerte del cliente Prisma reduce errores en la capa de acceso.
4. **Precedente en el proyecto de referencia:** RHPro-NextGeneration ya utiliza Prisma con MySQL, lo que permite reutilizar convenciones, herramientas y conocimiento del equipo.
5. **Inserción segura por defecto:** toda consulta del *query builder* está parametrizada, eliminando la inyección SQL como clase de vulnerabilidad.

### 5.4 Configuración de Prisma

```prisma
// backend/prisma/schema.prisma (extracto — no es código final)

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"          // MySQL como motor único del proyecto
  url      = env("DATABASE_URL")
}
```

**Convención de nombres (OBLIGATORIA):**

- **Modelos** en `PascalCase` en Prisma, mapeados a tablas en `snake_case` con `@@map`.
- **Columnas** en `camelCase` en Prisma, mapeadas a `snake_case` con `@map`.
- Tipos nativos MySQL explícitos: `@db.VarChar(80)`, `@db.Text`, `@db.DateTime`, `@db.TinyInt`.
- `createdAt` y `updatedAt` obligatorios en toda tabla de negocio.
- Toda FK con `onDelete` explícito: `Restrict` para datos clínicos, `SetNull` para referencias opcionales.

### 5.5 Restricciones de uso de Prisma

1. **El *query builder* es la primera opción** siempre. SQL crudo es último recurso y debe justificarse en un comentario.
2. Si se usa SQL crudo, solo con el tagged template `$queryRaw` (parametrizado). **Prohibido** concatenar strings.
3. En SQL crudo se usa únicamente el **subconjunto ANSI**: `COALESCE` (nunca `IFNULL`/`ISNULL`), sin `LIMIT/OFFSET` (se pagina con `skip`/`take`), sin funciones de fecha propias del motor (se pasa un `Date` como parámetro).
4. La búsqueda insensible a mayúsculas y acentos se apoya en el **collation `utf8mb4_0900_ai_ci` de MySQL**, con `mode: 'insensitive'` en las columnas de texto donde esté soportado.
5. **Prohibido** `prisma migrate reset` sobre bases con datos. Se usan `prisma migrate dev` (desarrollo) y migraciones nombradas (producción).
6. No se ejecutan sentencias DDL desde el código de aplicación.

---

## 6. Variables de Entorno

### 6.1 Backend (`backend/.env`)

```dotenv
# --- Aplicación ---
NODE_ENV=development
PORT=4000

# --- Base de datos ---
DATABASE_URL="mysql://usuario:clave@localhost:3306/meregalasunahora"

# --- Autenticación (OBLIGATORIOS) ---
JWT_SECRET="<cadena-aleatoria-de-minimo-32-caracteres>"
JWT_EXPIRES_IN=8h

# --- CORS (OBLIGATORIO) ---
CORS_ORIGINS=http://localhost:3000
```

### 6.2 Frontend (`frontend/.env.local`)

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 6.3 Reglas

1. `.env` **nunca** se versiona. Solo `.env.example` con valores de ejemplo.
2. `JWT_SECRET` es obligatorio y **distinto por ambiente**; en producción se genera de forma aleatoria.
3. `CORS_ORIGINS` es obligatorio. **Prohibido** `origin: true` o el comodín `*`.
4. Toda configuración se lee con `ConfigService`; **prohibido** leer `process.env` fuera de `app.module.ts` y `main.ts`.
5. El arranque del backend **falla rápido** si falta una variable obligatoria (fail-fast).

---

## 7. Arquitectura de la API REST

### 7.1 Flujo de una solicitud

```
Componente React (Client Component)
        │  usa
        ▼
  app/services/<dominio>.ts          ← único lugar con fetch
        │  Authorization: Bearer <JWT>
        ▼
  NestJS: JwtAuthGuard (global)      ← autenticación
        ▼
  ValidationPipe (global)            ← validación y saneo del DTO
        ▼
  Controller                         ← debe delegar; sin lógica
        ▼
  Service                            ← lógica de negocio
        ▼
  PrismaService → MySQL              ← acceso a datos
        ▼
  { success, data, meta? }           ← respuesta estandarizada
```

### 7.2 Prefijos de ruta

Todas las rutas de negocio llevan el prefijo `/api`:

| Dominio | Base |
|---|---|
| Autenticación | `/api/auth` |
| Pacientes | `/api/pacientes` |
| Historias clínicas | `/api/historias-clinicas` |
| Evoluciones | `/api/historias-clinicas/:id/evoluciones` |
| Médicos voluntarios | `/api/medicos-voluntarios` |
| Catálogos | `/api/catalogos` |
| Dashboard | `/api/dashboard` |
| Salud | `/api/health` (público) |

### 7.3 Formato de respuesta

```typescript
// Éxito
interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Error
interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    path: string;
    timestamp: string;
  };
}
```

### 7.4 Endpoints del MVP

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| POST | `/api/auth/login` | Iniciar sesión (público) | Público |
| GET | `/api/health` | Estado del servicio (público) | Público |
| GET | `/api/pacientes` | Listado paginado + búsqueda + filtros | Autenticado |
| GET | `/api/pacientes/:id` | Detalle del paciente con historias | Autenticado |
| POST | `/api/pacientes` | **Alta de paciente + primer ingreso + evolución** | Autenticado |
| PATCH | `/api/pacientes/:id` | Editar datos de identificación | Autenticado |
| GET | `/api/pacientes/:id/historias` | Historias clínicas del paciente | Autenticado |
| GET | `/api/pacientes/:id/evoluciones` | Historial cronológico unificado | Autenticado |
| GET | `/api/historias-clinicas/:id` | Detalle de un ingreso | Autenticado |
| PATCH | `/api/historias-clinicas/:id/estado` | Cerrar / reabrir | Autor o coordinador |
| GET | `/api/historias-clinicas/:id/evoluciones` | Evoluciones del ingreso | Autenticado |
| POST | `/api/historias-clinicas/:id/evoluciones` | **Registrar nueva evolución** | Autenticado |
| GET | `/api/medicos-voluntarios` | Listado de médicos | Coordinador/Admin |
| POST | `/api/medicos-voluntarios` | Crear médico | Coordinador/Admin |
| PATCH | `/api/medicos-voluntarios/:id` | Modificar médico | Coordinador/Admin |
| PATCH | `/api/medicos-voluntarios/:id/estado` | Activar / desactivar | Coordinador/Admin |
| GET | `/api/catalogos/estados-civiles` | Catálogo | Autenticado |
| GET | `/api/catalogos/nacionalidades` | Catálogo | Autenticado |
| GET | `/api/dashboard/resumen` | Indicadores del período | Autenticado |
| GET | `/api/dashboard/recientes` | Ingresos recientes | Autenticado |
| GET | `/api/dashboard/sin-contacto` | Pacientes sin evolución reciente | Autenticado |

> **Detalle de diseño de `POST /api/pacientes`:** un único endpoint crea paciente + historia clínica + evolución inicial, dentro de una **transacción** (`prisma.$transaction`). Esto garantiza que nunca exista una historia clínica sin su paciente ni una historia huérfana. Si falla un paso, se revierte todo.

### 7.5 Códigos de estado HTTP

| Código | Uso |
|---|---|
| `200` | Consulta o actualización exitosa |
| `201` | Recurso creado |
| `400` | Error de validación del cuerpo o query |
| `401` | Token ausente, inválido o vencido |
| `403` | Rol sin permisos suficientes |
| `404` | Recurso inexistente |
| `409` | Conflicto de negocio (duplicado, historia cerrada) |
| `422` | Regla de negocio no satisfecha (ej. evolución en historia `CERRADA`) |
| `500` | Error interno (se registra; no se filtra detalle al cliente) |

---

## 8. Autenticación y Autorización (D-07)

### 8.1 Esquema

1. `POST /api/auth/login` valida las credenciales contra el hash almacenado.
2. El backend emite un **JWT** con los claims: `sub` (id), `usuario`, `nombre`, `rol`, `iss`, `aud`, `iat`, `exp`.
3. El frontend guarda el token en cookie **HttpOnly** (`SameSite=Lax`, `Secure` en producción, `Path=/`, `Max-Age` acotado a la vida del JWT) y lo envía en `Authorization: Bearer <JWT>`.
4. `JwtAuthGuard` está registrado **globalmente** con `APP_GUARD`: todos los endpoints requieren token salvo los marcados con `@Public()`.
5. `RolesGuard` evalúa el decorador `@Roles(...)` en los endpoints de gestión.
6. `proxy.ts` (middleware de Next.js) valida la sesión **antes de renderizar** cada ruta protegida.

> **DI-01 — RESUELTA (2026-09-25, Fase 4): opción A, BFF de Next.**
>
> El paso 3, tal como estaba escrito, no es realizable: una cookie `HttpOnly` **no se puede leer desde
> el JavaScript del navegador**, así que el `fetch` del cliente no puede armar el encabezado
> `Authorization`. Implementar el punto 3 al pie de la letra obligaba a elegir entre romper RN-06 o no
> funcionar.
>
> Lo que se implementó, en `frontend/`:
>
> | Pieza | Dónde | Qué hace |
> |---|---|---|
> | Login | `app/api/auth/login/route.ts` | Llama al backend y deja el token **sólo** en la cookie `HttpOnly`. El cuerpo de la respuesta no lleva `accessToken` |
> | Logout | `app/api/auth/logout/route.ts` | Borra la cookie. `204` sin cuerpo |
> | BFF | `app/api/proxy/[...path]/route.ts` | Lee la cookie, agrega `Authorization: Bearer` y reenvía al backend. **Prohibido** reenviar cookies del navegador |
>
> Reglas que quedaron fijadas por la implementación:
>
> 1. El navegador **nunca** habla con NestJS. `app/services/` llama a `/api/proxy/...`, y sólo el
>    Route Handler del servidor conoce la URL del backend.
> 2. La variable es **`API_URL`, sin `NEXT_PUBLIC_`**. Con el prefijo quedaría en el bundle del
>    cliente y cualquiera podría saltear el BFF (DI-25).
> 3. `proxy.ts` exime **`/api/*` entera**, no sólo login y logout: un endpoint de API contesta con su
>    propio código (`401` en JSON), no redirige. Si `/api/proxy` devolviera un 307, el `fetch` del
>    cliente seguiría el redirect y parsearía el HTML del login como si fuera JSON (DI-26).
> 4. `POST /api/auth/login` **no** pasa por el BFF: es la única ruta del backend que no lleva token,
>    y el proxy la rechaza a propósito. Va directo a su Route Handler.
>
> Verificado: el token no aparece en `localStorage`, `sessionStorage` ni en el código del cliente, y
> `/dashboard` sin sesión devuelve el redirect y no el HTML protegido.

### 8.2 Reglas obligatorias

- **El único endpoint público de negocio es `POST /api/auth/login`** (y `/api/health` para monitoreo). Cualquier otro endpoint nuevo debe llevar el guard.
- `JWT_SECRET` es obligatorio, aleatorio por ambiente, mínimo 32 caracteres. **Prohibido** un valor por defecto hardcodeado.
- **No se hardcodean credenciales, ni usuarios demo, ni bypass por `NODE_ENV`.**
- Las contraseñas se almacenan **solo con hash** (bcrypt o argon2). Nunca en texto plano ni cifrado reversible.
- El token se valida por firma, `iss`, `aud`, `exp`, `sub` y `rol`.
- Ante un `401`, el frontend limpia la sesión y redirige a `/login`.
- El **autor del registro se toma siempre del token**, nunca del cuerpo de la petición (ver RN y §3.1.5 del documento de requerimientos).

---

## 9. Validación de Entrada (D-08)

### 9.1 Backend

`ValidationPipe` global en `main.ts`:

```typescript
new ValidationPipe({
  whitelist: true,      // descarta campos no declarados en el DTO
  forbidNonWhitelisted: true,  // error explícito ante campos desconocidos
  transform: true,      // convierte el payload a la clase del DTO
})
```

**Reglas para todos los DTOs:**

- Decoradores de `class-validator` en **todas** las propiedades.
- Saneo de cadenas: `@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)`.
- `update-*.dto.ts` se genera con `PartialType(CreateXDto)`.
- `query-*.dto.ts` incluye paginación (`page`, `limit`) y filtro general (`q`).
- Ningún DTO acepta un id de usuario para establecer autoría: la autoría sale del token.

### 9.2 Frontend

- `react-hook-form` + `zod` para validación inmediata con mensajes en español.
- El mismo esquema Zod define las reglas que el cliente aplica y **repite** las del backend.
- El backend **siempre revalida**: la validación del cliente es una ayuda de UX, nunca una garantía de seguridad.

---

## 10. Convenciones de Frontend

### 10.1 Patrón de UI obligatorio (Toolbar Pattern)

Se replica el patrón del proyecto de referencia:

- **Toolbar superior** con las acciones globales (`Nuevo`, `Modificar`, `Eliminar`, `Desactivar`, `Refrescar`, `Exportar`) y buscador con debounce.
- **Prohibido** botones o íconos de acción dentro de las filas de la tabla.
- **Click simple** en la fila → selecciona (estilo visual activo) y habilita `Modificar` / `Eliminar` en la toolbar.
- **Doble click** en la fila → abre directamente el modal de edición.

### 10.2 Estados asíncronos

Toda pantalla que consulte datos debe contemplar los tres estados:

| Estado | Tratamiento |
|---|---|
| Carga | Skeleton o spinner (nunca una pantalla en blanco) |
| Vacío | Estado vacío con mensaje explicativo y acción sugerida (ej. *"Registrar el primer paciente"*) |
| Error | Toast/notificación con el mensaje del backend |

### 10.3 Navegación

Todo acceso nuevo se registra en el menú lateral (`sidebar.tsx` / `NAV_SECTIONS`).

### 10.4 Estilos

- Tailwind CSS v4, sin CSS modules ni estilos inline salvo valores dinámicos.
- Tema claro/oscuro con variables CSS definidas en `globals.css`.
- Utilidad `cn()` (clsx + tailwind-merge) para clases condicionales.
- Componentes de UI propios bajo `components/ui/`, sin dependencia de una librería de componentes de terceros en el MVP.

---

## 11. Generación de Código

Se usan los **generadores oficiales** para evitar errores de cableado:

```bash
# Módulo de dominio completo (controller + service + module + DTOs)
nest g resource pacientes --no-spec

# Módulo sin CRUD (solo endpoints propios)
nest g module dashboard

# Migración de Prisma
npx prisma migrate dev --name nombre_de_la_migracion
```

**Reglas:**

- `nest g` es la única forma de crear el esqueleto de un módulo.
- La generación de pruebas automáticas con `--no-spec` está deshabilitada por convención del proyecto.
- Los DTOs y los types de respuesta se escriben a mano para controlar el contrato público.

---

## 12. Convenciones de Código (OBLIGATORIAS)

### 12.1 Generales

1. **TypeScript estricto** en backend y frontend: `"strict": true`, sin `any` implícito.
2. **ESM** (`"type": "module"` en `package.json`).
3. **Los imports relativos de TypeScript llevan extensión `.js`**, obligatorio en modo ESM. Compilación en `dist/main.js`, nunca `dist/src/main.js`.
4. Entorno **Windows / Git Bash**: los comandos deben ser compatibles con Bash.
5. Variables y funciones en `camelCase`; clases, componentes y tipos en `PascalCase`; constantes en `SCREAMING_SNAKE_CASE`.
6. Sin `console.log` en código de aplicación: se usa el `Logger` de NestJS.
7. Sin comentarios innecesarios: el código explica el *qué*, la documentación explica el *por qué*.
8. Sin credenciales, tokens ni datos reales de pacientes en el repositorio, ni en ejemplos, ni en capturas.

### 12.2 Lint y formato

| Elemento | Herramienta | Comando |
|---|---|---|
| Lint backend | Oxlint | `npm run lint` |
| Lint frontend | ESLint + `eslint-config-next` | `npm run lint` |
| Formato | Prettier | `npm run format` |

`npm run lint` debe terminar **sin errores ni warnings** en backend y frontend.

---

## 13. Gestión de Versiones y Ramas

- **Conventional Commits:** `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `perf:`, `build:`, `style:`, `test:`.
- Ramas: `main` (estable) · `develop` (integración) · `feat/…`, `fix/…` (trabajo).
- Pull request obligatorio con descripción de **qué** cambia y **por qué**.
- Sin commits directos a `main`.
- `specs/` se versiona: los cambios de requisitos quedan en el historial.

---

## 14. Entornos

| Entorno | Propósito | Base de datos | URL |
|---|---|---|---|
| **Local** | Desarrollo | MySQL local `meregalasunahora_dev` | `http://localhost:3000` (front) · `http://localhost:4000` (back) |
| **Staging** | Pruebas de aceptación con la organización | MySQL de pruebas | Servidor de pruebas |
| **Producción** | Uso real del equipo médico | MySQL productive | Dominio con HTTPS |

**Reglas por entorno:**

- Cada entorno tiene su propia base de datos y sus propias credenciales.
- En producción, **HTTPS obligatorio** y `Secure: true` en la cookie de sesión.
- Las migraciones se aplican en staging antes que en producción.

---

## 15. Despliegue

| Componente | Decisión |
|---|---|
| Frontend | Build estático (`next build`), servido por el backend o por servidor estático con CDN |
| Backend | Build NestJS (`nest build`) + `node dist/main.js` con gestor de procesos (PM2) |
| Base de datos | MySQL 8 en servidor propio o servicio administrado; **backups automáticos diarios** |
| Proxy inverso | Nginx con terminación TLS y proxy inverso a `localhost:4000` |
| Procesos | **Prohibido** `prisma migrate reset` en staging y producción |

> El respaldo de la base de datos es **crítico**: contiene historias clínicas. Un plan de backups sin verificar no es un plan de recuperación. Se documenta un procedimiento de restauración probado.

---

## 16. Resumen de Dependencias Críticas

```
Frontend (Next.js)
   │  HTTPS + Authorization: Bearer
   ▼
Backend (NestJS)
   │  Prisma Client
   ▼
MySQL 8
```

- El **frontend nunca** accede a la base de datos: toda operación pasa por la API.
- El **backend** es el único dueño de la lógica de negocio y de la validación final.
- La base de datos aplica integridad referencial (`FOREIGN KEY`) y unicidad (`UNIQUE`) como última línea de defensa.

---

## 17. Trazabilidad hacia el resto de la especificación

| Documento | Propósito |
|---|---|
| `01-requerimientos-y-negocio.md` | Qué debe hacer el sistema: requerimientos, reglas de negocio y flujos de usuario |
| `03-esquema-bd.md` | Cómo se materializa este stack en tablas, tipos e índices sobre MySQL |
| `04-plan-de-fases.md` | En qué orden se implementa cada decisión técnica de este documento |
