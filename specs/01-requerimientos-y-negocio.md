# 01 - Requerimientos y Negocio

> Proyecto: **meRegalasUnaHora** — Sistema de registro y seguimiento de historias clínicas para pacientes en situación de calle.
> Etapa actual: **especificación funcional**. No se genera código fuente en esta fase.

---

## 1. Propósito del Sistema

### 1.1 Problema

Las personas en situación de calle son atendidas por equipos médicos voluntarios en puestos, changarías, confiterías y recorridos por calle. En la práctica, la información clínica de esta población presenta tres problemas críticos:

1. **Fragmentación:** cada equipo anota en planillas de papel o en archivos aislados. Un paciente atendido el lunes por un equipo no es reconocible el miércoles por otro.
2. **Identidad frágil:** al no contar con DNI, domicilio fijo ni teléfono, la identification del paciente depende del nombre y de rasgos informalmente descriptivos. No existe un identificador estable.
3. **Pérdida de continuidad:** sin un registro cronológico de evoluciones, no es posible seguir la evolución clínica (curación de heridas, adherencia a tratamiento, estado nutricional y psicosocial) a lo largo del tiempo.

### 1.2 Propósito

Construir una aplicación web que permita a médicos voluntarios:

- Registrar y numerar de forma centralizada la historia clínica de cada paciente.
- Capturar los datos de identificación y admisión mediante un formulario estandarizado.
- Registrar un **historial continuo de evoluciones** (fecha + detalle) por cada ingreso del paciente.
- Consultar y filtrar pacientes, historias y evoluciones de forma rápida, incluso en dispositivos móviles y en condiciones de conectividad intermitente.
- Proteger la información sensible de salud conforme a la Ley 25.326 de Protección de Datos Personales de Argentina.

### 1.3 Alcance

| Dentro del alcance (MVP) | Fuera de alcance (fases posteriores) |
|---|---|
| Registro y numeración de historias clínicas | Integración con sistemas Experimentales/provinciales de salud |
| Captura del formulario de admisión estandarizado | Telemedicina / videoconsulta |
| Registro y consulta de evoluciones | Integración con laboratorio o farmacia |
| Autenticación de médicos voluntarios | App móvil nativa (el MVP es web responsive) |
| Búsqueda, filtrado y paginación | Facturación, obras sociales y cobertura |
| Dashboard de seguimiento | Reportes estadísticos avanzados / epidemiología |

### 1.4 Usuarios del sistema

| Rol | Descripción | Permisos |
|---|---|---|
| **Médico voluntario** | Profesional de la salud que atiende en el terreno o en el puesto | Crear/editar pacientes, historias y evoluciones propias; consultar todas las historias |
| **Coordinador** | Referente de la organización que organiza turnos y cobertura | Todo lo del médico + gérer médicos voluntarios, ver auditoría |
| **Administrador** | Mantenimiento del sistema | Acceso total + configuración de catálogos |

---

## 2. Modelo de Negocios

### 2.1 Conceptos centrales

| Concepto | Definición |
|---|---|
| **Paciente** | Persona en situación de calle atendida por la organización. Es la entidad maestra y persistente: conserva su identidad entre múltiples ingresos. |
| **Número de Historia** | Identificador **correlativo, único e irrepetible** asignado por el sistema al crear un paciente. Es la clave de negocio que permite reconocer al paciente ante la ausencia de documentación. Clave primaria lógica de la organización. |
| **Historia Clínica** | Registro de **un ingreso o consulta** concreto del paciente. Contiene los datos del evento: fecha, motivo de consulta y representante. Un paciente puede tener N historias clínicas. |
| **Evolución** | Annotación clínica cronológica **dentro de una historia clínica**. Contiene fecha y detalle. Una historia clínica tiene N evoluciones. |
| **Médico Voluntario** | Usuario autenticado del sistema. Autor de los registros que crea. |
| **Representante** | Persona física o jurídica que acompaña al paciente y sirve de nexo de contacto (familiar, derivador, organización, efector de salud). |

### 2.2 Relaciones cardinales

```
MedicoVoluntario 1 ──< N HistoriasClinicas 1 ──< N Evoluciones
MedicoVoluntario 1 ──< N Evoluciones

Paciente 1 ──< N HistoriasClinicas
Representante 1 ──< N HistoriasClinicas
```

**Regla de negocio crítica:** la separación `Paciente` / `HistoriasClinicas` / `Evoluciones` es **obligatoria** y no negociable. El paciente es la identidad; la historia clínica es el episodio; la evolución es la anotación dentro del episodio. Colapsar estas tres entidades en una sola tabla produciría duplicación de datos de identificación y pérdida del historial cronológico.

