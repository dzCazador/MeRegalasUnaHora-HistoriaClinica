# Fase 5 — UI del Formulario de Admisión y Seguimiento de Pacientes

| | |
|---|---|
| **Estado** | `PENDIENTE` |
| **Depende de** | Fases 2, 3, 4 |
| **Bloquea a** | Fase 7 |
| **Estimación** | 8 – 12 días (la de mayor riesgo de desvío) |
| **Rama sugerida** | `feat/fase-5-ui-formulario-admision` |
| **Documentos fuente** | `../01-requerimientos-y-negocio.md` §3.1, §3.2, §3.3, §5.2–§5.7, §6, §7 (CU-01 a CU-06), §8 (RNF-01, RNF-02, RNF-03), §9 (RN-08 a RN-11) · `../02-arquitectura-tech.md` §10 |
| **Requisitos cubiertos** | RF-01, RF-02, RF-03, RF-04.3–RF-04.5 · RN-01, RN-02, RN-03, RN-09, RN-10, RN-11 · CU-01 a CU-06 |
| **Progreso** | **0 / 36 tareas · 0 / 27 verificaciones · 0 / 13 criterios de cierre** · 5 condiciones de entrada |

---

## 1. Objetivo

La pantalla que permite registrar un paciente completo —los bloques A, B, C y D del formulario
*"¿Me regalás una hora?"*— **operable con una sola mano en un teléfono de 5 pulgadas**, más el
listado, el detalle y el seguimiento de ingresos y evoluciones.

**Al terminar:** el flujo completo login → alta → confirmación con N° de historia → registro de
evoluciones funciona de punta a punta desde el celular.

---

## 2. Condiciones de entrada (gate)

- [ ] Fases 2, 3 y 4 `COMPLETADAS`, con los criterios de cierre verificados.
- [ ] Contrato REST **congelado** en Swagger: `POST /api/pacientes`, `GET /api/pacientes`,
      `POST /api/historias-clinicas/:id/evoluciones` y `PATCH /api/historias-clinicas/:id/estado`.
- [ ] **DI-07** resuelta: el formulario tiene **16 campos** (2 de A, 10 de B, 2 de C, 2 de D).
      `../04` §5.4 dice "14 campos": corregir la especificación al validar.
- [ ] **B-1** preguntas 4 y 5 (`../01` §12) resueltas (inmutabilidad de la evolución, migración de
      planillas — la segunda no bloquea el MVP).
- [ ] Prueba real en un dispositivo móvil de 5" disponible para la verificación manual.

---

## 3. Contexto técnico

### 3.1 Los 16 campos y su obligatoriedad

| # | Bloque | Campo | Campo técnico | Obligatoriedad |
|---|---|---|---|---|
| 1 | A | Número de Historia | `numeroHistoria` | **Automático**, solo lectura |
| 2 | A | Fecha | `fecha` | Obligatorio, default hoy |
| 3 | B | Apellido | `apellido` | Obligatorio, 2–80 |
| 4 | B | Nombre | `nombre` | Obligatorio, 2–80 |
| 5 | B | Documento | `documento` | Condicional (RN-01) |
| 6 | B | Edad | `edad` | Obligatorio, 0–120, **autocalculada** |
| 7 | B | Sexo | `sexo` | Obligatorio, enum |
| 8 | B | Estado civil | `estadoCivilId` | Obligatorio, catálogo |
| 9 | B | Fecha de nacimiento | `fechaNacimiento` | Condicional |
| 10 | B | Nacionalidad | `nacionalidadId` | Obligatorio, catálogo |
| 11 | B | Domicilio | `domicilio` | Opcional |
| 12 | B | Teléfono | `telefono` | Opcional |
| 13 | C | Representante | `representanteId` | Condicional (RN-03) |
| 14 | C | Motivo de la consulta | `motivoConsulta` | Obligatorio, 3–2000 |
| 15 | D | Fecha de evolución | `evolucionInicial.fecha` | Obligatorio, admite retroactiva |
| 16 | D | Detalle | `evolucionInicial.detalle` | Obligatorio, 3–5000 |

### 3.2 Layout mobile-first (RN-09)

- Bloques progresivos: el **Bloque A** (solo lectura) y el **Bloque B** primero; C y D en secciones
  desplegables o en scroll con los obligatorios siempre alcanzables.
- Campos obligatorios arriba de cada bloque, con etiqueta y marcador visual (asterisco o `label`).
- Targets táctiles ≥ 44 px, `inputMode` correcto en el teclado móvil
  (`numeric` en edad y documento, `tel` en teléfono).
