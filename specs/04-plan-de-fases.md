# 04 - Plan de Desarrollo por Fases

> Plan secuencial para avanzar por iteraciones lógicas, cada una con un entregable verificable.
> Documentos de referencia: `01-requerimientos-y-negocio.md`, `02-arquitectura-tech.md`, `03-esquema-bd.md`.
>
> **Playbooks ejecutables:** cada fase tiene su archivo con tareas y verificaciones en formato
> checklist en [`fases/`](./fases/README.md), pensado para que un agente de IA la ejecute paso a paso.
> Índice y protocolo: [`fases/README.md`](./fases/README.md) · [`fases/00-protocolo-de-ejecucion.md`](./fases/00-protocolo-de-ejecucion.md).

---

## 1. Principios de Planificación

1. **Cada fase produce algo que se puede ejecutar.** No hay fases puramente administrativas: al terminar cada una, el sistema hace más que antes.
2. **Vertical antes que horizontal.** Cada funcionalidad se entrega completa (base de datos + API + UI) antes de pasar a la siguiente.
3. **El flujo principal primero.** El alta de paciente con historia y evolución es el camino crítico del negocio; se construye antes que el dashboard.
4. **Criterios de cierre objetivos.** Cada fase define cómo se verifica que está terminada. Sin verificación, la fase no está cerrada.
5. **Sin phase.productiva sin la anterior verificada.** No se avanza con una fase abierta.
6. **Sin secretos ni datos reales** en el repositorio, en todos los casos.

---

## 2. Vista General del Plan

| Fase | Nombre | Entregable principal | Depende de |
|---|---|---|---|
| **Fase 1** | Especificaciones y setup inicial | Repositorios configurados y arrancando | — |
| **Fase 2** | Modelado de BD y CRUD de pacientes | API REST de pacientes operativa | Fase 1 |
| **Fase 3** | API de historias clínicas y evoluciones | Endpoint de alta completo (transaccional) | Fase 2 |
| **Fase 4** | Setup del frontend y enrutamiento | Next.js con login y rutas protegidas | Fase 1 |
| **Fase 5** | UI/UX del formulario de admisión | Alta de paciente operable en móvil | Fases 2, 3, 4 |
| **Fase 6** | Dashboard de seguimiento de evoluciones | Panel con indicadores y alertas | Fases 3, 4 |
| **Fase 7** | Impresión, exportación y auditoría | Historia clínica imprimible | Fases 5, 6 |

> **Fases 4 y 5** pueden solaparse parcialmente: el frontend puede avanzar en paralelo con el backend una vez que el contrato de API está congelado en Swagger.

---

## Fase 1 — Especificaciones y Setup Inicial de Repositorios

### 1.1 Objetivo

Dejar la base técnica_ANDES: dos proyectos inicializados, conectados a una base de datos vacía, con las convenciones del proyecto escritas y verificadas.

### 1.2 Tareas

**Documentación y decisiones**

| # | Tarea |
|---|---|
| 1.1.1 | Revisar y aprobar los 4 documentos de `specs/` con la organización |
| 1.1.2 | Resolver las preguntas abiertas de `01-requerimientos-y-negocio.md` §12 |
| 1.1.3 | Redactar `AGENTS.md` del proyecto con las convenciones derivadas de `02-arquitectura-tech.md` |
| 1.1.4 | Redactar `README.md` con instrucciones de arranque |

**Backend**

| # | Tarea |
|---|---|
| 1.2.1 | Inicializar NestJS 12 con `nest new backend` |
| 1.2.2 | Configurar `"type": "module"` (ESM) y verificar la salida en `dist/main.js` |
| 1.2.3 | Instalar dependencias: Prisma, `@nestjs/config`, `@nestjs/swagger`, `@nestjs/jwt`, `class-validator`, `class-transformer`, `joi`, `bcrypt` |
| 1.2.4 | Configurar `ConfigModule` con validación Joi y fail-fast en variables obligatorias |
| 1.2.5 | Implementar `PrismaService` (extends `PrismaClient`) con `onModuleInit` / `onModuleDestroy` |
| 1.2.6 | Configurar `main.ts`: CORS con lista blanca, `ValidationPipe` global, Swagger en `/api` |
| 1.2.7 | Configurar Oxlint y Prettier |
| 1.2.8 | Crear `.env.example` y verificar que `.env` está en `.gitignore` |

**Frontend**

| # | Tarea |
|---|---|
| 1.3.1 | Inicializar Next.js 16 con App Router y TypeScript (`create-next-app`) |
| 1.3.2 | Instalar Tailwind CSS v4, TanStack Query, `react-hook-form`, `zod`, `lucide-react` |
| 1.3.3 | Configurar `cn()`, `globals.css` y el conmutador de tema claro/oscuro |
| 1.3.4 | Configurar ESLint con `eslint-config-next` |
| 1.3.5 | Crear `.env.local.example` |

