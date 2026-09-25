# Fases de Implementación — meRegalasUnaHora

> Carpeta de trabajo para ejecutar el proyecto **paso a paso con un agente de IA**.
> Cada archivo de fase es un *playbook autocontenido*: el agente debe poder ejecutarlo sin
> haber leído el resto de la especificación, salvo los documentos fuente que se citan explícitamente.

---

## 1. Documentos fuente (specs/)

| Documento | Contenido | Cuándo leerlo |
|---|---|---|
| `../01-requerimientos-y-negocio.md` | Requisitos, reglas de negocio, flujos, validaciones | Antes de cada fase de producto |
| `../02-arquitectura-tech.md` | Stack, estructura de carpetas, convenciones de código | **Siempre**: es el contrato técnico |
| `../03-esquema-bd.md` | Tablas, tipos, índices, restricciones, transacciones | Antes de tocar `schema.prisma` |
| `../04-plan-de-fases.md` | Plan maestro, estimaciones, Definition of Done | Visión general y trazabilidad |
| `00-protocolo-de-ejecucion.md` | **Reglas de ejecución del agente** | Al inicio de cada fase |
| `ESTADO.md` | Estado de avance de cada fase | Antes y después de cada fase |

> Los documentos fuente son la **fuente de verdad funcional**. Si un playbook de fase contradice a un
> documento fuente, **manda el documento fuente** y hay que actualizar el playbook.

---

## 2. Índice de fases

| Fase | Archivo | Entregable verificable | Depende de | Est. |
|---|---|---|---|---|
| **1** | [`fase-01-setup-inicial.md`](./fase-01-setup-inicial.md) | Backend y frontend arrancando, health check, Swagger | — | 2–3 j |
| **2** | [`fase-02-bd-pacientes-auth.md`](./fase-02-bd-pacientes-auth.md) | Migración inicial + seed + login + CRUD de pacientes | 1 | 5–7 j |
| **3** | [`fase-03-historias-clinicas-evoluciones.md`](./fase-03-historias-clinicas-evoluciones.md) | Alta transaccional paciente + historia + evolución | 2 | 4–6 j |
| **4** | [`fase-04-frontend-base-enrutamiento.md`](./fase-04-frontend-base-enrutamiento.md) | Next.js con login, rutas protegidas y componentes base | 1 | 4–5 j |
| **5** | [`fase-05-ui-formulario-admision.md`](./fase-05-ui-formulario-admision.md) | Alta de paciente operable en móvil, punta a punta | 2, 3, 4 | 8–12 j |
| **6** | [`fase-06-dashboard.md`](./fase-06-dashboard.md) | Panel con indicadores y alerta de abandono | 3, 4 | 4–6 j |
| **7** | [`fase-07-impresion-exportacion-auditoria.md`](./fase-07-impresion-exportacion-auditoria.md) | Historia imprimible, Excel, auditoría, MVP completo | 5, 6 | 4–6 j |

**MVP completo: 7 fases · 31–45 días de trabajo.**

Fases futuras (fuera del MVP, sin playbook todavía): modo offline (RN-08), importación de planillas,
fotografías clínicas, reportes estadísticos, app móvil nativa, interoperabilidad. Ver
`../04-plan-de-fases.md` §3.

---

## 3. Cómo ejecutar una fase con el agente

### 3.1 Orden obligatorio

```
1. Leer ESTADO.md                    → ¿hay una fase anterior abierta?
2. Leer 00-protocolo-de-ejecucion.md → reglas de ejecución
3. Leer el archivo de la fase        → objetivo, tareas, verificación
4. Crear la rama                     → feat/fase-N-<slug>
5. Ejecutar las tareas EN ORDEN      → una tarea, verificar, seguir
6. Ejecutar la sección Verificación  → todos los comandos, en bloque
7. Cargar los criterios de cierre    → checkboxes
8. Reportar                          → resumen + evidencia + estado
```

### 3.2 Prompt mínimo para arrancar una fase

```text
Ejecutá la Fase N del proyecto meRegalasUnaHora.
Archivos: specs/fases/00-protocolo-de-ejecucion.md y specs/fases/fase-0N-<slug>.md.
Leelos completos antes de escribir código. Respetá las convenciones de specs/02-arquitectura-tech.md.
Ejecutá las tareas en orden y, al terminar, corré TODOS los comandos de la sección "Verificación".
No avances a la fase siguiente. Actualizá specs/fases/ESTADO.md y respondé con el reporte de cierre.
```