- Nada de hover-dependencia: la información crítica se ve sin hover.
- Advertencia de cambios sin guardar (`beforeunload`).

### 3.3 Toolbar Pattern (obligatorio)

```text
┌──────────────────────────────────────────────────────────────┐
│ [Nuevo] [Modificar] [Refrescar] [Exportar]  🔍 [buscador   ] │
│                                                  con debounce] │
├──────────────────────────────────────────────────────────────┤
│ N° Historia │ Apellido y nombre │ Documento │ Edad │ Sexo │ …  │ ← sin botones
│ HC-000123   │ PÉREZ José       │ 987       │ 45   │ M     │   │   en las filas
└──────────────────────────────────────────────────────────────┘
   click → selecciona (resalta) · doble click → abre edición
```

**Prohibido** botones o íconos de acción dentro de las filas de la grilla.

### 3.4 Reglas de negocio visibles en la UI

| Regla | Comportamiento en pantalla |
|---|---|
| RN-01 | Botón *"Sin documento"* que limpia el campo y marca `tipoDocumentoId` = Sin documento. Nunca se bloquea el alta por falta de documento |
| RN-02 | Al informar `fechaNacimiento`, la **edad se calcula sola** y sigue siendo editable. Discrepancia > 2 años → **advertencia**, no error |
| RN-03 | Representante opcional: búsqueda de existentes + alta rápida inline |
| RN-10 | Ante ausencia de dato se marca *"sin datos"*. **Nunca** se rellenan valores inventados |
| RF-02.2 | En una historia `CERRADA` **no** se ofrece el formulario de nueva evolución |
| RF-03.6 | El buscador ignora mayúsculas y acentos (resuelto por el backend) |

---

## 4. Tareas

### 4.1 Servicios y capa de datos

- [ ] **5.1.1** `services/pacientes.ts` completo: `listar`, `obtener`, `crear`, `actualizar`,
      `historias`, `evoluciones`, `crearIngreso`, con tipos alineados al contrato REST.
      *Archivo: `frontend/app/services/pacientes.ts`*
- [ ] **5.1.2** `services/historias-clinicas.ts`: `obtener`, `listarEvoluciones`, `registrarEvolucion`,
      `cambiarEstado`.
      *Archivo: `frontend/app/services/historias-clinicas.ts`*
- [ ] **5.1.3** `services/catalogos.ts`: estados civiles, nacionalidades, tipos de documento, representantes.
      *Archivo: `frontend/app/services/catalogos.ts`*
- [ ] **5.1.4** Hooks de TanStack Query con claves consistentes y **invalidación de caché** tras cada
      mutación (pacientes, historia, evoluciones).
      *Archivos: `frontend/app/hooks/`*

### 4.2 Listado de pacientes

- [ ] **5.2.1** `/pacientes` con la Toolbar Pattern completa: `Nuevo`, `Modificar`, `Refrescar`,
      `Exportar` (deshabilitado hasta la Fase 7) y buscador con **debounce de 300 ms**.
      *Archivo: `frontend/app/(app)/pacientes/page.tsx`*
- [ ] **5.2.2** Grilla con `Table` de la Fase 4: click selecciona, doble click abre el modal de
      edición. **Sin botones en las filas**.
      *Archivo: `frontend/app/(app)/pacientes/page.tsx`*
- [ ] **5.2.3** Columnas: N° historia (formato `HC-000123`), apellido y nombre, documento, edad,
      sexo, último contacto, estado (`Badge` activo/inactivo).
      *Archivo: `frontend/app/(app)/pacientes/page.tsx`*
- [ ] **5.2.4** Paginación con los `meta` del backend, `Skeleton` durante la carga y `EmptyState`
      con la acción *"Registrar el primer paciente"*.
      *Archivo: `frontend/app/(app)/pacientes/page.tsx`*
- [ ] **5.2.5** Filtros combinables: rango de fechas de ingreso, sexo, nacionalidad, estado civil,
      estado de la historia.
      *Archivo: `frontend/app/(app)/pacientes/page.tsx`*
- [ ] **5.2.6** La fila seleccionada se persiste al cambiar de página y las acciones de la toolbar
      se habilitan/deshabilitan según haya selección.
      *Archivo: `frontend/app/(app)/pacientes/page.tsx`*

### 4.3 Formulario de admisión

