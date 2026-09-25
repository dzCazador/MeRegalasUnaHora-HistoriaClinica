# Fase 4 — Frontend Base: Login, Rutas Protegidas y Componentes UI

| | |
|---|---|
| **Estado** | `PENDIENTE` |
| **Depende de** | Fase 1 (contract) · Fase 2 (login y API disponibles) |
| **Bloquea a** | Fases 5, 6 |
| **Estimación** | 4 – 5 días |
| **Rama sugerida** | `feat/fase-4-frontend-base` |
| **Documentos fuente** | `../02-arquitectura-tech.md` §4.4, §8.1, §9.2, §10 · `../01-requerimientos-y-negocio.md` §3.4, §5.1, §8 (RNF-01, RNF-15) |
| **Requisitos cubiertos** | RF-04.2, RF-03 (parcial) · RN-06 · CU-07 |
| **Progreso** | **0 / 30 tareas · 0 / 19 verificaciones · 0 / 9 criterios de cierre** · 4 condiciones de entrada |

---

## 1. Objetivo

Next.js operativo con la estructura de carpetas definida en `../02` §4.4: sesión persistente,
protección de rutas antes de renderizar, layout con navegación y los componentes base de UI.

**Al terminar:** un médico se loguea, ve el shell de la aplicación, navega entre secciones y al
cerrar sesión `/dashboard` redirige a `/login`. `/dashboard` escrita sin sesión se bloquea en el
servidor.

---

## 2. Condiciones de entrada (gate)

- [ ] Fase 1 `COMPLETADA` (Next.js arrancando, lint limpio).
- [ ] Fase 2 `COMPLETADA`: `POST /api/auth/login` funciona y devuelve el token.
- [ ] **DI-01** resuelta: cómo se reenvía el token en cookie `HttpOnly` al backend. Ver §3.1.
- [ ] Contrato de `POST /api/auth/login` **congelado** en Swagger antes de empezar la UI.

---

## 3. Contexto técnico

### 3.1 DI-01 — El token en cookie `HttpOnly`

Una cookie `HttpOnly` **no se puede leer desde JavaScript del cliente**. Si el token vive solo en esa
cookie, el `fetch` del navegador no puede mandar `Authorization: Bearer`. Opciones:

| Opción | Cómo funciona | Tradeoff |
|---|---|---|
| **A (propuesta)** | Route Handler de Next como **BFF**: el cliente llama a `/api/…` de Next; el handler lee la cookie, agrega `Authorization: Bearer` y reenvía al backend | El token nunca llega al JS del cliente. Un salto extra de red. **Requerido por RN-06** |
| B | Cookie legible por JS + `fetch` directo al backend | El token queda expuesto a XSS. Rechazada por RN-06 |
| C | Token en `localStorage` | Peor: sobrevive al cierre de sesión y es legible por cualquier script |

**Aplicar la opción A.** El token se guarda **solo** en la cookie `HttpOnly`, `SameSite=Lax`,
`Secure` en producción. `app/services/` sigue siendo el único lugar con `fetch`.

```
Componente ──fetch──▶ /api/proxy/pacientes (Route Handler, server)
                            │  lee cookie HttpOnly
                            │  agrega Authorization: Bearer
                            ▼
                      NestJS :4000
```

### 3.2 Estructura a construir

```text
frontend/
├── proxy.ts                      ← middleware de sesión (archivo raíz del proyecto, ver 8.4)
├── app/
│   ├── layout.tsx                ← tema + AuthProvider + AppShell
│   ├── globals.css               ← variables de tema claro/oscuro
│   ├── page.tsx                  ← redirige según sesión
│   ├── api/
│   │   ├── auth/login/route.ts           ← login: llama al backend y setea la cookie
│   │   ├── auth/logout/route.ts          ← borra la cookie
│   │   └── proxy/[...path]/route.ts      ← BFF: reenvía con Authorization (DI-01)
│   ├── (auth)/login/page.tsx     ← ÚNICA página pública
│   ├── (app)/                    ← rutas protegidas
│   │   ├── layout.tsx            ← AppShell + Sidebar + Topbar
│   │   ├── dashboard/page.tsx    ← placeholder
│   │   ├── pacientes/page.tsx    ← placeholder
│   │   └── medicos/page.tsx      ← placeholder
│   ├── services/                 ← api.ts · auth.ts · pacientes.ts · dashboard.ts
│   ├── components/
│   │   ├── ui/                   ← Button, Input, Select, Card, Modal, Table, Badge, Skeleton
│   │   ├── layout/               ← AppShell, Sidebar, Topbar
│   │   └── shared/               ← EmptyState, Toast, ConfirmDialog
│   ├── hooks/ · lib/ · types/ · auth-context.tsx · sidebar.tsx
└── next.config.ts
```

