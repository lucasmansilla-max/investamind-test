import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { Purchases, LOG_LEVEL } from "@revenuecat/purchases-capacitor";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { LanguageProvider, useLanguage } from "@/contexts/language-context";
import LanguageSelectionModal from "./language-selection-modal";

// Pages
import Welcome from "@/pages/welcome";
import LanguageSelection from "@/pages/language-selection";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import LearningPath from "@/pages/learning-path";
import LearningDashboard from "@/pages/learning-dashboard";
import LessonContent from "@/pages/lesson-content";
import Module from "@/pages/module";
import Progress from "@/pages/progress";
import Premium from "@/pages/premium";
import Pricing from "@/pages/pricing";
import Admin from "@/pages/admin";
import Community from "@/pages/community";
import NotFound from "@/pages/not-found";

import { usePurchases } from "./hooks/use-purchases";

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [location, setLocation] = useLocation();
  const { isLanguageSelected } = useLanguage();
  const {
    isPaid,
    isLoading: purchasesLoading,
    restorePurchases,
  } = usePurchases(isAuthenticated ? user?.id.toString() : undefined);

  // Initialize notifications for authenticated users
  useNotifications(isAuthenticated);

  // Redirect to language selection if user hasn't selected a language
  useEffect(() => {
    // Only redirect if:
    // 1. User is not authenticated
    // 2. Language hasn't been selected
    // 3. Not already on language selection page
    // 4. Not on special routes (reset-password, etc.)
    if (!isLoading && !isAuthenticated && !isLanguageSelected) {
      const specialRoutes = ['/reset-password', '/forgot-password'];
      const isSpecialRoute = specialRoutes.some(route => location.startsWith(route));
      
      if (location !== '/language' && !isSpecialRoute) {
        setLocation('/language');
      }
    }
  }, [isLoading, isAuthenticated, isLanguageSelected, location, setLocation]);

  // Handle deeplinks for password reset
  useEffect(() => {
    // Handle deeplinks in native platform
    if (Capacitor.isNativePlatform()) {
      // Handle app launch from deeplink
      CapacitorApp.getLaunchUrl().then((result) => {
        if (result?.url) {
          handleDeeplink(result.url);
        }
      }).catch(() => {
        // No launch URL available
      });

      // Listen for app state changes (when app comes to foreground)
      let listenerHandle: any = null;
      CapacitorApp.addListener("appUrlOpen", (event) => {
        handleDeeplink(event.url);
      }).then((listener) => {
        listenerHandle = listener;
      });

      return () => {
        if (listenerHandle) {
          listenerHandle.remove();
        }
      };
    } else {
      // Handle deeplinks in web - check if we're on reset-password page with token
      // This handles the case when user opens the web link
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (token && location === "/reset-password") {
        // Already on the right page, no action needed
      }
    }
  }, [location]);

  const handleDeeplink = (url: string) => {
    try {
      // Parse deeplink URL: investamind://reset-password?token=xxx
      // or investamind:///reset-password?token=xxx
      // or investamind://host/reset-password?token=xxx
      
      // Remove scheme
      let urlWithoutScheme = url.replace(/^investamind:\/\//, "");
      
      // Handle different formats
      // Format 1: investamind://reset-password?token=xxx (no leading slash)
      // Format 2: investamind:///reset-password?token=xxx (with leading slash)
      // Format 3: investamind://host/reset-password?token=xxx (with host)
      
      // Remove leading slashes
      urlWithoutScheme = urlWithoutScheme.replace(/^\/+/, "");
      
      // Split path and query
      const [pathPart, queryPart] = urlWithoutScheme.split("?");
      
      // Extract path (remove host if present)
      let path = pathPart;
      if (path.includes("/")) {
        // If there's a host, extract just the path
        const pathParts = path.split("/");
        if (pathParts.length > 1) {
          // Skip host, get path
          path = "/" + pathParts.slice(1).join("/");
        } else {
          path = "/" + path;
        }
      } else {
        // No slashes, this is the path directly
        path = "/" + path;
      }
      
      // Normalize path
      if (!path.startsWith("/")) {
        path = "/" + path;
      }
      
      if (path === "/reset-password" || path.includes("reset-password")) {
        // Extract token from query string
        const query = queryPart ? `?${queryPart}` : "";
        const tokenMatch = query.match(/[?&]token=([^&]+)/);
        if (tokenMatch) {
          const token = decodeURIComponent(tokenMatch[1]);
          setLocation(`/reset-password?token=${token}`);
        }
      }
    } catch (error) {
      // Fallback: try to extract token manually
      const tokenMatch = url.match(/[?&]token=([^&]+)/);
      if (tokenMatch && url.includes("reset-password")) {
        const token = decodeURIComponent(tokenMatch[1]);
        setLocation(`/reset-password?token=${token}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
            <i className="fas fa-chart-line text-white text-xl"></i>
          </div>
          <p className="text-brand-brown font-medium">Loading Investamind...</p>
          <p className="text-gray-500 text-sm mt-2">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white min-h-[100dvh] relative app-container overflow-hidden">
      <Switch>
        {!isAuthenticated ? (
          <>
            <Route path="/login" component={Login} />
            <Route path="/signup" component={Signup} />
            <Route path="/forgot-password" component={ForgotPassword} />
            <Route path="/reset-password" component={ResetPassword} />
            <Route path="/language" component={LanguageSelection} />
            <Route path="/" component={Welcome} />
          </>
        ) : (
          <>
            <Route path="/module/:moduleId/lesson/:lessonId">
              {(params) => (
                <LessonContent
                  moduleId={params.moduleId}
                  lessonId={params.lessonId}
                />
              )}
            </Route>
            <Route path="/module/:id" component={Module} />
            <Route path="/learning-path" component={LearningPath} />
            <Route path="/learning" component={LearningDashboard} />
            <Route path="/progress" component={Progress} />
            <Route path="/premium" component={Premium} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/upgrade" component={Pricing} />
            <Route path="/community" component={Community} />
            <Route path="/admin" component={Admin} />
            <Route path="/profile" component={Profile} />
            <Route path="/" component={Home} />
            <Route component={NotFound} />
          </>
        )}
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <LanguageSelectionModal />
          <Toaster />
          <AppContent />
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
