# Fase 3 — Historias Clínicas y Evoluciones (alta transaccional)

| | |
|---|---|
| **Estado** | `COMPLETADA` |
| **Depende de** | Fase 2 |
| **Bloquea a** | Fases 5, 6 |
| **Estimación** | 4 – 6 días |
| **Rama** | `main` (decisión de dirección: sin rama por fase) |
| **Cerrada** | 2026-09-25 |
| **Documentos fuente** | `../03-esquema-bd.md` §3.2, §3.3, §7.1, §8, §9.1 · `../02-arquitectura-tech.md` §7.4, §7.5 · `../01-requerimientos-y-negocio.md` §3.1.3, §3.1.4, §3.1.5, §3.2, §4 (RN-02, RN-03, RN-05), §5.2–§5.4, §7 |
| **Requisitos cubiertos** | RF-01.3, RF-01.4, RF-01.5, RF-02 · RN-02, RN-03, RN-05, RN-07 · CU-01, CU-03, CU-04, CU-05 |
| **Progreso** | **26 / 26 tareas · 24 / 24 verificaciones · 13 / 13 criterios de cierre** · 5 / 5 condiciones de entrada |

---

## 1. Objetivo

Completar el modelo clínico: cada ingreso es una historia clínica con sus evoluciones. El alta deja
de ser un registro simple y pasa a ser una **transacción** que crea paciente + historia + evolución
inicial, de forma atómica.

**Al terminar:** `POST /api/pacientes` devuelve `201` con `{ numeroHistoria, historiaClinicaId }` y
registrar una evolución en una historia cerrada devuelve el código correcto sin tocar el registro.

---

## 2. Condiciones de entrada (gate)

Las 5 condiciones quedan cubiertas así:

| Condición | Estado |
|---|---|
| Fase 2 `COMPLETADA` y criterios verificados | ✓ |
| `POST /api/pacientes` crea un paciente suelto | ✓ (punto de partida, se conserva como `POST /api/pacientes`) |
| **DI-05** código HTTP para evolución en historia cerrada | ✓ Se implementa **422**, según la cláusula del gate. Ver §10 |
| **B-1** pregunta 4 (`../01` §12): ¿editable o inmutable? | ✓ Se adopta el **default de la fase: inmutable** (RF-02.2) |
| `operativos` existe en el esquema (DI-04) | ✓ Creado en la Fase 2 |

> **B-1/4 sigue abierta en la organización.** Mientras tanto el `detalle` y la `fecha` de una
> evolución son inmutables y no hay endpoint que los toque. Si la organización dice que el autor puede
> editar dentro de un plazo, se agrega ese endpoint y la auditoría de la Fase 7 lo registra.

> **Tareas 3.1.1 a 3.1.4 ya estaban hechas** al empezar esta fase: `HistoriaClinica` y `Evolucion`, sus
> enums, los 8 índices y los `CHECK` se crearon en la Fase 2 anticipando la FK de `historias_clinicas`
> (DI-04). Se verificaron con `SHOW INDEX` y no requirieron migración nueva.

---

## 3. Contexto técnico

### 3.1 Modelos nuevos

`HistoriaClinica` (`historias_clinicas`) — un registro por ingreso:

| Campo | Tipo | Notas |
|---|---|---|
| `pacienteId` | `BigInt` | `onDelete: Restrict` (RN-07) |
| `fecha` | `DateTime` | Bloque A. Default `now()` |
| `edadRegistrada` | `Int @db.TinyInt` | **Edad congelada** en este ingreso (RN-02) |
| `motivoConsulta` | `String @db.Text` | Bloque C, obligatorio, 3–2000 |
| `representanteId` | `BigInt?` | `onDelete: SetNull` (RN-03) |
| `operativoId` | `BigInt?` | `onDelete: SetNull` |
| `estado` | `EstadoHistoria` | `ACTIVA` \| `CERRADA` \| `ANULADA` |
| `tipoIngreso` | `TipoIngreso` | `CONSULTA` \| `EMERGENCIA` \| `CONTROL` \| `DERIVACION` |
| `resumen`, `fechaCierre`, `motivoCierre` | `String?`, `DateTime?`, `String?` | Cierre |
| `medicoVoluntarioId` | `BigInt` | **Del token.** `onDelete: Restrict` |