### 3.3 Componentes base requeridos

`Button` (variantes `primary`/`secondary`/`danger`/`ghost`, tamaños, `disabled`, `loading`) ·
`Input` (label, error, helper) · `Select` · `Card` (título, acciones) · `Modal` (foco atrapado,
`Esc` para cerrar) · `Table` (columnas, `onRowClick`, `onRowDoubleClick`, selección) ·
`Badge` (variantes por estado) · `Skeleton` · `EmptyState` (mensaje + acción) · `Toast`.

### 3.4 Navegación

`NAV_SECTIONS` en `sidebar.tsx` con `Dashboard`, `Pacientes` y `Médicos`. Toda pantalla nueva se
agrega ahí (`../02` §10.3).

---

## 4. Tareas

### 4.1 Estructura y configuración

- [ ] **4.1.1** Crear la estructura de carpetas completa de §3.2.
      *Archivo: `frontend/`*
- [ ] **4.1.2** `globals.css` con las variables de tema claro/oscuro
      (`--background`, `--foreground`, `--primary`, `--border`, …) y el bloque `@theme` de Tailwind v4.
      *Archivo: `frontend/app/globals.css`*
- [ ] **4.1.3** `app/layout.tsx` raíz: `<html lang="es">`, tema (script anti-parpadeo antes de la
      hidratación), `Providers` con `QueryClientProvider` + `AuthProvider`.
      *Archivo: `frontend/app/layout.tsx`*
- [ ] **4.1.4** `QueryClient` configurado con `staleTime` razonable y reintentos desactivados para
      `401` (para que un token vencido no dispare 3 reintentos).
      *Archivo: `frontend/app/providers.tsx` o `frontend/lib/query-client.ts`*
- [ ] **4.1.5** `next.config.ts`: sin settings innecesarios. Si se usa el BFF, declarar que
      las rutas `/api/*` no se cachean.
      *Archivo: `frontend/next.config.ts`*

### 4.2 Capa de servicios (único lugar con fetch)

- [ ] **4.2.1** `services/api.ts`: cliente base que llama al BFF, adjunta
      `credentials: 'include'`, y maneja `401` limpiando la sesión y redirigiendo a `/login`.
      *Archivo: `frontend/app/services/api.ts`*
- [ ] **4.2.2** `services/api.ts` tipa las respuestas con el contrato REST:
      `ApiSuccess<T>` y `ApiError`, y **muestra literalmente** el `error.message` del backend.
      *Archivo: `frontend/app/services/api.ts`*
- [ ] **4.2.3** `services/auth.ts`: `login(email, password)`, `logout()`, `me()`.
      *Archivo: `frontend/app/services/auth.ts`*
- [ ] **4.2.4** `services/pacientes.ts`: `listar(params)`, `obtener(id)`, `crear(dto)`,
      `actualizar(id, dto)` con tipos propios alineados al contrato.
      *Archivo: `frontend/app/services/pacientes.ts`*
- [ ] **4.2.5** `types/` con los tipos del dominio derivados de Swagger (**escritos a mano**,
      nunca importados del backend).
      *Archivos: `frontend/types/`*
- [ ] **4.2.6** Verificar con `rg "fetch\(" frontend/app` que **solo** los services llaman a la API.

### 4.3 Sesión (BFF + cookie HttpOnly)

- [ ] **4.3.1** `app/api/auth/login/route.ts`: recibe `{ email, password }`, llama al backend, y si
      el login es correcto setea la cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción,
      `Path=/`, `Max-Age` = expiración del JWT.
      *Archivo: `frontend/app/api/auth/login/route.ts`*
- [ ] **4.3.2** `app/api/auth/logout/route.ts`: borra la cookie y devuelve `204`.
      *Archivo: `frontend/app/api/auth/logout/route.ts`*
- [ ] **4.3.3** `app/api/proxy/[...path]/route.ts` (DI-01): reenvía método, query y body al backend
      con `Authorization: Bearer <cookie>`, y devuelve la respuesta tal cual (status + JSON).
      **Prohibido** reenviar cookies del navegador al backend.
      *Archivo: `frontend/app/api/proxy/[...path]/route.ts`*
