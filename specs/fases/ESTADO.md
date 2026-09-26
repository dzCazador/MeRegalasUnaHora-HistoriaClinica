# Estado de Avance

> Registro de avance del proyecto. **Se actualiza al cerrar cada fase.**
> Es lo primero que lee el agente antes de ejecutar una fase.

---

## 1. Vista general

| Fase | Nombre | Estado | Fecha inicio | Fecha fin | Rama | PR |
|---|---|---|---|---|---|---|
| 1 | Setup inicial de repositorios | `COMPLETADA` | 2026-09-25 | 2026-09-25 | `feat/fase-1-setup-inicial` | — |
| 2 | Modelo de BD, pacientes y autenticación | `COMPLETADA` | 2026-09-25 | 2026-09-25 | `main` | — |
| 3 | Historias clínicas y evoluciones | `COMPLETADA` | 2026-09-25 | 2026-09-25 | `main` | — |
| 4 | Frontend base y enrutamiento | `COMPLETADA` | 2026-09-25 | 2026-09-25 | `main` | — |
| 5 | UI del formulario de admisión | `COMPLETADA` | 2026-09-26 | 2026-09-26 | `main` | — |
| 6 | Dashboard de seguimiento | `BLOQUEADA` (dep. 3 ✓, 4 · B-7) | — | — | — | — |
| 7 | Impresión, exportación y auditoría | `BLOQUEADA` (dep. 5, 6) | — | — | — | — |

**Fase actual:** ninguna. La siguiente es la **Fase 4** (frontend base), que desbloquea la 5 y la 6.
**Progreso total del MVP:** 5 / 7 fases.

> La Fase 7 es la última del MVP y ya tiene sus dependencias resueltas (5 y 6 `COMPLETADAS`).
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
| B-1 | Preguntas abiertas de `../01-requerimientos-y-negocio.md` §12 | Requisito | Fases 2, 5, 7 | Dirección de la organización | `RESUELTA` 1–5 (defaults). 6–8 abiertas y **no bloquean** el MVP |
| B-2 | Estrategia de pruebas automatizadas (DI-08) | Proceso | Fase 2 | Dirección del proyecto | `RESUELTA` (sin tests) |
| B-3 | DI-01 — BFF de Next.js para el token en cookie HttpOnly | Técnica | Fase 4 | Dirección técnica | `RESUELTA` (opción A) |
| B-4 | DI-02 — Generación de `numero_historia` | Técnica | Fase 2 | Dirección técnica | `RESUELTA` |
| B-5 | DI-05 — Código HTTP para evolución en historia cerrada (422 vs 409) | Técnica | Fase 3 | Dirección técnica | `RESUELTA` (422) |
| B-6 | DI-07 — Cantidad de campos del formulario (16 vs 14) | Documental | Fase 5 | Dirección técnica | `RESUELTA` (16; se corrigió `04` §5.4) |
| B-7 | Puestos de atención concretos para `operativos` | Requisito | Fase 7 | Organización | `ABIERTA` — la Fase 6 la sortea con el fallback de `fase-06` §2 (filtro oculto) |
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

### 3.2 Corrección posterior a la Fase 6 — recorrido a la historia clínica

**Reportada por la organización el 2026-09-26, después de cerrar la Fase 6.**

Al usar la aplicación, la organización no encontraba la historia clínica. Al revisar el código
resultó que **no había forma de llegar desde el listado de pacientes**: la grilla tenía
`alSeleccionar` (un click selecciona) y `onFilaDobleClick` (abre la edición), pero **no
`onFilaClick`**, y la toolbar no tenía ninguna acción de apertura. Es decir, el recorrido
"listado → historia del paciente → hoja de la historia" estaba roto en el primer salto, y en un
teléfono era inservible: el doble click no existe en pantalla táctil.

Es un defecto de la **Fase 5** que sólo apareció con la Fase 6 encima: la Fase 4 verificó que
las rutas existían, la Fase 5 que el alta y el listado andaba, y nadie recorrió el camino de ida
a una historia clínica existente. Los tests de la Fase 5 pasaban porque comprobaban que el doble click
abriera la edición, que era lo que el código hacía.

