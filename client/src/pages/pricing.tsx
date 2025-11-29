import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Check,
  Star,
  ArrowLeft,
  Sparkles,
  Calendar,
  CreditCard,
  Gift,
  Shield,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BottomNavigation from "@/bottom-navigation";
import BetaCodeInput from "@/BetaCodeInput";
import { presentPaywall } from "@/lib/revenue-cat";
import { useSubscriptionStatus } from "@/hooks/use-subscription-status";
import { useLanguage } from "@/contexts/language-context";

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Get subscription status using the hook
  const { data: subscriptionData } = useSubscriptionStatus();

  // Start trial mutation
  const startTrialMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/subscription/create-trial");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: t("pricing.freeTrial"),
        description: t("pricing.daysFree") + " " + t("pricing.premiumPlan"),
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("common.tryAgain"),
        variant: "destructive",
      });
    },
  });

  // Upgrade subscription mutation
  const upgradeMutation = useMutation({
    mutationFn: async (planType: string) => {
      return await apiRequest("POST", "/api/subscription/upgrade", {
        planType: planType === "monthly" ? "premium_monthly" : "premium_yearly",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: t("pricing.upgradeNow"),
        description: t("pricing.subscriptionProtectedDesc"),
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("common.tryAgain"),
        variant: "destructive",
      });
    },
  });

  // Pricing configuration - using real data from subscription
  const pricing = useMemo(() => {
    const isFounder = subscriptionData?.isBetaUser || subscriptionData?.subscription?.founderDiscount;
    const monthlyPrice = isFounder ? "$32.50" : "$64.99";
    const yearlyPrice = isFounder ? "$299.99" : "$599.99";
    const monthlyPerMonth = isFounder ? "$32.50" : "$64.99";
    const yearlyPerMonth = isFounder ? "$24.99" : "$49.99";
    
    return {
      monthly: {
        price: monthlyPrice,
        period: t("pricing.perMonth"),
        fullPrice: `${monthlyPrice}/${t("common.month")}`,
        savings: null,
      },
      yearly: {
        price: yearlyPrice,
        period: t("pricing.perYear"),
        fullPrice: `${yearlyPerMonth}/${t("common.month")}`,
        savings: t("pricing.saveYearly"),
        discount: "23%",
      },
    };
  }, [subscriptionData, t]);

  const features = useMemo(() => [
    {
      icon: "📚",
      title: t("pricing.allModules"),
      description: t("pricing.completeLibrary"),
      detail: t("pricing.allModulesDesc"),
    },
    {
      icon: "📊",
      title: t("pricing.tradingSignals"),
      description: t("pricing.expertCalls"),
      detail: t("pricing.tradingSignalsDesc"),
    },
    {
      icon: "💬",
      title: t("pricing.community"),
      description: t("pricing.unlimitedAccess"),
      detail: t("pricing.communityDesc"),
    },
    {
      icon: "🎯",
      title: t("pricing.expertTips"),
      description: t("pricing.liveInsights"),
      detail: t("pricing.expertTipsDesc"),
    },
    {
      icon: "📈",
      title: t("pricing.portfolioAnalysis"),
      description: t("pricing.advancedTools"),
      detail: t("pricing.portfolioAnalysisDesc"),
    },
    {
      icon: "🔔",
      title: t("pricing.marketAlerts"),
      description: t("pricing.realTimeNotifications"),
      detail: t("pricing.marketAlertsDesc"),
    },
  ], [t]);

  const handleUpgrade = async () => {
    setIsProcessing(true);

    try {
      await presentPaywall();
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("common.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPlan = pricing[billingCycle];
  const isFounder = subscriptionData?.isBetaUser || subscriptionData?.subscription?.founderDiscount;
  const founderPrice = billingCycle === "monthly" ? "$32.50" : "$299.99";

  // Check if user is free - using real data from database
  const isFreeUser = useMemo(() => {
    if (!subscriptionData) return true;
    const role = subscriptionData.role || 'free';
    // Admin, legacy, and premium roles have access
    if (role === 'admin' || role === 'legacy' || role === 'premium') return false;
    // Beta users have access
    if (subscriptionData.isBetaUser) return false;
    // Check subscription status
    const status = subscriptionData.subscriptionStatus;
    if (status === "premium" || status === "trial") return false;
    // Check if subscription exists and is active
    const subscription = subscriptionData.subscription;
    if (subscription && (subscription.status === 'active' || subscription.status === 'trial')) return false;
    return true;
  }, [subscriptionData]);

  // Helper to safely parse dates from database
  const parseDate = (dateValue: string | Date | null | undefined): Date | null => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Get plan data from real database data
  const planData = useMemo(() => {
    if (!subscriptionData) return null;
    
    const subscription = subscriptionData.subscription;
    const role = subscriptionData.role || 'free';
    
    // Determine plan type from subscription or role
    let planType = 'premium_monthly';
    if (subscription?.planType) {
      planType = subscription.planType;
    } else if (role === 'premium' || role === 'legacy' || role === 'admin') {
      planType = 'premium_monthly'; // Default for premium users without subscription record
    }
    
    // Get dates from subscription - using real database data
    const startDate = parseDate(
      subscription?.trialStart || 
      subscription?.currentPeriodStart
    ) || new Date();
    
    const nextBillingDate = parseDate(
      subscription?.currentPeriodEnd || 
      subscription?.trialEnd
    ) || (() => {
      const date = new Date();
      if (planType === 'premium_yearly') {
        date.setFullYear(date.getFullYear() + 1);
      } else {
        date.setMonth(date.getMonth() + 1);
      }
      return date;
    })();

    // Plan name based on type and role
    const planName = planType === 'premium_yearly' 
      ? `${t("pricing.premiumPlan")} ${t("pricing.yearly")}`
      : planType === 'premium_monthly' 
      ? `${t("pricing.premiumPlan")} ${t("pricing.monthly")}`
      : role === 'legacy' 
      ? t("pricing.premiumPlan") // Legacy users show as Premium
      : role === 'admin' 
      ? t("pricing.premiumPlan") // Admin users show as Premium
      : t("pricing.premiumPlan");
    
    // Pricing from database subscription data
    const hasFounderDiscount = subscription?.founderDiscount !== undefined 
      ? subscription.founderDiscount 
      : (subscriptionData.isBetaUser || false);
    
    const planPrice = hasFounderDiscount 
      ? (planType === 'premium_yearly' ? '$299.99' : '$32.50')
      : (planType === 'premium_yearly' ? '$599.99' : '$64.99');
    
    const billingPeriod = planType === 'premium_yearly' 
      ? t("pricing.perYear") 
      : t("pricing.perMonth");
    
    const subscriptionStatus = subscription?.status || subscriptionData?.subscriptionStatus || 'active';
    const discountPercent = subscription?.discountPercent !== undefined 
      ? subscription.discountPercent 
      : (hasFounderDiscount ? 50 : 0);
    const isTrial = subscriptionStatus === 'trial';
    const isCanceled = subscriptionStatus === 'canceled';
    const trialEndDate = parseDate(subscription?.trialEnd);

    return {
      planName,
      planPrice,
      billingPeriod,
      role,
      startDate,
      nextBillingDate,
      isFounder: hasFounderDiscount,
      discountPercent,
      subscriptionStatus,
      isTrial,
      isCanceled,
      trialEndDate,
      planType,
    };
  }, [subscriptionData, t]);

  // If user is not free, show their plan details
  if (!isFreeUser && subscriptionData && planData) {
    return (
      <div
        className="page-wrapper"
        style={{ height: "100vh", maxHeight: "100vh", overflow: "auto" }}
      >
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
              <h1 className="text-xl font-bold text-brand-dark-green">
                {t("pricing.myPlan")}
              </h1>
              <div className="w-10" />
            </div>
          </header>

          <div className="max-w-sm mx-auto p-4 space-y-4">
            {/* Plan Card */}
            <Card className="border-2 border-brand-light-green bg-white shadow-lg">
              <CardHeader className="bg-gradient-to-br from-brand-light-green/20 to-brand-blue/20 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-brand-dark-green text-xl">
                    {planData.planName}
                  </CardTitle>
                  {planData.isFounder && (
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                      <Crown className="w-3 h-3 mr-1" />
                      {t("pricing.founder")}
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold text-brand-dark-green">
                    {planData.planPrice}
                  </span>
                  <span className="text-sm text-brand-dark-green/70">
                    /{planData.billingPeriod}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent className="p-4 space-y-4">
                {/* Status Badge */}
                <div className="flex items-center justify-center">
                  {planData.isTrial ? (
                    <Badge className="bg-blue-500 text-white px-4 py-1.5 text-sm">
                      <Clock className="w-4 h-4 mr-1" />
                      {t("pricing.trialPeriod")}
                    </Badge>
                  ) : planData.isCanceled ? (
                    <Badge className="bg-yellow-500 text-white px-4 py-1.5 text-sm">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      {t("pricing.canceled")}
                    </Badge>
                  ) : (
                    <Badge className="bg-brand-dark-green text-white px-4 py-1.5 text-sm">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      {t("pricing.planActive")}
                    </Badge>
                  )}
                </div>

                {/* Plan Details */}
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-brand-blue" />
                      <span className="text-sm text-gray-600">
                        {planData.isTrial ? t("pricing.trialStart") : t("pricing.startDate")}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-brand-dark-green">
                      {planData.startDate instanceof Date 
                        ? planData.startDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })
                        : new Date(planData.startDate).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                    </span>
                  </div>

                  {planData.isTrial && planData.trialEndDate && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-gray-600">{t("pricing.trialEnd")}</span>
                      </div>
                      <span className="text-sm font-medium text-blue-600">
                        {planData.trialEndDate instanceof Date 
                          ? planData.trialEndDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })
                          : new Date(planData.trialEndDate).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                      </span>
                    </div>
                  )}

                  {!planData.isTrial && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="w-5 h-5 text-brand-blue" />
                        <span className="text-sm text-gray-600">
                          {planData.isCanceled ? t("pricing.accessUntil") : t("pricing.nextBilling")}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-brand-dark-green">
                        {planData.nextBillingDate instanceof Date 
                          ? planData.nextBillingDate.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })
                          : new Date(planData.nextBillingDate).toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                      </span>
                    </div>
                  )}

                  {planData.isFounder && (
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-2">
                        <Gift className="w-5 h-5 text-brand-orange" />
                        <span className="text-sm text-gray-600">{t("pricing.discountLabel")}</span>
                      </div>
                      <span className="text-sm font-medium text-brand-orange">
                        {planData.discountPercent}% {t("pricing.lifetime")}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Benefits Card */}
            <Card className="border border-brand-light-green/50 bg-white">
              <CardHeader>
                <CardTitle className="text-brand-dark-green text-lg flex items-center">
                  <Star className="w-5 h-5 mr-2 text-brand-orange" />
                  {t("pricing.includedBenefits")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <Check className="w-5 h-5 text-brand-light-green flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-brand-dark-green">
                        {feature.title}
                      </p>
                      <p className="text-xs text-gray-600">{feature.detail}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Value Proposition */}
            <Card className="border border-brand-light-green/30 bg-gradient-to-br from-brand-light-green/20 to-brand-blue/10">
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="w-6 h-6 text-brand-dark-green flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-brand-dark-green mb-1">
                      {t("pricing.subscriptionProtected")}
                    </h3>
                    <p className="text-xs text-gray-700">
                      {t("pricing.subscriptionProtectedDesc")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Button */}
            <Button
              variant="outline"
              className="w-full border-brand-dark-green text-brand-dark-green hover:bg-brand-dark-green hover:text-white"
              onClick={() => setLocation("/")}
            >
              {t("pricing.backToHome")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <BottomNavigation />
        </div>
      </div>
    );
  }

  return (
    <div
      className="page-wrapper"
      style={{ height: "100vh", maxHeight: "100vh", overflow: "auto" }}
    >
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
            <h1 className="text-xl font-bold text-brand-dark-green">
              {t("pricing.title")}
            </h1>
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
                {t("pricing.freeTrial")}
              </p>
              <p className="text-xs text-blue-700">
                {t("pricing.noCreditCard")}
              </p>
            </div>
          )}

          {/* Founder Badge */}
          {isFounder && (
            <div className="bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <span className="font-bold text-purple-900">
                  {t("pricing.founderMember")}
                </span>
              </div>
              <p className="text-sm text-purple-800">
                {t("pricing.lifetimeDiscount")}
              </p>
            </div>
          )}

          {/* Billing Toggle */}
          <div className="bg-white rounded-2xl p-1 shadow-sm border border-gray-200">
            <div className="relative flex">
              <button
                onClick={() => setBillingCycle("monthly")}
                className={`flex-1 text-center py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 ${
                  billingCycle === "monthly"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t("pricing.monthly")}
              </button>
              <button
                onClick={() => setBillingCycle("yearly")}
                className={`flex-1 text-center py-3 px-4 rounded-xl text-sm font-medium transition-all duration-300 relative ${
                  billingCycle === "yearly"
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {t("pricing.yearly")}
                {billingCycle === "yearly" && currentPlan.savings && (
                  <div className="absolute -top-2 -right-2">
                    <Badge className="bg-green-500 text-white text-xs px-2 py-1 animate-pulse">
                      {t("pricing.save")} {currentPlan.discount}
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
                <span className="text-sm opacity-90">{t("pricing.premiumPlan")}</span>
              </div>
              <div className="flex items-baseline justify-center space-x-1">
                <span className="text-4xl font-bold">
                  {isFounder ? founderPrice : currentPlan.price}
                </span>
                <span className="text-lg opacity-90">
                  {billingCycle === "yearly" ? `/${t("pricing.year")}` : `/${t("pricing.month")}`}
                </span>
              </div>
              {billingCycle === "yearly" && (
                <div className="mt-2">
                  <span className="text-sm opacity-90">
                    {t("pricing.billedAs")} {isFounder ? founderPrice : currentPlan.price}{" "}
                    {t("pricing.annually")}
                  </span>
                  {currentPlan.savings && (
                    <div className="mt-1">
                      <Badge className="bg-green-500 text-white animate-pulse">
                        {isFounder ? t("pricing.saveFounder") : currentPlan.savings}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Enhanced CTA Button */}
            <Button
              onClick={handleUpgrade}
              disabled={
                isProcessing ||
                startTrialMutation.isPending ||
                upgradeMutation.isPending
              }
              className="w-full bg-white text-blue-600 hover:bg-gray-50 font-semibold py-4 rounded-xl text-lg shadow-lg border-2 border-white/20 relative overflow-hidden group min-h-[4rem]"
            >
              <div className="relative z-10 flex flex-col items-center justify-center gap-1">
                {isProcessing ||
                startTrialMutation.isPending ||
                upgradeMutation.isPending ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>{t("pricing.processing")}</span>
                  </div>
                ) : !subscriptionData?.subscription ? (
                  <>
                    <div className="font-bold text-lg leading-tight">
                      {t("pricing.startFreeTrial")}
                    </div>
                    <div
                      className="text-sm opacity-75 leading-tight whitespace-nowrap"
                      style={{ letterSpacing: "normal" }}
                    >
                      {t("pricing.daysFree")}{" "}
                      {isFounder ? founderPrice : currentPlan.fullPrice}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-bold text-lg leading-tight">
                      {t("pricing.upgradeNow")}
                    </div>
                    <div className="text-sm opacity-75 leading-tight">
                      {t("pricing.switchTo")} {billingCycle === "monthly" ? t("pricing.monthly") : t("pricing.yearly")} {t("pricing.billing")}
                    </div>
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
              {t("pricing.everythingYouGet")}
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
                  <p className="text-xs text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Value Proposition */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6 border border-green-200">
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                {t("pricing.whyChoosePremium")}
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    {t("pricing.completeEducation")}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    {t("pricing.realTimeSignals")}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    {t("pricing.unlimitedCommunity")}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-gray-700">
                    {t("pricing.prioritySupport")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">95%</div>
                <div className="text-xs text-gray-600">{t("pricing.successRate")}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">24/7</div>
                <div className="text-xs text-gray-600">{t("pricing.support")}</div>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              {t("pricing.securePayment")}
            </p>
          </div>
        </div>

        <BottomNavigation />
      </div>
    </div>
  );
}
