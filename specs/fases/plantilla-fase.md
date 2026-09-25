# Plantilla de Fase

> Copiar este archivo como `fase-0N-<slug>.md` y completar cada sección.
> Borrar las secciones que no apliquen. **No borrar** §5 (Verificación) ni §6 (Criterios de cierre):
> son las que permiten al agente saber cuándo terminó.

---

# Fase N — <Título de la fase>

| | |
|---|---|
| **Estado** | `PENDIENTE` |
| **Depende de** | Fase N-1 |
| **Bloquea a** | Fase N+1 |
| **Estimación** | X – Y días |
| **Rama sugerida** | `feat/fase-N-<slug>` |
| **Documentos fuente** | `../01-requerimientos-y-negocio.md` §…, `../02-arquitectura-tech.md` §…, `../03-esquema-bd.md` §… |
| **Requisitos cubiertos** | RF-…, RN-…, CU-… |

---

## 1. Objetivo

Una frase con lo que el sistema hace al terminar la fase que no hacía antes.

---

## 2. Condiciones de entrada (gate)

Solo se empieza si todo esto es cierto:

- [ ] La fase anterior está `COMPLETADA` en `ESTADO.md`.
- [ ] El proyecto compila y `npm run lint` está limpio.
- [ ] Las decisiones DI aplicables a esta fase están resueltas.

---

## 3. Contexto técnico

Lo mínimo imprescindible para no releer 1.500 líneas de spec: entidades, contratos, rutas,
variables de entorno y archivos involved. Tablas, bloques de código, rutas exactas.

---

## 4. Tareas

Ejecutar **en orden**. Cada tarea es un checkbox que el agente tilda **solo** cuando su verificación
se ejecutó con éxito. Cada una indica los archivos que toca y cómo se sabe que está terminada.

### 4.1 <Grupo de tareas>

- [ ] **N.1.1** <qué hacer>
      *Archivo: `<ruta exacta>`*
      Verificación: `<comando>` → `<resultado esperado>`

---

## 5. Verificación

### 5.1 Comandos

- [ ] `<comando>` → `<resultado esperado>`

### 5.2 Pruebas manuales

- [ ] <acción> → <resultado esperado>

---

## 6. Criterios de cierre

- [ ] Verificable y objetivo
- [ ] Verificable y objetivo

---

## 7. Fuera de alcance

Lo que **no** se hace en esta fase, aunque parezca relacionado. Para que el agente no se pase de largo.

---

## 8. Errores frecuentes

| Trampa | Cómo evitarla |
|---|---|

---

## 9. Cierre

- [ ] Commit: `feat: <descripción>`
- [ ] PR contra `develop` con *qué* cambia, *por qué* y requisitos cubiertos.
- [ ] `ESTADO.md` actualizado.
