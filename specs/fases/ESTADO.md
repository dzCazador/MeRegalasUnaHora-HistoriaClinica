# Estado de Avance

> Registro de avance del proyecto. **Se actualiza al cerrar cada fase.**
> Es lo primero que lee el agente antes de ejecutar una fase.

---

## 1. Vista general

| Fase | Nombre | Estado | Fecha inicio | Fecha fin | Rama | PR |
|---|---|---|---|---|---|---|
| 1 | Setup inicial de repositorios | `COMPLETADA` | 2026-09-25 | 2026-09-25 | `feat/fase-1-setup-inicial` | — |
| 2 | Modelo de BD, pacientes y autenticación | `COMPLETADA` | 2026-09-25 | 2026-09-25 | `main` | — |
| 3 | Historias clínicas y evoluciones | `PENDIENTE` (dep. 2 ✓) | — | — | — | — |
| 4 | Frontend base y enrutamiento | `PENDIENTE` (dep. 1 ✓) | — | — | — | — |
| 5 | UI del formulario de admisión | `BLOQUEADA` (dep. 2 ✓, 3, 4) | — | — | — | — |
| 6 | Dashboard de seguimiento | `BLOQUEADA` (dep. 3, 4 · B-7) | — | — | — | — |
| 7 | Impresión, exportación y auditoría | `BLOQUEADA` (dep. 5, 6) | — | — | — | — |

**Fase actual:** ninguna. La siguiente es la **Fase 3** (o la **Fase 4**, que sólo depende de la 1).
**Progreso total del MVP:** 2 / 7 fases.

> Las Fases 3 y 4 ya no dependen de la 1: pueden arrancar en cuanto seifique la 2.
>
> **Rama de trabajo: `main`.** Por decisión de la dirección del proyecto (2026-09-25) la ejecución de
> fases se hace directo sobre `main`, sin rama por fase ni PR. `develop` se mantiene sincronizado con
> `main` al cerrar cada fase.

---

## 2. Estados posibles

| Estado | Significado |
|---|---|
| `PENDIENTE` | Lista para arrancar, sin bloqueos |
| `EN CURSO` | En ejecución. **Ninguna otra fase puede empezar** |
| `COMPLETADA` | Todos los criterios de cierre verificados con evidencia |
| `PARCIAL` | Entregable parcial. Falta lo que figure en "Pendiente" de la fase |
| `BLOQUEADA` | No se puede avanzar por una decisión o un problema externo |
| `DESCARTADA` | Fuera del alcance del proyecto |

---

## 3. Bloqueos y decisiones pendientes

Reglas para el agente: si algo de esta tabla afecta a la fase que va a ejecutar, **se detiene y pregunta**.

| # | Ítem | Tipo | Bloquea a | Responsable | Estado |
|---|---|---|---|---|---|
| B-1 | Preguntas abiertas 1–3 de `../01-requerimientos-y-negocio.md` §12 | Requisito | Fase 2 | Dirección de la organización | `RESUELTA` (defaults) |
| B-2 | Estrategia de pruebas automatizadas (DI-08) | Proceso | Fase 2 | Dirección del proyecto | `RESUELTA` (sin tests) |
| B-3 | DI-01 — BFF de Next.js para el token en cookie HttpOnly | Técnica | Fase 4 | Dirección técnica | `PROPUESTA` |
| B-4 | DI-02 — Generación de `numero_historia` | Técnica | Fase 2 | Dirección técnica | `RESUELTA` |
| B-5 | DI-05 — Código HTTP para evolución en historia cerrada (422 vs 409) | Técnica | Fase 3 | Dirección técnica | `PROPUESTA` |
| B-6 | DI-07 — Cantidad de campos del formulario (16 vs 14) | Documental | Fase 5 | Dirección técnica | `PROPUESTA` |
| B-7 | Puestos de atención concretos para `operativos` | Requisito | Fase 6 | Organización | `ABIERTA` |
| B-8 | Variables del admin: unificar nomenclatura y login por email | Requisito | Fase 2 | Dirección técnica | `RESUELTA` |
| B-9 | Puertos 4000 y 3000 ocupados por el proyecto hermano `RHPro-NextGeneration` | Entorno | Fase 4 | Dirección del proyecto | `RESUELTA` (4001/3001) |
| B-10 | `DATABASE_URL` de desarrollo apunta a `root` de MySQL, no al usuario `app` acotado | Seguridad | — | Dirección técnica | `RESUELTA` |

### 3.1 Notas de estado

**B-1 — `RESUELTA` por default documentado (2026-09-25).** Sin respuesta de la organización, la Fase 2
adopta los valores que ya fija el propio playbook (`fase-02` §3.1 y tareas 2.2.2–2.2.4), que son
consistentes con `../03-esquema-bd.md` §3.1 y §4:

| # | Default adoptado | Dónde está especificado |
|---|---|---|
| 1 | Número de historia **global** de la organización, derivado de `id` | `../03` §3.1 (DI-02) — ya `RESUELTA` como B-4 |
| 2 | Tipos de documento: DNI, Cédula, Pasaporte, Documento de emergencia, **Sin documento** | `../03` §4.4 · `fase-02` 2.2.4 |
| 3 | Roles: `MEDICO`, `COORDINADOR`, `ADMIN` | `../03` §3.4 · `fase-02` §3.1 |

