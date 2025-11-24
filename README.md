# Investamind – Plan de Puesta en Marcha

Este documento resume todo lo que falta (frontend y backend), pasos necesarios para levantar el proyecto y una estimación de esfuerzo total.

---

## Panorama Actual

- **Backend** en `server/`: Express + Socket.IO + Drizzle ORM apuntando a Postgres (Neon). Usa alias `@shared` para esquemas Drizzle.
- **Frontend** en `client/`: React (Vite), Tailwind y un set de componentes UI (ShadCN), pero faltan hooks, páginas y utilidades clave.
- **Infraestructura**: sólo hay una migración SQL (extensión `pg_trgm`) y no existe la carpeta `shared/` con los esquemas que el código importa.

---

## Backend – Pendientes

### 1. Estructura y Migraciones

- [ ] Crear la carpeta `shared/` y mover `schema.ts` allí (`@shared/schema` debe resolver).
- [ ] Regenerar migraciones Drizzle completas (`drizzle-kit generate`) para todas las tablas definidas en `schema.ts`.
- [ ] Ejecutar migraciones en una base Postgres real (`drizzle-kit push` o pipeline equivalente).
- [ ] Preparar datos seed mínimos (usuarios, módulos, posts) para que las rutas no devuelvan vacío.

### 2. Configuración y Entorno

- [ ] Documentar variables de entorno (`.env.example`):
  - `DATABASE_URL`
  - `SESSION_SECRET`
  - `CLIENT_ORIGINS`
  - Credenciales S3/R2 (`S3_BUCKET`, `S3_ACCESS_KEY_ID`, etc.)
  - Stripe (`STRIPE_SECRET_KEY`, `STRIPE_MONTHLY_PRICE_ID`, `STRIPE_YEARLY_PRICE_ID`)
  - Opcionales: dominios, claves de analítica, etc.
- [ ] Validar carga de variables en `config/env.ts` y propagar defaults seguros para desarrollo.

### 3. Sesiones y Autenticación

- [ ] Reemplazar el `Map` en memoria por un store persistente (Redis o tabla `sessions`).
- [ ] Integrar middleware de sesión que verifique cookies y `req.user` antes de las rutas (ahora cada endpoint se autovalida).
- [ ] Asegurar expiración y revocación de sesiones.

### 4. Correcciones Funcionales

- [ ] Sustituir los incrementos `db.$count(...)` por expresiones válidas (uso de `sql\`\${field} + 1\``) en likes, reposts, etc.
- [ ] Consolidar rutas duplicadas (`/api/subscription/create-trial` aparece dos veces).
- [ ] Revisar módulos que aún retornan datos stub (ej. comentarios en `DbStorage`).
- [ ] Ajustar `public/sw.js` o eliminarlo para que no intente cachear rutas tipo CRA.
- [ ] Añadir pruebas básicas (smoke tests de rutas críticas y servicios).

### 5. Infraestructura Complementaria

- [ ] Script para iniciar/sembrar la BD (p. ej. `npm run db:seed`).
- [ ] Pipeline de lint/test (`npm run check`) y revisión de TypeScript.
- [ ] Documentar cómo iniciar el servidor (`npm install`, `npm run dev`, etc.).

---

## Frontend – Pendientes

### 1. Arquitectura Básica

- [ ] Crear `client/src/lib/queryClient.ts` con la instancia de React Query.
- [ ] Implementar hooks esenciales:
  - `useAuth` (estado de autenticación, carga, mutaciones básicas).
  - `useNotifications` (suscripción a Socket.IO y fetch inicial).
- [ ] Definir `LanguageSelectionModal` y otros modales clave usados por `App.tsx`.

### 2. Páginas y Rutas

Para cada ruta mencionada en `App.tsx`, crear componente (aunque sea minimal):

- `/` → `Home`
- `/signup` → `Signup`
- `/language` → `LanguageSelection`
- `/learning-path` → `LearningPath`
- `/learning` → `LearningDashboard`
- `/module/:id` y `/module/:moduleId/lesson/:lessonId` → `Module`, `LessonContent`
- `/progress` → `Progress`
- `/premium`, `/pricing`, `/upgrade` → `Premium`, `Pricing`
- `/community` → `Community`
- `/admin` → `Admin`
- `/not-found` → `NotFound`

Cada página debería:

