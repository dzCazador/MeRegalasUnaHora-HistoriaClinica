# Fase 7 — Impresión, Exportación, Auditoría y Cierre del MVP

| | |
|---|---|
| **Estado** | `PENDIENTE` |
| **Depende de** | Fases 5, 6 |
| **Bloquea a** | — (cierra el MVP) |
| **Estimación** | 4 – 6 días |
| **Rama sugerida** | `feat/fase-7-impresion-exportacion-auditoria` |
| **Documentos fuente** | `../01-requerimientos-y-negocio.md` §3.6, §3.7, §4 (RN-05, RN-06), §8 (RNF-12, RNF-13, RNF-18, RNF-07, RNF-09), §9 (RN-13) · `../02-arquitectura-tech.md` §14, §15 · `../03-esquema-bd.md` §4.6, §12 |
| **Requisitos cubiertos** | RF-06, RF-07.2, RF-07.3 · RN-05, RN-06, RN-13 · RNF-12, RNF-13, RNF-18, RNF-07, RNF-09 |
| **Progreso** | **0 / 28 tareas · 0 / 38 verificaciones · 0 / 9 criterios de cierre** · 5 condiciones de entrada |

---

## 1. Objetivo

Completar el MVP con lo que hace que el sistema sea **utilizable en el mundo real**: el expediente
imprimible, la exportación de listados, el registro de auditoría y la preparación del despliegue.

**Al terminar:** la historia clínica se imprime respetando los 4 bloques del formulario, el listado
se exporta a Excel respetando los filtros de pantalla, toda escritura y toda lectura de una historia
quedan auditadas, y el respaldo de la base está **probado**, no solo documentado.

---

## 2. Condiciones de entrada (gate)

- [ ] Fases 1 a 6 `COMPLETADAS` con sus criterios de cierre verificados.
- [ ] Fases 1 a 6 con todos los checkboxes tildados y `ESTADO.md` al día.
- [ ] **B-1** pregunta 6 (`../01` §12) resuelta: plazo legal de conservación de las historias.
      Si sigue abierta: documentar la política propuesta y marcarla como pendiente de aprobación legal.
- [ ] Entorno de **staging** disponible para la validación con la organización.
- [ ] Un servidor o un contenedor donde probar la **restauración** del respaldo (RNF-18).

---

## 3. Contexto técnico

### 3.1 Impresión (RF-06.1, RF-06.2, RN-13)

La maqueta reproduce el formulario físico con sus cuatro bloques:

```text
┌──────────────────────────────────────────────────────┐
│ HISTORIA CLÍNICA — ¿ME REGALÁS UNA HORA?   HC-000123 │
├──────────────────────────────────────────────────────┤
│ A · Fecha del ingreso: 12/03/2026                    │
├──────────────────────────────────────────────────────┤
│ B · APELLIDO          PÉREZ                          │
│     NOMBRE            José                           │
│     DOCUMENTO         (sin documento)                │
│     EDAD              45   · SEXO  M                 │
│     ESTADO CIVIL      Soltero/a                      │
│     FECHA NAC.        15/08/1980                     │
│     NACIONALIDAD      Argentina                      │
│     DOMICILIO         (sin domicilio fijo)           │
│     TELÉFONO          —                              │
├──────────────────────────────────────────────────────┤
│ C · REPRESENTANTE     (sin representante)             │
│     MOTIVO            Control de presión arterial     │
├──────────────────────────────────────────────────────┤
│ D · EVOLUCIONES                                      │
│     12/03/2026  Dr. Pérez, María                    │
│       Paciente refiere cefalea...                    │
│     19/03/2026  Dr. Gómez, Juan                      │
│       Continúa tratamiento...                        │
├──────────────────────────────────────────────────────┤
│ Médico autor: Dr. Pérez, María · Emitida 12/03/2026  │
└──────────────────────────────────────────────────────┘
```

Reglas:

- La **edad** que se imprime es `edadRegistrada` de esa historia, no la edad actual del paciente (RN-02).
- Los campos ausentes se imprimen explícitamente como *"(sin dato)"* o *"(sin documento)"*.
  **Nunca** en blanco: un espacio vacío en un expediente es ambiguo (RN-10).
- Cada evolución muestra fecha clínica, autor y hora de registro.
- Impresión con `@media print`: sin sidebar, sin toolbar, sin colores de fondo, A4, márgenes de
  15 mm y saltos de página controlados.

### 3.2 Exportación (RF-06.3)

