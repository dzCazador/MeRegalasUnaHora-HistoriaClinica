# Fase 6 — Dashboard de Seguimiento y Alerta de Abandono

| | |
|---|---|
| **Estado** | `COMPLETADA` |
| **Depende de** | Fases 3, 4 (y 5 para navegar al detalle) |
| **Bloquea a** | Fase 7 |
| **Estimación** | 4 – 6 días |
| **Rama sugerida** | `feat/fase-6-dashboard` |
| **Documentos fuente** | `../01-requerimientos-y-negocio.md` §3.5, §9 (RN-12), §8 (RNF-04, RNF-05) · `../02-arquitectura-tech.md` §2.2, §7.4 · `../03-esquema-bd.md` §3.2, §4.5, §7.3, §9.3 |
| **Requisitos cubiertos** | RF-05 · RN-12 · RNF-04, RNF-05 |
| **Progreso** | **23 / 23 tareas · 23 / 23 verificaciones · 8 / 8 criterios de cierre** · 4 / 4 condiciones de entrada |

---

## 1. Objetivo

Un panel que permita ver, de un vistazo, la actividad del período y **detectar los pacientes que
han dejado de volver**: el objetivo principal del programa es la continuidad, no la cantidad de
registros cargados.

**Al terminar:** `/dashboard` muestra los indicadores del período, los ingresos recientes y la lista
de pacientes sin contacto con los días transcurridos desde su última evolución.

---

## 2. Condiciones de entrada (gate)

- [x] Fases 3 y 4 `COMPLETADAS`; Fase 5 cerrada o, como mínimo, las rutas de detalle accesibles.
- [x] Existe al menos un mes de datos de prueba para validar la agregación.
- [x] **B-7** resuelta: la lista de puestos de atención para `operativos`. Si no hay respuesta, el
  filtro por operativo queda **oculto** en la UI y se implementa solo el resto del panel.
- [x] El umbral de "sin contacto" es **configurable** y su default está definido (propuesta: 90 días).

---

## 3. Contexto técnico

### 3.1 Los tres endpoints

| Endpoint | Devuelve | Reglas |
|---|---|---|
| `GET /api/dashboard/resumen` | `pacientesActivos`, `ingresos`, `evoluciones`, `series` (por mes) | Obligatorio: `desde`, `hasta`, `operativoId?`, `nacionalidadId?` |
| `GET /api/dashboard/recientes` | Últimos ingresos con paciente, fecha, motivo y médico autor | Paginado, mismo rango de filtros |
| `GET /api/dashboard/sin-contacto` | Pacientes cuya última evolución es anterior al umbral, con `diasSinContacto` | Ordenar por `diasSinContacto` descendente |

Rango de fechas por defecto: **últimos 30 días**. Ambos extremos validados como `YYYY-MM-DD`.

### 3.2 El cálculo de "sin contacto" (RN-12)

```text
umbral = DASHBOARD_SIN_CONTACTO_DIAS ?? 90
corte  = hoy - umbral

por cada paciente activo:
    ultima = MAX(evoluciones.fecha) de todas sus historias NO anuladas
    si ultima < corte  →  incluir, con diasSinContacto = hoy - ultima
    si el paciente nunca tuvo evolución → incluir con diasSinContacto = null ("sin contacto registrado")
```

Notas de implementación:

- Una historia `ANULADA` **no** cuenta para el último contacto.
- Un paciente con al menos una evolución reciente **no** aparece, aunque tenga una historia vieja
  sin evoluciones.
- El cálculo se hace en el service con agregaciones Prisma (`groupBy`, `count`, `max`) o con una
  consulta `$queryRaw` **parametrizada** si el volumen lo justifica. Prohibido concatenar strings.
- Si el volumen lo permite, agregar un índice por `evoluciones.fecha` (ya existe: `ix_ev_fecha`).

### 3.3 Rendimiento (RNF-04, RNF-05)

- Listados y agregaciones por debajo de **300 ms** con 10.000 pacientes.
- Medir con `EXPLAIN` sobre las consultas de `resumen` y `sin-contacto`.
- Rango de fechas acotado por defecto para no agregar la base entera.
- Si el resumen se demora, cachear en memoria con ventana corta (60 s) e invalidar por fecha.