| Qué cambió | Por qué |
|---|---|
| Acción **Ver historias** en la toolbar del listado | El click sigue seleccionando, como manda el Toolbar Pattern (§6.2). La apertura va en la toolbar porque el doble click ya está ocupado por la edición, y porque en un teléfono la toolbar es el único camino posible. |
| Las filas son operables con teclado (`Enter`/`Espacio`) | Las acciones de la toolbar dependen de que haya una fila elegida: sin esto, un usuario de teclado no llegaba nunca a ellas. |
| `/pacientes/[id]` pasa a ser la pantalla de **historias** del paciente | Antes arrancaba con los 12 datos de identificación, que es el bloque más largo y el que menos se viene a mirar. Ahora van primero las historias, después el historial unificado, y los datos de identificación quedan plegados. Es lo que pidió la organización: el listado es sólo de pacientes, y al elegir uno se ven sus historias. |
| Miga de pan de 3 niveles (`Pacientes › paciente › Historia clínica`) | El menú lateral dice siempre "Pacientes" y no había forma de saber a dos niveles de distancia dónde se estaba, ni de volver al nivel intermedio. |
| La `descripcion` de cada sección del menú, que ya estaba en los datos, ahora se pinta | Decía "Historia clínica y admisión" pero no se renderizaba nunca, así que el menú no daba ninguna pista de qué había adentro. |
| Pista textual en el listado | Decía "un click selecciona, doble click abre la edición", que era cierto pero no decía cómo llegar a una historia. |

Verificado con **26/26** checks en Chromium (escritorio y Pixel 7): recorrido completo con mouse,
con teclado y con toques. Sin regresión en el panel (29/29) ni en la API (38/38).

---

## 4. Registro de ejecuciones

Una fila por intento de fase. Conservar el historial: sirve para no repetir errores.