- **Excel** (`xlsx`) del listado de pacientes **con los filtros aplicados en pantalla**: mismas
  filas, mismas columnas, mismo rango de fechas.
- **CSV** como alternativa, con `;` como separador y BOM UTF-8 para que Excel no rompa los acentos.
- La exportación se genera **en el cliente** con los datos ya paginados, o con un endpoint dedicado
  que devuelva el rango completo filtrado. Si se agrega el endpoint, va autenticado y sin un límite
  de filas que habilite abuso.

### 3.3 Auditoría (RNF-12, RNF-13)

Tabla `auditoria` (append-only, solo admite `INSERT`):

| Columna | Tipo | Origen |
|---|---|---|
| `usuarioId` | `BigInt?` | Del token |
| `entidad` | `VARCHAR(40)` | `pacientes`, `historias_clinicas`, `evoluciones`, `medicos_voluntarios` |
| `registroId` | `BigInt?` | PK del registro afectado |
| `accion` | `ENUM` | `CREATE`, `UPDATE`, `DELETE`, `ANULAR`, `REABRIR`, `LECTURA` |
| `campoAnterior` | `JSON?` | Valor previo |
| `campoNuevo` | `JSON?` | Valor nuevo |
| `ip` | `VARCHAR(45)?` | Soporta IPv6. Del request |
| `userAgent` | `VARCHAR(255)?` | Del header `user-agent` |
| `createdAt` | `DATETIME(3)` | Momento exacto |

Índices: `ix_auditoria_entidad` (`entidad`, `registroId`) · `ix_auditoria_fecha` · `ix_auditoria_usuario`.

**Acciones a auditar:**

| Acción | Dónde |
|---|---|
| `CREATE` | Alta de paciente, de ingreso, de evolución, de médico y de representante |
| `UPDATE` | Edición del Bloque B, cierre y reapertura de historia |
| `ANULAR` | Anulación de una evolución (RF-07.2) |
| `LECTURA` | **Apertura del detalle de una historia clínica** (RNF-13) |

> La auditoría **no** loguea el cuerpo completo del request: alcanza con `campoAnterior` y
> `campoNuevo`. Si el texto es extenso (motivo, detalle), truncar a 500 caracteres. El
> `password_hash` de un médico **jamás** se audita.

### 3.4 Respaldo y restauración (RNF-18)

| Aspecto | Definición |
|---|---|
| Frecuencia | Dump completo **diario** + binarios incrementales semanales |
| Retención | 30 días los diarios · 12 meses los mensuales |
| Cifrado | Sí, en reposo y **fuera** del servidor de aplicación |
| Verificación | **Restauración probada**, no solo el dump generado |

```text
deploy/
├── backup.sh              # dump + rotación + verificación de tamaño no cero
├── restore.sh             # restauración con verificación de conteos de filas
├── verificar-backup.sh    # restaura en una base temporal y compara conteos
└── README.md              # procedimiento escrito, con responsable y frecuencia
```

> **Una copia de seguridad no verificada es una hipótesis, no un plan de recuperación.** La
> verificación es un criterio de cierre, no una tarea opcional.

### 3.5 Endurecimiento de producción (RNF-07, RNF-09)

- `NODE_ENV=production` → cookie `Secure`, CORS con la lista blanca real, Swagger protegido o
  deshabilitado, y `trust proxy` para que la IP registrada sea la del cliente real.
- HTTPS obligatorio con Nginx como proxy inverso y terminación TLS.
- PM2 como gestor de procesos: `pm2 start dist/main.js`, con reinicio automático.
- El usuario de MySQL en producción **no** tiene `DROP`, `ALTER` ni `CREATE` en runtime.

---

## 4. Tareas

### 4.1 Impresión

- [ ] **7.1.1** Ruta de impresión `/pacientes/[id]/historias/[historiaId]/imprimir`, con estilos
      `@media print` y sin elementos de navegación.
      *Archivo: `frontend/app/(app)/pacientes/[id]/historias/[historiaId]/imprimir/page.tsx`*
- [ ] **7.1.2** Componente `HistoriaImprimible` con los 4 bloques de §3.1, en A4, y los datos
      ausentes explícitos (*"(sin documento)"*, *"(sin dato)"*).
      *Archivo: `frontend/app/components/pacientes/HistoriaImprimible.tsx`*