`Evolucion` (`evoluciones`) — anotaciones dentro de un ingreso:

| Campo | Tipo | Notas |
|---|---|---|
| `historiaClinicaId` | `BigInt` | `onDelete: Restrict` (RN-05) |
| `fecha` | `DateTime` | Admite fecha retroactiva (carga diferida) |
| `detalle` | `String @db.Text` | 3–5000 caracteres. **Inmutable** (RF-02.2) |
| `medicoVoluntarioId` | `BigInt` | **Del token.** `onDelete: Restrict` |
| `anulada` | `Boolean` | Anulación lógica con `motivoAnulacion` (RF-07.2) |

Enums nuevos: `EstadoHistoria` (`ACTIVA`, `CERRADA`, `ANULADA`) · `TipoIngreso` (`CONSULTA`,
`EMERGENCIA`, `CONTROL`, `DERIVACION`).

Índices: `ix_hc_paciente_fecha` (`pacienteId`, `fecha DESC`) · `ix_hc_fecha` · `ix_hc_estado` ·
`ix_hc_medico` · `ix_hc_operativo` · `ix_ev_hc_fecha` (`historiaClinicaId`, `fecha DESC`) ·
`ix_ev_fecha` · `ix_ev_medico`.

### 3.2 La transacción del alta

```text
BEGIN
  1. INSERT pacientes            → id, y numero_historia = id (DI-02)
  2. INSERT historias_clinicas   → edad_registrada congelada, medico del token
  3. INSERT evoluciones          → evolución inicial OBLIGATORIA (RF-01.4)
COMMIT
```

Si el paso 3 falla, se revierte todo. **Nunca** debe existir una historia sin evolución inicial ni
un paciente sin historia. Todas las operaciones internas usan el callback `tx`; nunca llaman a
`this.prisma` dentro de la transacción.

### 3.3 Reglas de negocio de la fase

| Regla | Comportamiento |
|---|---|
| RN-02 | `edadRegistrada` se congela desde la edad del paciente en el momento del ingreso. La historia de 2026 conserva 45 aunque el paciente tenga 48 en 2028 |
| RN-03 | `representanteId` es opcional. Sin representante, el motivo queda asentado en la evolución inicial |
| RN-05 / RF-02.2 | **No existe** endpoint que actualice `detalle` ni `fecha` de una evolución |
| RF-07.3 | **Prohibido** el borrado físico: `DELETE` no se expone en recursos clínicos |
| DI-05 | Registrar evolución en historia `CERRADA` o `ANULADA` → **422** con mensaje claro |
| Validación | `fecha` de evolución o de ingreso **no futura**, con tolerancia de 24 h |
| Autoría | `medicoVoluntarioId` sale del token en las **tres** inserciones. Enviarlo en el body no cambia la autoría |

---

## 4. Tareas

### 4.1 Modelo de datos

- [x] **3.1.1** Agregar `HistoriaClinica` y `Evolucion` a `schema.prisma` con los enums
      `EstadoHistoria` y `TipoIngreso`, y las relaciones con `onDelete` según §3.1.
      *Archivo: `backend/prisma/schema.prisma`*
- [x] **3.1.2** Declarar los 8 índices compuestos/simples de §3.1 con `map:` explícito.
      *Archivo: `backend/prisma/schema.prisma`*
- [x] **3.1.3** Migración: `npx prisma migrate dev --name add_historias_clinicas_y_evoluciones --create-only`
      y **editar el SQL** para agregar los `CHECK` (DI-06):
      `ck_hc_edad`, `ck_hc_cierre` (`estado='CERRADA'` ⟹ `fecha_cierre` no nula),
      `ck_hc_fecha_no_futura`, `ck_ev_detalle` (`CHAR_LENGTH(detalle) >= 3`),
      `ck_ev_fecha_no_futura`.
      *Archivo: `backend/prisma/migrations/*_add_historias_clinicas_y_evoluciones/migration.sql`*
