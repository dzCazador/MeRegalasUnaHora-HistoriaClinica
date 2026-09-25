# AGENTS.md — meRegalasUnaHora

> **Este archivo es el punto de entrada de cualquier agente de IA que trabaje en este repositorio.**
> Leerlo completo antes de escribir código. Es normativo: si algo aquí contradice al criterio propio
> del agente, gana este archivo.

---

## 1. Qué es este proyecto

Sistema de registro de **historias clínicas** para una organización de médicos voluntarios que
atiende población en situación de calle. El producto es, esencialmente, **la implementación digital
del formulario de admisión "Historia clínica — ¿Me regalás una hora?"**, con 4 bloques:

| Bloque | Contenido | Dónde se persiste |
|---|---|---|
| **A** | Número de Historia (automático) · Fecha | `pacientes.numero_historia` · `historias_clinicas.fecha` |
| **B** | Apellido, nombre, documento, edad, sexo, estado civil, fecha de nacimiento, nacionalidad, domicilio, teléfono | `pacientes` |
| **C** | Representante · Motivo de la consulta | `historias_clinicas.representante_id` · `.motivo_consulta` |
| **D** | Evolución inicial: fecha y detalle (**obligatoria**) | `evoluciones` |

**Datos sensibles.** Se almacenan datos personales de salud (Ley 25.326, art. 2 inc. f). De ahí
salen las prohibiciones de la §5. No relajar ninguna.

**MVP:** registro de paciente + ingresos + evoluciones, búsqueda, dashboard, impresión y auditoría.
7 fases de implementación, 31–45 días de trabajo.

---

## 2. Estado actual

| | |
|---|---|
| **Fase en curso** | ninguna |
| **Progreso** | 0 / 7 fases |
| **Fases cerradas** | ninguna |

Fuente de verdad del avance: [`specs/fases/ESTADO.md`](./specs/fases/ESTADO.md).

**Antes de hacer cualquier cosa:** mirá esa tabla. Si hay una fase `EN CURSO`, continuá esa. No
arranques una fase nueva con otra abierta.

---

## 3. Documentos y orden de lectura

| Orden | Documento | Qué te da |
|---|---|---|
| 1 | `AGENTS.md` (este) | Reglas del proyecto |
| 2 | [`specs/fases/ESTADO.md`](./specs/fases/ESTADO.md) | Dónde está el proyecto |
| 3 | [`specs/fases/00-protocolo-de-ejecucion.md`](./specs/fases/00-protocolo-de-ejecucion.md) | Cómo se ejecuta una fase |
| 4 | [`specs/fases/fase-0N-<slug>.md`](./specs/fases/) | Las tareas de la fase |
| 5 | [`specs/01-requerimientos-y-negocio.md`](./specs/01-requerimientos-y-negocio.md) | Requisitos, reglas de negocio, validaciones |
| 6 | [`specs/02-arquitectura-tech.md`](./specs/02-arquitectura-tech.md) | Stack, estructura, convenciones |
| 7 | [`specs/03-esquema-bd.md`](./specs/03-esquema-bd.md) | Tablas, índices, transacciones |

**Regla de precedencia:** si un playbook de fase contradice a un documento fuente, **manda el
documento fuente**. Corregí el playbook y anotá la desviación en el reporte de cierre.

---

## 4. Estructura del repositorio

```text
meregalasunahora/
├── backend/                    NestJS 12 · API REST · puerto 4000
│   ├── prisma/
│   │   ├── schema.prisma       FUENTE DE VERDAD del modelo de datos
│   │   ├── migrations/
│   │   └── seed.ts             Idempotente · sin datos de pacientes
│   ├── src/
│   │   ├── main.ts             CORS · ValidationPipe · Swagger en /api
│   │   ├── app.module.ts
│   │   ├── prisma/prisma.service.ts
│   │   ├── common/             decorators · filters · interceptors · guards · dto · utils
│   │   ├── auth/               MÓDULO: login, JWT, guard global
│   │   ├── pacientes/
│   │   ├── historias-clinicas/
│   │   ├── medicos-voluntarios/
│   │   ├── catalogos/
│   │   └── dashboard/
│   ├── .env.example
│   └── package.json
├── frontend/                   Next.js 16 App Router · puerto 3000
│   ├── app/
│   │   ├── (auth)/login/       ÚNICA página pública
│   │   ├── (app)/              Rutas protegidas: dashboard · pacientes · medicos
│   │   ├── services/           ÚNICO lugar con fetch
│   │   ├── components/         ui · layout · pacientes · shared
│   │   ├── hooks/ · lib/ · types/
│   │   ├── proxy.ts            Middleware de sesión (archivo raíz de Next)
│   │   ├── layout.tsx · globals.css
│   │   └── next.config.ts
│   └── package.json
├── specs/                      Documentación (versionada)
│   ├── 01-requerimientos-y-negocio.md
│   ├── 02-arquitectura-tech.md
│   ├── 03-esquema-bd.md
│   ├── 04-plan-de-fases.md
│   └── fases/                  Playbooks ejecutables por fase
├── deploy/                     Scripts de despliegue y respaldo
└── AGENTS.md · README.md
```

