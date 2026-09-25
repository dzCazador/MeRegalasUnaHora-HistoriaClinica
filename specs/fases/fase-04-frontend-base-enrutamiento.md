# Fase 4 — Frontend Base: Login, Rutas Protegidas y Componentes UI

| | |
|---|---|
| **Estado** | `COMPLETADA` |
| **Depende de** | Fase 1 (contract) · Fase 2 (login y API disponibles) |
| **Bloquea a** | Fases 5, 6 |
| **Estimación** | 4 – 5 días |
| **Rama** | `main` (decisión de dirección: sin rama por fase) |
| **Cerrada** | 2026-09-25 |
| **Documentos fuente** | `../02-arquitectura-tech.md` §4.4, §8.1, §9.2, §10 · `../01-requerimientos-y-negocio.md` §3.4, §5.1, §8 (RNF-01, RNF-15) |
| **Requisitos cubiertos** | RF-04.2, RF-03 (parcial) · RN-06 · CU-07 |
| **Progreso** | **30 / 30 tareas · 19 / 19 verificaciones · 9 / 9 criterios de cierre** · 4 / 4 condiciones de entrada |

---

## 1. Objetivo

Next.js operativo con la estructura de carpetas definida en `../02` §4.4: sesión persistente,
protección de rutas antes de renderizar, layout con navegación y los componentes base de UI.

**Al terminar:** un médico se loguea, ve el shell de la aplicación, navega entre secciones y al
cerrar sesión `/dashboard` redirige a `/login`. `/dashboard` escrita sin sesión se bloquea en el
servidor.

---

## 2. Condiciones de entrada (gate)

Las 4 condiciones quedan cubiertas así:

| Condición | Estado |
|---|---|
| Fase 1 `COMPLETADA` (Next arrancando, lint limpio) | ✓ |
| Fase 2 `COMPLETADA`: `POST /api/auth/login` emite token | ✓ |
| **DI-01** resuelta | ✓ Opción A, el BFF. Ver §3.1 y §10 |
| Contrato de login congelado en Swagger | ✓ Documentado en `/api-json` |

> **DI-01 no estaba abierta como pregunta abierta**: §3.1 prescribe la opción A y descarta la B y la C
> por RN-06. Se implementó la A. Se documenta la resolución en `../02-arquitectura-tech.md` §8.1.

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

- [x] **4.1.1** Crear la estructura de carpetas completa de §3.2.
      *Archivo: `frontend/`*
- [x] **4.1.2** `globals.css` con las variables de tema claro/oscuro
      (`--background`, `--foreground`, `--primary`, `--border`, …) y el bloque `@theme` de Tailwind v4.
      *Archivo: `frontend/app/globals.css`*
- [x] **4.1.3** `app/layout.tsx` raíz: `<html lang="es">`, tema (script anti-parpadeo antes de la
      hidratación), `Providers` con `QueryClientProvider` + `AuthProvider`.
      *Archivo: `frontend/app/layout.tsx`*
- [x] **4.1.4** `QueryClient` configurado con `staleTime` razonable y reintentos desactivados para
      `401` (para que un token vencido no dispare 3 reintentos).
      *Archivo: `frontend/app/providers.tsx` o `frontend/lib/query-client.ts`*
- [x] **4.1.5** `next.config.ts`: sin settings innecesarios. Si se usa el BFF, declarar que
      las rutas `/api/*` no se cachean.
      *Archivo: `frontend/next.config.ts`*

### 4.2 Capa de servicios (único lugar con fetch)

- [x] **4.2.1** `services/api.ts`: cliente base que llama al BFF, adjunta
      `credentials: 'include'`, y maneja `401` limpiando la sesión y redirigiendo a `/login`.
      *Archivo: `frontend/app/services/api.ts`*
- [x] **4.2.2** `services/api.ts` tipa las respuestas con el contrato REST:
      `ApiSuccess<T>` y `ApiError`, y **muestra literalmente** el `error.message` del backend.
      *Archivo: `frontend/app/services/api.ts`*
- [x] **4.2.3** `services/auth.ts`: `login(email, password)`, `logout()`, `me()`.
      *Archivo: `frontend/app/services/auth.ts`*