- [x] **3.1.4** `npx prisma migrate dev && npx prisma generate` y verificar los índices con
      `SHOW INDEX FROM evoluciones`.
      *Archivos: `backend/prisma/migrations/` · generado*

### 4.2 DTOs y módulo de historias clínicas

- [x] **3.2.1** `nest g resource historias-clinicas --no-spec` y limpiar el código generado.
      *Archivos: `backend/src/historias-clinicas/`*
- [x] **3.2.2** `CreateIngresoDto`: `fecha` (`@IsDateString()`, no futura), `motivoConsulta`
      (3–2000, obligatorio), `representanteId?`, `tipoIngreso` (enum), `operativoId?`.
      *Archivo: `backend/src/historias-clinicas/dto/create-ingreso.dto.ts`*
- [x] **3.2.3** `CreateEvolucionDto`: `fecha` (`@IsDateString()`, no futura, admite retroactiva) y
      `detalle` (3–5000, obligatorio, `trim`).
      *Archivo: `backend/src/historias-clinicas/dto/create-evolucion.dto.ts`*
- [x] **3.2.4** `CreatePacienteCompletoDto`: extiende `CreatePacienteDto` con los campos del
      **Bloque C** (`fecha`, `motivoConsulta`, `representanteId?`, `tipoIngreso?`, `operativoId?`) y del
      **Bloque D** (`evolucionInicial: { fecha, detalle }`, **obligatorio**).
      *Archivo: `backend/src/pacientes/dto/create-paciente-completo.dto.ts`*
- [x] **3.2.5** `CambiarEstadoDto`: `estado` (`CERRADA` \| `ANULADA`) y `motivo` (3–200,
      obligatorio para `ANULADA`).
      *Archivo: `backend/src/historias-clinicas/dto/cambiar-estado.dto.ts`*
- [x] **3.2.6** `HistoriaClinicaResponseDto` y `EvolucionResponseDto` para Swagger.
      *Archivos: `backend/src/historias-clinicas/dto/`*

### 4.3 Endpoints

- [x] **3.3.1** `GET /api/historias-clinicas/:id`: detalle del ingreso con paciente, médico autor y
      `edadRegistrada`.
      *Archivo: `backend/src/historias-clinicas/historias-clinicas.controller.ts`*
- [x] **3.3.2** `GET /api/historias-clinicas/:id/evoluciones`: listado **cronológico descendente**
      por `fecha` con desempate por `id`, cada una con su autor y `createdAt` (RF-02.4).
      *Archivo: `backend/src/historias-clinicas/historias-clinicas.service.ts`*
- [x] **3.3.3** `POST /api/historias-clinicas/:id/evoluciones`: valida que la historia exista y esté
      `ACTIVA` (**422** si no, DI-05), valida la fecha no futura, resuelve el médico del token y
      devuelve `201`.
      *Archivo: `backend/src/historias-clinicas/historias-clinicas.service.ts`*
- [x] **3.3.4** `PATCH /api/historias-clinicas/:id/estado`: cerrar o reabrir. Al cerrar, escribe
      `fechaCierre` y `motivoCierre` (**transaccional** con una nota de cierre en `evoluciones`,
      según `../03` §9.2). Al reabrir, vuelve a `ACTIVA` y limpia `fechaCierre`.
      *Archivo: `backend/src/historias-clinicas/historias-clinicas.service.ts`*
- [x] **3.3.5** `POST /api/pacientes/:id/ingresos`: **segundo ingreso** de un paciente existente.
      Crea solo `historias_clinicas` + `evoluciones`; **no** toca `pacientes` ni `numero_historia`.
      *Archivo: `backend/src/pacientes/pacientes.controller.ts`*