- [ ] **5.3.1** `/pacientes/nuevo` con los bloques A, B, C y D, y el `Card` por bloque.
      *Archivo: `frontend/app/(app)/pacientes/nuevo/page.tsx`*
- [ ] **5.3.2** Esquema Zod en `lib/validations/paciente.schema.ts` replicando **exactamente** las
      reglas de `../01` §6, con los mensajes sugeridos en español.
      *Archivo: `frontend/app/lib/validations/paciente.schema.ts`*
- [ ] **5.3.3** **Bloque A**: N° de historia autogenerado y **solo lectura** (placeholder
      *"Se asigna al guardar"*), y fecha con default hoy y `max` = hoy.
      *Archivo: `frontend/app/components/pacientes/AdmissionForm.tsx`*
- [ ] **5.3.4** **Bloque B**: los 10 campos del Bloque B con sus validaciones.
      *Archivo: `frontend/app/components/pacientes/DatosIdentificacion.tsx`*
- [ ] **5.3.5** **Cálculo automático de la edad** desde `fechaNacimiento` (RN-02, RNF-03): al
      cambiar la fecha, la edad se completa sola pero **queda editable**; si el médico la corrige, su
      valor manda. Discrepancia > 2 años → advertencia no bloqueante.
      *Archivo: `frontend/app/components/pacientes/DatosIdentificacion.tsx`*
- [ ] **5.3.6** Campo documento con botón *"Sin documento"* y el resto de condicionales marcados
      visualmente como opcionales.
      *Archivo: `frontend/app/components/pacientes/DatosIdentificacion.tsx`*
- [ ] **5.3.7** **Bloque C**: buscador de representante con alta rápida inline (nombre, tipo,
      documento, teléfono, vínculo) y campo `motivoConsulta` (textarea con contador de caracteres).
      *Archivo: `frontend/app/components/pacientes/DatosIngreso.tsx`*
- [ ] **5.3.8** **Bloque D**: fecha de la evolución (admite retroactiva, `max` = hoy + 24 h) y
      `detalle` multilínea. **Ambos obligatorios**: sin ellos no se habilita el envío.
      *Archivo: `frontend/app/components/pacientes/EvolucionInicial.tsx`*
- [ ] **5.3.9** Layout mobile-first según §3.2 y `beforeunload` si el formulario tiene cambios.
      *Archivo: `frontend/app/(app)/pacientes/nuevo/page.tsx`*
- [ ] **5.3.10** Envío con estado de carga, manejo del error del backend mostrado **literalmente** y
      deshabilitado doble clic.
      *Archivo: `frontend/app/(app)/pacientes/nuevo/page.tsx`*
- [ ] **5.3.11** Pantalla de confirmación con el **N° de historia asignado** y acciones: *Imprimir*
      (habilitada desde la Fase 7), *Registrar evolución*, *Volver al listado*.
      *Archivo: `frontend/app/(app)/pacientes/nuevo/page.tsx` o `confirmacion/page.tsx`*
- [ ] **5.3.12** **Advertencia (no bloqueo)** ante posible duplicado: al escribir un documento ya
      existente o un apellido+nombre muy similar, avisar y permitir continuar.
      *Archivo: `frontend/app/components/pacientes/`*

### 4.4 Detalle y seguimiento

- [ ] **5.4.1** `/pacientes/[id]`: datos de identificación (solo lectura) + listado de sus historias
      clínicas con estado, fecha, motivo y cantidad de evoluciones.
      *Archivo: `frontend/app/(app)/pacientes/[id]/page.tsx`*
- [ ] **5.4.2** Historial **unificado y cronológico** de evoluciones de todas las historias
      (RF-02.3), con autor, fecha clínica y fecha de registro.
      *Archivo: `frontend/app/(app)/pacientes/[id]/page.tsx`*
- [ ] **5.4.3** Botón *"Nuevo ingreso"* que precarga los datos de identificación en **solo lectura**
      y pide únicamente motivo y evolución.
      *Archivo: `frontend/app/(app)/pacientes/[id]/page.tsx`*
- [ ] **5.4.4** Modal de edición del Bloque B, con los mismos mensajes de validación del formulario.
      *Archivo: `frontend/app/components/pacientes/ModalEditarPaciente.tsx`*
- [ ] **5.4.5** `/pacientes/[id]/historias/[historiaId]`: detalle del ingreso con **todas** sus
      evoluciones en orden cronológico descendente y la `edadRegistrada` de ese ingreso (RN-02).
      *Archivo: `frontend/app/(app)/pacientes/[id]/historias/[historiaId]/page.tsx`*