**Monorepo sin workspaces.** `backend/` y `frontend/` no comparten código: cada uno tiene su
`package.json` y su `node_modules`. **No existe paquete `shared/`**: el contrato REST documentado
en Swagger es la frontera, y el frontend define sus propios tipos alineados a ese contrato.

### 4.1 Convención interna de un módulo de dominio

```text
pacientes/
├── dto/
│   ├── create-paciente.dto.ts     ← CreatePacienteDto (validado con class-validator)
│   ├── update-paciente.dto.ts     ← PartialType(CreatePacienteDto)
│   ├── query-paciente.dto.ts      ← page, limit, q, filtros
│   ├── paciente-response.dto.ts   ← formas de salida (Swagger)
│   └── index.ts
├── pacientes.controller.ts        ← rutas /api/pacientes · SIN lógica de negocio
├── pacientes.service.ts           ← lógica + Prisma (el único que lo usa)
├── pacientes.module.ts
└── index.ts                       ← barrel
```

---

## 5. Prohibiciones absolutas

1. **Datos reales de pacientes** en el repositorio, en ejemplos, en capturas o en el seed.
2. **Secretos hardcodeados.** Ni usuarios demo, ni contraseñas de ejemplo. `.env` nunca se versiona;
   solo `.env.example` con placeholders.
3. **Bypass de autenticación.** `POST /api/auth/login` y `GET /api/health` son los **únicos**
   endpoints públicos. Todo lo demás va detrás del `JwtAuthGuard` global.
4. **Borrado físico** de historias, evoluciones, pacientes o médicos. Solo baja lógica
   (`activo`, `anulada` + `motivo_anulacion`).
5. **Autoría desde el cuerpo de la petición.** `medicoVoluntarioId` sale **siempre** del token.
6. **Acoplamiento backend ↔ frontend.** Nada de tipos importados, nada de carpeta compartida.
7. **SQL con concatenación de strings.** Solo `$queryRaw` con tagged template. El query builder de
   Prisma es la primera opción.
8. **`prisma migrate reset` con datos.** Nunca en staging ni producción.
9. **Refactors fuera del alcance de la fase.** Si algo se puede mejorar pero no pertenece a la fase,
   se anota como pendiente y no se hace.
10. **Avanzar sin verificar.** Una tarea sin su comando ejecutado no está terminada.
11. **Comentarios innecesarios.** El código explica el *qué*; este archivo y `specs/` explican el *por qué*.
12. **`console.log`.** Se usa el `Logger` de NestJS.

---

## 6. Convenciones técnicas

### 6.1 Backend

| Tema | Regla |
|---|---|
| Módulos | ESM: `"type": "module"` |
| Imports | Los relativos llevan **extensión `.js`** |
| Build | `nest build` → **`dist/main.js`** (nunca `dist/src/main.js`) |
| Generadores | `nest g resource <n> --no-spec` · `nest g module <n>`; borrar el código muerto que generan |
| Capas | El controller valida y delega. El service es el **único** que instancia Prisma |
| DTOs | `class-validator` en todas las propiedades + `@Transform` para trim |
| Respuesta OK | `{ success: true, data, meta? { total, page, limit, totalPages } }` |
| Respuesta error | `{ success: false, error: { code, message, details?, path, timestamp } }` |
| Swagger | `@ApiTags`, `@ApiOperation`, `@ApiResponse` en todos los endpoints |
| Lint | Oxlint + Prettier, **0 errores y 0 warnings** |

### 6.2 Frontend

| Tema | Regla |
|---|---|
| Fetch | **Solo** desde `app/services/`. Ningún componente hace `fetch` |
| Estados | Toda pantalla con datos tiene estado de **carga**, **vacío** y **error** |
| Formularios | `react-hook-form` + `zod`, mensajes **en español y accionables** |
| Grillas | **Toolbar Pattern**: acciones en la toolbar, **prohibido** botones en las filas. Click selecciona, doble click abre edición |
| Estilos | Tailwind v4 + variables de tema en `globals.css`. Sin CSS modules |
| UI | Componentes propios en `components/ui/`. Sin librería de terceros en el MVP |
| Navegación | Toda pantalla nueva se suma a `NAV_SECTIONS` |