**Base de datos e infraestructura**

| # | Tarea |
|---|---|
| 1.4.1 | Crear la base de datos MySQL `meregalasunahora_dev` con `utf8mb4` / `utf8mb4_0900_ai_ci` |
| 1.4.2 | Crear el usuario de aplicación con permisos mínimos |
| 1.4.3 | Inicializar el repositorio Git en la raíz (`git init`) con `.gitignore` |
| 1.4.4 | Crear las ramas `main` y `develop` |

### 1.3 Entregables

- Repositorio inicializado con `backend/`, `frontend/`, `specs/`, `AGENTS.md` y `README.md`.
- `GET /api/health` responde `200` con estado de la conexión a la base.
- Swagger accesible en `http://localhost:4000/api`.
- Next.js arranca en `http://localhost:3000`.
- `npm run lint` sin errores ni warnings en ambos proyectos.
- Commit: `chore: setup inicial del proyecto meRegalasUnaHora`.

### 1.4 Criterios de Cierre

- [ ] `npm run start:dev` (backend) arranca sin errores.
- [ ] `npm run dev` (frontend) arranca sin errores.
- [ ] `GET /api/health` devuelve `200` y confirma conexión a MySQL.
- [ ] Swagger documenta al menos un endpoint.
- [ ] CORS rechaza un origen no autorizado y acepta uno de `CORS_ORIGINS`.
- [ ] La aplicación **falla al arrancar** si falta `DATABASE_URL`, `JWT_SECRET` o `CORS_ORIGINS`.
- [ ] `.env` y `.env.local` **no** aparecen en `git status`.
- [ ] `npm run lint` limpio en backend y frontend.
- [ ] `AGENTS.md` y `README.md` escritos.

### 1.5 Riesgos

| Riesgo | Mitigación |
|---|---|
| Variables de entorno mal configuradas | Fail-fast en el arranque + `README.md` con pasos exactos |
| Confusión de puertos (3000 vs 4000) | Documentado en `README.md` y en la consola de arranque |
| Olvidar el `.gitignore` antes del primer commit | Crear `.gitignore` **antes** del `git init` |

---

## Fase 2 — Modelado de BD y API REST de Pacientes (CRUD)

### 2.1 Objetivo

Definir el modelo de datos en Prisma, aplicar la migración inicial y exponer la API REST completa de pacientes, con autenticación funcionando.

### 2.2 Tareas

**Modelo de datos**

| # | Tarea |
|---|---|
| 2.1.1 | Escribir `schema.prisma` con `MedicoVoluntario`, `Paciente`, `EstadoCivil`, `Nacionalidad`, `TipoDocumento`, `Representante` |
| 2.1.2 | Mapear con `@@map` y `@map` a nombres `snake_case` |
| 2.1.3 | Declarar índices, claves foráneas y `onDelete` según `03-esquema-bd.md` |
| 2.1.4 | Declarar las restricciones `CHECK` de edad, fechas y longitud de detalle |
| 2.1.5 | Generar la migración inicial: `npx prisma migrate dev --name init` |
| 2.1.6 | Escribir `prisma/seed.ts` (idempotente) con catálogos y un usuario `ADMIN` leído de `.env` |
| 2.1.7 | Verificar el esquema con `npx prisma studio` |

**Autenticación (mínimo indispensable para exponer datos)**

| # | Tarea |
|---|---|
| 2.2.1 | `AuthModule`, `AuthService`, `AuthController` |
| 2.2.2 | `POST /api/auth/login` con validación por hash (bcrypt) |
| 2.2.3 | Emisión del JWT con `sub`, `usuario`, `nombre`, `rol`, `iss`, `aud`, `iat`, `exp` |
| 2.2.4 | `JwtAuthGuard` registrado globalmente con `APP_GUARD` |
| 2.2.5 | Decoradores `@Public()` y `@CurrentUser()` |
| 2.2.6 | `GET /api/auth/me` (devuelve el usuario del token) |
| 2.2.7 | Traducción de errores de Prisma a excepciones HTTP (`P2002`, `P2003`, `P2025`) |

**Módulo de pacientes**

| # | Tarea |
|---|---|
| 2.3.1 | `nest g resource pacientes --no-spec` y limpieza de los archivos generados |
| 2.3.2 | `CreatePacienteDto` con los campos del Bloque B del formulario y validaciones de `01-requerimientos-y-negocio.md` §6 |
| 2.3.3 | `UpdatePacienteDto` con `PartialType` y saneo de cadenas |
| 2.3.4 | `QueryPacienteDto` (`page`, `limit`, `q`, filtros) |
| 2.3.5 | `GET /api/pacientes` — listado paginado con búsqueda insensible a acentos y mayúsculas |
| 2.3.6 | `GET /api/pacientes/:id` — detalle |
| 2.3.7 | `POST /api/pacientes` — alta (**solo paciente** en esta fase) |
| 2.3.8 | `PATCH /api/pacientes/:id` — edición de datos de identificación |
| 2.3.9 | Normalizar `documento = ''` a `NULL` (RN-01) y detección de duplicados |
| 2.3.10 | `GET /api/catalogos/estados-civiles` y `GET /api/catalogos/nacionalidades` |