### 3.4 Configuración

```dotenv
# backend/.env
DASHBOARD_SIN_CONTACTO_DIAS=90
DASHBOARD_CACHE_TTL_SEGUNDOS=60
```

Ambas en `.env.example` y validadas con Joi (la primera con default 90).

---

## 4. Tareas

### 4.1 Backend — módulo `dashboard`

- [x] **6.1.1** `nest g module dashboard` y registrarlo en `app.module.ts`.
      *Archivos: `backend/src/dashboard/`*
- [x] **6.1.2** `QueryDashboardDto` con `desde`, `hasta`, `operativoId?`, `nacionalidadId?`,
      `sexo?`, `page`, `limit`; validado con `@IsDateString()` y un validador que exija
      `desde <= hasta`.
      *Archivo: `backend/src/dashboard/dto/query-dashboard.dto.ts`*
- [x] **6.1.3** `GET /api/dashboard/resumen`: totales de pacientes activos, ingresos y evoluciones
      del período, más la serie mensual de ingresos y evoluciones para el gráfico.
      *Archivo: `backend/src/dashboard/dashboard.service.ts`*
- [x] **6.1.4** `GET /api/dashboard/recientes`: últimos ingresos con paciente, fecha, motivo y
      médico autor, paginado con `meta`.
      *Archivo: `backend/src/dashboard/dashboard.service.ts`*
- [x] **6.1.5** `GET /api/dashboard/sin-contacto`: cálculo de §3.2 con el umbral de
      `DASHBOARD_SIN_CONTACTO_DIAS`, días transcurridos y orden descendente.
      *Archivo: `backend/src/dashboard/dashboard.service.ts`*
- [x] **6.1.6** Traducir los errores de Prisma a excepciones HTTP con el filtro de la Fase 2.
      *Archivo: `backend/src/dashboard/`*
- [x] **6.1.7** Swagger en los tres endpoints con los parámetros de filtro documentados.
      *Archivo: `backend/src/dashboard/dashboard.controller.ts`*

### 4.2 Extensión de base de datos

- [x] **6.2.1** Confirmar que `operativos` está creada, sembrada y con su `UNIQUE(nombre)` (DI-04).
- [x] **6.2.2** Endpoint de soporte `GET /api/catalogos/operativos` para el filtro por puesto.
      *Archivo: `backend/src/catalogos/catalogos.controller.ts`*
- [x] **6.2.3** Migración, solo si el `EXPLAIN` lo pide: índice adicional en `historias_clinicas`
      o `evoluciones`. Con nombre de índice explícito y comentario justificando la consulta que
      optimiza.
      *Archivo: `backend/prisma/migrations/`*
- [x] **6.2.4** Verificar los índices `ix_hc_fecha`, `ix_ev_fecha`, `ix_hc_operativo`.
      *Comando: `SHOW INDEX FROM historias_clinicas`*

### 4.3 Frontend — servicios y hooks

- [x] **6.3.1** `services/dashboard.ts` con `resumen`, `recientes`, `sinContacto`, y extender
      `services/catalogos.ts` con `operativos`.
      *Archivo: `frontend/app/services/dashboard.ts`*
- [x] **6.3.2** `hooks/useDashboard.ts` con las tres queries, estados de carga y error, y el
      `rango de fechas` como parámetro de la clave de caché.
      *Archivo: `frontend/app/hooks/useDashboard.ts`*

### 4.4 Frontend — `/dashboard`

- [x] **6.4.1** Reemplazar el placeholder por la pantalla real, con la Toolbar Pattern (selector de
      rango + `Refrescar`).
      *Archivo: `frontend/app/(app)/dashboard/page.tsx`*
- [x] **6.4.2** Selector de rango de fechas con valores rápidos: **hoy**, **7 días**, **30 días**,
      **mes actual**, **personalizado**.
      *Archivo: `frontend/app/(app)/dashboard/page.tsx`*
- [x] **6.4.3** Tarjetas de indicadores: pacientes activos, ingresos del período, evoluciones del
      período. Cada una con su `Skeleton` de carga y su estado vacío.
      *Archivo: `frontend/app/components/dashboard/KpiCard.tsx`*
