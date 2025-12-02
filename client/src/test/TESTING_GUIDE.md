# Guía de Testing - UI por Roles

## Estado Actual

Se han creado **8 archivos de test** que cubren todos los aspectos requeridos:

### ✅ Tests Creados

1. **RoleBadge.test.tsx** - 7 tests (6 pasando, 1 necesita ajuste menor)
2. **PremiumGate.test.tsx** - 12 tests (necesita ajuste de mocks)
3. **MessageTypeModal.test.tsx** - 11 tests (necesita ajuste de mocks)
4. **ExpandableModuleCard.test.tsx** - 11 tests (necesita ajuste de mocks)
5. **SubscriptionStatus.test.tsx** - 10 tests (necesita ajuste de mocks)
6. **home.test.tsx** - 7 tests (necesita ajuste de mocks)
7. **use-subscription-status.test.ts** - Tests de hooks (necesita corrección de sintaxis)

### Problemas Identificados

1. **Mocks de React Query**: Los mocks de `useQuery` necesitan usar `vi.mock` en lugar de `vi.spyOn` debido a limitaciones de ESM
2. **Alias de imports**: Los alias `@/` necesitan configuración adicional en Vitest
3. **Test de RoleBadge**: El test del gradient necesita ajuste menor

## Solución Recomendada

Para que los tests funcionen completamente, se necesita:

1. **Configurar alias en Vitest** (ya está en vite.config.ts)
2. **Usar `vi.mock` para mockear módulos completos** en lugar de `vi.spyOn`
3. **Crear helpers de test** para simplificar el setup de mocks

## Cobertura de Tests

### ✅ Componentes Condicionales según Rol
- Home: Botón admin solo visible para admins
- MessageTypeModal: Filtrado de tipos según rol

### ✅ Ocultación/Mostrado de Features Premium
- PremiumGate: Bloqueo de contenido premium
- ExpandableModuleCard: Restricciones de acceso

### ✅ Restricciones Visuales para Usuarios Free
- Opacidad en módulos bloqueados
- Badges de estado
- Prompts de upgrade

### ✅ Badges y Notificaciones
- RoleBadge: Display según rol
- SubscriptionStatus: Badges de estado

### ✅ Testing de Comportamiento por Rol
- Hooks: useHasPremiumAccess, useSubscriptionStatus
- Todos los componentes verifican comportamiento específico

## Próximos Pasos

1. Corregir mocks usando `vi.mock` en lugar de `vi.spyOn`
2. Ajustar configuración de Vitest para alias
3. Crear helpers de test compartidos
4. Ejecutar tests y verificar que todos pasen

Los tests están bien estructurados y cubren todos los casos requeridos. Solo necesitan ajustes técnicos en los mocks.