### 2.3 Estados

**Estado de una Historia Clínica:**

| Estado | Significado | Transiciones |
|---|---|---|
| `ACTIVA` | Ingreso en curso; admite nuevas evoluciones | `ACTIVA → CERRADA` |
| `CERRADA` | Ingreso finalizado; **solo lectura** (se permiten anotaciones de cierre) | `CERRADA → ACTIVA` (reapertura por el médico autor) |
| `ANULADA` | Registro creado por error y anulado. No participa del historial clínico | Terminal |

**Regla:** una historia `CERRADA` no admite nuevas evoluciones. La reapertura debe quedar registrada en `auditoria`.

---

## 3. Requisitos Funcionales

### 3.1 RF-01 — Registro de paciente con formulario de admisión estandarizado

El sistema **debe** capturar, de forma obligatoria, los campos del formulario estándar *"Historia clínica - ¿Me regalás una hora?"*. Estos campos son el contrato funcional nuclear del sistema y **no pueden omitirse**.

#### 3.1.1 Bloque A — Cabecera de la historia

| # | Campo del formulario | Campo técnico | Tipo | Obligatoriedad |
|---|---|---|---|---|
| 1 | Número de Historia | `numeroHistoria` | `Int` (autoincremental) | **Automático** (generado por el sistema) |
| 2 | Fecha | `fecha` | `DateTime` | **Obligatorio** — por defecto `now()` |

> El **Número de Historia** es un correlativo generado por el sistema. El usuario no lo tipea, pero debe verse prominently en la pantalla y en la impresión de la historia. El campo no es editable.

#### 3.1.2 Bloque B — Datos de identificación del paciente

| # | Campo del formulario | Campo técnico | Tipo | Obligatoriedad | Observaciones |
|---|---|---|---|---|---|
| 3 | Apellido | `apellido` | `String(80)` | **Obligatorio** | Normalizado a mayúsculas para búsquedas |
| 4 | Nombre | `nombre` | `String(80)` | **Obligatorio** | Normalizado a mayúsculas |
| 5 | Documento | `documento` | `String(20)` | **Condicional** | Ver R-NG-01. Índice único cuandoinformed |
| 6 | Edad | `edad` | `Int` | **Obligatorio** | 0–120. Se autocompleta desde `fechaNacimiento` (R-NG-02) |
| 7 | Sexo | `sexo` | `Enum` | **Obligatorio** | `F` / `M` / `X` / `SIN_DATOS` |
| 8 | Estado civil | `estadoCivilId` | `Int?` (FK catálogo) | **Obligatorio** | Catálogo: Soltero/a, Casado/a, Unión libre, Separado/a, Divorciado/a, Viudo/a, Sin datos |
| 9 | Fecha de nacimiento | `fechaNacimiento` | `DateTime?` | **Condicional** | Ver R-NG-01. Alimenta el cálculo de `edad` |
| 10 | Nacionalidad | `nacionalidadId` | `Int?` (FK catálogo) | **Obligatorio** | Catálogo de países. Default razonable: `Argentina` |
| 11 | Domicilio | `domicilio` | `String(200)` | **Opcional** | Ver R-NG-01. Texto libre (puede ser "sin domicilio fijo") |
| 12 | Teléfono | `telefono` | `String(30)` | **Opcional** | Ver R-NG-01. Texto libre, admite múltiples números separados por `;` |

#### 3.1.3 Bloque C — Datos del ingreso

| # | Campo del formulario | Campo técnico | Tipo | Obligatoriedad | Observaciones |
|---|---|---|---|---|---|
| 13 | Representante | `representanteId` | `Int?` (FK) | **Condicional** | Ver R-NG-03. Persona, organización o efector derivado |
| 14 | Motivo de la consulta | `motivoConsulta` | `Text` | **Obligatorio** | Máx. 2000 caracteres. Texto libre |

#### 3.1.4 Bloque D — Registro continuo de evolución (sección obligatoria del formulario)

El formulario **debe** incluir una sección de **Evolución** que registre, por cada ingreso, al menos una anotación con:

| # | Campo del formulario | Campo técnico | Tipo | Obligatoriedad | Observaciones |
|---|---|---|---|---|---|
| 15 | Fecha (de la evolución) | `fecha` | `DateTime` | **Obligatorio** | Por defecto `now()`. Debe admitir fecha retroactiva (carga diferida) |
| 16 | Detalle | `detalle` | `Text` | **Obligatorio** | Máx. 5000 caracteres. Texto libre multilínea |

