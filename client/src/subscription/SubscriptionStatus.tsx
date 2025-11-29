import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Calendar, CreditCard, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useMemo } from "react";

type EntitlementState = 'active' | 'expired' | 'none';

interface SubscriptionData {
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

export default function SubscriptionStatus() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: subscriptionData, isLoading, error } = useQuery<SubscriptionData>({
    queryKey: ["/api/subscription/status"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/subscription/status");
        if (!res.ok) {
          throw new Error("Failed to fetch subscription status");
        }
        return (await res.json()) as SubscriptionData;
      } catch (err) {
        // Return default free state on error
        return { 
          subscriptionStatus: "free",
          role: "free"
        } as SubscriptionData;
      }
    },
    retry: 1,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Determine entitlement state with validation
  const entitlementState = useMemo<EntitlementState>(() => {
    if (!subscriptionData) return 'none';
    
    const status = subscriptionData.subscriptionStatus;
    const subscription = subscriptionData.subscription;
    
    // Beta users are always active
    if (subscriptionData.isBetaUser) return 'active';
    
    // No subscription = none state
    if (!subscription && status === 'free') return 'none';
    
    // Check if subscription is expired
    if (subscription) {
      const subStatus = subscription.status;
      const periodEnd = subscription.currentPeriodEnd;
      
      // Check if subscription has expired (past_due or past end date)
      if (subStatus === 'past_due' || subStatus === 'canceled') {
        if (periodEnd) {
          const endDate = new Date(periodEnd);
          const now = new Date();
          // If period has ended, it's expired
          if (endDate < now) {
            return 'expired';
          }
          // If canceled but period hasn't ended, still active until period end
          if (subStatus === 'canceled') {
            return 'active';
          }
        }
        // If past_due and no period end, consider expired
        if (subStatus === 'past_due') {
          return 'expired';
        }
      }
      
      // Check trial expiration
      if (status === 'trial' && subscription.trialEnd) {
        const trialEnd = new Date(subscription.trialEnd);
        const now = new Date();
        if (trialEnd < now) {
          return 'expired';
        }
      }
      
      // Active states
      if (subStatus === 'active' || subStatus === 'trial' || status === 'premium' || status === 'trial') {
        return 'active';
      }
    }
    
    // Default to none if no clear state
    return status === 'free' ? 'none' : 'active';
  }, [subscriptionData]);

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/cancel");
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to cancel subscription");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: "Subscription Canceled",
        description: "Your subscription has been canceled. You'll retain access until the end of your billing period.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  };

  const getDaysUntilExpiration = () => {
    const subscription = subscriptionData?.subscription;
    if (!subscription) return null;
    
    const endDate = subscription.currentPeriodEnd || subscription.trialEnd;
    if (!endDate) return null;
    
    const end = new Date(endDate);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-gray-900">Error Loading Subscription</h3>
              <p className="text-sm text-gray-600">Please try refreshing the page.</p>
            </div>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] })}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render based on entitlement state
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Entitlement Status</CardTitle>
          {entitlementState === 'active' && (
            <Badge className="bg-green-500 text-white">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Active
            </Badge>
          )}
          {entitlementState === 'expired' && (
            <Badge className="bg-red-500 text-white">
              <XCircle className="w-4 h-4 mr-1" />
              Expired
            </Badge>
          )}
          {entitlementState === 'none' && (
            <Badge variant="outline">
              <Clock className="w-4 h-4 mr-1" />
              Free
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ACTIVE STATE UI */}
        {entitlementState === 'active' && (
          <ActiveStateUI 
            subscriptionData={subscriptionData}
            formatDate={formatDate}
            getDaysUntilExpiration={getDaysUntilExpiration}
            cancelMutation={cancelMutation}
            setLocation={setLocation}
          />
        )}

        {/* EXPIRED/CANCELLED STATE UI */}
        {entitlementState === 'expired' && (
          <ExpiredStateUI 
            subscriptionData={subscriptionData}
            formatDate={formatDate}
            setLocation={setLocation}
          />
        )}

        {/* NONE (FREE) STATE UI */}
        {entitlementState === 'none' && (
          <NoneStateUI setLocation={setLocation} />
        )}
      </CardContent>
    </Card>
  );
}

