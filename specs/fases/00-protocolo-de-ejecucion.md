# 00 — Protocolo de Ejecución con Agente de IA

> Reglas que el agente debe respetar **antes de escribir la primera línea de código** de cualquier fase.
> Este documento es la base del `AGENTS.md` del proyecto (tarea 1.1.3 de la Fase 1).

---

## 1. Contexto del proyecto

**Qué es.** Sistema de registro de historias clínicas para una organización de médicos
voluntarios que atiende población en situación de calle. El formulario de admisión es el contrato
funcional nuclear: bloques A (cabecera), B (identificación), C (ingreso) y D (evolución).

**Por qué es sensible.** Se almacenan **datos personales sensibles de salud** (Ley 25.326, art. 2
inc. f). De ahí se derivan las prohibiciones: sin datos reales en el repositorio, sin borrado físico
de registros clínicos, sin endpoints públicos de datos clínicos, autoría siempre desde el token.

**Stack.** NestJS 12 + Prisma 5 + MySQL 8 (backend) · Next.js 16 App Router + Tailwind v4 +
TanStack Query (frontend) · Monorepo sin workspaces: `backend/` y `frontend/` con `node_modules`
propios y **sin código compartido** (el contrato REST es la frontera).

---

## 2. Flujo de trabajo por fase

```text
ESTADO.md  →  00-protocolo  →  fase-0N  →  rama  →  tareas en orden  →  verificación  →  reporte
```

| Paso | Acción | Salida esperada |
|---|---|---|
| 1 | Leer `ESTADO.md` | Saber si la fase anterior está cerrada |
| 2 | Leer este protocolo | Conocer las convenciones |
| 3 | Leer el archivo de la fase completo | Tener tareas, archivos y verificaciones |
| 4 | `git switch develop && git pull` → `git switch -c feat/fase-N-<slug>` | Rama de trabajo |
| 5 | Ejecutar las tareas **en orden**, una por una, tildando cada checkbox | Código funcionando en cada paso |
| 6 | Correr **todos** los comandos de "Verificación", tildando cada checkbox | Evidencia de que funciona |
| 7 | Tachar los criterios de cierre | Checklist completa |
| 8 | Actualizar `ESTADO.md` + commit + PR | Cierre trazable |

**Prohibido:** avanzar a la fase siguiente con la actual en `EN CURSO`, o dar por buena una tarea
sin su comando de verificación ejecutado.

### 2.1 Reglas de los checkboxes

- Todas las tareas, verificaciones y criterios de cierre son `- [ ]` marcables. El agente **tilda**
  cada casilla a medida que la ejecuta.
- **Nunca tildar por intención.** Una casilla se tilda cuando el comando corrió y su salida fue la
  esperada. Si el comando falla, la casilla queda sin tildar.
- Al terminar la fase, el encabezado del archivo debe mostrar el conteo real: `Progreso: 30/34 tareas`
  (las incompletas quedan sin tildar y se listan en el reporte).
- Una tarea que quedó a medias **no se tilda**: se anota como pendiente en el reporte de cierre.
- Los checkboxes viven en el repositorio: se commitean ticked para que el avance quede en el historial.

---

## 3. Convenciones obligatorias

### 3.1 Backend (NestJS)

| Tema | Regla |
|---|---|
| Módulos ESM | `"type": "module"` en `package.json` |
| Imports | Los imports relativos llevan **extensión `.js`** (obligatorio en ESM) |
| Build | Salida en `dist/main.js`, nunca `dist/src/main.js` |
| Generación | `nest g resource <nombre> --no-spec` / `nest g module <nombre>`; borrar el código muerto que generan |
| Capas | El `controller` **no** tiene lógica: valida y delega. El `service` es el **único** que usa Prisma |
| DTOs | `class-validator` en **todas** las propiedades + saneo con `@Transform` (trim) |
| Update DTOs | `PartialType(CreateXDto)` |
| Respuesta | Envoltorio `{ success, data, meta? }` y error `{ success, error: { code, message, path, timestamp } }` |
| Swagger | Todos los endpoints decorados con `@ApiTags`, `@ApiOperation`, `@ApiResponse` |
| Logger | `Logger` de NestJS. **Prohibido** `console.log` |
| SQL | Solo `$queryRaw` con tagged template. **Prohibido** concatenar strings |
| Migraciones | `npx prisma migrate dev --name <descripcion>`. **Prohibido** `migrate reset` con datos |
| Lint | Oxlint + Prettier. Cero errores y cero warnings |

### 3.2 Frontend (Next.js)

| Tema | Regla |
|---|---|
| Rutas | Carpetas en `kebab-case`, dinámicas con `[id]` |
| Layouts | Route groups `(auth)` (público) y `(app)` (protegido) |
| Fetch | **Solo** desde `app/services/`. Ningún componente hace `fetch` |
| Estados | Toda pantalla con datos tiene estado de **carga**, **vacío** y **error** |
| Formularios | `react-hook-form` + `zod`, mensajes **en español y accionables** |
| Patrón de grilla | **Toolbar Pattern**: acciones arriba, **prohibido** botones en las filas. Click selecciona, doble click edita |
| Estilos | Tailwind v4 + variables de tema en `globals.css`. Sin CSS modules |
| Componentes | Propios en `components/ui/`. Sin librería de componentes de terceros en el MVP |
| Navegación | Toda pantalla nueva se agrega a `NAV_SECTIONS` del sidebar |
| Errores | Se muestra el mensaje del backend **literalmente** |