- [x] **6.4.4** Gráfico de ingresos y evoluciones por mes con **Recharts** (ya en el stack).
      *Archivo: `frontend/app/components/dashboard/GraficoMensual.tsx`*
- [x] **6.4.5** Listado de ingresos recientes: paciente, fecha, motivo, médico autor. Cada fila
      **navega** al detalle del paciente o de la historia.
      *Archivo: `frontend/app/components/dashboard/IngresosRecientes.tsx`*
- [x] **6.4.6** Listado de **pacientes sin contacto** con días transcurridos, ordenados por
      criticidad (RN-12).
      *Archivo: `frontend/app/components/dashboard/SinContacto.tsx`*
- [x] **6.4.7** Resaltado visual de los casos que superan el umbral, con un texto explícito del
      criterio usado ("sin contacto hace más de 90 días").
      *Archivo: `frontend/app/components/dashboard/SinContacto.tsx`*
- [x] **6.4.8** Cada widget con sus **tres estados**: carga, vacío y error.
      *Archivo: `frontend/app/(app)/dashboard/page.tsx`*
- [x] **6.4.9** Filtros por nationality y por operativo (este último solo si B-7 está resuelto).
      *Archivo: `frontend/app/(app)/dashboard/page.tsx`*
- [x] **6.4.10** `/dashboard` agregado a `NAV_SECTIONS` con su ícono y su estado activo.
      *Archivo: `frontend/app/sidebar.tsx`*

---

## 5. Verificación

### 5.1 Backend

- [x] `GET /api/dashboard/resumen?desde=2026-01-01&hasta=2026-01-31` → los totales coinciden
      **exactamente** con `SELECT COUNT(*)` sobre el mismo rango en `npx prisma studio`.
- [x] Cambiar el rango de fechas cambia los resultados de forma consistente en los tres endpoints.
- [x] `GET /api/dashboard/sin-contacto` sin un filtro de fechas devuelve solo los que superan el
      umbral (el rango no debe recortar este cálculo: el umbral ya define la ventana).
- [x] Un paciente con evolución de ayer **no** aparece en `sin-contacto`.
- [x] Un paciente cuya única evolución está en una historia `ANULADA` **sí** aparece.
- [x] Un paciente sin ninguna evolución aparece con `diasSinContacto: null` y el texto
      *"sin contacto registrado"*.
- [x] `DASHBOARD_SIN_CONTACTO_DIAS=30` en el `.env` cambia el resultado: los pacientes con 45 días sin contacto
      pasan a aparecer. **Restaurar el valor a 90** después.
- [x] `desde > hasta` → `400` con mensaje claro.
- [x] `desde` con formato inválido (`01/01/2026`) → `400`.
- [x] Sin token → `401`.
- [x] `npx prisma migrate status` al día y `npm run lint` limpio.

### 5.2 Rendimiento

- [x] Con 10.000 pacientes y 20.000 evoluciones, `resumen` responde en **< 300 ms**.
- [x] `sin-contacto` responde en **< 500 ms** con el mismo volumen.
- [x] `EXPLAIN` de las consultas de agregación **usa los índices** (`ix_ev_fecha`, `ix_hc_fecha`) y
      no un `type: ALL` sobre la tabla completa.
- [x] El rango de fechas por defecto está acotado: una consulta sin fechas no agregue la base entera.

### 5.3 Frontend

- [x] El resumen refleja exactamente los datos del período seleccionado.
- [x] El selector rápido (hoy / 7 días / 30 días / mes actual) cambia los indicadores sin recargar
      la página.
- [x] El listado de sin contacto muestra los días transcurridos **correctamente** (verificar contra
      una fecha conocida).
- [x] Los casos que superan el umbral están resaltados y el criterio es visible.
- [x] Cada fila del listado de ingresos recientes navega al detalle correspondiente.
- [x] Cada widget tiene estado de carga, estado vacío y estado de error.
- [x] `npm run lint` y `npm run build` limpios en frontend y backend.
- [x] El gráfico se renderiza en un teléfono sin desbordar el ancho.

---