// Active State Component
function ActiveStateUI({ 
  subscriptionData, 
  formatDate, 
  getDaysUntilExpiration,
  cancelMutation,
  setLocation 
}: {
  subscriptionData?: SubscriptionData;
  formatDate: (date?: string) => string;
  getDaysUntilExpiration: () => number | null;
  cancelMutation: any;
  setLocation: (path: string) => void;
}) {
  const subscription = subscriptionData?.subscription;
  const daysLeft = getDaysUntilExpiration();
  const isTrial = subscriptionData?.subscriptionStatus === 'trial';
  const isCanceled = subscription?.status === 'canceled';

  return (
    <>
      <div>
        <h3 className="font-semibold text-gray-900">
          {subscriptionData?.isBetaUser 
            ? "Founder Member" 
            : subscription?.planType === "premium_monthly"
            ? "Premium Monthly"
            : subscription?.planType === "premium_yearly"
            ? "Premium Yearly"
            : isTrial
            ? "Free Trial"
            : "Premium Active"
          }
        </h3>
        <p className="text-sm text-gray-600">
          {subscriptionData?.isBetaUser 
            ? "Lifetime founder access with 50% discount"
            : "Full access to all premium features"
          }
        </p>
      </div>

      {isTrial && daysLeft !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-900">
                {daysLeft} days left in your free trial
              </p>
              <p className="text-sm text-blue-700">
                Trial ends on {formatDate(subscription?.trialEnd)}
              </p>
            </div>
          </div>
        </div>
      )}

      {isCanceled && subscription?.currentPeriodEnd && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-900">Subscription Canceled</p>
              <p className="text-sm text-yellow-700">
                Access continues until {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>
          </div>
        </div>
      )}

      {subscription?.status === "active" && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Next billing date:</span>
            <span className="font-medium">
              {formatDate(subscription.currentPeriodEnd)}
            </span>
          </div>
          
          {subscription.founderDiscount && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Founder discount:</span>
              <span className="font-medium text-green-600">
                {subscription.discountPercent}% off
              </span>
            </div>
          )}
        </div>
      )}

      <div className="pt-4 border-t space-y-2">
        {isTrial && (
          <Button 
            className="w-full bg-brand-dark-green hover:bg-brand-dark-green/90 text-white" 
            size="lg"
            onClick={() => setLocation("/pricing")}
          >
            Upgrade to Premium
          </Button>
        )}

        {subscription?.status === "active" && !isCanceled && (
          <Button
            variant="outline"
            onClick={() => cancelMutation.mutate()}
            disabled={cancelMutation.isPending}
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
          >
            {cancelMutation.isPending ? "Canceling..." : "Cancel Subscription"}
          </Button>
        )}
      </div>
    </>
  );
}

// Expired/Cancelled State Component
function ExpiredStateUI({ 
  subscriptionData, 
  formatDate,
  setLocation 
}: {
  subscriptionData?: SubscriptionData;
  formatDate: (date?: string) => string;
  setLocation: (path: string) => void;
}) {
  const subscription = subscriptionData?.subscription;

  return (
    <>
      <div>
        <h3 className="font-semibold text-gray-900">Subscription Expired</h3>
        <p className="text-sm text-gray-600">
          Your subscription has expired. Renew to regain access to premium features.
        </p>
      </div>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <XCircle className="w-5 h-5 text-red-600" />
          <div>
            <p className="font-semibold text-red-900">Access Expired</p>
            {subscription?.currentPeriodEnd && (
              <p className="text-sm text-red-700">
                Expired on {formatDate(subscription.currentPeriodEnd)}
              </p>
            )}
            {subscription?.trialEnd && (
              <p className="text-sm text-red-700">
                Trial ended on {formatDate(subscription.trialEnd)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t">
        <Button 
          className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white" 
          size="lg"
          onClick={() => setLocation("/pricing")}
        >
          Renew Subscription
        </Button>
      </div>
    </>
  );
}

// None (Free) State Component
function NoneStateUI({ setLocation }: { setLocation: (path: string) => void }) {
  return (
    <>
      <div>
        <h3 className="font-semibold text-gray-900">Free Plan</h3>
        <p className="text-sm text-gray-600">
          Limited access to basic features. Upgrade to unlock premium content.
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <div>
            <p className="font-semibold text-gray-900">No Active Subscription</p>
            <p className="text-sm text-gray-700">
              Start a free trial to access premium features
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t">
        <Button 
          className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white" 
          size="lg"
          onClick={() => setLocation("/pricing")}
        >
          Start Free Trial
        </Button>
      </div>
    </>
  );
}