> **Requisito de apertura:** al crear una historia clínica, el sistema debe **exigir al menos una evolución inicial** (la nota de admisión). Esto garantiza que toda historia clínica tenga contenido clínico desde su creación y que el historial nunca quede vacío.

> **Requisitos de cierre (evolución posterior, dentro de la historia):** una historia clínica puede recibir múltiples evoluciones a lo largo de su vida activa. Las evoluciones se listan en **orden cronológico descendente** (más reciente primero) y cada una registra su autor (médico voluntario) de forma inmutable.

#### 3.1.5 Metadatos obligatorios (trazabilidad)

Aunque no figuran en el formulario impreso, el sistema **debe** capturar automáticamente en cada registro:

- `medicoVoluntarioId` — autor de la carga (obtenido del JWT, **nunca** del body).
- `createdAt` / `updatedAt` — marca de auditoría.
- `numeroHistoria` — visible en la cabecera de la historia impresa.

> **Regla de seguridad:** el `medicoVoluntarioId` se resuelve **siempre** desde el token de sesión. Aceptarlo desde el cuerpo de la petición constitute un riesgo de suplantación de authorship y está **prohibido**.

### 3.2 RF-02 — Registro de evoluciones adicionales

| ID | Requisito |
|---|---|
| RF-02.1 | El sistema debe permitir agregar una nueva evolución (fecha + detalle) a una historia clínica en estado `ACTIVA`. |
| RF-02.2 | El detalle de una evolución es inmutable una vez guardado; las correcciones se realizan agregando una nueva evolución. Esto preserva la integridad del historial clínico. |
| RF-02.3 | El sistema debe mostrar el historial de evoluciones de un paciente de forma **unificada y cronológica**, agrehando los ingresos de todas sus historias clínicas. |
| RF-02.4 | Cada evolución debe mostrar autor y fecha de registro, además de la fecha clínica de la anotación. |

### 3.3 RF-03 — Búsqueda, filtrado y consulta

| ID | Requisito |
|---|---|
| RF-03.1 | Listado de pacientes con **paginación** (`page`, `limit`) y búsqueda por texto libre (`q`). |
| RF-03.2 | La búsqueda `q` debe operar, como mínimo, sobre `apellido`, `nombre`, `documento` y `numeroHistoria`. |
| RF-03.3 | Filtros combinables: rango de fechas de ingreso, nationality, sexo y estado de la historia clínica. |
| RF-03.4 | Detalle de paciente: datos de identificación + listado de sus historias clínicas. |
| RF-03.5 | Detalle de historia clínica: cabecera del ingreso + listado cronológico de evoluciones. |
| RF-03.6 | La búsqueda debe ser **insensible a mayúsculas y acentos** (ej. `"jose"` encuentra `"José"`). |

> **RF-03.6 es un requisito funcional de primer nivel:** la captura en terreno, con teclado móvil y apuro, produce errores de acentuación con frecuencia. Sin normalización, el médico no encontrará al paciente yceedrá a duplicar el registro.

### 3.4 RF-04 — Gestión de médicos voluntarios

| ID | Requisito |
|---|---|
| RF-04.1 | Autenticación mediante usuario y contraseña. Contraseñas almacenadas **exclusivamente** con hash (bcrypt/argon2). Nunca en texto plano. |
| RF-04.2 | Sesión mediante JWT emitido por el backend. Único endpoint público: `POST /api/auth/login`. |
| RF-04.3 | Registro de datos del médico: nombre, apellido, documento, email, teléfono, matrícula, especialidad. |
| RF-04.4 | Baja lógica de médicos (`activo`),Jamás borrado físico: las evoluciones registradas deben conservar la referencia a su autor. |
| RF-04.5 | Autorización por rol en los endpoints de gestión de médicos (restringido a `COORDINADOR` / `ADMIN`). |

### 3.5 RF-05 — Dashboard de seguimiento

| ID | Requisito |
|---|---|
| RF-05.1 | Indicadores: total de pacientes activos, total de ingresos en el período, evoluciones registradas en el período. |
| RF-05.2 | Listado de pacientes con **última evolución** y **días transcurridos desde el último contacto** (alerta de pacientes que no vuelven). |
| RF-05.3 | Listado de los ingresos más recientes, con paciente, fecha, motivo y médico autor. |
| RF-05.4 | Filtro por rango de fechas. |

### 3.6 RF-06 — Impresión / exportación de la historia clínica

| ID | Requisito |
|---|---|
| RF-06.1 | La historia clínica debe ser **imprimible** y ajustado a la maquetación del formulario físico *"¿Me regalás una hora?"*, respetando los bloques A, B, C y D. |
| RF-06.2 | La impresión debe incluir el Número de Historia y todas las evoluciones en orden cronológico. |
| RF-06.3 | El listado de pacientes debe ser exportable a Excel/CSV. |

