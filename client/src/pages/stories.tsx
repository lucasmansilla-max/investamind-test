import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";
import BottomNavigation from "@/bottom-navigation";
import StoriesFeed from "@/components/stories/StoriesFeed";
import { BookOpen } from "lucide-react";
import { useLocation } from "wouter";

export default function Stories() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  return (
    <div className="page-wrapper">
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setLocation("/profile")}
              className="text-brand-brown hover:text-brand-orange transition-colors"
              aria-label="Back to profile"
            >
              <i className="fas fa-arrow-left text-xl"></i>
            </button>
            <div className="flex items-center space-x-2">
              <BookOpen className="w-7 h-7 text-brand-dark-green" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">{t('stories.title')}</h1>
                <p className="text-xs text-gray-500">{t('stories.subtitle')}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 pt-4">
          <StoriesFeed />
        </main>

        <BottomNavigation />
      </div>
    </div>
  );
}