### 2.3 Entregables

- Base de datos creada con el modelo completo de esta fase.
- Migración inicial versionada en `prisma/migrations/`.
- `POST /api/auth/login` operativo.
- API de pacientes completa y documentada en Swagger.
- Seed ejecutable que carga catálogos y el usuario administrador.

### 2.4 Criterios de Cierre

- [ ] `npx prisma migrate status` indica la base al día.
- [ ] `npx prisma migrate dev` genera una migración limpia desde cero.
- [ ] El seed es idempotente: ejecutarlo dos veces no duplica registros.
- [ ] Sin endpoints de datos accesibles sin token (verificado con `curl` sin cabecera `Authorization` → `401`).
- [ ] `POST /api/auth/login` con credenciales incorrectas devuelve `401` con mensaje genérico.
- [ ] `GET /api/pacientes?q=jose` encuentra a un paciente `José`.
- [ ] `GET /api/pacientes?q=JOSE` devuelve el mismo resultado.
- [ ] `POST /api/pacientes` con `documento` vacío **no** genera conflicto de duplicado en el segundo alta.
- [ ] `POST /api/pacientes` con `documento` repetido devuelve `409`.
- [ ] `PATCH /api/pacientes/:id` con `edad = 200` devuelve `400`.
- [ ] La respuesta de los listados incluye `meta: { total, page, limit, totalPages }`.
- [ ] `createdBy` y la autoría provienen del token, no del cuerpo de la petición.
- [ ] `npm run lint` limpio.
- [ ] Ningún dato sensible en los logs del servidor.

### 2.5 Riesgos

| Riesgo | Mitigación |
|---|---|
| Numeración correlativa mal implementada | `numero_historia` como `AUTO_INCREMENT` en la base, nunca generado en la aplicación |
| Doble alta por documento duplicado | Índice `UNIQUE` + normalización de `''` a `NULL` + aviso (no bloqueo) en la UI |
| Consultas de búsqueda lentas | Índices compuestos de `03-esquema-bd.md` §7 + verificar con `EXPLAIN` |
| Filtrar datos sensibles en logs | No registrar cuerpos de petición; loguear solo operación, recurso y resultado |

---

## Fase 3 — API REST de Historias Clínicas y Evoluciones

### 3.1 Objetivo

Completar el modelo clínico: cada ingreso es una historia clínica con sus evoluciones. El alta del paciente deja de ser un registro simple y pasa a ser una **transacción** que crea paciente + historia + evolución inicial.

### 3.2 Tareas

**Modelo de datos (extensión)**

| # | Tarea |
|---|---|
| 3.1.1 | Agregar `HistoriaClinica` y `Evolucion` al `schema.prisma` con los enums `EstadoHistoria`, `TipoIngreso`, `Sexo` |
| 3.1.2 | Migración: `npx prisma migrate dev --name add_historias_clinicas_y_evoluciones` |
| 3.1.3 | Verificar los índices `ix_hc_paciente_fecha` y `ix_ev_hc_fecha` |

**Módulo de historias clínicas**

| # | Tarea |
|---|---|
| 3.2.1 | `nest g resource historias-clinicas --no-spec` |
| 3.2.2 | `CreateIngresoDto` (motivo, representante, fecha, tipo de ingreso) y `CreateEvolucionDto` (fecha, detalle) |
| 3.2.3 | `GET /api/historias-clinicas/:id` — detalle del ingreso |
| 3.2.4 | `GET /api/historias-clinicas/:id/evoluciones` — listado cronológico descendente |
| 3.2.5 | `POST /api/historias-clinicas/:id/evoluciones` — **registro de evolución** |
| 3.2.6 | `PATCH /api/historias-clinicas/:id/estado` — cerrar / reabrir |
| 3.2.7 | `GET /api/pacientes/:id/historias` — historial de ingresos del paciente |
| 3.2.8 | `GET /api/pacientes/:id/evoluciones` — historial unificado y cronológico |
| 3.2.9 | Endpoint de alta de ingreso para paciente existente (segundo ingreso) |

**Reglas de negocio en la capa de servicio**