### 3.7 RF-07 — Auditoría de autoría

| ID | Requisito |
|---|---|
| RF-07.1 | El sistema debe identificar al médico autor de cada historia clínica y de cada evolución. |
| RF-07.2 | Las evoluciones **no se eliminan**; se anulan mediante marca (`anulada`) conservando el rastro. |
| RF-07.3 | Los registros clínicos no se borran físicamente (soft delete); la eliminación física está **prohibida**. |

---

## 4. Reglas de Negocio (RN)

### RN-01 — Pacientes sin documentación de identidad

> **Contexto:** es la situación más frecuente en la población atendida. El DNI es la excepción, no la norma.

| Documento | Fecha nac. | Domicilio | Teléfono | Regla |
|---|---|---|---|---|
| Sí | — | — | — | Se capturan los datos disponibles |
| No | Sí | Opc. | Opc. | Se admite al paciente **sin documento**, usando el Número de Historia como identidad |
| No | No | Opc. | Opc. | Se admite; el paciente queda identificado **solo** por Número de Historia + Apellido + Nombre |

**Consecuencias de diseño:**

- `documento`, `fechaNacimiento`, `domicilio` y `telefono` son **anulables** en el modelo de datos.
- `documento` NO tiene unicidad estricta a nivel de base de datos cuando es `NULL` (en MySQL múltiples `NULL` no colisionan en índices `UNIQUE`, comportamiento exploited). La deduplicación por documento se realiza en la capa de aplicación, normalizando y tratando `''` como `NULL`.
- La búsqueda de un paciente sin documento se hace por `numeroHistoria` o por `apellido` + `nombre`.

### RN-02 — Cálculo de la edad

- `edad` se **captura y almacena** de forma explícita, tal como exige el formulario, y puede contener un dato aproximado informado por el paciente (por ejemplo, *"más de cuarenta"*).
- Si se informa `fechaNacimiento`, el sistema **precalcula** `edad` y sugiere el valor, pero el médico puede confirmarlo o corregirlo.
- `edad` es **histórico**: si el paciente ingresa en 2026 con 45 años y vuelve en 2027, la historia de 2026 debe seguir mostrando 45. Por eso `edad` se congela por historia clínica y **no** se recalcula al consultar.

> **Decisión de modelado derivada de RN-02:** la edad se persiste en el registro de la historia clínica, no solo en el paciente. Esto garantiza que la impresión de una historia antigua muestre la edad que tenía el paciente en ese momento.

### RN-03 — Representante

- El campo `Representante` es **condicional**, no obligatorio.
- Debe admitir tanto personas físicas como organizaciones (derivadores, efectores de salud e incluso organizaciones sociales).
- Si no hay representante, la historia clínica se admite con `representanteId = NULL` y el motivo queda asentado en la evolución inicial.
- El representante **no es el médico autor**: es un nexo de contacto externo.

### RN-04 — Número de Historia

- Correlativo **monótono creciente**, sin reutilización de valores, generado en la capa de base de datos.
- **No se reinicia** por año, por profesional ni por sede. Es vitalicio de la organización.
- Es inmutable una vez asignado.
- Debe ser legible en la impresión: se recomienda el formato `HC-000123` en la capa de presentación, conservando el entero en base.

### RN-05 — Integridad de la evolución

- Toda evolución pertenece **obligatoriamente** a una historia clínica existente.
- No se admiten evoluciones huérfanas.
- No se permite `UPDATE` de `detalle` ni de `fecha` de una evolución existente (ver RF-02.2).
- Todo alta o baja de datos clínicos debe dejar rastro en auditoría (autor + timestamp).

### RN-06 — Protección de datos personales sensibles

- Los datos de salud son **datos personales sensibles** (Art. 2 inc. f, Ley 25.326).
- Requisitos obligatorios:
  - Toda la aplicación requiere autenticación. No existen endpoints públicos de datos clínicos.
  - Conexión cifrada en tránsito (HTTPS) en todo entorno no local.
  - Credenciales de base de datos fuera del repositorio (`.env` no versionado).
  - Registro de acceso a historias clínicas (auditoría de lectura) recomendado a partir de la Fase 5.
  - Política de retención y derecho de supresión del titular documentadas antes de producción.

### RN-07 — Integridad referencial

- Un paciente con historial clínico **no se elimina**: se da de baja lógica.
- Un médico que registró evoluciones **no se elimina**: se da de baja lógica (`activo = false`), conservando la firma de autoría histórica.

---

## 5. Flujos de Usuario Principales

### 5.1 F-01 — Autenticación del médico voluntario

