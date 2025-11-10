import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Premium() {
  const [, setLocation] = useLocation();
  
  // Redirect to pricing page immediately
  useEffect(() => {
    setLocation("/pricing");
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-brand-light-green/10 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-brand-orange border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-brand-dark-green">Redirecting to pricing...</p>
      </div>
    </div>
  );
}