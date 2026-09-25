# MeRegalasUnaHora — Historia Clínica

Sistema de registro de **historias clínicas** para una organización de médicos voluntarios que
atiende población en situación de calle. Implementa el formulario de admisión
*"¿Me regalás una hora?"* y el seguimiento de la continuidad de atención.

> **Datos personales sensibles.** Este sistema almacena datos de salud (Ley 25.326, art. 2 inc. f).
> Ningún dato real de pacientes puede entrar al repositorio, a los ejemplos, a las capturas ni al
> seed. Ver [Seguridad](#seguridad-y-datos-sensibles).

---

## Estado del proyecto

| | |
|---|---|
| **Fase actual** | 1 — Setup inicial *(specs pendientes de aprobación)* |
| **Progreso MVP** | 0 / 7 fases |
| **Stack congelado** | Sí (`specs/02-arquitectura-tech.md`) |
| **Base de datos** | MySQL 8 · `utf8mb4` · `utf8mb4_0900_ai_ci` |

Estado actualizado: [`specs/fases/ESTADO.md`](./specs/fases/ESTADO.md)

---

## Qué hace el sistema

El flujo central es el **registro de un ingreso**: una persona es atendida, se le asigna un número
de historia y se registra el motivo de la consulta junto con, al menos, una anotación de evolución.

| Bloque del formulario | Contenido | Dónde se persiste |
|---|---|---|
| **A** | Número de Historia (automático) · Fecha | `pacientes.numero_historia` · `historias_clinicas.fecha` |
| **B** | Apellido, nombre, documento, edad, sexo, estado civil, fecha de nacimiento, nacionalidad, domicilio, teléfono | `pacientes` |
| **C** | Representante · Motivo de la consulta | `historias_clinicas.representante_id` · `.motivo_consulta` |
| **D** | Evolución inicial: fecha y detalle (**obligatoria**) | `evoluciones` |

Además: búsqueda insensible a acentos, historial cronológico de ingresos, dashboard de seguimiento
con alerta de pacientes que no vuelven, historia clínica imprimible y auditoría de autoría.

### El problema que resuelve

La población atendida mayoritariamente **no tiene DNI** y suele carecer de domicilio fijo. El
formulario está diseñado para que la ausencia de un dato sea un dato explícito (*"sin datos"*),
nunca un campo inventado, y para que un paciente quede identificado por su número de historia.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · TanStack Query · react-hook-form + zod |
| **Backend** | NestJS 12 (ESM) · Prisma 5 · class-validator · JWT · Swagger |
| **Base de datos** | MySQL 8 |
| **Linting** | Oxlint (backend) · ESLint + `eslint-config-next` (frontend) · Prettier |
| **Entorno** | Node.js ≥ 20 LTS |

Monorepo **sin workspaces**: `backend/` y `frontend/` son independientes y no comparten código. El
contrato REST documentado en Swagger es la frontera entre ambos.

---

## Requisitos previos

| Requisito | Versión | Verificar con |
|---|---|---|
| Node.js | ≥ 20 LTS | `node -v` |
| npm | ≥ 10 | `npm -v` |
| MySQL | 8.0+ | `mysql --version` |
| Git | cualquiera reciente | `git --version` |

---

## Estructura del repositorio

```text
.
├── backend/            API REST NestJS (puerto 4000)
│   ├── prisma/         schema.prisma · migrations/ · seed.ts
│   ├── src/
│   │   ├── main.ts     CORS · ValidationPipe · Swagger en /api
│   │   ├── auth/       login · JWT · guard global
│   │   ├── common/     decorators · filters · interceptors · guards
│   │   └── pacientes/ · historias-clinicas/ · medicos-voluntarios/ · catalogos/ · dashboard/
│   └── .env.example
├── frontend/           Next.js App Router (puerto 3000)
│   ├── app/
│   │   ├── (auth)/login/   única página pública
│   │   ├── (app)/          rutas protegidas
│   │   ├── services/       único lugar con fetch
│   │   └── components/     ui · layout · shared
│   └── .env.local.example
├── specs/              documentación versionada
│   ├── 01-requerimientos-y-negocio.md
│   ├── 02-arquitectura-tech.md
│   ├── 03-esquema-bd.md
│   ├── 04-plan-de-fases.md
│   └── fases/          playbooks ejecutables por un agente de IA
├── deploy/             scripts de despliegue y respaldo
└── AGENTS.md           convenciones y protocolo del agente
```

---

## Puesta en marcha

### 1. Clonar e instalar

```bash
git clone https://github.com/dzCazador/MeRegalasUnaHora-HistoriaClinica.git
cd MeRegalasUnaHora-HistoriaClinica

# Backend
cd backend
npm install
cp .env.example .env

# Frontend
cd ../frontend
npm install
cp .env.local.example .env.local
```

### 2. Base de datos MySQL

```sql
CREATE DATABASE meregalasunahora_dev
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'app'@'localhost' IDENTIFIED BY '<clave-fuerte>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES
  ON meregalasunahora_dev.* TO 'app'@'localhost';
FLUSH PRIVILEGES;
```

> El usuario de aplicación debe tener permisos **solo** sobre su propio esquema. MySQL no se expone
> a Internet: solo es accesible desde el backend.

### 3. Variables de entorno

**`backend/.env`**

```dotenv
NODE_ENV=development
PORT=4000
DATABASE_URL="mysql://app:<clave>@localhost:3306/meregalasunahora_dev"
JWT_SECRET="<cadena-aleatoria-de-mínimo-32-caracteres>"
JWT_EXPIRES_IN=8h
CORS_ORIGINS=http://localhost:3000
ADMIN_EMAIL="admin@organizacion.org"
ADMIN_PASSWORD="<clave-del-admin-inicial>"
```

**`frontend/.env.local`**

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Generar un secreto adequado:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> `.env` y `.env.local` **nunca** se versionan. Solo los `.example`, que están en `.gitignore`
> con excepción explícita. La aplicación **falla al arrancar** si falta una variable obligatoria.

### 4. Migraciones y datos iniciales

```bash
cd backend
npx prisma generate
npx prisma migrate dev        # aplica las migraciones de prisma/migrations/
npx prisma db seed            # catálogos + usuario ADMIN (idempotente)
```

El seed **no inserta datos de pacientes**. Carga catálogos (estados civiles, nacionalidades, tipos
de documento) y un único usuario `ADMIN` con la contraseña leída de `ADMIN_PASSWORD`.

### 5. Arrancar

```bash
# Dos terminales
cd backend  && npm run start:dev    # http://localhost:4000
cd frontend && npm run dev          # http://localhost:3000
```

### 6. Verificar

| Qué | Cómo | Resultado esperado |
|---|---|---|
| Backend vivo | `curl -s http://localhost:4000/api/health` | `{"status":"ok","database":"up"}` |
| Documentación | abrir `http://localhost:4000/api` | Swagger UI |
| Frontend vivo | abrir `http://localhost:3000` | redirige a `/login` |
| Autenticación | ver abajo | token JWT |

```bash
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}'

curl -s -H "Authorization: Bearer <token>" http://localhost:4000/api/pacientes
```

`POST /api/auth/login` y `GET /api/health` son los **únicos endpoints públicos**. Cualquier otro
devuelve `401` sin un token válido.

---

## Comandos frecuentes

| Comando | Dónde | Qué hace |
|---|---|---|
| `npm run start:dev` | `backend/` | Servidor de desarrollo (puerto 4000) |
| `npm run build` | `backend/` | Compila a `dist/main.js` |
| `npm run lint` | ambos | Lint (debe dar 0 errores y 0 warnings) |
| `npm run format` | ambos | Prettier |
| `npx prisma migrate dev --name <desc>` | `backend/` | Crea y aplica una migración versionada |
| `npx prisma migrate status` | `backend/` | Estado de las migraciones |
| `npx prisma studio` | `backend/` | Inspeccionar y editar datos |
| `npx prisma db seed` | `backend/` | Carga catálogos y admin (idempotente) |
| `npm run dev` | `frontend/` | Servidor de desarrollo (puerto 3000) |
| `npm run build` | `frontend/` | Build de producción |

---

## Documentación

| Documento | Contenido |
|---|---|
| [`specs/01-requerimientos-y-negocio.md`](./specs/01-requerimientos-y-negocio.md) | Requisitos funcionales, reglas de negocio, flujos, casos de uso, preguntas abiertas |
| [`specs/02-arquitectura-tech.md`](./specs/02-arquitectura-tech.md) | Decisiones de stack, estructura, ORM, convenciones de código |
| [`specs/03-esquema-bd.md`](./specs/03-esquema-bd.md) | Tablas, tipos, índices, restricciones, transacciones, respaldos |
| [`specs/04-plan-de-fases.md`](./specs/04-plan-de-fases.md) | Plan de desarrollo, estimaciones, Definition of Done |
| [`specs/fases/README.md`](./specs/fases/README.md) | Índice de fases y decisiones de implementación (DI) |
| [`specs/fases/00-protocolo-de-ejecucion.md`](./specs/fases/00-protocolo-de-ejecucion.md) | Reglas para ejecutar una fase con un agente de IA |
| [`specs/fases/ESTADO.md`](./specs/fases/ESTADO.md) | Estado de avance, bloqueos y registro de ejecuciones |
| [`AGENTS.md`](./AGENTS.md) | **Punto de entrada de cualquier agente de IA** |

### Plan de implementación

| Fase | Entregable | Depende de |
|---|---|---|
| 1 | Repos arrancando, health check, Swagger, convenciones | — |
| 2 | Migración inicial, seed, login, CRUD de pacientes | 1 |
| 3 | Alta transaccional paciente + historia + evolución | 2 |
| 4 | Next.js con login, rutas protegidas, componentes base | 1 |
| 5 | Formulario de admisión completo, operable en móvil | 2, 3, 4 |
| 6 | Dashboard con indicadores y alerta de abandono | 3, 4 |
| 7 | Impresión, exportación, auditoría (MVP completo) | 5, 6 |

---

## Desarrollo con un agente de IA

El proyecto está pensado para ejecutarse **fase por fase con un agente de IA**. Cada fase tiene un
playbook autocontenido en `specs/fases/` con tareas y verificaciones en formato checklist.

```text
1. Leer AGENTS.md  →  2. Leer ESTADO.md  →  3. Leer el playbook de la fase
4. Crear la rama feat/fase-N-<slug>  →  5. Ejecutar las tareas en orden, tildando cada casilla
6. Correr todos los comandos de verificación  →  7. Tildar los criterios de cierre
8. Actualizar ESTADO.md · commit · PR · reporte de cierre
```

Prompt de arranque:

```text
Ejecutá la Fase N del proyecto meRegalasUnaHora.
Archivos: AGENTS.md, specs/fases/00-protocolo-de-ejecucion.md y specs/fases/fase-0N-<slug>.md.
Leelos completos antes de escribir código. Ejecutá las tareas en orden y, al terminar, corré TODOS
los comandos de la sección "Verificación". No avances a la fase siguiente.
Actualizá specs/fases/ESTADO.md y respondé con el reporte de cierre.
```

### Ramas y commits

| Rama | Uso |
|---|---|
| `main` | Estable. Solo merges verificados. Sin commits directos |
| `develop` | Integración |
| `feat/…` `fix/…` `docs/…` | Trabajo |

Commits con [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`,
`docs:`, `refactor:`, `chore:`, `build:`, `perf:`, `style:`.

---

## Seguridad y datos sensibles

1. **Datos reales de pacientes** prohibidos en el repositorio, ejemplos, capturas y seeds.
2. **Secretos hardcodeados** prohibidos. `.env` nunca se versiona.
3. **Sin bypass de autenticación.** No hay endpoints públicos de datos clínicos.
4. **Autoría desde el token.** El `medicoVoluntarioId` nunca se toma del cuerpo de la petición.
5. **Sin borrado físico** de historias, evoluciones, pacientes o médicos: solo baja lógica.
6. **Contraseñas solo con hash** (bcrypt), nunca en texto plano.
7. **HTTPS obligatorio** fuera del entorno local; cookie de sesión `HttpOnly` + `Secure` en producción.
8. **Copias de seguridad**: dump diario automatizado, con procedimiento de restauración **probado**.
   Una copia no verificada es una hipótesis, no un plan de recuperación.

### Reportar un problema de seguridad

No abras un issue público con datos de pacientes ni detalles del problema. Contactá al responsable
técnico del proyecto de forma privada.

---

## Licencia

Software de uso interno de la organización. Todos los derechos reservados.
Uso, modificación y distribución sujetos a la autorización de la dirección de la organización.
