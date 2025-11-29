import { RevenueCatUI } from "@revenuecat/purchases-capacitor-ui";
import { PAYWALL_RESULT, Purchases } from "@revenuecat/purchases-capacitor";
import { queryClient, apiRequest } from "./queryClient";

/**
 * Sincroniza el estado de RevenueCat con el backend después de una compra
 * Funciona tanto en web como en Android/iOS
 */
async function syncSubscriptionWithBackend() {
  try {
    // Obtener la información más reciente del cliente
    const customerInfo = await Purchases.getCustomerInfo();
    
    // Enviar al backend para sincronizar usando fetch directamente para mejor control de errores
    const response = await fetch("/api/revenuecat/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        entitlements: customerInfo.customerInfo.entitlements,
        activeSubscriptions: customerInfo.customerInfo.activeSubscriptions,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[RevenueCat] Failed to sync subscription with backend:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      return false;
    }

    await response.json();
    
    // Invalidar queries para refrescar el estado
    queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    
    return true;
  } catch (error) {
    console.error("[RevenueCat] Error syncing subscription with backend:", error);
    return false;
  }
}

export async function presentPaywall(): Promise<boolean> {
  // Present paywall for current offering
  const { result } = await RevenueCatUI.presentPaywall();

  // Handle result
  switch (result) {
    case PAYWALL_RESULT.NOT_PRESENTED:
    case PAYWALL_RESULT.ERROR:
    case PAYWALL_RESULT.CANCELLED:
      return false;
    case PAYWALL_RESULT.PURCHASED:
    case PAYWALL_RESULT.RESTORED:
      // Sincronizar inmediatamente con el backend
      await syncSubscriptionWithBackend();
      
      // Invalidar queries para asegurar que el frontend se actualice
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      return true;
    default:
      return false;
  }
}