| Fecha | Fase | Resultado | Duración | Observación |
|---|---|---|---|---|
| 2026-09-25 | 1 | `COMPLETADA` | 1 sesión | 26/27 tareas · 17/17 verificaciones · 9/9 criterios. Sin PR: falta `origin/develop` en remoto. 3 desviaciones de tooling: Prisma 6 en vez de 5 (`8.0.0-rc.17` es la `latest`), Joi vía Standard Schema, `onModuleInit` tolerante a MySQL caído. 1 tarea sin tildar: 1.1.1 (revisión con la organización de las 8 preguntas §12). 3 bloqueos nuevos: B-8, B-9, B-10. |
| 2026-09-25 | 2 | `COMPLETADA` | 1 sesión | 44/44 tareas · 30/30 verificaciones · 15/15 criterios. Gate resuelto adoptingando defaults de B-1/B-2 y unificando B-8. 9 desviaciones (DI-13…DI-21) y **3 bugs reales** detectados al verificar: doble envoltorio `data.data`, `409`/`404` que salían `500` por el orden inverso de los filters, y `DROP DATABASE` no permitido para `app` (que motivó el esquema sombra, DI-15). Cerrados B-1, B-2, B-8, B-9, B-10. |
| 2026-09-25 | 3 | `COMPLETADA` | 1 sesión | 26/26 tareas · 24/24 verificaciones · 13/13 criterios. 47/47 checks con curl. DI-05 resuelto con **422** (no 409) y `../01` §7 CU-05 actualizado. 4 desviaciones (DI-22…DI-24 + DI-05) y **1 bug real**: la tolerancia de 24 h dejaba crear una evolución con fecha de mañana; pasó a comparar días calendario (DI-22). Cerrado B-5. |
| 2026-09-25 | 4 | `COMPLETADA` | 1 sesión | 30/30 tareas · 19/19 verificaciones · 9/9 criterios. **30/30** checks con curl y **27/27** con Chromium real (Playwright, en directorio temporal, sin tocar el proyecto). DI-01 resuelta con la opción A (BFF). **5 bugs reales** encontrados al probar: el login no funcionaba (iba por el BFF, que lo rechaza), `/api/proxy` respondía 307 en vez de 401, el logout no borraba la cookie (204 con cuerpo descarta el Set-Cookie), dos controles con la misma etiqueta accesible, y el tema leído con setState en effect. Cerrado B-3. |
| 2026-09-26 | 5 | `COMPLETADA` | 1 sesión | 36/36 tareas · 27/27 verificaciones · 13/13 criterios. **48/48** checks en Chromium real y **21/21** del cálculo de edad, ambos en directorio temporal (B-2: sin tests en el repo). DI-07 resuelta: 16 campos, se corrigió el "14" de `04` §5.4. Módulo de médicos voluntarios nuevo con `@Roles(COORDINADOR, ADMIN)` y baja lógica; filtro `estadoHistoria` agregado (sin migración). **4 bugs reales**, tres de ellos pérdida de datos clínicos: el backend **descartaba la nota del Bloque D** y la reemplazaba por un encabezado generado; el segundo ingreso mandaba cadenas vacías por leer `FormData` de inputs sin `name`; los bloques A y D compartían el campo `fecha`; y el `409` decía "Ya existe un registro con ese valor" sin nombrar el campo. Dispositivo de 5" **emulado** (375×667), no físico: la validación con la organización sigue pendiente. |
| 2026-09-26 | 6 | `COMPLETADA` | 1 sesión | 23/23 tareas · 23/23 verificaciones · 8/8 criterios. **38/38** checks por HTTP y **29/29** en Chromium real (escritorio + Pixel 7), en directorio temporal. Rendimiento medido sobre **10.038 pacientes y 20.065 evoluciones**: `resumen` 68 ms, `recientes` 83 ms, `sin-contacto` 196 ms, todos bajo el límite de RNF-04/05. Caché probada por conteo de consultas a MySQL, no por tiempos: TTL=60 → 0 consultas en 4 repeticiones; TTL=0 → 3 por llamada. **Sin migración**: el `EXPLAIN` mostró que `ix_hc_fecha` e `ix_ev_fecha` alcanzan y que el barrido de tabla con rango de 365 días es la elección correcta del optimizador, no un índice faltante (ver `fase-06` §10.1). 7 desviaciones y **6 bugs reales**, dos de ellos de contrato: la query del listado armaba `?…&hasta=…?limit=20` con dos `?` y daba `400`, y los tipos del frontend asumían `medico: {apellido}` cuando el contrato devuelve `medicoNombre`, lo que crasheaba la pantalla. B-7 sigue abierta: filtro por operativo oculto. |
| 2026-09-26 | 6 (corrección) | `CORRECCIÓN` | 1 sesión | Corrección de navegación reportada por la organización: **desde `/pacientes` no había forma de llegar a una historia clínica**. La grilla tenía `alSeleccionar` y `onFilaDobleClick` pero no `onFilaClick`, y la toolbar no tenía ninguna acción de apertura; en un teléfono el recorrido era imposible, porque el doble click no existe en pantalla táctil. Es un defecto de la Fase 5 que la Fase 6 dejó a la vista: los tests de la Fase 5 pasaban porque comprobaban que el doble click abriera la edición —que era lo que el código hacía— y nadie recorrió el camino de ida a una historia ya existente. Corregido con acción **Ver historias** en la toolbar, filas operables con teclado, `/pacientes/[id]` reorganizado con las historias primero y la identificación plegada al final, miga de pan de 3 niveles, y la `descripcion` de las secciones del menú que ya estaba en los datos pero nunca se renderizaba. **26/26** checks en Chromium (escritorio + Pixel 7), sin regresión en el panel (29/29) ni en la API (38/38). Ver §3.2. |

---

## 5. Métricas del MVP

| Dato | Valor |
|---|---|
| Fases completadas | 6 / 7 |
| Tareas de implementación | 214 (27 + 44 + 26 + 30 + 36 + 23 + 28) |
| Tareas ejecutadas | 186 / 214 (26 + 44 + 26 + 30 + 36 + 23, más 1 de la Fase 1 pendiente) |
| Verificaciones | 178 → **301** (30 + 24 + 19 + 27 + 23) |
| Criterios de cierre | 76 → **134** (15 + 13 + 9 + 13 + 8) |
| Días de trabajo estimados restantes | 18 – 27 → **5 – 8** |
| Requisitos funcionales cubiertos | **7 / 7 RF** (RF-03.1, RF-03.2, RF-03.6, RF-04.1, RF-04.2, RF-05, RF-07.1) |
| Casos de uso verificados | 6 / 7 CU (CU-01, CU-02, CU-03, CU-04, CU-05, CU-06) |
| Desviación acumulada | 3 → **35** (3 + 9 + 5 + 5 + 6 + 7) |