### 6.3 Base de datos

- `schema.prisma` es la **fuente de verdad**. Si el código y el esquema discrepan, gana el esquema.
- Modelos `PascalCase` con `@@map`; campos `camelCase` con `@map`; tablas y columnas en `snake_case`.
- `created_at` / `updated_at` obligatorios en toda tabla de negocio.
- Toda FK con `onDelete` explícito: `Restrict` en datos clínicos, `SetNull` en referencias accesorias.
- Índices compuestos en el **orden de la consulta**: igualdad primero, ordenamiento después.
- Búsqueda insensible a mayúsculas y acentos apoyada en el collation **`utf8mb4_0900_ai_ci`**.
- Paginación con `skip`/`take` y `orderBy` **estable** (desempate por `id`).
- Toda alteración de esquema: migración **versionada y nombrada**. Columna nueva siempre anulable o
  con default; columna eliminada se marca obsoleta primero y se borra en una segunda migración.

### 6.4 Git

| Rama | Uso |
|---|---|
| `main` | Estable. Solo merges verificados. **Sin commits directos** |
| `develop` | Integración |
| `feat/…` `fix/…` `docs/…` | Trabajo |

Conventional Commits: `feat:` `fix:` `docs:` `refactor:` `chore:` `build:` `perf:` `style:`.
PR obligatorio con **qué** cambia, **por qué** y qué requisitos cubre (`RF-01`, `RN-02`, `CU-05`).
Nunca se versiona `dist/`, `node_modules/`, `.next/`, `.env`, `.env.local`.

---

## 7. Comandos frecuentes

```bash
# Backend (desde backend/)
npm run start:dev          # servidor en http://localhost:4000
npm run build              # nest build → dist/main.js
npm run lint               # oxlint
npm run format             # prettier
npx prisma migrate dev --name <descripcion>
npx prisma migrate status
npx prisma generate
npx prisma studio
npx prisma db seed

# Frontend (desde frontend/)
npm run dev                # http://localhost:3000
npm run build
npm run lint

# Verificación de auth
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<del .env>","password":"<del .env>"}'

curl -s http://localhost:4000/api/health
curl -s -H "Authorization: Bearer <token>" http://localhost:4000/api/pacientes
```

---

## 8. Trampas técnicas conocidas

Resolvé estas antes de que te hagan perder una iteración. Están detalladas en los playbooks de fase.

| # | Trampa | Cómo se maneja |
|---|---|---|
| 1 | Los `BigInt` de Prisma **no se serializan a JSON** (`TypeError: Do not know how to serialize a BigInt`) | Exponer los ids como `Number` mediante un interceptor global. Ver DI-03 y la Fase 2 |
| 2 | Imports ESM sin `.js` compilan en el editor y **fallan en runtime** | Extensión `.js` en todos los imports relativos del backend |
| 3 | MySQL admite **una sola columna `AUTO_INCREMENT` por tabla** | `pacientes.id` ya la usa: el correlativo `numero_historia` se deriva de `id` (DI-02) |
| 4 | Prisma **no declara `CHECK` constraints** | Vanilla en la migración SQL: `migrate dev --create-only` y editar el archivo |
| 5 | Una cookie `HttpOnly` **no se lee desde el cliente** | Route Handler BFF que reenvía el `Authorization` (DI-01), ver Fase 4 |
| 6 | `whitelist` + `forbidNonWhitelisted` define si un campo desconocido se descarta en silencio o se rechaza con `400` | Ver Fase 2: el cuerpo se valida con `forbidNonWhitelisted: true` (doc 02 §9.1) |
| 7 | Next.js 16 renombró `middleware.ts` a **`proxy.ts`** | Si la versión instalada no lo reconoce, volver a `middleware.ts` y anotarlo |
| 8 | Paginación sin `orderBy` estable genera páginas inconsistentes | Desempate por `id` |
| 9 | Un `''` en un campo `UNIQUE` **sí** colisiona (los `NULL` no) | Normalizar `''` → `NULL` antes de insertar (RN-01) |

---

## 9. Workflow de fases

Las fases se ejecutan **de a una**, con checklists marcables en cada archivo.