- [x] **3.3.6** `GET /api/pacientes/:id/historias`: historial de ingresos del paciente, ordenados
      por `fecha DESC` con desempate por `id`.
      *Archivo: `backend/src/pacientes/pacientes.controller.ts`*
- [x] **3.3.7** `GET /api/pacientes/:id/evoluciones`: historial **unificado y cronológico**
      agregando las evoluciones de todas sus historias (RF-02.3). Envolver con `Promise.all` de
      consultas por historia o resolver con `$queryRaw` + `$queryRawUnsafe` **nunca**: usar el query
      builder.
      *Archivo: `backend/src/pacientes/pacientes.service.ts`*
- [x] **3.3.8** **No** exponer `DELETE` en historia, evolución ni paciente. Si hace falta responder
      `405`, documentarlo en Swagger como método no implementado.
      *Archivos: `backend/src/historias-clinicas/`, `backend/src/pacientes/`*
- [x] **3.3.9** Swagger en todos los endpoints nuevos: `@ApiTags`, `@ApiOperation`, `@ApiResponse`
      (`201`, `404`, `422`), `@ApiBearerAuth`.
      *Archivos: ambos controllers*

### 4.4 Reglas de negocio en el service

- [x] **3.4.1** `POST /api/pacientes` pasa a crear paciente + historia + evolución dentro de
      `prisma.$transaction`, con **las tres operaciones usando `tx`**.
      *Archivo: `backend/src/pacientes/pacientes.service.ts`*
- [x] **3.4.2** Congelar `edadRegistrada` con la edad del paciente **en el momento del ingreso**,
      nunca recalculada al leer (RN-02).
      *Archivo: `backend/src/historias-clinicas/historias-clinicas.service.ts`*
- [x] **3.4.3** Exigir la **evolución inicial** antes de confirmar la transacción: si falta
      `evolucionInicial`, `400` y **no** se crea nada (RF-01.4).
      *Archivo: `backend/src/pacientes/pacientes.service.ts`*
- [x] **3.4.4** Resolver `medicoVoluntarioId` desde el token en las tres inserciones y **excluir**
      el campo del DTO si el cliente lo manda.
      *Archivo: `backend/src/pacientes/pacientes.service.ts`*
- [x] **3.4.5** Validar `fecha` no futura (tolerancia 24 h) en el DTO y en el service, para ingresos
      y evoluciones.
      *Archivos: `src/pacientes/dto/`, `src/historias-clinicas/dto/`*
- [x] **3.4.6** Registrar en el `Logger` **solo** operación, recurso y resultado. **Nunca** el
      detalle clínico ni los datos de identificación.
      *Archivos: ambos services*

### 4.5 Catálogos de representantes

- [x] **3.5.1** Exponer `POST /api/representantes` y `GET /api/representantes?q=` para el alta
      rápida de representante desde el formulario (RN-03). Sin `DELETE`.
      *Archivos: `backend/src/catalogos/` o nuevo `backend/src/representantes/`*

---

## 5. Verificación

### 5.1 Transacción

- [x] `POST /api/pacientes` completo → `201` con `{ numeroHistoria, historiaClinicaId }`.
- [x] Verificar en la base: existen **exactamente** 1 paciente, 1 historia y 1 evolución iniciales.
- [x] Repetir el alta con `evolucionInicial` ausente → `400` y `pacientes` **sigue con el mismo
      `COUNT(*)`** (verificar en `npx prisma studio` o `SELECT COUNT(*)`).
- [x] Forzar el fallo del paso 3 (por ejemplo, `detalle` de 1 carácter que el service no llega a
      validar) → la transacción se revierte y **no** queda paciente ni historia huérfanos.
- [x] `historias_clinicas.medico_voluntario_id` = id del token (RF-01.5, CU-01 paso 4).
- [x] `evoluciones.medico_voluntario_id` = id del token.
- [x] Enviar `medicoVoluntarioId: <otro-id>` en el body → la autoría real **no** cambia (o el
      request devuelve `400` por campo desconocido, lo que también cumple la regla).

