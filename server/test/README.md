# Tests de Seguridad del Backend

Esta suite de tests cubre todos los aspectos de seguridad de endpoints del backend, incluyendo autenticación, autorización y control de acceso basado en roles.

## Cobertura de Tests

### ✅ 1. Middlewares de Autenticación (`server/middlewares/auth.test.ts`)

- **requireAuth**: Verifica que rechaza usuarios no autenticados (401)
- **requireAdmin**: Verifica que rechaza usuarios no admin (403)
- **requirePremium**: Verifica que rechaza usuarios sin suscripción premium (403)
- **requireTradingAlerts**: Verifica que rechaza usuarios sin acceso a trading alerts (403)
- **requireViewTradingAlerts**: Verifica que rechaza usuarios sin acceso para ver trading alerts (403)
- **requireCourses**: Verifica que rechaza usuarios sin acceso a cursos (403)

### ✅ 2. Endpoints de Admin (`server/modules/admin/routes.test.ts`)

- **GET /api/admin/webhook-logs**: Verifica protección con requireAuth + requireAdmin
- **GET /api/admin/webhook-logs/:id**: Verifica protección con requireAuth + requireAdmin
- **GET /api/admin/users**: Verifica protección con requireAuth + requireAdmin

### ✅ 3. Endpoints de Suscripción (`server/modules/subscription/routes.test.ts`)

- **GET /api/subscription/status**: Verifica que requiere autenticación
- **POST /api/subscription/admin/beta-users/grant-access**: Verifica protección admin
- **GET /api/subscription/admin/subscriptions**: Verifica protección admin

### ✅ 4. Endpoints de Comunidad (`server/modules/community/routes.test.ts`)

- **GET /api/community/posts**: Verifica autenticación y filtrado de trading alerts
- **POST /api/community/posts**: Verifica validación de roles para:
  - Crear trading alerts (requiere premium)
  - Crear anuncios (requiere admin)

### ✅ 5. Endpoints de Módulos (`server/modules/modules/routes.test.ts`)

- **GET /api/modules**: Verifica que requiere acceso premium
- **GET /api/modules/:id**: Verifica que requiere acceso premium
- Prueba todos los roles: admin, premium, legacy, beta, trial, free

### ✅ 6. Endpoints Principales (`server/routes.test.ts`)

- **GET /api/content/access-check**: Verifica validación de acceso a contenido:
  - Cursos/módulos
  - Trading alerts
  - Contenido básico (basic_module_1, community_read)

## Ejecutar Tests

```bash
# Ejecutar todos los tests
npm test

# Ejecutar solo tests del servidor
npm test server

# Ejecutar tests con UI interactiva
npm run test:ui

# Ejecutar tests con cobertura
npm run test:coverage
```

## Casos de Prueba Cubiertos

### Códigos de Estado HTTP

- ✅ **401 Unauthorized**: Usuario no autenticado
- ✅ **403 Forbidden**: Usuario autenticado pero sin permisos
- ✅ **404 Not Found**: Recurso no encontrado

### Roles Testeados

- ✅ **Admin**: Acceso completo a todos los endpoints
- ✅ **Premium**: Acceso a contenido premium
- ✅ **Legacy**: Acceso a contenido premium
- ✅ **Free**: Acceso limitado a contenido básico
- ✅ **Beta Users**: Acceso a contenido premium

### Validaciones de Seguridad

- ✅ Autenticación requerida en endpoints protegidos
- ✅ Validación de roles en endpoints críticos
- ✅ Protección de endpoints de admin
- ✅ Validación de suscripción activa para contenido premium
- ✅ Filtrado de contenido según permisos del usuario

## Estructura de Tests

```
server/
├── middlewares/
│   └── auth.test.ts              # Tests de middlewares de autenticación
├── modules/
│   ├── admin/
│   │   └── routes.test.ts        # Tests de endpoints de admin
│   ├── subscription/
│   │   └── routes.test.ts        # Tests de endpoints de suscripción
│   ├── community/
│   │   └── routes.test.ts        # Tests de endpoints de comunidad
│   └── modules/
│       └── routes.test.ts        # Tests de endpoints de módulos
├── routes.test.ts                # Tests de endpoints principales
└── test/
    └── README.md                 # Este archivo
```

## Notas

- Los tests usan **Vitest** como framework de testing
- Se mockean los middlewares y servicios para aislar las pruebas
- Se verifican los códigos de estado HTTP correctos (401, 403)
- Se prueban todos los roles y estados de suscripción
- Los tests son independientes y pueden ejecutarse en cualquier orden

