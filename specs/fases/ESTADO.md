# Estado de Avance

> Registro de avance del proyecto. **Se actualiza al cerrar cada fase.**
> Es lo primero que lee el agente antes de ejecutar una fase.

---

## 1. Vista general

| Fase | Nombre | Estado | Fecha inicio | Fecha fin | Rama | PR |
|---|---|---|---|---|---|---|
| 1 | Setup inicial de repositorios | `COMPLETADA` | 2026-09-25 | 2026-09-25 | `feat/fase-1-setup-inicial` | — |
| 2 | Modelo de BD, pacientes y autenticación | `BLOQUEADA` (dep. 1 ✓, B-1, B-2, B-8) | — | — | — | — |
| 3 | Historias clínicas y evoluciones | `BLOQUEADA` (dep. 2) | — | — | — | — |
| 4 | Frontend base y enrutamiento | `BLOQUEADA` (dep. 1 ✓) | — | — | — | — |
| 5 | UI del formulario de admisión | `BLOQUEADA` (dep. 2, 3, 4) | — | — | — | — |
| 6 | Dashboard de seguimiento | `BLOQUEADA` (dep. 3, 4) | — | — | — | — |
| 7 | Impresión, exportación y auditoría | `BLOQUEADA` (dep. 5, 6) | — | — | — | — |

**Fase actual:** ninguna. La siguiente es la **Fase 2**.
**Progreso total del MVP:** 1 / 7 fases.

> Las Fases 3 y 4 ya no dependen de la 1: pueden arrancar en cuanto seifique la 2.

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
| B-1 | Preguntas abiertas 1–8 de `../01-requerimientos-y-negocio.md` §12 | Requisito | Fase 2 | Dirección de la organización | `ABIERTA` |
| B-2 | Estrategia de pruebas automatizadas (DI-08) | Proceso | Fase 2 | Dirección del proyecto | `ABIERTA` |
| B-3 | DI-01 — BFF de Next.js para el token en cookie HttpOnly | Técnica | Fase 4 | Dirección técnica | `PROPUESTA` |
| B-4 | DI-02 — Generación de `numero_historia` | Técnica | Fase 2 | Dirección técnica | `RESUELTA` |
| B-5 | DI-05 — Código HTTP para evolución en historia cerrada (422 vs 409) | Técnica | Fase 3 | Dirección técnica | `PROPUESTA` |
| B-6 | DI-07 — Cantidad de campos del formulario (16 vs 14) | Documental | Fase 5 | Dirección técnica | `PROPUESTA` |
| B-7 | Puestos de atención concretos para `operativos` | Requisito | Fase 6 | Organización | `ABIERTA` |
| B-8 | Variables del admin: el `.env` de desarrollo usa `AUTH_USERNAME` / `AUTH_PASSWORD`; el spec usa `ADMIN_EMAIL` / `ADMIN_NOMBRE` / `ADMIN_PASSWORD` y login por email | Requisito | Fase 2 | Dirección técnica | `ABIERTA` |
| B-9 | Puertos 4000 y 3000 ocupados por el proyecto hermano `RHPro-NextGeneration` | Entorno | Fase 4 | Dirección del proyecto | `ABIERTA` |
| B-10 | `DATABASE_URL` de desarrollo apunta a `root` de MySQL, no al usuario `app` acotado | Seguridad | — | Dirección técnica | `ABIERTA` |

### 3.1 Notas de estado

**B-4 — DI-02 `RESUELTA` (2026-09-25).** MySQL admite una sola columna `AUTO_INCREMENT` por tabla y
`pacientes.id` ya la ocupa. Se adopta la propuesta: `numero_historia` se **deriva de `id`**, sin
contador ni tabla de secuencias. Documentado en `../03-esquema-bd.md` §3.1 y §9.1. Si la organización responde de forma distinta a la pregunta 1 de `../01` §12 (global vs por sede), se
reabre y hace falta una tabla de secuencias.

**B-1 y B-2 no bloquean la Fase 1.** Las 8 preguntas abiertas de `../01` §12 definen enumeraciones,
matriz de autorización y alcance de la auditoría: nada de eso afecta el arranque técnico. Por eso la
Fase 1 arrancó bajo la cláusula del gate que las admite "al menos las que no bloquean el setup
técnico". **Ambas siguen bloqueando el arranque de la Fase 2.**

**B-8 — abrir antes de la Fase 2.** La Fase 1 no lee variables de admin. Antes de la tarea 2.2.6
(`seed.ts`) hay que unificar la nomenclatura: el login es **por email** y `medicos_voluntarios.email`
es `UNIQUE`, así que `AUTH_USERNAME` no alcanza como está.

**B-9 — puertos tomados.** `RHPro-NextGeneration` (proyecto hermano) tiene el **4000** (backend) y
el **3000** (frontend). Durante la Fase 1 el backend se verificó en el 4000 mientras RHPro estaba
parado, y después en el 4100 para no pelear el puerto. El frontend de Next cayó al 3001 por su cuenta.
Ninguna verificación de la Fase 1 quedó sin hacer por esto, pero hay que decidir: parar RHPro
mientras se trabaja acá, o mover este proyecto a otros puertos y actualizar `PORT`, `CORS_ORIGINS` y
la documentación.

**B-10 — `root` en `DATABASE_URL`.** El `.env` de desarrollo conecta como `root`, que es lo que
pasó. El usuario `app` con permisos acotados al esquema **existe** (tarea 1.4.2, clave en
`README.md` no, en el reporte de cierre) y es lo que exige la especificación. Cambiar la URL alcanza
para corregirlo.

---

## 4. Registro de ejecuciones

Una fila por intento de fase. Conservar el historial: sirve para no repetir errores.

| Fecha | Fase | Resultado | Duración | Observación |
|---|---|---|---|---|
| 2026-09-25 | 1 | `COMPLETADA` | 1 sesión | 26/27 tareas · 17/17 verificaciones · 9/9 criterios. Sin PR: falta `origin/develop` en remoto. 3 desviaciones de tooling: Prisma 6 en vez de 5 (`8.0.0-rc.17` es la `latest`), Joi vía Standard Schema, `onModuleInit` tolerante a MySQL caído. 1 tarea sin tildar: 1.1.1 (revisión con la organización de las 8 preguntas §12). 3 bloqueos nuevos: B-8, B-9, B-10. |

---

## 5. Métricas del MVP

| Dato | Valor |
|---|---|
| Fases completadas | 1 / 7 |
| Tareas de implementación | 214 (27 + 44 + 26 + 30 + 36 + 23 + 28) |
| Tareas ejecutadas | 27 / 214 (26 de la Fase 1) |
| Verificaciones | 178 |
| Criterios de cierre | 76 |
| Días de trabajo estimados restantes | 29 – 43 |
| Requisitos funcionales cubiertos | 0 / 7 RF |
| Casos de uso verificados | 0 / 7 CU |
| Desviación acumulada | 3 (Prisma 6 vs 5 · health plano y 503 · MySQL caído no tumba el proceso) |