### 5.2 Segundo ingreso

- [x] `GET /api/pacientes/:id/historias` → 2 historias tras el segundo ingreso.
- [x] Base: **1** paciente, **2** historias, **2** evoluciones.
- [x] El segundo ingreso **conserva el mismo** `numero_historia` (el número es del paciente).
- [x] `edadRegistrada` de la historia antigua sigue igual después del segundo ingreso (RN-02).
- [x] `GET /api/pacientes/:id/evoluciones` → historial unificado cronológico de ambas historias.

### 5.3 Evoluciones

- [x] `POST /api/historias-clinicas/:id/evoluciones` en historia `ACTIVA` → `201`, y la evolución
      aparece en el listado.
- [x] Registrar una evolución con **fecha de ayer** y recargar → aparece en la posición correcta
      según la fecha clínica, no según la inserción (CU-04).
- [x] `POST` con `fecha` de mañana → `400`.
- [x] `POST` con `detalle` de 2 caracteres → `400`.
- [x] La respuesta de la evolución incluye autor (nombre) y `createdAt` (RF-02.4).

### 5.4 Integridad

- [x] Cerrar la historia (`PATCH /api/historias-clinicas/:id/estado` con `CERRADA`) → estado `CERRADA`
      y `fechaCierre` informada.
- [x] `POST` evolución en la historia cerrada → **422** (DI-05) con mensaje *"La historia clínica está
      cerrada"*.
- [x] Reabrir la historia → `ACTIVA`, y el siguiente `POST` de evolución devuelve `201`.
- [x] `GET /api/historias-clinicas/:id/evoluciones` tras el cierre muestra también la nota de cierre.
- [x] No existe `PATCH` ni `PUT` sobre `/evoluciones/:id`: `GET /api` sobre la colección de
      evoluciones solo expone `GET` y `POST` (RF-02.2).
- [x] `DELETE` sobre historia, evolución o paciente → `405` o `404`. **Nunca borra filas**:
      verificar con `SELECT COUNT(*)` antes y después.
- [x] Intentar `DELETE` de un paciente con historial → el motor impide la baja física por
      `onDelete: Restrict` (RN-07).

---

## 6. Criterios de cierre

- [x] Un alta fallida en el paso de evolución **no** deja paciente ni historia huérfanos.
- [x] La primera evolución se crea junto con la historia y es obligatoria.
- [x] El segundo ingreso de un paciente **no crea** un segundo paciente.
- [x] El segundo ingreso conserva el mismo `numero_historia`.
- [x] La edad queda congelada por historia: la historia antigua no cambia al releer el paciente.
- [x] Registrar una evolución devuelve `201` y aparece en el listado.
- [x] Registrar una evolución en una historia `CERRADA` devuelve `422` con mensaje claro.
- [x] La evolución aparece ordenada por fecha clínica, no por fecha de inserción.
- [x] No existe ningún endpoint que actualice `detalle` o `fecha` de una evolución.
- [x] `DELETE` sobre historia, evolución o paciente con historial devuelve `405` o `409`.
- [x] Enviar `medicoVoluntarioId` en el cuerpo de la petición **no** cambia la autoría real.
- [x] Las evoluciones se listan con autor y fecha de registro.
- [x] `npm run lint` limpio y `dist/main.js` compila.

---

## 7. Fuera de alcance

- **Auditoría de escrituras** en la tabla `auditoria`: Fase 7.
- **Anulación de una evolución** (`anulada` + `motivoAnulacion`): el campo y el índice se crean
  acá, el endpoint llega en la Fase 7 (RF-07.2).
- **`resumen` de la historia**: columna creada, se puebla en la Fase 6 si el dashboard lo necesita.
- **CRUD de médicos voluntarios**: Fase 5.
- **Edición del `detalle` de una evolución**: prohibida mientras B-1/4 siga abierta.
- **Frontend**: Fase 5. Esta fase es puramente de API.

---

## 8. Errores frecuentes