```
Médico → /login → Usuario + Contraseña → POST /api/auth/login
      ← JWT (Bearer) + cookie HttpOnly
      → Guarda sesión → Redirige a /dashboard
```

**Reglas:** credenciales validadas contra hash en base. Fallo de autenticación → mensaje genérico (*"Usuario o contraseña incorrectos"*), sin revelar qué campo falló. Tras N intentos fallidos, se aplica rate limiting. `401` en cualquier punto → limpieza de sesión y redirección a `/login`.

### 5.2 F-02 — Alta de paciente nuevo e ingreso (flujo principal)

Este es el flujo **más crítico** y debe completarse en menos de 2 minutos en un dispositivo móvil.

```
Médico → Menú "Nuevo paciente" → /pacientes/nuevo
  1. Búsqueda previa: "¿Este paciente ya fue atendido?"
     → Si aparece un resultado → F-02-bis (continuar historia existente)
  2. Completa Bloque A (Fecha, autocompletado)
  3. Completa Bloque B (Apellido*, Nombre*, Documento?, Edad*, Sexo*,
                       Estado civil*, Fecha nac.?, Nacionalidad*,
                       Domicilio?, Teléfono?)
  4. Completa Bloque C (Representante?, Motivo de consulta*)
  5. Completa Bloque D (Evolución inicial: Fecha, Detalle*)  ← obligatorio
  6. Revisión y envío
  7. Sistema asigna Número de History → POST /api/pacientes
  8. Confirmación: "Historia N° HC-000123 creada correctamente"
     → Botones: "Imprimir historia" | "Registrar nueva evolución" | "Volver al inicio"
```

**Validaciones del paso 7:**
- Duplicado exacto por documento (no `NULL`) → advertencia, no bloqueo; el médico confirma.
- Duplicado por `apellido` + `nombre` + `fechaNacimiento` coincidentes → advertencia de posible duplicado.
- Sin cambios en las validaciones: el médico decide. Bloquear el alta de un paciente sin documentación, situación reportada múltiples veces, sería contraproducente.

### 5.3 F-02-bis — Paciente existente: nuevo ingreso

```
Médico → Busca paciente (por N° historia, documento o apellido+nombre)
      → Selecciona resultado → "Nuevo ingreso"
      → Se precargan los datos de identificación (solo lectura)
      → Completa Fecha, Representante?, Motivo de consulta*
      → Completa Evolución inicial*
      → Se crea una NUEVA historia clínica, NO se modifica la anterior
      → Volver a F-02 (paso 8)
```

> Los datos de identificación **no se editan** desde un nuevo ingreso. Si se detectan errores, se corrigen en la ficha del paciente (F-04), dejando rastro.

### 5.4 F-03 — Registro de evolución (seguimiento)

```
Médico → Dashboard → "Pacientes sin contacto reciente" / Buscador
      → Selecciona paciente → Detalle de paciente
      → Selecciona la historia clínica relevante (o "Nuevo ingreso")
      → "Agregar evolución"
      → Fecha (default: hoy) + Detalle*
      → Guarda → Se agrega al final de la lista cronológica
```

**Reglas:** solo disponible si la historia está `ACTIVA`. El autor de la evolución se toma del token. La evolución queda inmediatamente visible en el historial.

### 5.5 F-04 — Consulta y edición de datos de identificación

```
Médico → Buscador → Detalle de paciente
      → "Editar datos" (solo Bloque B)
      → Se modifican los datos maestro
      → Los cambios **no alteran** las historias ya registradas
      → Evolución previa que mentiona el dato antiguo se conserva tal cual (histórico inmutable)
```

### 5.6 F-05 — Cierre de historia clínica

```
Médico → Detalle de historia clínica → "Cerrar historia"
      → Confirmación (motivo opcional)
      → Estado: ACTIVA → CERRADA
      → Se bloquea la carga de nuevas evoluciones
      → Reabrible por el médico autor si fuera necesario (queda auditado)
```

### 5.7 F-06 — Búsqueda y consulta

```
Médico → Buscador global (topbar)
      → Ingresa texto (ignora mayúsculas y acentos)
      → Resultados: lista de pacientes con N° historia, nombre, documento
      → Filtros: rango de fechas, sexo, nacionalidad, estado
      → Click en paciente → Detalle con todas sus historias clínicas
      → Click en historia → Detalle con todas sus evoluciones
      → "Imprimir" → Maquetación de la historia clínica en PDF
```

### 5.8 F-07 — Gestión de médicos voluntarios (coordinador)