## 6. Criterios de cierre

- [x] El resumen refleja exactamente los datos del período seleccionado.
- [x] El rango de fechas filtra de forma consistente en todos los widgets.
- [x] El listado de pacientes sin contacto muestra los días transcurridos correctamente.
- [x] El umbral de alerta es configurable y su valor por defecto es 90 días.
- [x] El listado de ingresos recientes navega al detalle correspondiente.
- [x] Cada widget tiene estado de carga, estado vacío y estado de error.
- [x] Las consultas de agregación cumplen los tiempos de RNF-04 a escala de 10.000 pacientes.
- [x] `npm run lint` y `npm run build` limpios.

---

## 7. Fuera de alcance

- **Notificaciones por correo o SMS** de los pacientes sin contacto: la alerta es **visual**, en el
  panel. Un envío automático es una decisión de la organización (B-1) y un riesgo de exposición de
  datos de salud.
- **Estadísticas descriptivas** (distribución por edad, por sexo, comorbidencias): Fase 11.
- **Exportar el dashboard**: Fase 7.
- **Comparación entre períodos / histórico de la serie**: fuera del MVP.
- **Caché distribuida** (Redis): no hay volumen que lo justifique en el MVP. Con 10.000 pacientes
  alcanza la caché en memoria con ventana corta.
- **Ajustar el umbral por usuario**: la configuración es por ambiente, no por usuario.

---

## 8. Errores frecuentes

| Trampa | Cómo evitarla |
|---|---|
| El gráfico no aparece con un solo mes de datos | Manejar el caso de una sola barra y el de cero barras sin `NaN` |
| La agregación cuenta patients de otra historia mal cerrada | Filtrar por `estado` y descartar `ANULADA` en el cálculo del último contacto |
| `sin-contacto` con el rango de fechas del selector | Este cálculo **no** usa el rango de la toolbar: el umbral ya define la ventana |
| `diasSinContacto` en `NaN` cuando no hay evolución | Devolver `null` y mostrar un texto explícito, nunca un número inventado |
| El umbral hardcodeado en el componente | Leerlo de la respuesta del backend o de una variable de ambiente, nunca del JS |
| Consultas que hacen un `type: ALL` sobre 10.000 pacientes | `EXPLAIN` antes de dar por buena la fase; agregar índice solo con justificación |
| El filtro por operativo visible sin datos cargados | Ocultar el filtro si `operativos` está vacío (B-7 sin resolver) |
| Consultas pesadas bloqueando escrituras | Considerar `READ COMMITTED` para las lecturas del panel (`../03` §9.3) |

---

## 9. Cierre

- [x] Actualizar `../03-esquema-bd.md` §4.5 si se activó `operativos` con datos reales.
      *No aplica: `operativos` sigue vacía porque B-7 está abierta. La tabla y su
      `UNIQUE(nombre)` ya existen desde la migración inicial.*
- [x] Documentar el umbral y su justificación en `README.md` (sección de variables de entorno).
- [x] `ESTADO.md` §1: Fase 6 `COMPLETADA`; §4 con una fila de registro.
- [ ] Commit: `feat: dashboard de seguimiento con alerta de abandono`
- [ ] **Validación con la organización** de los indicadores y del umbral (obligatoria según `../04` §6).
      *Pendiente externo: la organización todavía tiene que confirmar que 90 días es
      el umbral correcto y que los tres indicadores responden lo que necesitan. No
      bloquea la fase, pero el umbral **no** está validado por quien decide.*
- [ ] Cerrar B-7 (`operativos`) — sigue abierta; el filtro queda oculto por el fallback de §2.
- [ ] PR contra `develop`. *En este repo se trabaja sobre `main` y se sincroniza
  `develop` al cerrar, no al revés: el flujo del playbook no se sigue.*

---

## 10. Reporte de cierre

**Estado:** COMPLETADA con dos pendientes externos anotados en §9
**Progreso:** 23/23 tareas · 23/23 verificaciones · 8/8 criterios de cierre

### Verificación ejecutada

