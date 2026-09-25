# Fase 3 — Historias Clínicas y Evoluciones (alta transaccional)

| | |
|---|---|
| **Estado** | `PENDIENTE` |
| **Depende de** | Fase 2 |
| **Bloquea a** | Fases 5, 6 |
| **Estimación** | 4 – 6 días |
| **Rama sugerida** | `feat/fase-3-historias-clinicas-evoluciones` |
| **Documentos fuente** | `../03-esquema-bd.md` §3.2, §3.3, §7.1, §8, §9.1 · `../02-arquitectura-tech.md` §7.4, §7.5 · `../01-requerimientos-y-negocio.md` §3.1.3, §3.1.4, §3.1.5, §3.2, §4 (RN-02, RN-03, RN-05), §5.2–§5.4, §7 |
| **Requisitos cubiertos** | RF-01.3, RF-01.4, RF-01.5, RF-02 · RN-02, RN-03, RN-05, RN-07 · CU-01, CU-03, CU-04, CU-05 |
| **Progreso** | **0 / 26 tareas · 0 / 24 verificaciones · 0 / 13 criterios de cierre** · 5 condiciones de entrada |

---

## 1. Objetivo

Completar el modelo clínico: cada ingreso es una historia clínica con sus evoluciones. El alta deja
de ser un registro simple y pasa a ser una **transacción** que crea paciente + historia + evolución
inicial, de forma atómica.

**Al terminar:** `POST /api/pacientes` devuelve `201` con `{ numeroHistoria, historiaClinicaId }` y
registrar una evolución en una historia cerrada devuelve el código correcto sin tocar el registro.

---

## 2. Condiciones de entrada (gate)

- [ ] Fase 2 `COMPLETADA` y los criterios de cierre verificados.
- [ ] `POST /api/pacientes` crea correctamente un paciente suelto (sin historia) → es el punto de partida.
- [ ] **DI-05** resuelta: código HTTP para registrar una evolución en una historia cerrada.
      Propuesta: **422** (`../02` §7.5) frente al **409** que dice CU-05 en `../01` §7.
      Si sigue abierta: implementar **422** y anotarlo como desviación en el reporte.
- [ ] **B-1** pregunta 4 (`../01` §12) resuelta: si la evolución es estrictamente inmutable o
      editable por el autor dentro de un plazo. **Default de esta fase: inmutable** (RF-02.2).
- [ ] `operativos` existe en el esquema (DI-04, Fase 2) porque `historias_clinicas.operativoId` lo necesita.

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

- [ ] **3.1.1** Agregar `HistoriaClinica` y `Evolucion` a `schema.prisma` con los enums
      `EstadoHistoria` y `TipoIngreso`, y las relaciones con `onDelete` según §3.1.
      *Archivo: `backend/prisma/schema.prisma`*
- [ ] **3.1.2** Declarar los 8 índices compuestos/simples de §3.1 con `map:` explícito.
      *Archivo: `backend/prisma/schema.prisma`*
- [ ] **3.1.3** Migración: `npx prisma migrate dev --name add_historias_clinicas_y_evoluciones --create-only`
      y **editar el SQL** para agregar los `CHECK` (DI-06):
      `ck_hc_edad`, `ck_hc_cierre` (`estado='CERRADA'` ⟹ `fecha_cierre` no nula),
      `ck_hc_fecha_no_futura`, `ck_ev_detalle` (`CHAR_LENGTH(detalle) >= 3`),
      `ck_ev_fecha_no_futura`.
      *Archivo: `backend/prisma/migrations/*_add_historias_clinicas_y_evoluciones/migration.sql`*
- [ ] **3.1.4** `npx prisma migrate dev && npx prisma generate` y verificar los índices con
      `SHOW INDEX FROM evoluciones`.
      *Archivos: `backend/prisma/migrations/` · generado*

### 4.2 DTOs y módulo de historias clínicas

- [ ] **3.2.1** `nest g resource historias-clinicas --no-spec` y limpiar el código generado.
      *Archivos: `backend/src/historias-clinicas/`*
- [ ] **3.2.2** `CreateIngresoDto`: `fecha` (`@IsDateString()`, no futura), `motivoConsulta`
      (3–2000, obligatorio), `representanteId?`, `tipoIngreso` (enum), `operativoId?`.
      *Archivo: `backend/src/historias-clinicas/dto/create-ingreso.dto.ts`*
- [ ] **3.2.3** `CreateEvolucionDto`: `fecha` (`@IsDateString()`, no futura, admite retroactiva) y
      `detalle` (3–5000, obligatorio, `trim`).
      *Archivo: `backend/src/historias-clinicas/dto/create-evolucion.dto.ts`*