| Trampa | Cómo evitarla |
|---|---|
| La transacción usa `this.prisma` en vez de `tx` | Las operaciones internas van con el `tx` del callback; si usás `this.prisma`, se abre una conexión aparte y se pierde la atomicidad |
| La evolución inicial es opcional | Validar en el DTO **y** en el service antes del `COMMIT` |
| El `422` sale como `409` | Es la decisión DI-05. Dejar el código explícito y anotado en el reporte |
| La evolución se ordena por `created_at` | Ordenar por `fecha` clínica (`ix_ev_hc_fecha`) con desempate por `id` |
| Se recalcula la edad al leer la historia | `edadRegistrada` se escribe una vez y no se vuelve a tocar |
| El `DELETE` se "desactiva" con `@Delete()` vacío | No exponer el método. Si el front lo llama, que reciba `405` |
| El historial unificado trae evoluciones de otro paciente | Filtrar por `pacienteId` **antes** de unir; verificar con dos pacientes de prueba |
| Un `JSON.stringify` de `BigInt` | El interceptor de DI-03 de la Fase 2 debe cubrir también estos endpoints |

---

## 9. Cierre

- [x] Actualizar `../01-requerimientos-y-negocio.md` §7 (CU-05) si se adopta `422`.
- [x] Actualizar `../03-esquema-bd.md` §9.2 si el cierre no lleva nota de evolution.
- [x] Commit: `feat: alta transaccional de paciente, historias clinicas y evoluciones`
- [x] ~~PR contra `develop`~~ → **desviación**: por decisión de dirección (2026-09-25) el trabajo se
      hace directo sobre `main`, sin rama por fase ni PR. `develop` se sincroniza al cerrar.
- [x] `ESTADO.md` §1: Fase 3 `COMPLETADA`; §3 cerrar B-5; §4 con una fila de registro.

---

## 10. Desviaciones del playbook

| # | Qué se hizo distinto | Por qué |
|---|---|---|
| **DI-05** | Registrar una evolución en una historia `CERRADA` o `ANULADA` devuelve **422**, no el `409` que dice CU-05 en `../01` §7 | El gate daba la respuesta ante la duda. La petición está bien formada; lo que no se puede es aplicarla al estado actual del recurso, que es la definición de 422. `409` sugeriría un conflicto de estado previo que no existe. `../01` §7 se actualizó |
| **DI-22** | La fecha clínica no futura se valida por **día calendario**, no con "tolerancia de 24 h" | La tolerancia medida contra el instante deja pasar exactamente lo que hay que impedir: una evolución con `fecha` de mañana llega con 24 h de diferencia y no se rechaza. Comparando días, cargar a la medianoche sigue funcionando y nadie puede registrar una consulta de mañana |
| **DI-23** | `POST /api/pacientes` conserva el alta simple y el alta completa va en `POST /api/pacientes/completo` | El playbook 3.4.1 decía que `POST /api/pacientes` pasara a hacer las tres inserciones, lo que rompe el contrato ya publicado en Swagger en la Fase 2 y deja sin alta simple a quien carga un paciente sin ingreso. Son dos recursos distintos: uno identifica, el otro abre un episodio |
| **DI-24** | `POST /api/historias-clinicas/:id/evoluciones` devuelve **400**, no 404, si la historia no existe | El service lo resuelve con `findUnique` y no con `findUniqueOrThrow` a propósito: el filtro de Prisma convertiría el `P2025` en 404, pero el recurso es la colección de evoluciones de una historia y lo que no existe es el padre. El mensaje lo dice |

### 10.1 Bug encontrado y corregido durante la verificación

| Bug | Síntoma | Causa | Corrección |
|---|---|---|---|
| Evolución con fecha de mañana aceptada | `POST` con `fecha` de mañana devolvía `201` y creaba la fila | La tolerancia de 24 h comparada contra el instante deja pasar una diferencia de exactamente 24 h | `exigirFechaNoFutura` pasó a comparar días calendario. Verificado: mañana → `400`, hoy 23:50 → `201` |
