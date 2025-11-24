import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Zap, Star } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

interface PricingPlansProps {
  onSubscribe?: (planType: string) => void;
}

export default function PricingPlans({ onSubscribe }: PricingPlansProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Get subscription status
  const { data: subscriptionData } = useQuery<{ subscription?: any; subscriptionStatus?: string; isBetaUser?: boolean }>({
    queryKey: ["/api/subscription/status"],
  });

  // Start trial mutation
  const startTrialMutation = useMutation({
    mutationFn: async () => {
      // apiRequest expects (method, url, data?) — pass method and url, no body needed here
      return await apiRequest("POST", "/api/subscription/create-trial");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: "Trial Started!",
        description: "Your 7-day free trial has begun. Enjoy premium features!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start trial",
        variant: "destructive",
      });
    },
  });

  // Upgrade subscription mutation
  const upgradeMutation = useMutation({
    mutationFn: async (planType: string) => {
      // apiRequest accepts (method, url, data) — pass the plan object as data
      return await apiRequest("POST", "/api/subscription/upgrade", { planType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: "Subscription Updated!",
        description: "Your subscription has been upgraded successfully.",
      });
      onSubscribe?.(selectedPlan!);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upgrade subscription",
        variant: "destructive",
      });
    },
  });

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "/month",
      description: "Perfect for getting started",
      features: [
        "Access to first investment module",
        "Community read access",
        "Basic market insights",
        "5 posts per day limit"
      ],
      buttonText: "Current Plan",
      buttonDisabled: true,
      popular: false,
    },
    {
      id: "premium_monthly",
      name: "Premium Monthly",
      price: "$64.99",
      period: "/month",
      description: "Full access to all features",
      features: [
        "All investment modules",
        "Full community access",
        "Trading signals & alerts",
        "Advanced market analysis",
        "Unlimited posts & interactions",
        "Priority support",
        "Early access to new features"
      ],
      buttonText: "Start 7-Day Trial",
      buttonDisabled: false,
      popular: true,
    },
    {
      id: "premium_yearly",
      name: "Premium Yearly",
      price: "$599.99",
      period: "/year",
      originalPrice: "$779.88",
      savings: "Save $179.89",
      description: "Best value for serious investors",
      features: [
        "All Premium Monthly features",
        "Annual strategy sessions",
        "Exclusive webinars",
        "Portfolio review sessions",
        "Advanced analytics dashboard",
        "Personal investment coach",
        "Tax optimization strategies"
      ],
      buttonText: "Start 7-Day Trial",
      buttonDisabled: false,
      popular: false,
    }
  ];

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);

    if (planId === "free") return;

    // Check if user has existing subscription
    if (subscriptionData?.subscription) {
      // User has subscription, upgrade it
      upgradeMutation.mutate(planId);
    } else {
      // No subscription, start trial
      startTrialMutation.mutate();
    }
  };

  const isCurrentPlan = (planId: string) => {
    if (planId === "free" && subscriptionData?.subscriptionStatus === "free") return true;
    if (subscriptionData?.subscription?.planType === planId) return true;
    return false;
  };

  const getButtonText = (plan: any) => {
    if (isCurrentPlan(plan.id)) return "Current Plan";
    if (subscriptionData?.subscriptionStatus === "trial" && plan.id !== "free") return "Upgrade Now";
    return plan.buttonText;
  };

  const getButtonDisabled = (plan: any) => {
    if (isCurrentPlan(plan.id)) return true;
    return startTrialMutation.isPending || upgradeMutation.isPending;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Choose Your Investment Journey
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Unlock your trading potential with our comprehensive education platform. 
          Start with a free trial and upgrade anytime.
        </p>
        
        {subscriptionData?.isBetaUser && (
          <div className="mt-4 inline-flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-pink-100 px-4 py-2 rounded-full">
            <Crown className="w-5 h-5 text-purple-600" />
            <span className="text-purple-800 font-semibold">
              Founder Member - 50% Lifetime Discount Applied!
            </span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`relative ${
              plan.popular
                ? "border-blue-500 shadow-lg scale-105"
                : "border-gray-200"
            } ${
              isCurrentPlan(plan.id)
                ? "ring-2 ring-green-500"
                : ""
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500 text-white px-3 py-1">
                  <Star className="w-4 h-4 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}

            {isCurrentPlan(plan.id) && (
              <div className="absolute -top-3 right-4">
                <Badge className="bg-green-500 text-white px-3 py-1">
                  Current
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
              <div className="mt-4">
                <div className="flex items-baseline justify-center">
                  <span className="text-4xl font-bold text-gray-900">
                    {subscriptionData?.isBetaUser && plan.id !== "free" 
                      ? plan.id === "premium_monthly" 
                        ? "$32.50" 
                        : "$299.99"
                      : plan.price
                    }
                  </span>
                  <span className="text-gray-500 ml-1">{plan.period}</span>
                </div>
                
                {plan.originalPrice && (
                  <div className="mt-2">
                    <span className="text-sm text-gray-500 line-through">
                      {subscriptionData?.isBetaUser ? "$389.94" : plan.originalPrice}
                    </span>
                    <span className="text-sm text-green-600 ml-2 font-semibold">
                      {subscriptionData?.isBetaUser ? "Save $90" : plan.savings}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-gray-600 text-sm mt-2">{plan.description}</p>
            </CardHeader>

            <CardContent>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handlePlanSelect(plan.id)}
                disabled={getButtonDisabled(plan)}
                className={`w-full ${
                  plan.popular
                    ? "bg-blue-600 hover:bg-blue-700"
                    : isCurrentPlan(plan.id)
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-900 hover:bg-gray-800"
                }`}
                size="lg"
              >
                {(startTrialMutation.isPending || upgradeMutation.isPending) && 
                 selectedPlan === plan.id ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  getButtonText(plan)
                )}
              </Button>

              {plan.id !== "free" && !subscriptionData?.subscription && (
                <p className="text-xs text-gray-500 text-center mt-2">
                  7-day free trial • Cancel anytime
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 text-center">
        <div className="bg-gray-50 rounded-lg p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <Zap className="w-6 h-6 text-yellow-500" />
            <h3 className="text-lg font-semibold">Why Choose Premium?</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div>
              <strong className="text-gray-900">Complete Education</strong>
              <p>Access all modules from beginner to advanced trading strategies</p>
            </div>
            <div>
              <strong className="text-gray-900">Real-Time Signals</strong>
              <p>Get trading alerts and market insights as they happen</p>
            </div>
            <div>
              <strong className="text-gray-900">Community Access</strong>
              <p>Connect with other traders and share your progress</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}