- [x] **4.2.4** `services/pacientes.ts`: `listar(params)`, `obtener(id)`, `crear(dto)`,
      `actualizar(id, dto)` con tipos propios alineados al contrato.
      *Archivo: `frontend/app/services/pacientes.ts`*
- [x] **4.2.5** `types/` con los tipos del dominio derivados de Swagger (**escritos a mano**,
      nunca importados del backend).
      *Archivos: `frontend/types/`*
- [x] **4.2.6** Verificar con `rg "fetch\(" frontend/app` que **solo** los services llaman a la API.

### 4.3 Sesión (BFF + cookie HttpOnly)

- [x] **4.3.1** `app/api/auth/login/route.ts`: recibe `{ email, password }`, llama al backend, y si
      el login es correcto setea la cookie `HttpOnly`, `SameSite=Lax`, `Secure` en producción,
      `Path=/`, `Max-Age` = expiración del JWT.
      *Archivo: `frontend/app/api/auth/login/route.ts`*
- [x] **4.3.2** `app/api/auth/logout/route.ts`: borra la cookie y devuelve `204`.
      *Archivo: `frontend/app/api/auth/logout/route.ts`*
- [x] **4.3.3** `app/api/proxy/[...path]/route.ts` (DI-01): reenvía método, query y body al backend
      con `Authorization: Bearer <cookie>`, y devuelve la respuesta tal cual (status + JSON).
      **Prohibido** reenviar cookies del navegador al backend.
      *Archivo: `frontend/app/api/proxy/[...path]/route.ts`*
- [x] **4.3.4** `proxy.ts` en la **raíz** del proyecto: valida la presencia (y opcionalmente la
      expiración) de la cookie y bloquea las rutas no públicas **antes** de renderizar. Redirige a
      `/login` con `NextResponse.redirect`.
      *Archivo: `frontend/proxy.ts`*
- [x] **4.3.5** `auth-context.tsx`: `usuario`, `estadoCarga`, `login()`, `logout()`. Mientras resuelve
      la sesión, muestra un loader (evita el parpadeo de contenido protegido).
      *Archivo: `frontend/app/auth-context.tsx`*

### 4.4 UI: login y layout protegido

- [x] **4.4.1** `app/(auth)/login/page.tsx`: formulario con `email` y `password`, `react-hook-form` +
      `zod`, mensajes en español, estado de carga del botón y error del backend mostrado literal.
      *Archivo: `frontend/app/(auth)/login/page.tsx`*
- [x] **4.4.2** La página de login **no** muestra nunca qué campo falló. Con credenciales inválidas,
      el mensaje es genérico.
      *Archivo: `frontend/app/(auth)/login/page.tsx`*
- [x] **4.4.3** `app/(app)/layout.tsx`: `AppShell` + `Sidebar` + `Topbar` + `SidebarToggle`, con
      loader mientras se resuelve la sesión.
      *Archivo: `frontend/app/(app)/layout.tsx`*
- [x] **4.4.4** `sidebar.tsx` con `NAV_SECTIONS` (Dashboard, Pacientes, Médicos), íconos de
      `lucide-react`, indicador de la ruta activa y botón de cerrar sesión.
      *Archivo: `frontend/app/sidebar.tsx`*
- [x] **4.4.5** `app/page.tsx` raíz: redirige a `/dashboard` si hay sesión y a `/login` si no.
      *Archivo: `frontend/app/page.tsx`*
- [x] **4.4.6** Placeholders para `/dashboard`, `/pacientes` y `/medicos` con los **tres estados**
      (cargando con `Skeleton`, vacío con `EmptyState`, error con `Toast`).
      *Archivos: `frontend/app/(app)/*/page.tsx`*

### 4.5 Componentes base

- [x] **4.5.1** `components/ui/Button.tsx` con variantes y estado `loading`.
      *Archivo: `frontend/app/components/ui/Button.tsx`*
- [x] **4.5.2** `components/ui/Input.tsx` y `Select.tsx` con `label`, `error` y `helperText`.
      *Archivos: `frontend/app/components/ui/`*
- [x] **4.5.3** `components/ui/Card.tsx` con `CardHeader`, `CardTitle`, `CardContent`, `CardActions`.
      *Archivo: `frontend/app/components/ui/Card.tsx`*
- [x] **4.5.4** `components/ui/Modal.tsx` con `Esc` para cerrar, foco inicial y bloqueo del scroll.
      *Archivo: `frontend/app/components/ui/Modal.tsx`*
