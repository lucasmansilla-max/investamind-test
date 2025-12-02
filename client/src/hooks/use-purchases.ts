import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  LOG_LEVEL,
  CustomerInfo,
} from "@revenuecat/purchases-capacitor";
import { queryClient, apiRequest } from "@/lib/queryClient";

const ENTITLEMENT_NAME = "Investamind Pro";

/**
 * Invalidates subscription-related queries
 */
function invalidateSubscriptionQueries(userId?: string) {
  queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
  if (userId && userId !== 'undefined') {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  }
}

/**
 * Sincroniza el estado de RevenueCat con el backend
 */
async function syncWithBackend(customerInfo: CustomerInfo, userId?: string) {
  // Solo sincronizar si hay un usuario autenticado
  if (!userId) return;
  
  try {
    const hasActiveEntitlement = Boolean(
      customerInfo.entitlements?.active?.[ENTITLEMENT_NAME]
    );

    if (hasActiveEntitlement) {
      // Llamar al endpoint de sincronización del backend usando apiRequest que funciona en Android
      try {
        const response = await apiRequest("POST", "/api/revenuecat/sync", {
          entitlements: customerInfo.entitlements,
          activeSubscriptions: customerInfo.activeSubscriptions,
        });

        if (response.ok) {
          invalidateSubscriptionQueries(userId);
        }
      } catch (error) {
        console.error("Error calling sync endpoint:", error);
        invalidateSubscriptionQueries(userId);
      }
    } else {
      invalidateSubscriptionQueries(userId);
    }
  } catch (error) {
    console.error("Error syncing with backend:", error);
    invalidateSubscriptionQueries(userId);
  }
}

export function usePurchases(appUserId?: string) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const configure = useCallback(async () => {
    // No configurar RevenueCat si no hay usuario autenticado
    if (!appUserId) {
      setIsLoading(false);
      return;
    }

    // Solo configurar RevenueCat en plataformas nativas (iOS/Android)
    // En web, RevenueCat no funciona correctamente
    if (!Capacitor.isNativePlatform()) {
      setIsLoading(false);
      setIsPaid(false);
      return;
    }

    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      const apiKey = "test_tYbKhCzhifEmkMbTJZoFaaDIPkk";
      await Purchases.configure({ apiKey, appUserID: appUserId });

      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info.customerInfo);
      const hasActiveEntitlement = Boolean(
        info.customerInfo.entitlements?.active?.[ENTITLEMENT_NAME]
      );
      setIsPaid(hasActiveEntitlement);
      setIsLoading(false);

      // Sincronizar con el backend
      if (hasActiveEntitlement) {
        await syncWithBackend(info.customerInfo, appUserId);
      }

      await Purchases.addCustomerInfoUpdateListener(async (updatedInfo) => {
        // Solo sincronizar si hay usuario autenticado
        if (!appUserId) return;
        
        setCustomerInfo(updatedInfo);
        const hasActive = Boolean(
          updatedInfo?.entitlements?.active?.[ENTITLEMENT_NAME]
        );
        setIsPaid(hasActive);
        
        // Sincronizar con el backend cuando hay cambios
        await syncWithBackend(updatedInfo, appUserId);
      });
    } catch (e) {
      console.error("Error configuring RevenueCat:", e);
      setIsLoading(false);
      setIsPaid(false);
      // No lanzar el error, solo registrar y continuar
    }
  }, [appUserId]);

  useEffect(() => {
    configure();
  }, [configure]);

  const restorePurchases = useCallback(async () => {
    // Solo restaurar en plataformas nativas
    if (!Capacitor.isNativePlatform() || !appUserId) {
      return null;
    }

    try {
      await Purchases.restorePurchases();
      const updated = await Purchases.getCustomerInfo();
      setCustomerInfo(updated.customerInfo);
      const hasActive = Boolean(
        updated.customerInfo.entitlements?.active?.[ENTITLEMENT_NAME]
      );
      setIsPaid(hasActive);
      
      // Sincronizar con el backend después de restaurar
      await syncWithBackend(updated.customerInfo, appUserId);
      
      return updated;
    } catch (e) {
      console.error("Error restoring purchases:", e);
      return null;
    }
  }, [appUserId]);

  return { customerInfo, isPaid, isLoading, restorePurchases };
}