- [ ] **7.1.3** Mostrar la `edadRegistrada` de la historia, no la edad actual del paciente (RN-02).
      *Archivo: `frontend/app/components/pacientes/HistoriaImprimible.tsx`*
- [ ] **7.1.4** PDF con `jspdf` + `jspdf-autotable`: número de historia, cabecera y **todas** las
      evoluciones en orden cronológico (RF-06.2). Nunca datos de otros pacientes.
      *Archivo: `frontend/app/lib/pdf/historia-pdf.ts`*
- [ ] **7.1.5** Botón *Imprimir* en el detalle de la historia con **Imprimir** (navegador) y
      **Descargar PDF**. Habilitar el botón que en la Fase 5 estaba deshabilitado.
      *Archivo: `frontend/app/(app)/pacientes/[id]/historias/[historiaId]/page.tsx`*

### 4.2 Exportación

- [ ] **7.2.1** Habilitar el botón `Exportar` de la toolbar con exportación a **Excel** (`xlsx`).
      *Archivo: `frontend/app/(app)/pacientes/page.tsx`*
- [ ] **7.2.2** La exportación **respeta los filtros y la búsqueda aplicados en pantalla**
      (RF-06.3). Verificar con un filtro activo.
      *Archivo: `frontend/app/lib/export/exportar-pacientes.ts`*
- [ ] **7.2.3** Exportación a **CSV** con `;` y BOM UTF-8 para que los acentos se vean bien en Excel.
      *Archivo: `frontend/app/lib/export/exportar-pacientes.ts`*
- [ ] **7.2.4** Nombre de archivo con fecha y filtro: `pacientes_2026-03-12.xlsx`.
      *Archivo: `frontend/app/lib/export/exportar-pacientes.ts`*

### 4.3 Auditoría — backend

- [ ] **7.3.1** Migración con la tabla `auditoria` y sus 3 índices:
      `npx prisma migrate dev --name add_auditoria`.
      *Archivo: `backend/prisma/migrations/*_add_auditoria/migration.sql`*
- [ ] **7.3.2** `AuditService.record()`: recibe `{ usuarioId, entidad, registroId, accion,
      campoAnterior, campoNuevo, ip, userAgent }`. En escrituras el error se propaga; en lecturas
      un fallo de auditoría **no** debe bloquear la lectura.
      *Archivo: `backend/src/common/services/audit.service.ts`*
- [ ] **7.3.3** Registrar escrituras: alta de paciente, de ingreso y de evolución, edición del
      Bloque B, cierre y reapertura de historia, alta y baja de médicos.
      *Archivos: `backend/src/pacientes/`, `backend/src/historias-clinicas/`, `backend/src/medicos-voluntarios/`*
- [ ] **7.3.4** Registrar **lecturas** de historias clínicas (RNF-13) en `GET /api/historias-clinicas/:id`.
      *Archivo: `backend/src/historias-clinicas/historias-clinicas.service.ts`*
- [ ] **7.3.5** Capturar `ip` y `userAgent` del request con un interceptor o con `@Req()` en el
      punto de llamada.
      *Archivo: `backend/src/common/interceptors/`*
- [ ] **7.3.6** Truncar a 500 caracteres los textos largos guardados en `campoAnterior`/`campoNuevo`,
      y **nunca** auditar el `password_hash` de un médico.
      *Archivo: `backend/src/common/services/audit.service.ts`*
- [ ] **7.3.7** Anulación de una evolución:
      `PATCH /api/historias-clinicas/:historiaId/evoluciones/:id/anular` con `motivoAnulacion`
      obligatorio. **Nunca** borra la fila (RF-07.2, RN-05).
      *Archivo: `backend/src/historias-clinicas/`*
- [ ] **7.3.8** `GET /api/auditoria` con filtros por entidad, usuario, acción y rango de fechas,
      restringido a `COORDINADOR` y `ADMIN`.
      *Archivo: `backend/src/auditoria/auditoria.controller.ts`*
- [ ] **7.3.9** Swagger en el endpoint de auditoría y en el de anulación.

### 4.4 Auditoría — frontend

- [ ] **7.4.1** `/auditoria` con Toolbar Pattern: listado paginado, filtros y detalle del registro
      con el antes y el después.
      *Archivo: `frontend/app/(app)/auditoria/page.tsx`*
- [ ] **7.4.2** Visible solo para `COORDINADOR` y `ADMIN`. Para un `MEDICO`, mensaje sin permisos.
      *Archivo: `frontend/app/(app)/auditoria/page.tsx`*