- [ ] **4.3.4** `proxy.ts` en la **raíz** del proyecto: valida la presencia (y opcionalmente la
      expiración) de la cookie y bloquea las rutas no públicas **antes** de renderizar. Redirige a
      `/login` con `NextResponse.redirect`.
      *Archivo: `frontend/proxy.ts`*
- [ ] **4.3.5** `auth-context.tsx`: `usuario`, `estadoCarga`, `login()`, `logout()`. Mientras resuelve
      la sesión, muestra un loader (evita el parpadeo de contenido protegido).
      *Archivo: `frontend/app/auth-context.tsx`*

### 4.4 UI: login y layout protegido

- [ ] **4.4.1** `app/(auth)/login/page.tsx`: formulario con `email` y `password`, `react-hook-form` +
      `zod`, mensajes en español, estado de carga del botón y error del backend mostrado literal.
      *Archivo: `frontend/app/(auth)/login/page.tsx`*
- [ ] **4.4.2** La página de login **no** muestra nunca qué campo falló. Con credenciales inválidas,
      el mensaje es genérico.
      *Archivo: `frontend/app/(auth)/login/page.tsx`*
- [ ] **4.4.3** `app/(app)/layout.tsx`: `AppShell` + `Sidebar` + `Topbar` + `SidebarToggle`, con
      loader mientras se resuelve la sesión.
      *Archivo: `frontend/app/(app)/layout.tsx`*
- [ ] **4.4.4** `sidebar.tsx` con `NAV_SECTIONS` (Dashboard, Pacientes, Médicos), íconos de
      `lucide-react`, indicador de la ruta activa y botón de cerrar sesión.
      *Archivo: `frontend/app/sidebar.tsx`*
- [ ] **4.4.5** `app/page.tsx` raíz: redirige a `/dashboard` si hay sesión y a `/login` si no.
      *Archivo: `frontend/app/page.tsx`*
- [ ] **4.4.6** Placeholders para `/dashboard`, `/pacientes` y `/medicos` con los **tres estados**
      (cargando con `Skeleton`, vacío con `EmptyState`, error con `Toast`).
      *Archivos: `frontend/app/(app)/*/page.tsx`*

### 4.5 Componentes base

- [ ] **4.5.1** `components/ui/Button.tsx` con variantes y estado `loading`.
      *Archivo: `frontend/app/components/ui/Button.tsx`*
- [ ] **4.5.2** `components/ui/Input.tsx` y `Select.tsx` con `label`, `error` y `helperText`.
      *Archivos: `frontend/app/components/ui/`*
- [ ] **4.5.3** `components/ui/Card.tsx` con `CardHeader`, `CardTitle`, `CardContent`, `CardActions`.
      *Archivo: `frontend/app/components/ui/Card.tsx`*
- [ ] **4.5.4** `components/ui/Modal.tsx` con `Esc` para cerrar, foco inicial y bloqueo del scroll.
      *Archivo: `frontend/app/components/ui/Modal.tsx`*
- [ ] **4.5.5** `components/ui/Table.tsx` que soporte `onRowClick`, `onRowDoubleClick` y fila
      seleccionada, **sin** acciones dentro de las filas (Toolbar Pattern, `../02` §10.1).
      *Archivo: `frontend/app/components/ui/Table.tsx`*
- [ ] **4.5.6** `components/ui/Badge.tsx` (variantes activo/inactivo/ACTIVA/CERRADA/ANULADA) y
      `Skeleton.tsx`.
      *Archivos: `frontend/app/components/ui/`*
- [ ] **4.5.7** `components/shared/EmptyState.tsx` con mensaje explicativo y acción sugerida
      (ej. *"Registrar el primer paciente"*).
      *Archivo: `frontend/app/components/shared/EmptyState.tsx`*
- [ ] **4.5.8** `components/shared/Toast.tsx` con `useToast()` y que muestra el mensaje del backend
      sin reescribirlo.
      *Archivo: `frontend/app/components/shared/Toast.tsx`*

---

## 5. Verificación

### 5.1 Sesión

- [ ] Con credenciales válidas, se entra y se ve el shell (sidebar + topbar).
- [ ] Con credenciales inválidas, se muestra un error **claro y genérico**, sin revelar el campo
      que falló.
- [ ] Con email inexistente y con contraseña incorrecta, el mensaje es **idéntico**.
- [ ] Al cerrar sesión, `/dashboard` redirige a `/login`.
- [ ] Al escribir `/dashboard` sin sesión, la ruta se bloquea **antes de renderizar** (Network:
      la petición a `/dashboard` devuelve el redirect, no el HTML protegido).
