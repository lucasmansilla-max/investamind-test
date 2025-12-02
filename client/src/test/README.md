# Tests de UI por Roles

Esta suite de tests cubre todos los aspectos de comportamiento de UI según roles de usuario (Admin vs User).

## Cobertura de Tests

### ✅ 1. Componentes Condicionales según Rol
- **Home.test.tsx**: Verifica que el botón de admin solo se muestre para usuarios admin
- **MessageTypeModal.test.tsx**: Verifica filtrado de tipos de mensaje según rol

### ✅ 2. Ocultación/Mostrado de Features Premium
- **PremiumGate.test.tsx**: Verifica bloqueo de contenido premium para usuarios free
- **ExpandableModuleCard.test.tsx**: Verifica restricciones de acceso a módulos

### ✅ 3. Restricciones Visuales para Usuarios Free
- **ExpandableModuleCard.test.tsx**: Verifica opacidad, badges y prompts de upgrade
- **MessageTypeModal.test.tsx**: Verifica iconos de candado y estados deshabilitados

### ✅ 4. Badges y Notificaciones de Estado de Suscripción
- **RoleBadge.test.tsx**: Verifica display de badges según rol
- **SubscriptionStatus.test.tsx**: Verifica badges de estado (Active, Expired, Free)

### ✅ 5. Testing de Comportamiento de UI por Rol
- **use-subscription-status.test.ts**: Verifica lógica de acceso premium
- Todos los tests anteriores verifican comportamiento específico por rol

## Ejecutar Tests

```bash
# Ejecutar tests en modo watch
npm test

# Ejecutar tests una vez
npm run test:run

# Ejecutar tests con UI interactiva
npm run test:ui

# Ejecutar tests con cobertura
npm run test:coverage
```

## Estructura de Tests

```
client/src/
├── test/
│   ├── setup.ts                    # Configuración global de tests
│   └── README.md                   # Este archivo
├── components/
│   ├── RoleBadge.test.tsx          # Tests de badges de rol
│   └── upgrade-prompts/
│       └── PremiumGate.test.tsx   # Tests de bloqueo premium
├── community/
│   └── MessageTypeModal.test.tsx  # Tests de filtrado por rol
├── subscription/
│   └── SubscriptionStatus.test.tsx # Tests de estado de suscripción
├── pages/
│   └── home.test.tsx               # Tests de componentes condicionales
├── hooks/
│   └── use-subscription-status.test.ts # Tests de hooks
└── expandable-module-card.test.tsx # Tests de restricciones visuales
```

## Casos de Prueba Cubiertos

### Roles Testeados
- ✅ Admin
- ✅ Premium
- ✅ Legacy
- ✅ Free
- ✅ Beta Users

### Estados de Suscripción Testeados
- ✅ Active
- ✅ Trial
- ✅ Expired
- ✅ Free/None
- ✅ Canceled

### Componentes Testeados
- ✅ RoleBadge (display condicional)
- ✅ PremiumGate (bloqueo de contenido)
- ✅ MessageTypeModal (filtrado de tipos)
- ✅ ExpandableModuleCard (restricciones visuales)
- ✅ SubscriptionStatus (badges y notificaciones)
- ✅ Home (botón admin condicional)
- ✅ useHasPremiumAccess (lógica de acceso)
- ✅ useSubscriptionStatus (obtención de estado)

## Notas

- Los tests usan Vitest como framework de testing
- React Testing Library para renderizado y queries
- jsdom como entorno de DOM
- Todos los mocks necesarios están configurados en cada archivo de test