- [x] **4.5.5** `components/ui/Table.tsx` que soporte `onRowClick`, `onRowDoubleClick` y fila
      seleccionada, **sin** acciones dentro de las filas (Toolbar Pattern, `../02` §10.1).
      *Archivo: `frontend/app/components/ui/Table.tsx`*
- [x] **4.5.6** `components/ui/Badge.tsx` (variantes activo/inactivo/ACTIVA/CERRADA/ANULADA) y
      `Skeleton.tsx`.
      *Archivos: `frontend/app/components/ui/`*
- [x] **4.5.7** `components/shared/EmptyState.tsx` con mensaje explicativo y acción sugerida
      (ej. *"Registrar el primer paciente"*).
      *Archivo: `frontend/app/components/shared/EmptyState.tsx`*
- [x] **4.5.8** `components/shared/Toast.tsx` con `useToast()` y que muestra el mensaje del backend
      sin reescribirlo.
      *Archivo: `frontend/app/components/shared/Toast.tsx`*

---

## 5. Verificación

### 5.1 Sesión

- [x] Con credenciales válidas, se entra y se ve el shell (sidebar + topbar).
- [x] Con credenciales inválidas, se muestra un error **claro y genérico**, sin revelar el campo
      que falló.
- [x] Con email inexistente y con contraseña incorrecta, el mensaje es **idéntico**.
- [x] Al cerrar sesión, `/dashboard` redirige a `/login`.
- [x] Al escribir `/dashboard` sin sesión, la ruta se bloquea **antes de renderizar** (Network:
      la petición a `/dashboard` devuelve el redirect, no el HTML protegido).
- [x] Tras un `401` en cualquier llamada a la API, la sesión se limpia y se redirige a `/login`.
- [x] La cookie de sesión es `HttpOnly` con `SameSite=Lax` (verificable en DevTools ▸ Application).
- [x] El token **no** aparece en `localStorage`, `sessionStorage` ni en el código del cliente.
- [x] Cerrar el navegador y volver a abrir mantiene la sesión (mientras el JWT no expire).

### 5.2 Layout y navegación

- [x] El tema claro/oscuro persiste entre recargas.
- [x] La ruta activa se resalta en el sidebar.
- [x] La sidebar se colapsa en pantallas angostas y se puede cerrar con el botón.
- [x] `/pacientes` y `/dashboard` muestran, al menos, el esqueleto de carga y el estado vacío.
- [x] Ninguna pantalla muestra un error de hidratación en la consola.

### 5.3 Componentes y convenciones

- [x] `npm run lint` (frontend) → 0 errores, 0 warnings.
- [x] `npm run build` (frontend) → compila sin errores.
- [x] `rg "fetch\(" frontend/app` → solo resultados dentro de `app/services/`.
- [x] `rg "any" frontend/app --type ts` → sin `any` implícito.
- [x] Ningún componente importa tipos desde `backend/`.

---

## 6. Criterios de cierre

- [x] Con credenciales válidas se entra y se ve el shell de la aplicación.
- [x] Con credenciales inválidas se muestra un error claro sin revelar el campo que falló.
- [x] Al cerrar sesión, `/dashboard` redirige a `/login`.
- [x] Al escribir `/dashboard` sin sesión, la ruta se bloquea antes de renderizar.
- [x] Tras un `401` en cualquier llamada a la API, la sesión se limpia y se redirige a `/login`.
- [x] La cookie de sesión es `HttpOnly` con `SameSite=Lax`, y el token no está en el cliente.
- [x] El tema claro/oscuro persiste entre recargas.
- [x] `/pacientes` y `/dashboard` muestran, al menos, el esqueleto de carga y el estado vacío.
- [x] `npm run lint` y `npm run build` limpios.

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

- [x] Documentar DI-01 resuelta en `../02-arquitectura-tech.md` §8.1.
- [x] Commit: `feat: login, sesion con cookie httpOnly, rutas protegidas y componentes base`
- [x] ~~PR contra `develop`~~ → **desviación**: por decisión de dirección (2026-09-25) el trabajo se
      hace directo sobre `main`, sin rama por fase ni PR. `develop` se sincroniza al cerrar.