| # | Tarea | Regla |
|---|---|---|
| 3.3.1 | `POST /api/pacientes` pasa a crear paciente + historia + evolución en `prisma.$transaction` | RF-01, RN-02 |
| 3.3.2 | Congelar `edadRegistrada` desde la edad del paciente en el momento del ingreso | RN-02 |
| 3.3.3 | Rechazar evolución en historia `CERRADA` con `422` | CU-05 |
| 3.3.4 | Exigir al menos una evolución inicial al crear una historia | RF-01.4 |
| 3.3.5 | Resolver `medicoVoluntarioId` desde el token en las tres inserciones | §3.1.5 de doc 01 |
| 3.3.6 | Rechazar `fecha` de evolución futura con `400` | RN y §6 de doc 01 |
| 3.3.7 | Impedir `PATCH` sobre `detalle` y `fecha` de una evolución existente | RF-02.2 |
| 3.3.8 | Prohibir el borrado físico: `DELETE` devuelve `405` en recursos clínicos | RF-07.3 |

### 3.3 Entregables

- `POST /api/pacientes` crea el alta completa de forma atómica.
- API de ingresos y evoluciones completa y documentada.
- Todas las reglas de negocio RN-02, RN-04, RN-05 y RN-07 implementadas y verificadas.

### 3.4 Criterios de Cierre

- [ ] Un alta fallida en el paso de evolución **no** deja paciente ni historia huérfanos (transacción verificada).
- [ ] La primera evolución se crea junto con la historia y es obligatoria.
- [ ] El segundo ingreso de un paciente **no crea** un segundo paciente.
- [ ] El segundo ingreso conserva el mismo `numero_historia`.
- [ ] La edad queda congelada por historia: la historia antigua no cambia al releer el paciente.
- [ ] Registrar una evolución devuelve `201` y aparece en el listado.
- [ ] Registrar una evolución en una historia `CERRADA` devuelve `422` con mensaje claro.
- [ ] La evolución aparece ordenada por fecha clínica, no por fecha de inserción.
- [ ] No existe ningún endpoint que actualice `detalle` o `fecha` de una evolución.
- [ ] `DELETE` sobre historia, evolución o paciente con historial devuelve `405` o `409`.
- [ ] Enviar `medicoVoluntarioId` en el cuerpo de la petición **no** cambia la autoría real.
- [ ] Las evoluciones se listan con autor y fecha de registro.
- [ ] `npm run lint` limpio.

### 3.5 Riesgos

| Riesgo | Mitigación |
|---|---|
| Transacción anidada mal cerrada | Usar `prisma.$transaction` con el callback `tx` en **todas** las operaciones internas |
| Que el alta quede sin evolución | Validación en el DTO + verificación en el service antes de confirmar la transacción |
| Crecimiento desmedido de `evoluciones` | Índice compuesto por `historia_clinica_id` + `fecha DESC` |

---

## Fase 4 — Setup del Frontend y Enrutamiento Básico

### 4.1 Objetivo

Next.js operativo con la arquitectura de carpetas definida en `02-arquitectura-tech.md` §4.4, sesión persistente, protección de rutas y layout con navegación.

### 4.2 Tareas

| # | Tarea |
|---|---|
| 4.1.1 | Estructura de carpetas completa (`app/`, `components/`, `services/`, `hooks/`, `lib/`, `types/`) |
| 4.1.2 | `app/layout.tsx` raíz: tema, `AuthProvider`, `AppShell` |
| 4.1.3 | `globals.css` con variables de tema claro/oscuro |
| 4.1.4 | `app/services/api.ts`: instancia de `fetch` base con `Authorization: Bearer` y manejo de `401` |
| 4.1.5 | `auth-context.tsx`: `login`, `logout`, `usuario`, estado de carga |
| 4.1.6 | `proxy.ts`: middleware que valida la sesión y bloquea rutas no públicas |
| 4.1.7 | Route group `(auth)` con la página `/login` (única página pública) |
| 4.1.8 | Route group `(app)` con layout protegido: `AppShell`, `Sidebar`, `Topbar` |
| 4.1.9 | `sidebar.tsx` con la navegación y `NAV_SECTIONS` |
| 4.1.10 | Componentes base en `components/ui/`: `Button`, `Input`, `Select`, `Card`, `Modal`, `Table`, `Badge`, `Skeleton` |
| 4.1.11 | `EmptyState` y sistema de notificaciones (toast) |
| 4.1.12 | `page.tsx` raíz que redirige según el estado de sesión |
| 4.1.13 | Páginas de marcador de posición para `/dashboard`, `/pacientes` y `/medicos` |
| 4.1.14 | Configurar `QueryClientProvider` con TanStack Query |

### 4.3 Entregables

- Login funcional contra la API de la Fase 2.
- Sesión persistente y cierre de sesión que limpia cookie y almacenamiento local.
- Rutas protegidas inaccesibles sin sesión.
- Layout con navegación lateral y los tres estados asíncronos disponibles.

### 4.4 Criterios de Cierre