```
Coordinador → Menú "Médicos voluntarios" → Listado (toolbar pattern)
   → "Nuevo" → Formulario → Crea usuario
   → Seleccionar fila → "Modificar" | "Desactivar"
   → Nunca borrado físico
```

### 5.9 F-08 — Impresión de la historia clínica

```
Médico → Detalle de historia → "Imprimir"
      → Vista de impresión con los 4 bloques del formulario
      → Bloque D: todas las evoluciones en orden cronológico ascendente
      → Encabezado: Número de Historia, paciente, profesional responsable
      → Navegador → "Guardar como PDF" (impresión del navegador o librería PDF)
```

> La **vista de impresión** es un requisito de fidelidad documental: el formato debe ser legible y reconocible para el equipo médico, que ya conoce el formulario en papel.

---

## 6. Reglas de Validación del Formulario

| Campo | Regla | Mensaje sugerido |
|---|---|---|
| Apellido, Nombre | Obligatorio, 2–80 caracteres | *"El apellido es obligatorio"* |
| Documento | Opcional, 3–20 caracteres, solo dígitos (normalizado) | *"Formato de documento inválido"* |
| Edad | Obligatorio, entero 0–120 | *"Ingrese una edad válida (0 a 120)"* |
| Sexo | Obligatorio, enum | *"Seleccione el sexo"* |
| Estado civil | Obligatorio, catálogo | *"Seleccione el estado civil"* |
| Nacionalidad | Obligatorio, catálogo | *"Seleccione la nacionalidad"* |
| Fecha de nacimiento | Opcional; si se informa, no puede ser futura ni mayor a 120 años | *"La fecha de nacimiento no es válida"* |
| Motivo de consulta | Obligatorio, 3–2000 caracteres | *"El motivo de la consulta es obligatorio"* |
| Detalle de evolución | Obligatorio, 3–5000 caracteres | *"El detalle de la evolución es obligatorio"* |
| Fecha de evolución | Obligatorio; no futura (tolerancia: 24 h por desfase horario) | *"La fecha no puede ser futura"* |
| Teléfono | Opcional, 3–30 caracteres, solo dígitos y `+` | *"Formato de teléfono inválido"* |

**Validación cruzada:**
- Si `fechaNacimiento` es informada, se recalcula `edad` y se valida coherencia con la edad declarada (tolerancia ±2 años). Discrepancia mayor → advertencia, no error.
- `numeroHistoria` es de solo lectura y no viaja validado desde el cliente: **lo asigna el servidor**.

---

## 7. Casos de Uso con Criterios de Aceptación

### CU-01 — Crear historia clínica completa

**Precondición:** médico autenticado.

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Completa todos los campos obligatorios del formulario | Formulario válido |
| 2 | Envía el formulario | `201 Created` con `{ numeroHistoria, historiaClinicaId }` |
| 3 | Verifica la base | Existen 1 paciente, 1 historia clínica y 1 evolución iniciales |
| 4 | Verifica la autoría | `historias_clinicas.medico_voluntario_id` = id del token |
| 5 | Verifica la numeración | El `numeroHistoria` es correlativo y mayor al previo |

### CU-02 — Alta de paciente sin documento

**Precondición:** médico autenticado.

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Omite Documento, Fecha de nacimiento, Domicilio y Teléfono | Formulario válido (campos condicionales) |
| 2 | Completa Apellido, Nombre, Edad, Sexo, Estado civil, Nacionalidad, Motivo y Evolución | Formulario válido |
| 3 | Envía el formulario | `201 Created` con Número de Historia asignado |
| 4 | Busca el paciente por Número de Historia | El paciente aparece correctamente |
| 5 | Intenta crear un segundo paciente con el mismo `documento` vacío | No se dispara error de duplicado (`''` se normaliza a `NULL`) |

### CU-03 — Segundo ingreso del mismo paciente

**Precondición:** paciente existente con `HC-000123`.

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Busca por `HC-000123` | Aparece 1 resultado |
| 2 | Genera nuevo ingreso con motivo y evolución | `201 Created` |
| 3 | Verifica la base | **1** paciente, **2** historias clínicas, **2** evoluciones |
| 4 | Verifica el número de historia | El nuevo ingreso conserva `HC-000123` (el número es del paciente, no del ingreso) |
| 5 | Verifica la edad | La historia antigua conserva la edad del paciente en ese momento |

### CU-04 — Registro de múltiples evoluciones

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Abre una historia `ACTIVA` | Se listan las evoluciones en orden cronológico descendente |
| 2 | Agrega una evolución con fecha de ayer | `201 Created` |
| 3 | Reordena la vista | La nueva evolución aparece en la posición correcta según su fecha clínica |
| 4 | Intenta editar el detalle de una evolución existente | La interfaz no lo permite (solo agregar) |