- [ ] **3.2.4** `CreatePacienteCompletoDto`: extiende `CreatePacienteDto` con los campos del
      **Bloque C** (`fecha`, `motivoConsulta`, `representanteId?`, `tipoIngreso?`, `operativoId?`) y del
      **Bloque D** (`evolucionInicial: { fecha, detalle }`, **obligatorio**).
      *Archivo: `backend/src/pacientes/dto/create-paciente-completo.dto.ts`*
- [ ] **3.2.5** `CambiarEstadoDto`: `estado` (`CERRADA` \| `ANULADA`) y `motivo` (3–200,
      obligatorio para `ANULADA`).
      *Archivo: `backend/src/historias-clinicas/dto/cambiar-estado.dto.ts`*
- [ ] **3.2.6** `HistoriaClinicaResponseDto` y `EvolucionResponseDto` para Swagger.
      *Archivos: `backend/src/historias-clinicas/dto/`*

### 4.3 Endpoints

- [ ] **3.3.1** `GET /api/historias-clinicas/:id`: detalle del ingreso con paciente, médico autor y
      `edadRegistrada`.
      *Archivo: `backend/src/historias-clinicas/historias-clinicas.controller.ts`*
- [ ] **3.3.2** `GET /api/historias-clinicas/:id/evoluciones`: listado **cronológico descendente**
      por `fecha` con desempate por `id`, cada una con su autor y `createdAt` (RF-02.4).
      *Archivo: `backend/src/historias-clinicas/historias-clinicas.service.ts`*
- [ ] **3.3.3** `POST /api/historias-clinicas/:id/evoluciones`: valida que la historia exista y esté
      `ACTIVA` (**422** si no, DI-05), valida la fecha no futura, resuelve el médico del token y
      devuelve `201`.
      *Archivo: `backend/src/historias-clinicas/historias-clinicas.service.ts`*
- [ ] **3.3.4** `PATCH /api/historias-clinicas/:id/estado`: cerrar o reabrir. Al cerrar, escribe
      `fechaCierre` y `motivoCierre` (**transaccional** con una nota de cierre en `evoluciones`,
      según `../03` §9.2). Al reabrir, vuelve a `ACTIVA` y limpia `fechaCierre`.
      *Archivo: `backend/src/historias-clinicas/historias-clinicas.service.ts`*
- [ ] **3.3.5** `POST /api/pacientes/:id/ingresos`: **segundo ingreso** de un paciente existente.
      Crea solo `historias_clinicas` + `evoluciones`; **no** toca `pacientes` ni `numero_historia`.
      *Archivo: `backend/src/pacientes/pacientes.controller.ts`*
- [ ] **3.3.6** `GET /api/pacientes/:id/historias`: historial de ingresos del paciente, ordenados
      por `fecha DESC` con desempate por `id`.
      *Archivo: `backend/src/pacientes/pacientes.controller.ts`*
- [ ] **3.3.7** `GET /api/pacientes/:id/evoluciones`: historial **unificado y cronológico**
      agregando las evoluciones de todas sus historias (RF-02.3). Envolver con `Promise.all` de
      consultas por historia o resolver con `$queryRaw` + `$queryRawUnsafe` **nunca**: usar el query
      builder.
      *Archivo: `backend/src/pacientes/pacientes.service.ts`*
- [ ] **3.3.8** **No** exponer `DELETE` en historia, evolución ni paciente. Si hace falta responder
      `405`, documentarlo en Swagger como método no implementado.
      *Archivos: `backend/src/historias-clinicas/`, `backend/src/pacientes/`*
- [ ] **3.3.9** Swagger en todos los endpoints nuevos: `@ApiTags`, `@ApiOperation`, `@ApiResponse`
      (`201`, `404`, `422`), `@ApiBearerAuth`.
      *Archivos: ambos controllers*

### 4.4 Reglas de negocio en el service

- [ ] **3.4.1** `POST /api/pacientes` pasa a crear paciente + historia + evolución dentro de
      `prisma.$transaction`, con **las tres operaciones usando `tx`**.
      *Archivo: `backend/src/pacientes/pacientes.service.ts`*
- [ ] **3.4.2** Congelar `edadRegistrada` con la edad del paciente **en el momento del ingreso**,
      nunca recalculada al leer (RN-02).
      *Archivo: `backend/src/historias-clinicas/historias-clinicas.service.ts`*
- [ ] **3.4.3** Exigir la **evolución inicial** antes de confirmar la transacción: si falta
      `evolucionInicial`, `400` y **no** se crea nada (RF-01.4).
      *Archivo: `backend/src/pacientes/pacientes.service.ts`*
- [ ] **3.4.4** Resolver `medicoVoluntarioId` desde el token en las tres inserciones y **excluir**
      el campo del DTO si el cliente lo manda.
      *Archivo: `backend/src/pacientes/pacientes.service.ts`*