- [ ] Con credenciales válidas se entra y se ve el shell de la aplicación.
- [ ] Con credenciales inválidas se muestra un error claro sin revelar el campo que falló.
- [ ] Al cerrar sesión, `/dashboard` redirige a `/login`.
- [ ] Al escribir `/dashboard` sin sesión, la ruta se bloquea antes de renderizar.
- [ ] Tras un `401` en cualquier llamada a la API, la sesión se limpia y se redirige a `/login`.
- [ ] La cookie de sesión es `HttpOnly` con `SameSite=Lax`.
- [ ] El tema claro/oscuro persiste entre recargas.
- [ ] `/pacientes` y `/dashboard` muestran, al menos, el esqueleto de carga y el estado vacío.
- [ ] `npm run lint` y `npm run build` limpios.

### 4.5 Riesgos

| Riesgo | Mitigación |
|---|---|
| Parpadeo de contenido protegido antes de validar la sesión | El middleware valida antes de renderizar; la UI muestra un loader mientras resuelve |
| Token accesible desde JavaScript | Cookie `HttpOnly`; el token viaja en la cabecera `Authorization`, no en `localStorage` |
| Cliente intentando renderizar antes de hidratar | Componente de carga en el layout del route group protegido |

---

## Fase 5 — Integración UI/UX del Formulario de Admisión

### 5.1 Objetivo

La pantalla que permite registrar un paciente completo: los bloques A, B, C y D del formulario *"¿Me regalás una hora?"*, operable con una sola mano en un teléfono.

### 5.2 Tareas

**Servicios de datos**

| # | Tarea |
|---|---|
| 5.1.1 | `app/services/pacientes.ts` y `app/services/historias-clinicas.ts` con tipos alineados al contrato REST |
| 5.1.2 | Mutaciones de TanStack Query con invalidación de caché |

**Lista de pacientes**

| # | Tarea |
|---|---|
| 5.2.1 | `/pacientes` con Toolbar Pattern (Nuevo, Modificar, Refrescar, Exportar) y buscador con debounce |
| 5.2.2 | Grilla: click selecciona, doble click abre el modal de edición. **Sin botones en las filas** |
| 5.2.3 | Columnas: N° historia, apellido y nombre, documento, edad, sexo, último contacto |
| 5.2.4 | Badges de estado (activo / inactivo) |
| 5.2.5 | Paginación, estado vacío y skeleton de carga |
| 5.2.6 | Filtros: rango de fechas, sexo, nacionalidad |

**Formulario de admisión**

| # | Tarea |
|---|---|
| 5.3.1 | `/pacientes/nuevo` con el formulario en bloques A, B, C y D |
| 5.3.2 | Esquema Zod con los mensajes de validación de `01-requerimientos-y-negocio.md` §6 |
| 5.3.3 | Campos del **Bloque A**: N° de historia (autogenerado, solo lectura) y fecha |
| 5.3.4 | Campos del **Bloque B**: apellido, nombre, documento, edad, sexo, estado civil, fecha de nacimiento, nacionalidad, domicilio, teléfono |
| 5.3.5 | **Cálculo automático de la edad** a partir de la fecha de nacimiento, con valor editable (RN-02) |
| 5.3.6 | Campos del **Bloque C**: representante (búsqueda o alta rápida) y motivo de la consulta |
| 5.3.7 | Campos del **Bloque D**: evolución inicial con fecha y detalle, **obligatorios** |
| 5.3.8 | Marcar visualmente los campos opcionales y los condicionales |
| 5.3.9 | Layout mobile-first: bloques progresivos, obligatorios visibles sin desplazamiento |
| 5.3.10 | Confirmación con el N° de historia asignado y acciones: imprimir, registrar evolución, volver |
| 5.3.11 | Advertencia (no bloqueo) ante posible duplicado |

**Detalle y seguimiento**

| # | Tarea |
|---|---|
| 5.4.1 | `/pacientes/[id]` — datos de identificación + listado de sus historias |
| 5.4.2 | Historial cronológico unificado de evoluciones (RF-02.3) |
| 5.4.3 | Botón "Nuevo ingreso" que precarga los datos de identificación en solo lectura |
| 5.4.4 | Modal de edición de los datos de identificación (Bloque B) |
| 5.4.5 | `/pacientes/[id]/historias/[historiaId]` — detalle del ingreso con todas sus evoluciones |
| 5.4.6 | Formulario de **registro de evolución** en historias `ACTIVA` |
| 5.4.7 | Acción de cierre y reapertura de historia clínica |

**Seguridad de la UI**

| # | Tarea |
|---|---|
| 5.5.1 | Sin datos de pacientes en el lado del servidor sin sesión válida |
| 5.5.2 | Mensajes de error del backend mostrados literalmente al usuario |
| 5.5.3 | Confirmación obligatoria antes de acciones destructivas (anulación, cierre) |

### 5.3 Entregables

- Flujo completo de alta de paciente operativo de punta a punta.
- Lista, detalle, edición y seguimiento de pacientes e historias.
- Formulario utilizable con una sola mano en pantalla de 5 pulgadas.

### 5.4 Criterios de Cierre

