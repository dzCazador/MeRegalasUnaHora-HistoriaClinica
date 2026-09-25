# Fase 6 — Dashboard de Seguimiento y Alerta de Abandono

| | |
|---|---|
| **Estado** | `PENDIENTE` |
| **Depende de** | Fases 3, 4 (y 5 para navegar al detalle) |
| **Bloquea a** | Fase 7 |
| **Estimación** | 4 – 6 días |
| **Rama sugerida** | `feat/fase-6-dashboard` |
| **Documentos fuente** | `../01-requerimientos-y-negocio.md` §3.5, §9 (RN-12), §8 (RNF-04, RNF-05) · `../02-arquitectura-tech.md` §2.2, §7.4 · `../03-esquema-bd.md` §3.2, §4.5, §7.3, §9.3 |
| **Requisitos cubiertos** | RF-05 · RN-12 · RNF-04, RNF-05 |
| **Progreso** | **0 / 23 tareas · 0 / 23 verificaciones · 0 / 8 criterios de cierre** · 4 condiciones de entrada |

---

## 1. Objetivo

Un panel que permita ver, de un vistazo, la actividad del período y **detectar los pacientes que
han dejado de volver**: el objetivo principal del programa es la continuidad, no la cantidad de
registros cargados.

**Al terminar:** `/dashboard` muestra los indicadores del período, los ingresos recientes y la lista
de pacientes sin contacto con los días transcurridos desde su última evolución.

---

## 2. Condiciones de entrada (gate)

- [ ] Fases 3 y 4 `COMPLETADAS`; Fase 5 cerrada o, como mínimo, las rutas de detalle accesibles.
- [ ] Existe al menos un mes de datos de prueba para validar la agregación.
- [ ] **B-7** resuelta: la lista de puestos de atención para `operativos`. Si no hay respuesta, el
  filtro por operativo queda **oculto** en la UI y se implementa solo el resto del panel.
- [ ] El umbral de "sin contacto" es **configurable** y su default está definido (propuesta: 90 días).

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

- [ ] **6.1.1** `nest g module dashboard` y registrarlo en `app.module.ts`.
      *Archivos: `backend/src/dashboard/`*
- [ ] **6.1.2** `QueryDashboardDto` con `desde`, `hasta`, `operativoId?`, `nacionalidadId?`,
      `sexo?`, `page`, `limit`; validado con `@IsDateString()` y un validador que exija
      `desde <= hasta`.
      *Archivo: `backend/src/dashboard/dto/query-dashboard.dto.ts`*
- [ ] **6.1.3** `GET /api/dashboard/resumen`: totales de pacientes activos, ingresos y evoluciones
      del período, más la serie mensual de ingresos y evoluciones para el gráfico.
      *Archivo: `backend/src/dashboard/dashboard.service.ts`*
- [ ] **6.1.4** `GET /api/dashboard/recientes`: últimos ingresos con paciente, fecha, motivo y
      médico autor, paginado con `meta`.
      *Archivo: `backend/src/dashboard/dashboard.service.ts`*
- [ ] **6.1.5** `GET /api/dashboard/sin-contacto`: cálculo de §3.2 con el umbral de
      `DASHBOARD_SIN_CONTACTO_DIAS`, días transcurridos y orden descendente.
      *Archivo: `backend/src/dashboard/dashboard.service.ts`*
- [ ] **6.1.6** Traducir los errores de Prisma a excepciones HTTP con el filtro de la Fase 2.
      *Archivo: `backend/src/dashboard/`*
- [ ] **6.1.7** Swagger en los tres endpoints con los parámetros de filtro documentados.
      *Archivo: `backend/src/dashboard/dashboard.controller.ts`*

### 4.2 Extensión de base de datos

- [ ] **6.2.1** Confirmar que `operativos` está creada, sembrada y con su `UNIQUE(nombre)` (DI-04).
- [ ] **6.2.2** Endpoint de soporte `GET /api/catalogos/operativos` para el filtro por puesto.
      *Archivo: `backend/src/catalogos/catalogos.controller.ts`*
- [ ] **6.2.3** Migración, solo si el `EXPLAIN` lo pide: índice adicional en `historias_clinicas`
      o `evoluciones`. Con nombre de índice explícito y comentario justificando la consulta que
      optimiza.
      *Archivo: `backend/prisma/migrations/`*
- [ ] **6.2.4** Verificar los índices `ix_hc_fecha`, `ix_ev_fecha`, `ix_hc_operativo`.
      *Comando: `SHOW INDEX FROM historias_clinicas`*

### 4.3 Frontend — servicios y hooks

- [ ] **6.3.1** `services/dashboard.ts` con `resumen`, `recientes`, `sinContacto`, y extender
      `services/catalogos.ts` con `operativos`.
      *Archivo: `frontend/app/services/dashboard.ts`*
- [ ] **6.3.2** `hooks/useDashboard.ts` con las tres queries, estados de carga y error, y el
      `rango de fechas` como parámetro de la clave de caché.
      *Archivo: `frontend/app/hooks/useDashboard.ts`*

### 4.4 Frontend — `/dashboard`

- [ ] **6.4.1** Reemplazar el placeholder por la pantalla real, con la Toolbar Pattern (selector de
      rango + `Refrescar`).
      *Archivo: `frontend/app/(app)/dashboard/page.tsx`*
- [ ] **6.4.2** Selector de rango de fechas con valores rápidos: **hoy**, **7 días**, **30 días**,
      **mes actual**, **personalizado**.
      *Archivo: `frontend/app/(app)/dashboard/page.tsx`*