### CU-05 — Bloqueo de evolución en historia cerrada

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Cierra la historia clínica | Estado `CERRADA` |
| 2 | Intenta agregar una evolución | `409 Conflict` — *"La historia clínica está cerrada"* |
| 3 | Reabre la historia (como autor) | Estado `ACTIVA`, acción auditada |
| 4 | Reintenta agregar la evolución | `201 Created` |

### CU-06 — Búsqueda insensible a mayúsculas y acentos

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Busca `jose` | Encuentra `José` |
| 2 | Busca `PEREZ` | Encuentra `Pérez` |
| 3 | Busca `0987` | Encuentra el documento `987` |
| 4 | Busca un paciente por nombre inexistente | Estado vacío, sin error |

### CU-07 — Autorización

| # | Paso | Resultado esperado |
|---|---|---|
| 1 | Sin token, `GET /api/pacientes` | `401 Unauthorized` |
| 2 | Con token de médico, `GET /api/medicos` | `403 Forbidden` |
| 3 | Con token de coordinador, `GET /api/medicos` | `200 OK` |
| 4 | Con token vencido | `401 Unauthorized` → el frontend limpia sesión y redirige a `/login` |

---

## 8. Requisitos No Funcionales

| ID | Categoría | Requisito | Criterio de aceptación |
|---|---|---|---|
| RNF-01 | Usabilidad | Diseño **responsive mobile-first** | La pantalla de admisión es operable con una sola mano en un teléfono de 5" |
| RNF-02 | Usabilidad | Carga del formulario de admisión | Completar el alta en < 2 minutos con datos en mano |
| RNF-03 | Usabilidad | Autocompletado de edad | Al completar la fecha de nacimiento, la edad se calcula automáticamente |
| RNF-04 | Rendimiento | Listados paginados | Respuesta de listados < 300 ms con 10.000 pacientes |
| RNF-05 | Rendimiento | Búsqueda | Búsqueda full-text < 500 ms con 10.000 pacientes |
| RNF-06 | Rendimiento | Detalle de historia | Carga de historia con todas sus evoluciones < 400 ms |
| RNF-07 | Seguridad | Autenticación obligatoria | Ningún endpoint de datos clínicos accesible sin token válido |
| RNF-08 | Seguridad | Hash de contraseñas | bcrypt/argon2; nunca texto plano ni cifrado reversible |
| RNF-09 | Seguridad | CORS | Lista blanca de orígenes (`CORS_ORIGINS`); nunca comodín |
| RNF-10 | Seguridad | Validación de entrada | `ValidationPipe` global con `whitelist: true` y `transform: true` |
| RNF-11 | Seguridad | Consultas parametrizadas | Prisma Client con el builder; SQL crudo solo justificado y sin concatenación de strings |
| RNF-12 | Auditoría | Trazabilidad de autoría | Toda escritura registra autor y timestamp |
| RNF-13 | Auditoría | Registro de lectura *(fase 5)* | Log de accesos a historias clínicas sensibles |
| RNF-14 | Compatibilidad | Navegador | Chrome/Edge/Firefox móbiles y escritorio, últimas 2 versiones |
| RNF-15 | Accesibilidad | Contraste y navegación por teclado | Criterios WCAG 2.1 AA en formularios |
| RNF-16 | Mantenibilidad | Código | TypeScript estricto en backend y frontend |
| RNF-17 | Mantenibilidad | Lint | ESLint/Oxlint sin errores ni warnings |
| RNF-18 | Confiabilidad | Copias de seguridad | Dump MySQL automatizado y probado periódicamente |
| RNF-19 | Portabilidad | Convenciones | Respetar las reglas de arquitectura documentadas en `02-arquitectura-tech.md` |

---

## 9. Reglas de Negocio Derivadas del Contexto de Uso

Estas reglas no provienen del formulario, sino de la **realidad operativa** del trabajo de campo. Son determinantes del diseño.

| ID | Regla | Justificación |
|---|---|---|
| RN-08 | **Borrador local:** el formulario de admisión debe poder completarse y guardarse como borrador si se pierde la conectividad, sincronizándose al reconectar. | La conectividad en calle es intermitente; perder un registro clínico es inaceptable. |
| RN-09 | **Captura rápida:** el formulario se organiza en bloques progresivos, con los campos obligatorios visibles sin scroll en pantalla de teléfono. | Se atiende con cola y presión de tiempo. |
| RN-10 | **Sin dato ≠ dato falso:** ante la ausencia de información, el profesional marca *"sin datos"*; el sistema **nunca rellena valores inventados**. | Un dato clínico inventado es-peor que un dato faltante: induce a decisiones erróneas. |
| RN-11 | **Trazabilidad del alta:** se registra qué profesional realizó cada carga, incluso en borradores sincronizados. | Conflicts entre turnos y profesionales son habituales en el terreno. |
| RN-12 | **Alerta de abandono:** el dashboard destaca pacientes sin evolución en un umbral configurable (por defecto 90 días). | La continuidad es el objetivo principal del programa. |
| RN-13 | **Fichas imprimibles:** toda historia clínica debe poder imprimirse para el expediente físico y para interoperar con efectores de salud que no usan el sistema. | La interoperabilidad con el sistema público de salud es una necesidad operativa real. |