- [x] `ESTADO.md` §1: Fase 4 `COMPLETADA`; §3 cerrar B-3; §4 con una fila de registro.

---

## 10. Desviaciones del playbook

| # | Qué se hizo distinto | Por qué |
|---|---|---|
| **DI-01** | **Opción A**: Route Handlers de Next como BFF. `app/api/proxy/[...path]` lee la cookie `HttpOnly`, agrega `Authorization: Bearer` y reenvía a NestJS | Una cookie `HttpOnly` es invisible para el `fetch` del navegador: sin BFF el token nunca llega. La B (cookie legible por JS) y la C (`localStorage`) exponen el token a XSS y están prohibidas por RN-06 |
| **DI-25** | `API_URL` en vez de `NEXT_PUBLIC_API_URL` | Con el prefijo `NEXT_PUBLIC_` la URL del backend queda **en el bundle del cliente**, y cualquiera podría saltear el BFF para pegarle directo a NestJS. Sin prefijo, sólo el servidor la conoce |
| **DI-26** | `/api/*` entera exenta del redirect de `proxy.ts`, no sólo login y logout | El BFF tiene que **contestar** con su propio código —`401` en JSON—. Si fuera redirigido, el `fetch` del cliente seguiría el 307 y parsearía el HTML del login como si fuera JSON. Ver §10.1 |
| **DI-27** | `/login` con sesión activa redirige a `/dashboard` | El playbook no lo decía. Quedarse en el login con sesión válida es un callejón sin salida: el usuario ve un formulario que no le va a dejar entrar |
| **DI-28** | La cookie se recorta a 7 días como máximo, aunque el JWT dure 8 h | El `Max-Age` nunca puede superar la vida del token: una cookie más larga daría un token vencido en el navegador y un `401` en cada llamada. El criterio de verificación 5.1 pide que la sesión sobreviva al cierre del navegador, y una cookie sin `Max-Age` no sobrevive |

### 10.1 Bugs encontrados y corregido durante la verificación

Ninguno estaba en el playbook. Los cinco aparecieron al probar de verdad, con `curl` y con
navegador; cuatro de ellos habrían llegado a producción.

| Bug | Síntoma | Causa | Corrección |
|---|---|---|---|
| **El login no funcionaba** | Login válido devolvía *"Esta ruta no se reenvía por el proxy"* | `services/auth.ts` mandaba el login por el BFF, que rechaza `/auth/login` por diseño: es la única ruta del backend que no lleva token | El login va directo a `/api/auth/login`; sólo las llamadas con token pasan por el BFF |
| **`/api/proxy` respondía 307 en vez de 401** | Sin cookie, el cliente recibía el HTML del login en lugar de un `401` JSON | `proxy.ts` sólo excluía `/api/auth/login` y `/api/auth/logout`; el resto de `/api/*` caía en el redirect | `/api` exenta entera. Un endpoint de API contesta con su código, no redirige |
| **El cierre de sesión no borraba la cookie** | Tras `POST /api/auth/logout` la sesión seguía viva | `NextResponse.json({...}, { status: 204 })`: un 204 no puede llevar cuerpo, y el runtime descartaba el `Set-Cookie` | Respuesta 204 construida a mano, con la cabecera y sin cuerpo |
| **Dos controles con la misma etiqueta accesible** | El lector de pantalla anuncia "Cerrar menú" dos veces al abrir la sidebar en móvil | El overlay y el aspa compartían `aria-label` | El overlay queda como adorno: `aria-hidden` y fuera del tab order. Se agregó `Esc` como salida con teclado |
| **El tema se leía en `useEffect` con `setState`** | ESLint: *setState synchronously within an effect*; además provocaba un segundo render en cascada en cada montaje | El tema vive en el atributo `data-theme` del `<html>`, que es estado externo al componente | `useSyncExternalStore` con un `MutationObserver` sobre el atributo |

### 10.2 Un agregado que no estaba en el plan

`document.documentElement.dataset.hidratado` lo fija `Providers` al montar. No es funcionalidad: es lo
que permite que una prueba end-to-end espere a que React esté vivo antes de escribir en un campo.
Sin él, escribir antes de hidratar deja el estado del formulario vacío y el `submit` no se dispara:
parece un bug de la aplicación y en realidad es una carrera de la prueba. Se detectó justo por eso.
