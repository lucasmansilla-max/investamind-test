import { useEffect, useState, useCallback } from "react";
import {
  Purchases,
  LOG_LEVEL,
  CustomerInfo,
} from "@revenuecat/purchases-capacitor";

const ENTITLEMENT_NAME = "Investamind Pro"; // reemplaza por tu entitlement real (ver revenue cat dashboard)

export function usePurchases(appUserId?: string) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isPaid, setIsPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const configure = useCallback(async () => {
    try {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
      const apiKey = "test_tYbKhCzhifEmkMbTJZoFaaDIPkk";
      await Purchases.configure({ apiKey, appUserID: appUserId });

      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info.customerInfo);
      setIsPaid(
        Boolean(info.customerInfo.entitlements?.active?.[ENTITLEMENT_NAME]),
      );
      setIsLoading(false);

      await Purchases.addCustomerInfoUpdateListener((updatedInfo) => {
        setCustomerInfo(updatedInfo);
        setIsPaid(
          Boolean(updatedInfo?.entitlements?.active?.[ENTITLEMENT_NAME]),
        );
      });
    } catch (e) {
      console.error("Purchases configure error", e);
      setIsLoading(false);
    }
  }, [appUserId]);

  useEffect(() => {
    configure();
  }, [configure]);

  const restorePurchases = useCallback(async () => {
    try {
      await Purchases.restorePurchases();
      const updated = await Purchases.getCustomerInfo();
      setCustomerInfo(updated.customerInfo);
      setIsPaid(
        Boolean(updated.customerInfo.entitlements?.active?.[ENTITLEMENT_NAME]),
      );
      return updated;
    } catch (e) {
      throw e;
    }
  }, []);

  return { customerInfo, isPaid, isLoading, restorePurchases };
}