### 3.3 Base de datos

- Tablas y columnas en `snake_case`; modelos Prisma en `PascalCase` con `@@map`, campos con `@map`.
- `created_at` / `updated_at` obligatorios en toda tabla de negocio.
- Toda FK con `onDelete` explícito: `Restrict` en datos clínicos, `SetNull` en referencias accesorias.
- Índices compuestos **en el orden de la consulta**: igualdad primero, ordenamiento después.
- Búsqueda de texto apoyada en el collation `utf8mb4_0900_ai_ci` (insensible a mayúsculas y acentos).
- Paginación con `skip`/`take` y `orderBy` **estable** (desempate por `id`).
- Nunca DDL desde el código de aplicación.

### 3.4 Git

- Ramas: `main` (estable, sin commits directos) · `develop` (integración) · `feat/…` · `fix/…` · `docs/…`.
- Commits Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `build:`, `perf:`, `style:`.
- Un PR describe **qué** cambia y **por qué**, y referencia los requisitos cubiertos (`RF-01`, `RN-02`, `CU-05`).
- Nunca se versiona código generado: `dist/`, `node_modules/`, `.next/`, `.env`, `.env.local`.

---

## 4. Prohibiciones absolutas

1. **Datos reales de pacientes** en el repositorio, en ejemplos, en capturas o en seeds.
2. **Contraseñas o secretos** hardcodeados, ni siquiera de ejemplo. El usuario `ADMIN` inicial lee su
   contraseña de una variable de entorno.
3. **Bypass de autenticación**: sin usuarios demo, sin `if (NODE_ENV === 'test')` que salte el guard.
4. **Borrado físico** de historias, evoluciones, pacientes o médicos: solo baja lógica (`activo`, `anulada`).
5. **Endpoints públicos** distintos de `POST /api/auth/login` y `GET /api/health`.
6. **Autoría tomada del cuerpo** de la petición. Siempre del token.
7. **Acoplamiento entre backend y frontend**: nada de paquete `shared/`, nada de tipos importados.
8. **Adivinanzas silenciosas**: si un requisito es ambiguo, preguntar; no elegir por default y seguir.
9. **Refactors fuera del alcance de la fase.** Si aparece algo improving, va a una fase posterior o a un issue.

---

## 5. Manejo de la incertidumbre

| Situación | Conducta del agente |
|---|---|
| El playbook contradice a un documento fuente | Gana el documento fuente. Corregir el playbook y anotarlo en el reporte |
| Falta una decisión de la organización (pregunta abierta de `01` §12) | Detenerse, listar lo bloqueado, preguntar. No inventar el dato |
| Una DI de `README.md` está *Pendiente* | Detenerse y pedir la decisión |
| El tooling no coincide con la versión documentada | Adaptar al tooling instalado, documentar la diferencia en el reporte |
| Una tarea falla | No continuar sobre una base rota. Revertir o dejar la fase en `EN CURSO` con el detalle |

---

## 6. Formato del reporte de cierre de fase

El agente cierra cada fase con este bloque (en el chat y en la descripción del PR):

```markdown
## Reporte de cierre — Fase N

**Estado:** COMPLETADA | PARCIAL | BLOQUEADA
**Rama:** feat/fase-N-<slug>
**Archivos creados:** <cantidad y rutas principales>
**Archivos modificados:** <rutas>

### Verificación ejecutada
| Comando | Resultado |
|---|---|
| `npm run lint` (backend) | ✅ 0 errores 0 warnings |
| `nest build` | ✅ dist/main.js |
| `GET /api/health` | ✅ 200 {"status":"ok","database":"up"} |
| ... | ... |

### Criterios de cierre
- [x] 7 de 7 verificados
- [ ] 2 pendientes: <qué falta y por qué>

### Desviaciones
- <qué se hizo distinto al playbook y por qué>

### Requisitos cubiertos
RF-01.1, RN-02, CU-01

### Decisiones pendientes
- <lo que requiere intervención humana>
```

Si algo queda pendiente, **no** se marca la fase como completada: se marca `PARCIAL` o `BLOQUEADA`
en `ESTADO.md`, y el trabajo pendiente queda anotado en el archivo de la fase.

---

## 7. Verificación: qué es aceptable como evidencia

| Tipo | Aceptable | No aceptable |
|---|---|---|
| Comando | Salida real en la terminal | "Debería compilar" |
| Endpoint | `curl` con código y cuerpo de respuesta | "El endpoint está creado" |
| Base de datos | Salida de `prisma studio`, `mysql` o `EXPLAIN` | "La migración corrió" |
| UI | Descripción de lo que se ve tras la acción | "La pantalla funciona" |
| Lint | `0 errors and 0 warnings` | "El lint pasó" |

> **La verificación manual de los criterios de cierre es obligatoria en todas las fases**, aunque
> exista verificación automática (ver `../04-plan-de-fases.md` §6).