- [ ] Tras un `401` en cualquier llamada a la API, la sesión se limpia y se redirige a `/login`.
- [ ] La cookie de sesión es `HttpOnly` con `SameSite=Lax` (verificable en DevTools ▸ Application).
- [ ] El token **no** aparece en `localStorage`, `sessionStorage` ni en el código del cliente.
- [ ] Cerrar el navegador y volver a abrir mantiene la sesión (mientras el JWT no expire).

### 5.2 Layout y navegación

- [ ] El tema claro/oscuro persiste entre recargas.
- [ ] La ruta activa se resalta en el sidebar.
- [ ] La sidebar se colapsa en pantallas angostas y se puede cerrar con el botón.
- [ ] `/pacientes` y `/dashboard` muestran, al menos, el esqueleto de carga y el estado vacío.
- [ ] Ninguna pantalla muestra un error de hidratación en la consola.

### 5.3 Componentes y convenciones

- [ ] `npm run lint` (frontend) → 0 errores, 0 warnings.
- [ ] `npm run build` (frontend) → compila sin errores.
- [ ] `rg "fetch\(" frontend/app` → solo resultados dentro de `app/services/`.
- [ ] `rg "any" frontend/app --type ts` → sin `any` implícito.
- [ ] Ningún componente importa tipos desde `backend/`.

---

## 6. Criterios de cierre

- [ ] Con credenciales válidas se entra y se ve el shell de la aplicación.
- [ ] Con credenciales inválidas se muestra un error claro sin revelar el campo que falló.
- [ ] Al cerrar sesión, `/dashboard` redirige a `/login`.
- [ ] Al escribir `/dashboard` sin sesión, la ruta se bloquea antes de renderizar.
- [ ] Tras un `401` en cualquier llamada a la API, la sesión se limpia y se redirige a `/login`.
- [ ] La cookie de sesión es `HttpOnly` con `SameSite=Lax`, y el token no está en el cliente.
- [ ] El tema claro/oscuro persiste entre recargas.
- [ ] `/pacientes` y `/dashboard` muestran, al menos, el esqueleto de carga y el estado vacío.
- [ ] `npm run lint` y `npm run build` limpios.

---

## 7. Fuera de alcance

- **Formulario de admisión, grilla de pacientes y detalle**: Fase 5.
- **Dashboard real** con datos: Fase 6. Acá solo el placeholder.
- **CRUD de médicos**: Fase 5.
- **Impresión y exportación**: Fase 7.
- **Modo offline / borradores** (RN-08): Fase 8, fuera del MVP.
- **Internacionalización**: los mensajes van en español y quedan fijos.

---

## 8. Errores frecuentes

| Trampa | Cómo evitarla |
|---|---|
| `middleware.ts` no se ejecuta en Next 16 | Next 16 renombró el archivo a `proxy.ts` y va en la **raíz** del proyecto, no en `app/`. Si la versión instalada no lo reconoce, volver a `middleware.ts` y anotarlo en el reporte |
| El token no llega al backend | Sin BFF, la cookie `HttpOnly` es ilegible para el cliente. Es exactamente lo que resuelve DI-01 |
| Parpadeo de contenido protegido | El layout `(app)` muestra un loader mientras `auth-context` resuelve la sesión |
| Fuga del token al cliente | Nunca devolver el token en el JSON del login: solo setear la cookie |
| Un componente hace `fetch` | Todo pasa por `app/services/`. Verificable con `rg "fetch\(" frontend/app` |
| `401` dispara 3 reintentos y demora la redirección | En el `QueryClient`, `retry: false` para errores `401` |
| `useSearchParams` sin `<Suspense>` rompe el build | Envolver en `Suspense` o usar `<Suspense>` en el page |
| Errores de hidratación por `Date` o `Math.random` en el render | Calcular en `useEffect` o usar `suppressHydrationWarning` solo donde corresponda |

---

## 9. Cierre

- [ ] Documentar DI-01 resuelta en `../02-arquitectura-tech.md` §8.1.
- [ ] Commit: `feat: login, sesion con cookie httpOnly, rutas protegidas y componentes base`
- [ ] PR contra `develop` con *qué* cambia, *por qué* y requisitos cubiertos (RF-04, RN-06).
- [ ] `ESTADO.md` §1: Fase 4 `COMPLETADA`; §3 cerrar B-3; §4 con una fila de registro.
