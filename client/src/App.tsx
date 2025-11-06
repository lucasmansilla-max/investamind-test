import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { LanguageProvider } from "@/contexts/language-context";
import LanguageSelectionModal from "@/components/language-selection-modal";

// Pages
import Welcome from "@/pages/welcome";
import LanguageSelection from "@/pages/language-selection";
import Signup from "@/pages/signup";
import Home from "@/pages/home";
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

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();
  
  // Initialize notifications for authenticated users
  useNotifications(isAuthenticated);
  
  // Debug logging to track route rendering
  console.log('Current route:', location, 'Auth state:', { isAuthenticated, isLoading });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
            <i className="fas fa-chart-line text-white text-xl"></i>
          </div>
          <p className="text-brand-brown font-medium">Loading Investamind...</p>
          <p className="text-gray-500 text-sm mt-2">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto bg-white min-h-screen relative app-container" 
         style={{ height: '100vh', maxHeight: '100vh', overflow: 'hidden' }}>
      <Switch>
        {!isAuthenticated ? (
          <>
            <Route path="/signup" component={Signup} />
            <Route path="/language" component={LanguageSelection} />
            <Route path="/" component={Welcome} />
            <Route component={Welcome} />
          </>
        ) : (
          <>
            <Route path="/module/:moduleId/lesson/:lessonId">
              {(params) => <LessonContent moduleId={params.moduleId} lessonId={params.lessonId} />}
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