- [ ] El alta de un paciente completo crea paciente, historia y evolución, y muestra el N° de historia asignado.
- [ ] La evolución inicial es obligatoria: sin ella no se puede enviar el formulario.
- [ ] Los 16 campos del formulario están presentes y con la obligatoriedad definida en `01-requerimientos-y-negocio.md` §3.1.
- [ ] Al informar la fecha de nacimiento, la edad se calcula sola y sigue siendo editable.
- [ ] Un paciente sin documento, fecha de nacimiento, domicilio ni teléfono se puede registrar sin errores.
- [ ] Un segundo ingreso del mismo paciente crea una historia nueva sin duplicar el paciente.
- [ ] El buscador encuentra pacientes ignorando mayúsculas y acentos.
- [ ] La grilla no tiene botones de acción en las filas y el patrón de toolbar funciona completo.
- [ ] Registrar una evolución la muestra de inmediato en el historial, en la posición correcta.
- [ ] Una historia cerrada no ofrece el formulario de nueva evolución.
- [ ] El formulario se completa con una sola mano en un dispositivo móvil.
- [ ] Todos los mensajes de validación aparecen en español y son accionables.
- [ ] `npm run lint` y `npm run build` limpios.

### 5.5 Riesgos

| Riesgo | Mitigación |
|---|---|
| Formulario demasiado largo para usar en campo | Bloques progresivos, campos obligatorios arriba, opción de búsqueda de paciente existente como atajo |
| Errores de tipeo con acentos en la búsqueda | Collation `utf8mb4_0900_ai_ci` (Fase 2) + debounce en el buscador |
| Duplicación de pacientes por desconocimiento | Búsqueda previa obligatoria en el paso 1 del flujo + advertencia de duplicado |
| Pérdida de datos por cierre accidental del navegador | Advertencia de cambios sin guardar (`beforeunload`) |

---

## Fase 6 — Dashboard de Seguimiento de Evoluciones

### 6.1 Objetivo

Un panel que permita al equipo coordinator ver, de un vistazo, la actividad del período y detectar los pacientes que han dejado de volver.

### 6.2 Tareas

**Backend — módulo `dashboard`**

| # | Tarea |
|---|---|
| 6.1.1 | `nest g module dashboard` |
| 6.1.2 | `GET /api/dashboard/resumen` — totales de pacientes activos, ingresos y evoluciones del período |
| 6.1.3 | `GET /api/dashboard/recientes` — últimos ingresos con paciente, fecha, motivo y autor |
| 6.1.4 | `GET /api/dashboard/sin-contacto` — pacientes sin evolución en el umbral configurado |
| 6.1.5 | Filtros por rango de fechas, operativo y nationality |
| 6.1.6 | Traducción de errores de Prisma a excepciones HTTP |

**Frontend — `/dashboard`**

| # | Tarea |
|---|---|
| 6.2.1 | Tarjetas de indicadores con el total de pacientes activos, ingresos y evoluciones del período |
| 6.2.2 | Gráfico de ingresos y evoluciones por mes (Recharts) |
| 6.2.3 | Listado de ingresos recientes |
| 6.2.4 | **Listado de pacientes sin contacto reciente**, con días transcurridos desde la última evolución |
| 6.2.5 | Resaltado visual de los casos que superan el umbral (RN-12) |
| 6.2.6 | Selector de rango de fechas con valores rápidos (hoy, 7 días, 30 días, mes actual) |
| 6.2.7 | Estados de carga, vacío y de error en cada widget |
| 6.2.8 | Enlaces desde cada fila al detalle del paciente o de la historia |

**Extensión de base de datos**

| # | Tarea |
|---|---|
| 6.3.1 | Activar la tabla `operativos` y el filtro por puesto |
| 6.3.2 | Definir el umbral configurable de "sin contacto" (por defecto 90 días) |

### 6.3 Entregables

- Panel operativo con los indicadores de la organización.
- Mecanismo de alerta de pacientes que no vuelven.
- Módulo `dashboard` documentado en Swagger.

### 6.4 Criterios de Cierre

- [ ] El resumen refleja exactamente los datos del período seleccionado.
- [ ] El rango de fechas filtra de forma consistente en todos los widgets.
- [ ] El listado de pacientes sin contacto muestra los días transcurridos correctamente.
- [ ] El umbral de alerta es configurable y su valor por defecto es 90 días.
- [ ] El listado de ingresos recientes navega al detalle correspondiente.
- [ ] Cada widget tiene estado de carga, estado vacío y estado de error.
- [ ] Las consultas de agregación cumplen los tiempos de RNF-04 a escala de 10.000 pacientes.
- [ ] `npm run lint` y `npm run build` limpios.

### 6.5 Riesgos

| Riesgo | Mitigación |
|---|---|
| Consultas de agregación lentas sobre tablas grandes | Índices por fecha; medir con `EXPLAIN`; cachear el resumen con ventana de tiempo corta |
| Consultas pesadas bloqueando escrituras | Usar `READ COMMITTED` en lecturas y limitar el rango de fechas por defecto |
| Alertas que se ignoran por ser demasiado frecuentes | Umbral configurable y agrupar en vez de notificar individualmente |