> Si la organización responde distinto a cualquiera de las tres, se reabre el punto y se escribe una
> migración nueva. La 1 en particular obligaría a rehacer `numero_historia` con una tabla de secuencias
> (ver nota de B-4). Las preguntas 4 a 8 de §12 siguen abiertas: bloquean las fases 3, 5 y 7, no esta.

**B-2 / DI-08 — `RESUELTA`: sin pruebas automatizadas en el MVP.** Se adopta la cláusula del gate de
`fase-02` §2: **no se generan archivos de prueba** y toda la verificación de la Fase 2 es manual con
`curl` + `npx prisma studio` + los 30 checks de `fase-02` §5. `vitest` queda instalado y configurable
(`vitest.config.ts` y `vitest.config.e2e.ts` existen) para cuando se defina la estrategia. La decisión
sigue siendo de la dirección del proyecto: esto es un **default**, no una respuesta.

**B-4 — DI-02 `RESUELTA` (2026-09-25).** MySQL admite una sola columna `AUTO_INCREMENT` por tabla y
`pacientes.id` ya la ocupa. Se adopta la propuesta: `numero_historia` se **deriva de `id`**, sin
contador ni tabla de secuencias. Documentado en `../03-esquema-bd.md` §3.1 y §9.1. Si la organización responde de forma distinta a la pregunta 1 de `../01` §12 (global vs por sede), se
reabre y hace falta una tabla de secuencias.

**B-8 — `RESUELTA` (2026-09-25).** Gana el documento fuente: el login es **por email** y
`medicos_voluntarios.email` es `UNIQUE`. Se eliminan `AUTH_USERNAME` / `AUTH_PASSWORD` y quedan
`ADMIN_EMAIL` / `ADMIN_NOMBRE` / `ADMIN_PASSWORD`, **obligatorias** en la validación de configuración
(tarea 2.2.6: el seed no puede tener valor por defecto hardcodeado). `.env.example` actualizado.

**B-9 — `RESUELTA`: el proyecto se mueve a 4001 / 3001 (2026-09-25).** Decisión de la dirección del
proyecto para no pelearle los puertos al proyecto hermano `RHPro-NextGeneration`. Actualizado
`PORT`, `CORS_ORIGINS` y la documentación. El 4000/3000 queda libre para el hermano.

**B-10 — `RESUELTA` (2026-09-25).** Se regeneró la clave del usuario `app` y `DATABASE_URL` de
desarrollo pasó de `root` a `app`, que tiene permisos acotados al esquema `meregalasunahora_dev`
(`SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES`). La clave vive solo en
`backend/.env`, que no se versiona.

---

## 4. Registro de ejecuciones

Una fila por intento de fase. Conservar el historial: sirve para no repetir errores.

| Fecha | Fase | Resultado | Duración | Observación |
|---|---|---|---|---|
| 2026-09-25 | 1 | `COMPLETADA` | 1 sesión | 26/27 tareas · 17/17 verificaciones · 9/9 criterios. Sin PR: falta `origin/develop` en remoto. 3 desviaciones de tooling: Prisma 6 en vez de 5 (`8.0.0-rc.17` es la `latest`), Joi vía Standard Schema, `onModuleInit` tolerante a MySQL caído. 1 tarea sin tildar: 1.1.1 (revisión con la organización de las 8 preguntas §12). 3 bloqueos nuevos: B-8, B-9, B-10. |
| 2026-09-25 | 2 | `COMPLETADA` | 1 sesión | 44/44 tareas · 30/30 verificaciones · 15/15 criterios. Gate resuelto adoptingando defaults de B-1/B-2 y unificando B-8. 9 desviaciones (DI-13…DI-21) y **3 bugs reales** detectados al verificar: doble envoltorio `data.data`, `409`/`404` que salían `500` por el orden inverso de los filters, y `DROP DATABASE` no permitido para `app` (que motivó el esquema sombra, DI-15). Cerrados B-1, B-2, B-8, B-9, B-10. |

---

## 5. Métricas del MVP

| Dato | Valor |
|---|---|
| Fases completadas | 2 / 7 |
| Tareas de implementación | 214 (27 + 44 + 26 + 30 + 36 + 23 + 28) |
| Tareas ejecutadas | 71 / 214 (26 de la Fase 1 + 44 de la Fase 2 + 1 de la Fase 1 pendiente) |
| Verificaciones | 178 → **208** (30 de la Fase 2) |
| Criterios de cierre | 76 → **91** (15 de la Fase 2) |
| Días de trabajo estimados restantes | 29 – 43 → **24 – 36** |
| Requisitos funcionales cubiertos | 6 / 7 RF (RF-03.1, RF-03.2, RF-03.6, RF-04.1, RF-04.2, RF-07.1) |
| Casos de uso verificados | 2 / 7 CU (CU-02, CU-06) |
| Desviación acumulada | 3 → **12** (3 de la Fase 1 + 9 de la Fase 2) |