- [ ] **3.4.5** Validar `fecha` no futura (tolerancia 24 h) en el DTO y en el service, para ingresos
      y evoluciones.
      *Archivos: `src/pacientes/dto/`, `src/historias-clinicas/dto/`*
- [ ] **3.4.6** Registrar en el `Logger` **solo** operación, recurso y resultado. **Nunca** el
      detalle clínico ni los datos de identificación.
      *Archivos: ambos services*

### 4.5 Catálogos de representantes

- [ ] **3.5.1** Exponer `POST /api/representantes` y `GET /api/representantes?q=` para el alta
      rápida de representante desde el formulario (RN-03). Sin `DELETE`.
      *Archivos: `backend/src/catalogos/` o nuevo `backend/src/representantes/`*

---

## 5. Verificación

### 5.1 Transacción

- [ ] `POST /api/pacientes` completo → `201` con `{ numeroHistoria, historiaClinicaId }`.
- [ ] Verificar en la base: existen **exactamente** 1 paciente, 1 historia y 1 evolución iniciales.
- [ ] Repetir el alta con `evolucionInicial` ausente → `400` y `pacientes` **sigue con el mismo
      `COUNT(*)`** (verificar en `npx prisma studio` o `SELECT COUNT(*)`).
- [ ] Forzar el fallo del paso 3 (por ejemplo, `detalle` de 1 carácter que el service no llega a
      validar) → la transacción se revierte y **no** queda paciente ni historia huérfanos.
- [ ] `historias_clinicas.medico_voluntario_id` = id del token (RF-01.5, CU-01 paso 4).
- [ ] `evoluciones.medico_voluntario_id` = id del token.
- [ ] Enviar `medicoVoluntarioId: <otro-id>` en el body → la autoría real **no** cambia (o el
      request devuelve `400` por campo desconocido, lo que también cumple la regla).

### 5.2 Segundo ingreso

- [ ] `GET /api/pacientes/:id/historias` → 2 historias tras el segundo ingreso.
- [ ] Base: **1** paciente, **2** historias, **2** evoluciones.
- [ ] El segundo ingreso **conserva el mismo** `numero_historia` (el número es del paciente).
- [ ] `edadRegistrada` de la historia antigua sigue igual después del segundo ingreso (RN-02).
- [ ] `GET /api/pacientes/:id/evoluciones` → historial unificado cronológico de ambas historias.

### 5.3 Evoluciones

- [ ] `POST /api/historias-clinicas/:id/evoluciones` en historia `ACTIVA` → `201`, y la evolución
      aparece en el listado.
- [ ] Registrar una evolución con **fecha de ayer** y recargar → aparece en la posición correcta
      según la fecha clínica, no según la inserción (CU-04).
- [ ] `POST` con `fecha` de mañana → `400`.
- [ ] `POST` con `detalle` de 2 caracteres → `400`.
- [ ] La respuesta de la evolución incluye autor (nombre) y `createdAt` (RF-02.4).

### 5.4 Integridad

- [ ] Cerrar la historia (`PATCH /api/historias-clinicas/:id/estado` con `CERRADA`) → estado `CERRADA`
      y `fechaCierre` informada.
- [ ] `POST` evolución en la historia cerrada → **422** (DI-05) con mensaje *"La historia clínica está
      cerrada"*.
- [ ] Reabrir la historia → `ACTIVA`, y el siguiente `POST` de evolución devuelve `201`.
- [ ] `GET /api/historias-clinicas/:id/evoluciones` tras el cierre muestra también la nota de cierre.
- [ ] No existe `PATCH` ni `PUT` sobre `/evoluciones/:id`: `GET /api` sobre la colección de
      evoluciones solo expone `GET` y `POST` (RF-02.2).
- [ ] `DELETE` sobre historia, evolución o paciente → `405` o `404`. **Nunca borra filas**:
      verificar con `SELECT COUNT(*)` antes y después.
- [ ] Intentar `DELETE` de un paciente con historial → el motor impide la baja física por
      `onDelete: Restrict` (RN-07).

---

## 6. Criterios de cierre

- [ ] Un alta fallida en el paso de evolución **no** deja paciente ni historia huérfanos.
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
- [ ] `npm run lint` limpio y `dist/main.js` compila.

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

- [ ] Actualizar `../01-requerimientos-y-negocio.md` §7 (CU-05) si se adopta `422`.
- [ ] Actualizar `../03-esquema-bd.md` §9.2 si el cierre no lleva nota de evolution.
- [ ] Commit: `feat: alta transaccional de paciente, historias clinicas y evoluciones`
- [ ] PR contra `develop` con *qué* cambia, *por qué* y requisitos cubiertos (RF-01, RF-02, RN-02, RN-05).
- [ ] `ESTADO.md` §1: Fase 3 `COMPLETADA`; §3 cerrar B-5; §4 con una fila de registro.