- [ ] **5.4.6** Formulario de **registro de evolución** visible solo si la historia está `ACTIVA`.
      *Archivo: `frontend/app/components/pacientes/FormularioEvolucion.tsx`*
- [ ] **5.4.7** Acciones de **cierre** y **reapertura** con `ConfirmDialog` y motivo obligatorio
      para el cierre.
      *Archivo: `frontend/app/(app)/pacientes/[id]/historias/[historiaId]/page.tsx`*
- [ ] **5.4.8** Si el backend responde `422` (historia cerrada), mostrar el mensaje y refrescar el
      estado de la historia.
      *Archivo: `frontend/app/components/pacientes/FormularioEvolucion.tsx`*

### 4.5 Médicos voluntarios

- [ ] **5.5.1** `GET/POST/PATCH /api/medicos-voluntarios` en el backend con `@Roles('COORDINADOR', 'ADMIN')`.
      *Archivos: `backend/src/medicos-voluntarios/`*
- [ ] **5.5.2** `/medicos` con la Toolbar Pattern: listado, alta, edición y **baja lógica**
      (RF-04.4). Nunca `DELETE` físico.
      *Archivo: `frontend/app/(app)/medicos/page.tsx`*
- [ ] **5.5.3** Un médico con rol `MEDICO` que entra a `/medicos` ve un mensaje *"sin permisos"* (`403`).
      *Archivo: `frontend/app/(app)/medicos/page.tsx`*

### 4.6 Seguridad de la UI

- [ ] **5.6.1** Ninguna pantalla renderiza datos de pacientes sin sesión válida (verificado con
      `curl` directo a las rutas del frontend sin cookie).
      *Archivos: `frontend/proxy.ts` y las rutas `(app)`*
- [ ] **5.6.2** Los mensajes de error del backend se muestran **literalmente**, sin reescritura.
      *Archivo: `frontend/app/components/shared/Toast.tsx`*
- [ ] **5.6.3** `ConfirmDialog` obligatoria antes de cierre de historia, anulación y baja de médico.
      *Archivo: `frontend/app/components/shared/ConfirmDialog.tsx`*

---

## 5. Verificación

### 5.1 Alta completa (el camino crítico)

- [ ] Con un paciente completo, el alta devuelve `201` y muestra el **N° de historia asignado**.
- [ ] Base: 1 paciente, 1 historia, 1 evolución iniciales (verificar en `npx prisma studio`).
- [ ] La evolución inicial **no** se puede omitir: sin `detalle`, el botón de guardar está deshabilitado
      o el formulario no envía.
- [ ] Los **16 campos** están presentes con la obligatoriedad de §3.1.
- [ ] Al informar la fecha de nacimiento, la edad se calcula sola y **sigue siendo editable**.
- [ ] Un paciente **sin** documento, fecha de nacimiento, domicilio ni teléfono se registra sin errores
      (RN-01, CU-02).
- [ ] Registrar un segundo ingreso del mismo paciente crea una historia **nueva** sin duplicar el
      paciente, con el mismo `numeroHistoria` (CU-03).
- [ ] Tras el alta, el listado muestra al paciente en la primera página.
- [ ] Un fallo del backend (por ejemplo, `409` por documento duplicado) muestra el mensaje literal
      sin perder lo cargado del formulario.

### 5.2 Seguimiento

- [ ] Registrar una evolución la muestra de inmediato en el historial, **en la posición correcta**
      según su fecha clínica (CU-04).
- [ ] Una historia cerrada **no** ofrece el formulario de nueva evolución; reabrirla lo vuelve a
      mostrar (CU-05).
- [ ] En el detalle de la historia se ve la `edadRegistrada` congelada de ese ingreso (RN-02).
- [ ] El historial unificado muestra las evoluciones de todas las historias del paciente, ordenadas
      (RF-02.3).
- [ ] El detalle de una evolución muestra autor, fecha clínica y fecha de registro (RF-02.4).
- [ ] No existe ningún control de UI que permita **editar** el `detalle` de una evolución (RF-02.2).

### 5.3 Búsqueda y grilla

- [ ] El buscador encuentra `Pérez` escribiendo `perez` y `PEREZ` (RF-03.6, CU-06).
- [ ] El buscador encuentra un paciente por número de historia (`123` → `HC-000123`).
- [ ] Buscar algo inexistente muestra el **estado vacío**, no un error.
- [ ] La grilla **no tiene botones** en las filas y la toolbar funciona completa.
- [ ] Click en una fila la selecciona y habilita `Modificar`; doble click abre el modal.
- [ ] La paginación mantiene el `orderBy` estable: al ir y volver, no se repiten filas.

