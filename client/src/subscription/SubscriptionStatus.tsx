import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Calendar, CreditCard, AlertTriangle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function SubscriptionStatus() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ["/api/subscription/status"],
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/subscription/cancel", {
        method: "POST",
      });
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
        description: error.message || "Failed to cancel subscription",
        variant: "destructive",
      });
    },
  });

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

  const getStatusBadge = () => {
    const status = subscriptionData?.subscriptionStatus;
    const subscription = subscriptionData?.subscription;

    if (subscriptionData?.isBetaUser) {
      return (
        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <Crown className="w-4 h-4 mr-1" />
          Founder Member
        </Badge>
      );
    }

    switch (status) {
      case "trial":
        return (
          <Badge className="bg-blue-500 text-white">
            <Calendar className="w-4 h-4 mr-1" />
            Free Trial
          </Badge>
        );
      case "premium":
        return (
          <Badge className="bg-green-500 text-white">
            <CreditCard className="w-4 h-4 mr-1" />
            Premium Active
          </Badge>
        );
      case "free":
      default:
        return (
          <Badge variant="outline">
            Free Plan
          </Badge>
        );
    }
  };

  const getTrialDaysLeft = () => {
    if (!subscriptionData?.subscription?.trialEnd) return null;
    
    const trialEnd = new Date(subscriptionData.subscription.trialEnd);
    const now = new Date();
    const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.max(0, daysLeft);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getPlanName = () => {
    const planType = subscriptionData?.subscription?.planType;
    switch (planType) {
      case "premium_monthly":
        return "Premium Monthly";
      case "premium_yearly":
        return "Premium Yearly";
      default:
        return "Free Plan";
    }
  };

  const trialDaysLeft = getTrialDaysLeft();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Subscription Status</CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900">{getPlanName()}</h3>
          <p className="text-sm text-gray-600">
            {subscriptionData?.isBetaUser 
              ? "Lifetime founder access with 50% discount"
              : subscriptionData?.subscriptionStatus === "free"
              ? "Limited access to basic features"
              : "Full access to all premium features"
            }
          </p>
        </div>

        {subscriptionData?.subscriptionStatus === "trial" && trialDaysLeft !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-semibold text-blue-900">
                  {trialDaysLeft} days left in your free trial
                </p>
                <p className="text-sm text-blue-700">
                  Trial ends on {formatDate(subscriptionData.subscription.trialEnd)}
                </p>
              </div>
            </div>
          </div>
        )}

        {subscriptionData?.subscription?.status === "canceled" && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <div>
                <p className="font-semibold text-yellow-900">Subscription Canceled</p>
                <p className="text-sm text-yellow-700">
                  Access continues until {formatDate(subscriptionData.subscription.currentPeriodEnd)}
                </p>
              </div>
            </div>
          </div>
        )}

        {subscriptionData?.subscription?.status === "active" && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Next billing date:</span>
              <span className="font-medium">
                {formatDate(subscriptionData.subscription.currentPeriodEnd)}
              </span>
            </div>
            
            {subscriptionData.subscription.founderDiscount && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Founder discount:</span>
                <span className="font-medium text-green-600">
                  {subscriptionData.subscription.discountPercent}% off
                </span>
              </div>
            )}
          </div>
        )}

        <div className="pt-4 border-t">
          <div className="space-y-2">
            {subscriptionData?.subscriptionStatus === "free" && (
              <Button 
                className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white" 
                size="lg"
                onClick={() => setLocation("/pricing")}
              >
                Start Free Trial
              </Button>
            )}
            
            {subscriptionData?.subscriptionStatus === "trial" && (
              <Button 
                className="w-full bg-brand-dark-green hover:bg-brand-dark-green/90 text-white" 
                size="lg"
                onClick={() => setLocation("/pricing")}
              >
                Upgrade to Premium
              </Button>
            )}

            {subscriptionData?.subscription?.status === "active" && 
             subscriptionData?.subscription?.status !== "canceled" && (
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
        </div>
      </CardContent>
    </Card>
  );
}