- [ ] **6.4.3** Tarjetas de indicadores: pacientes activos, ingresos del período, evoluciones del
      período. Cada una con su `Skeleton` de carga y su estado vacío.
      *Archivo: `frontend/app/components/dashboard/KpiCard.tsx`*
- [ ] **6.4.4** Gráfico de ingresos y evoluciones por mes con **Recharts** (ya en el stack).
      *Archivo: `frontend/app/components/dashboard/GraficoMensual.tsx`*
- [ ] **6.4.5** Listado de ingresos recientes: paciente, fecha, motivo, médico autor. Cada fila
      **navega** al detalle del paciente o de la historia.
      *Archivo: `frontend/app/components/dashboard/IngresosRecientes.tsx`*
- [ ] **6.4.6** Listado de **pacientes sin contacto** con días transcurridos, ordenados por
      criticidad (RN-12).
      *Archivo: `frontend/app/components/dashboard/SinContacto.tsx`*
- [ ] **6.4.7** Resaltado visual de los casos que superan el umbral, con un texto explícito del
      criterio usado ("sin contacto hace más de 90 días").
      *Archivo: `frontend/app/components/dashboard/SinContacto.tsx`*
- [ ] **6.4.8** Cada widget con sus **tres estados**: carga, vacío y error.
      *Archivo: `frontend/app/(app)/dashboard/page.tsx`*
- [ ] **6.4.9** Filtros por nationality y por operativo (este último solo si B-7 está resuelto).
      *Archivo: `frontend/app/(app)/dashboard/page.tsx`*
- [ ] **6.4.10** `/dashboard` agregado a `NAV_SECTIONS` con su ícono y su estado activo.
      *Archivo: `frontend/app/sidebar.tsx`*

---

## 5. Verificación

### 5.1 Backend

- [ ] `GET /api/dashboard/resumen?desde=2026-01-01&hasta=2026-01-31` → los totales coinciden
      **exactamente** con `SELECT COUNT(*)` sobre el mismo rango en `npx prisma studio`.
- [ ] Cambiar el rango de fechas cambia los resultados de forma consistente en los tres endpoints.
- [ ] `GET /api/dashboard/sin-contacto` sin un filtro de fechas devuelve solo los que superan el
      umbral (el rango no debe recortar este cálculo: el umbral ya define la ventana).
- [ ] Un paciente con evolución de ayer **no** aparece en `sin-contacto`.
- [ ] Un paciente cuya única evolución está en una historia `ANULADA` **sí** aparece.
- [ ] Un paciente sin ninguna evolución aparece con `diasSinContacto: null` y el texto
      *"sin contacto registrado"*.
- [ ] `DASHBOARD_SIN_CONTACTO_DIAS=30` en el `.env` cambia el resultado: los pacientes con 45 días sin contacto
      pasan a aparecer. **Restaurar el valor a 90** después.
- [ ] `desde > hasta` → `400` con mensaje claro.
- [ ] `desde` con formato inválido (`01/01/2026`) → `400`.
- [ ] Sin token → `401`.
- [ ] `npx prisma migrate status` al día y `npm run lint` limpio.

### 5.2 Rendimiento

- [ ] Con 10.000 pacientes y 20.000 evoluciones, `resumen` responde en **< 300 ms**.
- [ ] `sin-contacto` responde en **< 500 ms** con el mismo volumen.
- [ ] `EXPLAIN` de las consultas de agregación **usa los índices** (`ix_ev_fecha`, `ix_hc_fecha`) y
      no un `type: ALL` sobre la tabla completa.
- [ ] El rango de fechas por defecto está acotado: una consulta sin fechas no agregue la base entera.

### 5.3 Frontend

- [ ] El resumen refleja exactamente los datos del período seleccionado.
- [ ] El selector rápido (hoy / 7 días / 30 días / mes actual) cambia los indicadores sin recargar
      la página.
- [ ] El listado de sin contacto muestra los días transcurridos **correctamente** (verificar contra
      una fecha conocida).
- [ ] Los casos que superan el umbral están resaltados y el criterio es visible.
- [ ] Cada fila del listado de ingresos recientes navega al detalle correspondiente.
- [ ] Cada widget tiene estado de carga, estado vacío y estado de error.
- [ ] `npm run lint` y `npm run build` limpios en frontend y backend.
- [ ] El gráfico se renderiza en un teléfono sin desbordar el ancho.

---

## 6. Criterios de cierre

- [ ] El resumen refleja exactamente los datos del período seleccionado.
- [ ] El rango de fechas filtra de forma consistente en todos los widgets.
- [ ] El listado de pacientes sin contacto muestra los días transcurridos correctamente.
- [ ] El umbral de alerta es configurable y su valor por defecto es 90 días.
- [ ] El listado de ingresos recientes navega al detalle correspondiente.
- [ ] Cada widget tiene estado de carga, estado vacío y estado de error.
- [ ] Las consultas de agregación cumplen los tiempos de RNF-04 a escala de 10.000 pacientes.
- [ ] `npm run lint` y `npm run build` limpios.

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

- [ ] Actualizar `../03-esquema-bd.md` §4.5 si se activó `operativos` con datos reales.
- [ ] Documentar el umbral y su justificación en `README.md` (sección de variables de entorno).
- [ ] Commit: `feat: dashboard de seguimiento con alerta de abandono`
- [ ] PR contra `develop` con *qué* cambia, *por qué* y requisitos cubiertos (RF-05, RN-12, RNF-04).
- [ ] **Validación con la organización** de los indicadores y del umbral (obligatoria según `../04` §6).
- [ ] `ESTADO.md` §1: Fase 6 `COMPLETADA`; §3 cerrar B-7; §4 con una fila de registro.