### 5.4 Mobile y calidad

- [ ] El formulario se completa con una sola mano en un dispositivo de 5" (RNF-01).
- [ ] Los campos obligatorios son visibles sin desplazamiento en la primera pantalla del bloque (RN-09).
- [ ] Ningún campo de texto se desborda en 320 px de ancho.
- [ ] Todos los mensajes de validación están **en español y son accionables**
      (ej. *"Ingrese una edad válida (0 a 120)"*).
- [ ] `npm run lint` y `npm run build` limpios en frontend; `npm run lint` limpio en backend.
- [ ] Consola del navegador sin errores ni warnings de hidratación.

---

## 6. Criterios de cierre

- [ ] El alta de un paciente completo crea paciente, historia y evolución, y muestra el N° de historia.
- [ ] La evolución inicial es obligatoria: sin ella no se puede enviar el formulario.
- [ ] Los 16 campos del formulario están presentes con la obligatoriedad definida en `../01` §3.1.
- [ ] Al informar la fecha de nacimiento, la edad se calcula sola y sigue siendo editable.
- [ ] Un paciente sin documento, fecha de nacimiento, domicilio ni teléfono se puede registrar.
- [ ] Un segundo ingreso del mismo paciente crea una historia nueva sin duplicar el paciente.
- [ ] El buscador encuentra pacientes ignorando mayúsculas y acentos.
- [ ] La grilla no tiene botones de acción en las filas y el patrón de toolbar funciona completo.
- [ ] Registrar una evolución la muestra de inmediato en el historial, en la posición correcta.
- [ ] Una historia cerrada no ofrece el formulario de nueva evolución.
- [ ] El formulario se completa con una sola mano en un dispositivo móvil.
- [ ] Todos los mensajes de validación aparecen en español y son accionables.
- [ ] `npm run lint` y `npm run build` limpios.

---

## 7. Fuera de alcance

- **Impresión y exportación reales**: Fase 7. El botón *Imprimir* puede quedar deshabilitado con una
  nota visible, nunca simular una impresión que no existe.
- **Dashboard**: Fase 6.
- **Auditoría de lecturas**: Fase 7.
- **Modo offline / borradores locales** (RN-08): Fase 8, fuera del MVP. **No** implementar
  `localStorage` con datos clínicos: es un riesgo de exposição, no una funcionalidad.
- **Firma digital de la evolución** (B-1 pregunta 7): pendiente de la organización.
- **Filtro por operativo**: Fase 6.

---

## 8. Errores frecuentes

| Trampa | Cómo evitarla |
|---|---|
| Botones de acción en las filas de la grilla | El `Table` de la Fase 4 no expone slots de acciones por celda. Las acciones viven en la toolbar |
| El autocalculo de la edad pisa lo que escribe el médico | Solo autocompletar cuando el campo de edad está vacío o cuando el usuario no lo editó a mano |
| El formulario se pierde al cerrar el navegador | `beforeunload` + aviso visible de cambios sin guardar |
| El `422` de historia cerrada se muestra como error genérico | Mostrar el `message` del backend literal y refrescar el estado de la historia |
| La edad de la historia histórica cambia al editar el paciente | El detalle de la historia muestra `edadRegistrada`, no la edad actual del paciente |
| Doble clic en *Guardar* crea dos pacientes | Deshabilitar el botón mientras la mutación está pendiente |
| Un paciente sin documento queda con `documento: ""` | El botón *"Sin documento"* manda `null`, no cadena vacía |
| Filtros que no llegan al backend | Los filtros van en el query string de la petición, no solo en el estado local del componente |
| `any` en los tipos del formulario | `strict: true` y tipos alineados con el contrato REST escritos a mano |

---

## 9. Cierre

- [ ] Actualizar `../04-plan-de-fases.md` §5.4 si el conteo de campos era 14 (DI-07).
- [ ] Commit: `feat: formulario de admision, listado y seguimiento de pacientes`
- [ ] PR contra `develop` con *qué* cambia, *por qué* y requisitos cubiertos (RF-01, RF-02, RF-03, CU-01 a CU-06).
- [ ] **Validación con la organización** en un operativo real (obligatoria según `../04` §6).
- [ ] `ESTADO.md` §1: Fase 5 `COMPLETADA`; §4 con una fila de registro.