---

## Fase 7 — Impresión, Exportación y Auditoría (MVP Completo)

### 7.1 Objetivo

Completar el MVP con las capacidades que hacen que el sistema sea utilizable en el mundo real: expediente imprimible, exportación de listados y registro de auditoría.

### 7.2 Tareas

| # | Tarea | Requisito |
|---|---|---|
| 7.1 | Vista de impresión de la historia clínica con los bloques A, B, C y D | RF-06.1, RF-06.2 |
| 7.1.2 | Generación de PDF con `jspdf` + `jspdf-autotable` | RF-06.2 |
| 7.1.3 | Exportación de listados a Excel con `xlsx` | RF-06.3 |
| 7.2.1 | Tabla `auditoria` y servicio de registro | RNF-12 |
| 7.2.2 | Registro de escrituras (alta, edición, anulación, cierre, reapertura) | RNF-12 |
| 7.2.3 | Registro de **lecturas** de historias clínicas | RNF-13 |
| 7.2.4 | Pantalla de consulta de auditoría para el rol coordinador | RNF-13 |
| 7.3.1 | Cierre y reapertura de historias con motivo | RN-05 |
| 7.3.2 | Anulación de evoluciones conservando el rastro | RF-07.2 |
| 7.4.1 | Procedimiento de respaldo documentado | RNF-18 |
| 7.4.2 | Procedimiento de restauración **probado** | RNF-18 |
| 7.5.1 | Endurecimiento de la configuración de producción (HTTPS, cookies seguras, CORS) | RNF-07, RNF-09 |
| 7.5.2 | Despliegue en staging y validación con la organización | — |

### 7.3 Criterios de Cierre

- [ ] La historia clínica impresa es legible y respeta los cuatro bloques del formulario.
- [ ] El PDF incluye el N° de historia y todas las evoluciones en orden cronológico.
- [ ] La exportación a Excel respeta los filtros aplicados en pantalla.
- [ ] Toda escritura queda registrada en `auditoria` con autor, timestamp, IP y user agent.
- [ ] El acceso de lectura a una historia clínica queda registrado.
- [ ] Una evolución anulada conserva el registro original y su motivo.
- [ ] El respaldo y la restauración se ejecutan y se verifican de extremo a extremo.
- [ ] El despliegue en staging funciona con HTTPS y cookies `Secure`.

---

## 3. Fases Posteriores (fuera del MVP)

| Fase | Contenido | Justificación |
|---|---|---|
| **Fase 8** | Modo offline con borradores locales y sincronización | RN-08: conectividad intermitente en calle |
| **Fase 9** | Importación de planillas Excel históricas | Pregunta abierta N° 5 |
| **Fase 10** | Fotografías clínicas con almacenamiento de objetos | Pregunta abierta N° 8 |
| **Fase 11** | Reportes estadísticos y epidemiología | Análisis de la organización |
| **Fase 12** | App móvil nativa | Si el uso en campo lo justifica |
| **Fase 13** | Interoperabilidad con efectores de salud | Requiere acuerdos institucionales previos |

> **Fase 8 (offline) merecehighlighting**: es la primera fase que se debería abordar si el equipo médico reporta pérdida de registros por falta de conectividad. El diseño actual (transacción atómica y APIs REST simples) no la bloquea, pero sí la condiciona.

---

## 4. Estrategia de Ramas y Pull Request

| Rama | Uso |
|---|---|
| `main` | Estable. Solo recibe merges verificados. **Sin commits directos** |
| `develop` | Integración de trabajo en curso |
| `feat/…` | Nueva funcionalidad |
| `fix/…` | Corrección de defecto |
| `docs/…` | Cambios en `specs/` |

**Flujo de un cambio:**

```
feat/mi-cambio  →  develop  →  main
```

**Reglas:**

- Un PR describe **qué** cambia y **por qué**.
- Referencia el requisito cubierto: `RF-01`, `RN-02`, `CU-05`.
- `npm run lint` y `npm run build` deben pasar antes de solicitar revisión.
- Revisión obligatoria de al menos una persona.
- Commits Conventional Commits.
- **Nunca** se commitea código generado (`dist/`, `node_modules/`, `.next/`, `.env`).

---

## 5. Definition of Done (Global)

Una fase o tarea está terminada cuando **todas** estas condiciones se cumplen:

- [ ] El código compila sin errores.
- [ ] `npm run lint` sin errores ni warnings.
- [ ] Los criterios de cierre de la fase están verificados.
- [ ] Los endpoints nuevos están documentados en Swagger.
- [ ] No se agregaron credenciales, tokens ni datos reales de pacientes al repositorio.
- [ ] No se agregaron endpoints públicos fuera de `/api/auth/login` y `/api/health`.
- [ ] La documentación en `specs/` está actualizada si cambió un requisito o una decisión.
- [ ] El código relevante incluye comentarios solo donde la decisión no sea evidente.
- [ ] Los casos de uso asociados están verificados manualmente o automáticamente.