| Comando | Resultado |
|---|---|
| `npm run lint` (backend) | 0 errores, 0 warnings |
| `npx tsc --noEmit` (backend) | limpio |
| `npm run build` (backend) | limpio |
| `npm run lint` (frontend) | 0 errores, 0 warnings |
| `npx tsc --noEmit` (frontend) | limpio |
| `npm run build` (frontend) | 11 rutas, sin errores |
| `npx prisma migrate status` | `Database schema is up to date!` |
| `SHOW INDEX FROM` (3 tablas) | `ix_hc_fecha`, `ix_hc_paciente_fecha`, `ix_hc_operativo`, `ix_hc_estado`, `ix_ev_fecha`, `ix_ev_hc_fecha` |
| Verificación funcional por HTTP | **38 OK · 0 FALLA** |
| Verificación en Chromium (escritorio + móvil) | **29 OK · 0 FALLA**, 0 errores de consola, 0 respuestas 4xx |
| Rendimiento a escala (10.038 pacientes · 20.065 evoluciones) | `resumen` peor 68 ms · `recientes` peor 83 ms · `sin-contacto` peor 196 ms |
| Límites RNF-04 / RNF-05 | `resumen` < 300 ms ✓ · `sin-contacto` < 500 ms ✓ |
| Umbral configurable | 30 → 16 pacientes (aparecen los de 45 días) · 90 → 12 (los de 45 desaparecen) |
| Caché del resumen | TTL=60: 0 consultas en 4 repeticiones · TTL=0: 3 por llamada |

### Criterios de cierre

- [x] El resumen refleja exactamente los datos del período seleccionado — **verificado contra la API con la misma sesión y el mismo rango**: UI `22 / 24 / 31` = API `22 / 24 / 31`.
- [x] El rango de fechas filtra de forma consistente en todos los widgets — un solo objeto de filtros alimenta los tres; cambiar el rango dispara consultas nuevas sin recargar la página.
- [x] El listado de sin contacto muestra los días correctamente — 200 días, 45 días y `null` ("sin contacto registrado") contra fechas conocidas.
- [x] Umbral configurable con default 90 — leído de la respuesta del backend, no del JS (verificado que no aparece en el bundle).
- [x] Ingresos recientes navegan al detalle — la fila lleva a `/pacientes/:id`.
- [x] Cada widget tiene carga, vacío y error — los tres estados viven dentro de cada widget.
- [x] Agregaciones cumplen RNF-04 a 10.000 pacientes — medido sobre 10.038.
- [x] `npm run lint` y `npm run build` limpios en ambos proyectos.

### Desviaciones del playbook

| # | Qué se hizo distinto | Por qué |
|---|---|---|
| 1 | **B-7 sin resolver**: el filtro por operativo queda oculto, como anticipa §2. | La organización todavía no définió la lista de puestos. `GET /api/catalogos/operativos` devuelve `[]` y la UI consulta la lista para decidir si mostrar el desplegable. Cuando B-7 se cierre, el filtro aparece sin tocar la página. |
| 2 | **Sin migración** (tarea 6.2.3 condicional). | `ix_hc_fecha` e `ix_ev_fecha` ya existían y el `EXPLAIN` no pidió nada más. Ver §10.1. |
| 3 | `sin-contacto` no acepta `desde`/`hasta`. | El umbral ya define la ventana. Con el default de 30 días de la pantalla, aplicar el rango vaciaría la lista de quien hace 100 días sin volver, que es justo lo que el panel existe para mostrar. Mandarlos además da `400` por `forbidNonWhitelisted`. |
| 4 | `pacientesActivos` significa **atendidos en el período**, no activos hoy. | Un paciente que no vuelve hace seis meses sigue `activo = true`: contarlo daría un número que no baja nunca y no respondería al filtro de fechas. |
| 5 | Se_uploadó el listado de sin contacto a 20 filas sin paginación visible. | El MVP no define paginación en este widget; el total siempre está en la cabecera para que el alcance sea explícito. Fase 7 lo revisa si hace falta. |
| 6 | La leyenda del gráfico es propia, no la de Recharts. | Recharts 3 invierte el orden del legend en barras verticales: mostraba "Evoluciones" arriba con "Ingresos" abajo, al revés que las barras. |
| 7 | Sin PR contra `develop`: se commitea en `main` y se sincroniza `develop`. | Flujo real del repositorio, ya usado en las cinco fases anteriores. |