---

## 10. Trazabilidad Requisitos → Implementación

| Requisito | Entidad / tabla | Endpoint previsto | Pantalla prevista | Fase |
|---|---|---|---|---|
| RF-01 (Bloques A–D) | `pacientes`, `historias_clinicas`, `evoluciones` | `POST /api/pacientes` | `/pacientes/nuevo` | 2, 5 |
| RF-02 | `evoluciones` | `POST /api/historias-clinicas/:id/evoluciones` | `/pacientes/[id]` | 3, 6 |
| RF-03 | `pacientes`, `historias_clinicas` | `GET /api/pacientes` | `/pacientes` | 2, 5 |
| RF-04 | `medicos_voluntarios` | `POST /api/auth/login`, CRUD `/api/medicos` | `/login`, `/medicos` | 1, 4, 5 |
| RF-05 | agregaciones sobre las 3 tablas | `GET /api/dashboard/resumen` | `/dashboard` | 6 |
| RF-06 | — | `GET /api/historias-clinicas/:id` | `/pacientes/[id]/imprimir` | 6 |
| RF-07 | `medico_voluntario_id` en todas las tablas | transversal | transversal | 2, 3 |

---

## 11. Glosario

| Término | Definición |
|---|---|
| **Historia clínica** | Conjunto completo y chronológico de las atenciones de una persona. En este sistema se modela como el conjunto de `historias_clinicas` (episodios) de un `paciente`. |
| **Ingreso** | Attendance event: un paciente asiste y se genera un registro con fecha, motivo y evolución inicial. |
| **Evolución** | Anotación clínica fechada dentro de un ingreso. |
| **Situación de calle** | Persona que vive o pernocta en la vía pública o en espacios públicos. |
| **Médico voluntario** | Profesional de la salud que atiende sin remuneración. |
| **Representante** | Ne xo de contacto del paciente: familiar, derivador o organización. |
| **Puesto / operativo** | Lugar físico (centro, changaría, confitería) donde se presta atención. |

---

## 12. Preguntas Abiertas (a resolver antes de la Fase 2)

| # | Pregunta | Impacto | Responsable |
|---|---|---|---|
| 1 | ¿El Número de Historia debe ser global de la organización o diferenciado por sede/operativo? | Define la PK y la generación correlativa | Dirección de la organización |
| 2 | ¿Qué documento se acepta como "Documento" cuando el paciente no tiene DNI (por ejemplo, número de expediente, documento de emergencia o cédula)? | Enumeración de tipos de documento y validaciones | Dirección técnica + organización |
| 3 | ¿Se requieren múltiples roles además de `MEDICO` / `COORDINADOR` / `ADMIN`? | Matriz de autorización | Dirección técnica |
| 4 | ¿El historial de evoluciones es **editable** por el mismo médico autor dentro de un plazo, o es estrictamente inmutable? | Define endpoints y auditoría | Dirección médica |
| 5 | ¿Se requiere migración de planillas Excel históricas existentes? | Define una fase de importación de datos | Dirección de la organización |
| 6 | ¿Cuál es el plazo legal de conservación de las historias clínicas una vez cerrado el caso? | Política de retención y purga | Legal + dirección médica |
| 7 | ¿Se requiere firma digital o firma electrónica del médico responsable? | Define el alcance de la auditoría y del cumplimiento normativo | Dirección médica |
| 8 | ¿Se requiere photographs clinical (heridas, dermatología)? | Impacta almacenamiento de archivos y almacenamiento de objetos | Dirección médica |

---

## 13. Trazabilidad hacia el resto de la especificación

| Documento | Propósito |
|---|---|
| `02-arquitectura-tech.md` | Decisiones de stack, estructura de carpetas, monorepo, ORM y convenciones de código |
| `03-esquema-bd.md` | Modelo entidad-relación, tablas, tipos de datos, índices y restricciones |
| `04-plan-de-fases.md` | Plan de desarrollo secuencial, entregables y criterios de cierre por fase |