- [ ] **7.4.3** Acción de anulación de evolución con `ConfirmDialog` y motivo obligatorio.
      *Archivo: `frontend/app/components/pacientes/`*
- [ ] **7.4.4** Agregar `/auditoria` a `NAV_SECTIONS`.
      *Archivo: `frontend/app/sidebar.tsx`*

### 4.5 Respaldo, despliegue y cierre

- [ ] **7.5.1** `deploy/backup.sh` con dump comprimido, rotación por fecha y verificación de que el
      archivo **no está vacío**.
      *Archivo: `deploy/backup.sh`*
- [ ] **7.5.2** `deploy/restore.sh` y `deploy/verificar-backup.sh` que restauran en una base
      **temporal** y comparan conteos de filas.
      *Archivos: `deploy/restore.sh`, `deploy/verificar-backup.sh`*
- [ ] **7.5.3** `deploy/README.md` con el procedimiento escrito, el responsable, la frecuencia y la
      **fecha de la última verificación probada**.
      *Archivo: `deploy/README.md`*
- [ ] **7.5.4** Endurecer producción: `Secure` en cookie, CORS real, Swagger protegido, PM2 y
      Nginx con TLS.
      *Archivos: `backend/src/main.ts`, `deploy/`*
- [ ] **7.5.5** Desplegar en **staging**, aplicar las migraciones con `prisma migrate deploy` y
      ejecutar el guion de verificación con la organización.
      *Archivos: `deploy/`*
- [ ] **7.5.6** Actualizar `README.md` con el procedimiento de despliegue y de recuperación.

---

## 5. Verificación

### 5.1 Impresión

- [ ] `Ctrl+P` sobre la vista de impresión produce un PDF con **los 4 bloques**, sin sidebar ni toolbar.
- [ ] La hoja impresa es legible: fuente suficiente y ningún texto cortado.
- [ ] El PDF incluye el **N° de historia** y **todas** las evoluciones en orden cronológico.
- [ ] El PDF de una historia **no** contiene datos de otros pacientes.
- [ ] Los campos ausentes aparecen como *"(sin documento)"* / *"(sin dato)"*, nunca en blanco.
- [ ] La edad impresa es la **congelada** de ese ingreso (RN-02): comparar con un paciente cuya
      edad actual difiere.
- [ ] Imprimir una historia con 30 evoluciones salta de página correctamente y no parte un bloque.

### 5.2 Exportación

- [ ] `Exportar` **sin filtros** produce un archivo con el listado completo.
- [ ] `Exportar` **con** un filtro de fechas activo produce un archivo que solo contiene ese rango.
- [ ] `Exportar` **con** una búsqueda de texto activa solo exporta esos resultados.
- [ ] El `.csv` se abre en Excel **sin romper los acentos** (BOM UTF-8 + separador `;`).
- [ ] El `.xlsx` abre con las columnas en el mismo orden que la grilla y los tipos correctos.
- [ ] El nombre del archivo incluye la fecha y la cantidad de filas exportadas en el log de la UI.

### 5.3 Auditoría — escritura

- [ ] Crear un paciente → 1 registro `CREATE` con el `usuarioId` del token.
- [ ] Crear una evolución → 1 registro `CREATE` con `entidad = 'evoluciones'`.
- [ ] Editar el Bloque B → 1 registro `UPDATE` con `campoAnterior` y `campoNuevo` distintos.
- [ ] Cerrar y reabrir una historia → 1 registro por cada acción, con el estado.
- [ ] Anular una evolución → 1 registro `ANULAR`, y la fila **sigue existiendo**.
- [ ] `campoAnterior` con un `detalle` de 5000 caracteres queda **truncado** a 500.
- [ ] `ip` se completa con la dirección del cliente (verificar `trust proxy` en staging) y
      `userAgent` no está vacío.
- [ ] **Ningún** dato de autenticación (`password_hash`, token) aparece en la tabla `auditoria`.

### 5.4 Auditoría — lectura y consulta

- [ ] Abrir el detalle de una historia clínica genera **1 registro `LECTURA`** por apertura.
- [ ] Listar pacientes **no** genera registros de lectura.
- [ ] Anular una evolución **no borra** el `CREATE` original: el rastro queda completo.
- [ ] `GET /api/auditoria` filtra por entidad, usuario, acción y rango de fechas.
- [ ] `GET /api/auditoria` con rol `MEDICO` → `403`. Con `COORDINADOR` y con `ADMIN` → `200`.
- [ ] `/auditoria` en la UI: un `MEDICO` ve el mensaje sin permisos, no un error 500.
- [ ] La tabla `auditoria` **no tiene** endpoint de `DELETE` ni de `UPDATE`.