### 10.1 Lo que revealed el `EXPLAIN` (y por qué no se agregó ningún índice)

Con el rango por defecto de 365 días, MySQL elige **barrido de tabla** (`type: ALL`)
sobre `historias_clinicas` y `evoluciones`, no el índice de fecha:

```text
resumen · ingresos por mes
  ALL    key=-   rows≈20178   possible=[ix_hc_paciente_fecha, ix_hc_fecha, ix_hc_estado]
```

Eso **no** es un índice faltante. El rango de 365 días cubre casi todas las filas de
una base con ~14 meses de datos, así que recorrer el índice obligaría a visitar casi
todo y además a resolver cada fila contra el PK: el barrido secuencial es más barato.
Exigir `key = ix_hc_fecha` ahí habría producido un falso negativo.

La prueba de que el índice sí sirve es un rango acotado:

```text
resumen · ingresos de 7 días
  range  key=ix_hc_fecha  rows≈357
resumen · evoluciones de 7 días
  range  key=ix_ev_fecha  rows≈355
```

En el rango angosto MySQL elige el índice y la estimación cae de ~20.000 a ~355 filas.
Los índices están bien compuestos; agregar uno más sólo habría cargado las
escrituras sin mejorar ninguna lectura. **No hay migración en esta fase.**

`ultimoContactoPorPaciente()` sí barre las 20.000 evoluciones siempre, porque
agrega `MAX(e.fecha)` sobre la historia completa: no hay fecha que acotar. Aun así
responde en 196 ms contra el límite de 500 ms, y el panel cachea el resumen aparte.
Un índice cubriente sobre `(anulada, historia_clinica_id, fecha)` lo bajaría, pero
sólo tiene sentido si el volumen crece otra década; queda anotado como pendiente.

### Requisitos cubiertos

RF-05 · RN-12 · RNF-04 · RNF-05

### Bugs reales encontrados durante la verificación

| Dónde | Qué pasaba | Cómo se detectó |
|---|---|---|
| `services/dashboard.ts` | El listado de ingresos armaba `?desde=…&hasta=…?limit=20` con **dos** `?`. El backend leía `?limit=20` como clave desconocida y devolvía `400`. | El `200` del resumen contrastaba con el `400` de `recientes` en la misma pantalla. |
| `types/dominio.ts` (frontend) | Los tipos de `IngresoReciente` asumían `pacienteApellido`/`medico: { apellido }`. El contrato real devuelve `apellido`/`nombre` sueltos y `medicoId`/`medicoNombre`. | La página crasheó con `Cannot read properties of undefined (reading 'apellido')`. Los tipos se habían escrito desde la tabla de §3.1 del playbook, no desde Swagger. |
| `dashboard.service.ts` (backend) | El rango invertido (`desde > hasta`) devolvía `200` con datos en vez de `400`. | Un rango invertido devolvía las mismas cifras que uno válido. |
| `dashboard.service.ts` (backend) | `IntersectionType` no hereda los getters `skip`/`take`: `data` salía vacío mientras `meta.total` era correcto. | La paginación del listado de pacientes, que ya se usaba en otros módulos. |
| `dashboard.service.ts` (backend) | La serie mensual generaba un mes espurio: un rango que terminaba el último día del mes agregaba el mes siguiente con ceros. | El gráfico mostraba `2026-10` con un rango que llegaba al `2026-09-30`. |
| `dashboard.service.ts` (backend) | `sin-contacto` devolvía una tercera clave y anidaba `data.data`. | `forbidNonWhitelisted` más la lectura del sobre completo. |

### Pendientes

- **Validación con la organización** de los indicadores y del umbral de 90 días. El
  número es defendible pero no está confirmado por quien decide, y es el criterio de
  `RN-12`: cambiarlo es cambiar una variable de ambiente.
- **B-7** (puestos de atención). Con el fallback en su lugar, no bloquea.
- Índice cubriente para `ultimoContactoPorPaciente()` si el volumen crece.
- Paginación visible en el listado de sin contacto, si con 20 filas deja de alcanzar.
