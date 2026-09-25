# Deploy

> **Vacío a propósito hasta la Fase 7.** Este archivo es el índice de las tareas
> de despliegue. La Fase 7 (Impresión, exportación y auditoría) las escribe con
> los comandos reales, verificados contra un entorno de pruebas.
>
> No poner acá secretos, credenciales ni cadenas de conexión. Los scripts de
> respaldo talking to producción leen todo del entorno.

---

## 1. Pendiente para la Fase 7

| # | Tarea | Qué exige | Estado |
|---|---|---|---|
| D-1 | Respaldo automatizado | `mysqldump` diario, rotación y retención definida | `PENDIENTE` |
| D-2 | Restauración **probada** | Restaurar un dump en un entorno limpio y comprobar el login | `PENDIENTE` |
| D-3 | HTTPS | Certificado, renovación y redirección `http` → `https` | `PENDIENTE` |
| D-4 | PM2 | Arranque, auto-restart, `ecosystem.config.*` sin secretos | `PENDIENTE` |
| D-5 | Nginx | Reverse proxy a `:4000`, cabeceras de seguridad, límite de tasa | `PENDIENTE` |
| D-6 | Variables de producción | `.env` de producción **fuera** del repositorio | `PENDIENTE` |
| D-7 | Migraciones en producción | `prisma migrate deploy` (nunca `migrate dev`) | `PENDIENTE` |
| D-8 | Verificación posterior al deploy | `GET /api/health` responde `database: "up"` | `PENDIENTE` |

## 2. Reglas que ya rigen desde la Fase 1

1. **Nunca** `prisma migrate reset` contra staging o producción.
2. `.env` no se versiona. En producción, variables del sistema o gestor de secretos.
3. HTTPS obligatorio fuera del entorno local.
4. `GET /api/health` es el sonda de disponibilidad: `200` con `database: "up"`.
5. El despliegue de la Fase 1 es manual: `npm ci && npm run build` en cada proyecto.

## 3. Puertos en desarrollo

| Servicio | Puerto |
|---|---|
| Backend (NestJS) | `4000` |
| Frontend (Next.js) | `3000` |

> Si el puerto está ocupado, Next avisa por consola y usa el siguiente libre
> (típicamente `3001`). En ese caso hay que **sumar el puerto real** a
> `CORS_ORIGINS` del backend: `http://localhost:3001`.
