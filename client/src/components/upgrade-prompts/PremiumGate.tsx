import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Crown, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface PremiumGateProps {
  requiredPlan?: "premium" | "trial";
  contentType?: string;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function PremiumGate({ 
  requiredPlan = "premium", 
  contentType, 
  children, 
  title = "Premium Content",
  description = "Upgrade to access this feature"
}: PremiumGateProps) {
  const [, setLocation] = useLocation();

  const { data: subscriptionData } = useQuery<{ subscription?: any; subscriptionStatus?: string; role?: string; isBetaUser?: boolean }>({
    queryKey: ["/api/subscription/status"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/subscription/status");
        return (await res.json()) as { subscription?: any; subscriptionStatus?: string; role?: string; isBetaUser?: boolean };
      } catch (err) {
        // Return an empty object on error/unauthorized so callers can safely check properties
        return {} as { subscription?: any; subscriptionStatus?: string; role?: string; isBetaUser?: boolean };
      }
    },
    // Keep this status query stable and avoid unexpected refetches
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Check if user has access based on role
  const hasAccess = () => {
    const role = subscriptionData?.role || 'free';
    
    // Admin has all access
    if (role === 'admin') return true;
    
    // Legacy and premium have premium access
    if (role === 'legacy' || role === 'premium') return true;
    
    // Beta users have premium access (backward compatibility)
    if (subscriptionData?.isBetaUser) return true;
    
    // Check subscription status for backward compatibility
    const status = subscriptionData?.subscriptionStatus;
    if (status === "premium" || status === "trial") return true;
    if (requiredPlan === "trial" && (status === "trial" || status === "premium")) return true;
    
    // Free access to basic content
    if (contentType === "basic_module_1" || contentType === "community_read") return true;
    
    return false;
  };

  if (hasAccess()) {
    return <>{children}</>;
  }

  return (
    <Card className="border-2 border-dashed border-brand-light-green bg-brand-light-green/20">
      <CardContent className="p-6 text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-brand-dark-green to-brand-orange rounded-full flex items-center justify-center mx-auto mb-3">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-lg font-bold text-brand-dark-green mb-2">{title}</h3>
          <p className="text-brand-dark-green/70 text-sm mb-4">{description}</p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => setLocation("/pricing")}
            className="w-full bg-gradient-to-r from-brand-dark-green to-brand-orange hover:from-brand-dark-green/90 hover:to-brand-orange/90 text-white"
            size="lg"
          >
            <Crown className="w-5 h-5 mr-2" />
            Upgrade to Premium
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          {!subscriptionData?.subscription && (
            <p className="text-xs text-brand-dark-green/60">
              Start with a 7-day free trial • No credit card required
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}