---

## 6. Estrategia de Verificación

> **Decisión pendiente:** el proyecto de referencia RHPro-NextGeneration tiene una regla que **prohíbe generar archivos de prueba** (`.spec.ts`, `.test.ts`, suites de Vitest o Jest). Esa regla responde a una prioridad concreta de ese proyecto y **no debería heredarse automáticamente** en un sistema que almacena datos clínicos sensibles. Esta decisión debe tomarla la dirección del proyecto antes de la Fase 2.

| Nivel | Alcance | Frecuencia | Estado |
|---|---|---|---|
| **Unitarias** | Reglas de negocio puras: cálculo de edad, normalización de documento, validación de fecha | Por PR | Pendiente de decisión |
| **Integración** | Servicios contra la base de datos de pruebas, confixtures aisladas | Por PR | Pendiente de decisión |
| **Extremo a extremo** | Flujos completos: login → alta → evolución → dashboard | Por versión | Pendiente de decisión |
| **Manuales** | Casos de uso CU-01 a CU-07 y criterios de cierre de cada fase | Por fase | **Obligatorio** en todos los casos |
| **Aceptación con la organización** | Pruebas del flujo real con médicos voluntarios | Fin de Fase 5 y Fase 6 | **Obligatorio** |

> **Regla que aplica en todos los casos:** la verificación manual de los criterios de cierre de cada fase es **obligatoria** y no se puede suprimir por la existencia de pruebas automáticas.

---

## 7. Estimación Orientativa

Estimaciones en **días de trabajo** para un desarrollador a tiempo completo. Son órdenes de magnitud para planificar, no compromisos.

| Fase | Complejidad | Estimación | Riesgo de desvío |
|---|---|---|---|
| Fase 1 | Baja | 2 – 3 j | Bajo |
| Fase 2 | Media-alta | 5 – 7 j | Medio |
| Fase 3 | Alta | 4 – 6 j | Medio |
| Fase 4 | Media | 4 – 5 j | Bajo |
| Fase 5 | **Alta** | 8 – 12 j | **Alto** (UX de campo) |
| Fase 6 | Media | 4 – 6 j | Medio |
| Fase 7 | Media | 4 – 6 j | Medio |
| **Total MVP** | — | **31 – 45 j** | — |

**Factores de desvío más probables:**

1. Falta de definiciones de las preguntas abiertas de `01-requerimientos-y-negocio.md` §12.
2. Cambios en el formulario original durante la implementación.
3. Curva de aprendizaje del equipo con NestJS + Prisma.
4. Disponibilidad de los médicos voluntarios para la validación del flujo de campo.

> **Mitigación principal:** cerrar las preguntas abiertas **antes** de iniciar la Fase 2. Cada respuesta pendiente es una retrabajo garantizado en la Fase 5.

---

## 8. Checklist de la Fase Actual

La fase de especificación documental se considera cerrada cuando:

- [x] `specs/01-requerimientos-y-negocio.md` redactado y revisado.
- [x] `specs/02-arquitectura-tech.md` redactado y revisado.
- [x] `specs/03-esquema-bd.md` redactado y revisado.
- [x] `specs/04-plan-de-fases.md` redactado y revisado.
- [ ] Preguntas abiertas de `01-requerimientos-y-negocio.md` §12 respondidas por la organización.
- [ ] Decisión sobre la estrategia de pruebas tomada (§6 de este documento).
- [ ] `AGENTS.md` del proyecto redactado (Fase 1, tarea 1.1.3).
- [ ] Fase 1 iniciada.

---

## 9. Trazabilidad de Requerimientos a Fases

| Requisito | Fases |
|---|---|
| RF-01 Formulario de admisión | 2, 3, 5 |
| RF-02 Evoluciones | 3, 5 |
| RF-03 Búsqueda y consulta | 2, 5 |
| RF-04 Médicos voluntarios | 1, 2, 5 |
| RF-05 Dashboard | 6 |
| RF-06 Impresión y exportación | 7 |
| RF-07 Auditoría de autoría | 2, 3, 7 |
| RN-01 Pacientes sin documentación | 2, 5 |
| RN-02 Cálculo y congelación de la edad | 3, 5 |
| RN-03 Representante | 2, 3, 5 |
| RN-04 Número de historia | 2 |
| RN-05 Integridad de la evolución | 3, 7 |
| RN-06 Protección de datos | 1, 4, 7 |
| RN-08 Borrador local (offline) | 8 |
| RN-12 Alerta de abandono | 6 |
| RN-13 Fichas imprimibles | 7 |
| RNF-01 a RNF-19 | 1, 2, 3, 4, 5, 6, 7 |