- Mostrar layout móvil consistente (según Tailwind).
- Integrarse con el backend (fetch de módulos, progreso, posts, etc.).
- Manejar estados de carga/errores.

### 3. Componentes de UI y Estado

- [ ] Barra de navegación con rutas reales.
- [ ] Formularios de autenticación conectados a las rutas `/api/auth/*`.
- [ ] Vistas para comunidad (timeline, likes, comentarios) conectadas al backend.
- [ ] Panel de progreso y módulos que lean los endpoints `/api/modules`, `/api/progress`.
- [ ] Gestión de suscripciones (trial, upgrade, estado) conectada a `/api/subscription/*`.

### 4. Internacionalización

- [ ] Revisar `LanguageProvider` para que las páginas usen `t()` y ofrezcan contenido traducido.
- [ ] Validar persistencia de idioma (localStorage/sessionStorage).

### 5. Calidad

- [ ] Configurar linting y formateo (ESLint, Prettier).
- [ ] Añadir pruebas unitarias básicas (React Testing Library) para hooks críticos.
- [ ] Documentar cómo levantar la app (`npm install`, `npm run dev` en `client/` o raíz).

---

## Servicio Worker / PWA

- [ ] Reescribir `public/sw.js` para adaptarlo a Vite (precaching usando Workbox o eliminarlo hasta tener estrategia).
- [ ] Verificar manifest y assets (favicon, iconos) coherentes.
- [ ] Documentar cómo probar modo PWA.

---

## Estimación de Esfuerzo

| Área     | Tarea                                                                   | Horas estimadas |
| -------- | ----------------------------------------------------------------------- | --------------- |
| Backend  | Reorganizar `@shared`, generar migraciones, ejecutar en DB real         | 12              |
| Backend  | Seed de datos iniciales y guías                                         | 6               |
| Backend  | Sustituir `db.$count`, duplicados, revisar rutas críticas               | 4               |
| Backend  | Implementar store de sesiones y middleware                              | 8               |
| Backend  | Documentación de entorno, scripts de seed/start, README                 | 6               |
| Backend  | Ajustar service worker (lado servidor) y pruebas smoke                  | 4               |
| Frontend | Hooks base (`useAuth`, `useNotifications`), `queryClient`, modal idioma | 8               |
| Frontend | Páginas mínimas con placeholders + routing funcional                    | 16              |
| Frontend | Integraciones reales con API (auth, módulos, comunidad, suscripciones)  | 20              |
| Frontend | Ajustes de UI/UX, internacionalización, feedback de errores             | 10              |
| Frontend | Tests básicos y linting                                                 | 6               |
| PWA      | Revisar `sw.js`, manifest, documentación                                | 4               |

**Total aproximado:** **104 horas** (alrededor de 13 días laborales).  
Incluye el frontend con contenido real conectado al backend. Ajusta según complejidad adicional (diseño, QA, integración continua, etc.).

---

## Puesta en Marcha – Checklist Rápido

1. **Backend**

   - Clonar repo y crear `.env` con credenciales.
   - Ejecutar `npm install`.
   - Generar migraciones (`npx drizzle-kit generate`) y aplicarlas (`npm run db:push` o script equivalente).
   - Ejecutar script de seed (una vez implementado).
   - Levantar servidor con `npm run dev`.

2. **Frontend**

   - Completar hooks/páginas pendientes.
   - Ejecutar `npm run dev` (desde la raíz o `client/` según ajustes de Vite).
   - Verificar comunicación con backend y Socket.IO.

3. **QA**

   - Correr lint/tests (`npm run check`, `npm run test`).
   - Probar flujo de autenticación, feed de comunidad, progreso y suscripciones.
   - Revisar logs de servidor (pino) y correcciones necesarias.

4. **Deployment**
   - Configurar hosting (API y frontend).
   - Establecer variables de entorno en producción.
   - Configurar servicios externos (Neon, Stripe, S3/R2).
   - Monitoreo/logging (Pino + transport a servicio externo, métricas).

---

## Notas Finales

- Prioriza primero la capa de datos (migraciones + seed) para validar todas las rutas.
- A medida que avances en el frontend, prueba cada endpoint para detectar inconsistencias tempranas.
- Ajusta la estimación si se agregan requisitos de diseño, animaciones o contenido educativo detallado.

Con todo lo anterior implementado, la aplicación debería levantarse end-to-end en ambientes de desarrollo y preparación para producción.
