import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface SubscriptionStatusData {
  subscription?: {
    id: number;
    status: string;
    planType: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    trialStart?: string;
    trialEnd?: string;
    canceledAt?: string;
    founderDiscount?: boolean;
    discountPercent?: number;
  };
  subscriptionStatus?: string;
  role?: string;
  isBetaUser?: boolean;
}

/**
 * Hook to get user subscription status and role
 * Uses React Query to cache the result and avoid duplicate requests
 */
export function useSubscriptionStatus() {
  return useQuery<SubscriptionStatusData>({
    queryKey: ["/api/subscription/status"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/subscription/status");
        return (await res.json()) as SubscriptionStatusData;
      } catch (err) {
        // Return default free role on error
        return { role: 'free' } as SubscriptionStatusData;
      }
    },
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

/**
 * Check if user has premium access (premium, legacy, or admin role)
 * This logic mirrors the server-side hasPremiumAccess function for consistency
 */
export function useHasPremiumAccess() {
  const { data: subscriptionData } = useSubscriptionStatus();
  
  const hasPremiumAccess = useMemo(() => {
    if (!subscriptionData) return false;
    
    const role = subscriptionData.role || 'free';
    
    // Admin has all access
    if (role === 'admin') return true;
    
    // Legacy and premium have premium access
    if (role === 'legacy' || role === 'premium') return true;
    
    // Beta users have premium access (backward compatibility)
    if (subscriptionData.isBetaUser) return true;
    
    // Check subscription status for backward compatibility
    const status = subscriptionData.subscriptionStatus;
    if (status === "premium" || status === "trial") return true;
    
    return false;
  }, [subscriptionData]);
  
  return {
    hasPremiumAccess,
    subscriptionData,
  };
}