### 3.3 Reglas invariables (resumen; el detalle está en el protocolo)

1. **Una fase por vez.** No se empieza la fase N+1 con la N abierta.
2. **Verificar antes de avanzar.** Una tarea sin comando de verificación no está terminada.
3. **Nada de secretos.** `.env` nunca se versiona; `.env.example` con valores de ejemplo.
4. **La autoría sale del token.** Jamás del cuerpo de la petición.
5. **Nada de borrado físico** en datos clínicos.
6. **ESM en el backend**: imports relativos con extensión `.js`, salida en `dist/main.js`.
7. **`npm run lint` limpio** en backend y frontend antes de cerrar la fase.
8. **SQL crudo solo con `$queryRaw`**, nunca concatenación de strings.
9. **Comentarios mínimos**: el código explica el qué, la spec explica el por qué.
10. **Commits Conventional Commits** y PR con *qué* cambia, *por qué* y a qué requisito corresponde.

---

## 4. Definición de Done (por fase)

Una fase está terminada cuando **todas** estas condiciones se cumplen:

- [ ] El proyecto compila (`nest build` / `next build`) sin errores.
- [ ] `npm run lint` sin errores ni warnings en backend y frontend.
- [ ] Los **criterios de cierre** de la fase están verificados con evidencia.
- [ ] Los endpoints nuevos están documentados en Swagger.
- [ ] No se agregaron credenciales, tokens ni datos reales de pacientes.
- [ ] No se agregaron endpoints públicos fuera de `/api/auth/login` y `/api/health`.
- [ ] `specs/fases/ESTADO.md` actualizado con fecha, rama y resultado.
- [ ] `specs/` actualizado si cambió un requisito o una decisión.
- [ ] PR abierto contra `develop` con el reporte de cierre.

---

## 5. Decisiones de implementación registradas (DI)

Detectadas al descomponer el plan en fases. **No están resueltas en los documentos fuente**: se
documentan acá para que el agente no improvise y para que la organización las valide.

| ID | Decisión | Estado | Documento fuente a actualizar |
|---|---|---|---|
| **DI-01** | Token en cookie `HttpOnly` + **BFF** (Route Handler) que reenvía el `Authorization` al backend | Propuesta | `02` §8.1 (el fetch directo desde el cliente no puede leer una cookie HttpOnly) |
| **DI-02** | `numero_historia`: MySQL admite **una sola** columna `AUTO_INCREMENT` por tabla, y `pacientes.id` ya la usa. Propuesta: `numero_historia = pacientes.id` (correlativo 1:1, generado por el motor) | Propuesta | `03` §3.1 (pide dos `AUTO_INCREMENT` en la misma tabla) |
| **DI-03** | `BigInt` de Prisma no es serializable a JSON: los ids se exponen como `Number` con límite explícito | Propuesta | `03` §6 y `02` §7.3 |
| **DI-04** | `operativos` se crea en el esquema desde la Fase 2 (la FK de `historias_clinicas` lo requiere); el filtro por puesto se expone en la Fase 6 | Propuesta | `03` §4.5, `04` fase 6 tarea 6.3.1 |
| **DI-05** | Evolución en historia cerrada responde **422** (no 409 como dice CU-05) | Propuesta | `01` CU-05 dice 409; `02` §7.5 dice 422 |
| **DI-06** | Restricciones `CHECK`: Prisma no las declara, van en una migración SQL editada a mano | Propuesta | `03` §3.1–3.3 |
| **DI-07** | El formulario tiene **16 campos** (2 de A, 10 de B, 2 de C, 2 de D), no 14 | Propuesta | `04` §5.4 criterio "los 14 campos" |
| **DI-08** | Estrategia de pruebas automatizadas: sigue **pendiente de decisión** (ver `../04-plan-de-fases.md` §6). Ningún playbook genera archivos de prueba salvo indicación expresa | Pendiente | `04` §6, checklist §8 |

> **Regla para el agente:** si una tarea de un playbook depende de una DI marcada *Pendiente*,
> detenete, dejá la fase en `EN CURSO` y pedí la decisión. No la inventes.
