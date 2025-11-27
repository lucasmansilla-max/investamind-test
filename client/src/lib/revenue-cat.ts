import { RevenueCatUI } from "@revenuecat/purchases-capacitor-ui";
import { PAYWALL_RESULT } from "@revenuecat/purchases-capacitor";

export async function presentPaywall(): Promise<boolean> {
  // Present paywall for current offering:
  const { result } = await RevenueCatUI.presentPaywall();

  console.log({ result });

  // Handle result if needed.
  switch (result) {
    case PAYWALL_RESULT.NOT_PRESENTED:
    case PAYWALL_RESULT.ERROR:
    case PAYWALL_RESULT.CANCELLED:
      return false;
    case PAYWALL_RESULT.PURCHASED:
    case PAYWALL_RESULT.RESTORED:
      return true;
    default:
      return false;
  }
}

// async function presentPaywallIfNeeded() {
//   // Present paywall for current offering:
//   const { result } = await RevenueCatUI.presentPaywallIfNeeded({
//     requiredEntitlementIdentifier: "YOUR_ENTITLEMENT_ID",
//   });

//   // If you need to present a specific offering:
//   const { result } = await RevenueCatUI.presentPaywallIfNeeded({
//     offering: offering, // Optional Offering object obtained through getOfferings
//     requiredEntitlementIdentifier: "pro",
//   });

//   // Handle result if needed.
// }
