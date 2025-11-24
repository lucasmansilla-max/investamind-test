import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Crown, Check, Star, Zap, Users, TrendingUp, ArrowLeft, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BottomNavigation from "@/bottom-navigation";
import BetaCodeInput from "@/BetaCodeInput";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get subscription status
  const { data: subscriptionData } = useQuery({
    queryKey: ["/api/subscription/status"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/subscription/status");
        // Ensure the parsed JSON matches the expected shape
        return (await res.json()) as { subscription?: any; isBetaUser?: boolean };
      } catch (err) {
        // Return an empty object on error/unauthorized so callers can safely check properties
        return {} as { subscription?: any; isBetaUser?: boolean };
      }
    },
    // local overrides to avoid surprising refetch/throws for auth/404 cases
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // Start trial mutation
  const startTrialMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/subscription/create-trial");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: "Trial Started!",
        description: "Your 7-day free trial has begun. Enjoy premium features!",
      });
      setLocation("/");
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
      return await apiRequest("POST", "/api/subscription/upgrade", { 
        planType: planType === 'monthly' ? 'premium_monthly' : 'premium_yearly' 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: "Subscription Updated!",
        description: "Your subscription has been upgraded successfully.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upgrade subscription",
        variant: "destructive",
      });
    },
  });

  const pricing = {
    monthly: { 
      price: '$64.99', 
      period: 'per month', 
      fullPrice: '$64.99/month',
      savings: null 
    },
    yearly: { 
      price: '$599.99', 
      period: 'per year', 
      fullPrice: '$49.99/month',
      savings: 'Save $179.89 yearly!',
      discount: '23%'
    }
  };

  const features = [
    {
      icon: '📚',
      title: 'All Modules',
      description: 'Complete library',
      detail: 'Access every learning module and lesson'
    },
    {
      icon: '📊',
      title: 'Trading Signals',
      description: 'Expert calls',
      detail: 'Real-time trading signals from experts'
    },
    {
      icon: '💬',
      title: 'Community',
      description: 'Unlimited access',
      detail: 'Full community participation'
    },
    {
      icon: '🎯',
      title: 'Expert Tips',
      description: 'Live insights',
      detail: 'Direct access to trading experts'
    },
    {
      icon: '📈',
      title: 'Portfolio Analysis',
      description: 'Advanced tools',
      detail: 'Professional portfolio tracking'
    },
    {
      icon: '🔔',
      title: 'Market Alerts',
      description: 'Real-time notifications',
      detail: 'Never miss important market moves'
    }
  ];

  const handleUpgrade = async () => {
    setIsProcessing(true);

    try {
      if (!subscriptionData?.subscription) {
        // Start trial for new users
        await startTrialMutation.mutateAsync();
      } else {
        // Upgrade existing subscription
        await upgradeMutation.mutateAsync(billingCycle);
      }
    } catch (error) {
      // Error handled by mutations
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPlan = pricing[billingCycle];
  const isFounder = subscriptionData?.isBetaUser;
  const founderPrice = billingCycle === 'monthly' ? '$32.50' : '$299.99';

  return (
    <div className="page-wrapper" style={{ height: '100vh', maxHeight: '100vh', overflow: 'auto' }}>
      <div className="min-h-screen bg-brand-light-green/10 pb-20">
        {/* Header */}
      <header className="bg-brand-light-green border-b border-brand-dark-green/20 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="p-2 text-brand-dark-green hover:text-brand-orange"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-brand-dark-green">Choose Your Plan</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-sm mx-auto p-4 space-y-6">
        {/* Beta Code Input */}
        <BetaCodeInput />

        {/* Trial Banner */}
        {!subscriptionData?.subscription && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-sm font-medium text-blue-900 mb-1">
              7-Day Free Trial
            </p>
            <p className="text-xs text-blue-700">
              No credit card required • Cancel anytime
            </p>
          </div>
        )}

        {/* Founder Badge */}
        {isFounder && (
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <span className="font-bold text-purple-900">Founder Member</span>
            </div>
            <p className="text-sm text-purple-800">
              50% Lifetime Discount Applied!
            </p>
          </div>
        )}

        {/* Billing Toggle */}
        <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-200">
          <div className="relative flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`flex-1 text-center py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`flex-1 text-center py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 relative ${
                billingCycle === 'yearly'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
              {billingCycle === 'yearly' && currentPlan.savings && (
                <div className="absolute -top-2 -right-2">
                  <Badge className="bg-green-500 text-white text-xs px-2 py-1 animate-pulse">
                    Save {currentPlan.discount}
                  </Badge>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg border border-blue-500">
          <div className="text-center mb-6">
            <div className="mb-2">
              <span className="text-sm opacity-90">Premium Plan</span>
            </div>
            <div className="flex items-baseline justify-center space-x-1">
              <span className="text-4xl font-bold">
                {isFounder ? founderPrice : currentPlan.price}
              </span>
              <span className="text-lg opacity-90">
                {billingCycle === 'yearly' ? '/year' : '/month'}
              </span>
            </div>
            {billingCycle === 'yearly' && (
              <div className="mt-2">
                <span className="text-sm opacity-90">
                  Billed as {isFounder ? founderPrice : currentPlan.price} annually
                </span>
                {currentPlan.savings && (
                  <div className="mt-1">
                    <Badge className="bg-green-500 text-white animate-pulse">
                      {isFounder ? 'Save $90' : currentPlan.savings}
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Enhanced CTA Button */}
          <Button
            onClick={handleUpgrade}
            disabled={isProcessing || startTrialMutation.isPending || upgradeMutation.isPending}
            className="w-full bg-white text-blue-600 hover:bg-gray-50 font-semibold py-4 rounded-xl text-lg shadow-lg border-2 border-white/20 relative overflow-hidden group min-h-[4rem]"
          >
            <div className="relative z-10 flex flex-col items-center justify-center gap-1">
              {isProcessing || startTrialMutation.isPending || upgradeMutation.isPending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : !subscriptionData?.subscription ? (
                <>
                  <div className="font-bold text-lg leading-tight">Start Free Trial</div>
                  <div className="text-sm opacity-75 leading-tight whitespace-nowrap" style={{ letterSpacing: 'normal' }}>
                    7 days free, then {isFounder ? founderPrice : currentPlan.fullPrice}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-bold text-lg leading-tight">Upgrade Now</div>
                  <div className="text-sm opacity-75 leading-tight">Switch to {billingCycle} billing</div>
                </>
              )}
            </div>

            {/* Shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
          </Button>
        </div>

        {/* Features Grid */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
            Everything You Get
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-3 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-all duration-200 cursor-pointer group"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-200">
                  {feature.icon}
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">
                  {feature.title}
                </h4>
                <p className="text-xs text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Value Proposition */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-200">
          <div className="text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-3">
              Why Choose Premium?
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">Complete trading education curriculum</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">Real-time market signals and alerts</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">Unlimited community access and posts</span>
              </div>
              <div className="flex items-center space-x-3">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-sm text-gray-700">Priority support and expert guidance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="grid grid-cols-2 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">95%</div>
              <div className="text-xs text-gray-600">Success Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">24/7</div>
              <div className="text-xs text-gray-600">Support</div>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Secure payment • Cancel anytime • No hidden fees
          </p>
        </div>
      </div>

      <BottomNavigation />
      </div>
    </div>
  );
}