### 5.5 Respaldo y despliegue

- [ ] `deploy/backup.sh` genera un `.sql.gz` **no vacío** con la fecha en el nombre.
- [ ] La rotación conserva los últimos 30 diarios y borra los más viejos.
- [ ] `deploy/verificar-backup.sh` restaura en una base temporal y los conteos de filas coinciden.
- [ ] `deploy/restore.sh` se **ejecutó de extremo a extremo** al menos una vez, con la fecha anotada
      en `deploy/README.md`.
- [ ] El respaldo queda **fuera** del servidor de aplicación y cifrado en reposo.
- [ ] En staging la cookie de sesión se emite con `Secure` y `HttpOnly`.
- [ ] `GET /api/health` en producción **no** expone la versión ni la cadena de conexión.
- [ ] El stack trace de un `500` **no** aparece en la respuesta al cliente.
- [ ] `npm run lint` y `npm run build` limpios en backend y frontend.
- [ ] `npx prisma migrate status` al día en staging, sin ejecutar `migrate reset`.

---

## 6. Criterios de cierre

- [ ] La historia clínica impresa es legible y respeta los cuatro bloques del formulario.
- [ ] El PDF incluye el N° de historia y todas las evoluciones en orden cronológico.
- [ ] La exportación a Excel respeta los filtros aplicados en pantalla.
- [ ] Toda escritura queda registrada en `auditoria` con autor, timestamp, IP y user agent.
- [ ] El acceso de lectura a una historia clínica queda registrado.
- [ ] Una evolución anulada conserva el registro original y su motivo.
- [ ] El respaldo y la restauración se ejecutan y se verifican de extremo a extremo.
- [ ] El despliegue en staging funciona con HTTPS y cookies `Secure`.
- [ ] `npm run lint` y `npm run build` limpios.

---

## 7. Fuera de alcance

- **Firma digital o electrónica** de la evolución (B-1 pregunta 7): requiere un compromiso legal
  que este proyecto no puede asumir por su cuenta.
- **Retención y purga automática** de historias según el plazo legal (B-1 pregunta 6): pendiente
  de la respuesta de legal.
- **Cifrado TLS entre el backend y MySQL** cuando la base no está en el mismo host: depende de la
  topología del despliegue.
- **Sellos de tiempo** sobre los registros de auditoría: fuera del MVP.
- **Exportación a FHIR u otros formatos de intercambio**: Fase 13.
- **Métricas de uso** (pacientes por operativo, motivo de consulta más frecuente): Fase 11.

---

## 8. Errores frecuentes

| Trampa | Cómo evitarla |
|---|---|
| El PDF corta un bloque al cambiar de página | Configurar `didDrawPage` en `autoTable` y el alto máximo de fila |
| El Excel abre el CSV con acentos rotos | Guardar con BOM UTF-8 y separador `;` |
| La auditoría registra el `password_hash` | Lista blanca explícita de campos auditables por entidad |
| La auditoría hace lento el alta | Insertar el registro de auditoría en la **misma transacción** del cambio |
| El `500` filtra el stack al cliente | El filtro de excepciones de la Fase 2 lo reemplaza por un mensaje genérico |
| `ip` registra siempre la del proxy | `app.set('trust proxy', 1)` en staging y producción |
| El respaldo genera un archivo vacío y "funciona" | Verificar tamaño no cero y conteo de filas en la verificación |
| Restaurar sobre la base de producción por error | `restore.sh` exige un flag explícito y una base destino distinta |
| Un `MEDICO` ve la pantalla de auditoría | El guard de roles responde `403` y la UI muestra el mensaje sin permisos |

---

## 9. Cierre

- [ ] Commit: `feat: impresion, exportacion, auditoria y despliegue del MVP`
- [ ] PR contra `develop` con *qué* cambia, *por qué* y requisitos cubiertos (RF-06, RF-07, RNF-12, RNF-18).
- [ ] **Validación con la organización** en staging (obligatoria según `../04` §6).
- [ ] `ESTADO.md` §1: Fase 7 `COMPLETADA`, **MVP completo**; §5 con las métricas finales.
- [ ] Documentar en `specs/` la política de retención propuesta, a la espera de aprobación legal.