```text
1. Leer ESTADO.md                     → ver si hay una fase abierta
2. Leer 00-protocolo-de-ejecucion.md  → reglas de ejecución
3. Leer fase-0N-<slug>.md             → objetivo, tareas, verificación
4. git switch develop && git switch -c feat/fase-N-<slug>
5. Ejecutar las tareas EN ORDEN, tildando cada checkbox
6. Ejecutar TODOS los comandos de "Verificación", tildando cada checkbox
7. Tildar los criterios de cierre
8. Actualizar ESTADO.md · commit · PR · reporte de cierre
```

### 9.1 Reglas del checklist

- **Una tarea sin su comando de verificación ejecutado no está terminada.** No tildar por intención.
- Las tareas están numeradas (`N.1.1`, `N.1.2`, …) y son la unidad de seguimiento.
- Si una tarea se partializa, tildarla solo si quedó **funcionalmente completa**; si no, dejarla sin
  tildar y anotarlo en el reporte.
- Al terminar, el encabezado de la fase debe mostrar el conteo real: `Progreso: 24/24`.
- **Nunca** tildar la casilla de un criterio de cierre que no se verificó a mano.

### 9.2 Orden de fases

| Fase | Entregable | Depende de |
|---|---|---|
| 1 | Repos arrancando, health check, Swagger, convenciones | — |
| 2 | Migración inicial, seed, login, CRUD de pacientes | 1 |
| 3 | Alta transaccional paciente + historia + evolución | 2 |
| 4 | Next.js con login, rutas protegidas, componentes base | 1 |
| 5 | Formulario de admisión completo, operable en móvil | 2, 3, 4 |
| 6 | Dashboard con indicadores y alerta de abandono | 3, 4 |
| 7 | Impresión, exportación, auditoría (MVP completo) | 5, 6 |

> Las fases 4 y 5 pueden solaparse una vez que el contrato de API esté congelado en Swagger.

### 9.3 Decisiones pendientes (no las inventes)

| ID | Tema | Estado |
|---|---|---|
| DI-01 | BFF de Next.js para reenviar el token desde cookie `HttpOnly` | Propuesta |
| DI-02 | Generación del correlativo `numero_historia` | Propuesta |
| DI-05 | Código HTTP al registrar evolución en historia cerrada (422 vs 409) | Propuesta |
| DI-07 | Cantidad de campos del formulario (16 vs 14 en la documentación) | Propuesta |
| DI-08 | Estrategia de pruebas automatizadas | **Abierta** |
| B-1 | Preguntas 1–8 de `specs/01-requerimientos-y-negocio.md` §12 | **Abierta** |
| B-7 | Puestos de atención concretos para `operativos` | **Abierta** |

> Si una tarea depende de una decisión *Abierta*: **detenete, dejá la fase `EN CURSO` y preguntá.**

---

## 10. Definition of Done

Una fase está terminada cuando **todas** estas condiciones se cumplen:

- [ ] Compila sin errores: `nest build` y `next build`.
- [ ] `npm run lint` sin errores **ni warnings** en backend y frontend.
- [ ] Todos los checkboxes de tareas y verificaciones de la fase están tildados.
- [ ] Todos los criterios de cierre verificados **a mano**.
- [ ] Endpoints nuevos documentados en Swagger.
- [ ] Sin credenciales, tokens ni datos reales de pacientes.
- [ ] Sin endpoints públicos fuera de `/api/auth/login` y `/api/health`.
- [ ] `specs/fases/ESTADO.md` actualizado.
- [ ] `specs/` actualizado si cambió un requisito o una decisión.
- [ ] PR contra `develop` con el reporte de cierre.

> La verificación manual de los criterios de cierre es **obligatoria aunque exista verificación
> automática**. Una copia de seguridad no verificada es una hipótesis, no un plan de recuperación:
> lo mismo vale para un criterio de cierre sin comprobar.

---

## 11. Formato del reporte de cierre

```markdown
## Reporte de cierre — Fase N

**Estado:** COMPLETADA | PARCIAL | BLOQUEADA
**Progreso:** 24/24 tareas · 12/12 verificaciones · 9/9 criterios de cierre
**Rama:** feat/fase-N-<slug>

### Verificación ejecutada
| Comando | Resultado |
|---|---|
| `npm run lint` (backend) | 0 errores 0 warnings |
| `GET /api/health` | 200 {"status":"ok","database":"up"} |

### Criterios de cierre
- [x] 9 de 9 verificados

### Desviaciones del playbook
- <qué se hizo distinto y por qué>

### Requisitos cubiertos
RF-01.1, RN-02, CU-01

### Pendientes
- <lo que falta y qué decisión lo bloquea>
```

Si algo queda pendiente, la fase **no** está completada: se marca `PARCIAL` o `BLOQUEADA` en
`ESTADO.md` y se deja anotado en el archivo de la fase.
