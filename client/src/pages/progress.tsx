import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import BottomNavigation from "@/components/bottom-navigation";
import ProgressBar from "@/components/progress-bar";
import { useProgress } from "@/hooks/use-progress";
import { useTranslation } from "@/lib/i18n";

export default function Progress() {
  const [, setLocation] = useLocation();
  const { completedModules, totalModules, progressPercentage, achievements } = useProgress();

  const moduleChecklist = [
    "Basics of Investing",
    "Introduction to Trading", 
    "Key Terms & Concepts",
    "Risk Management",
    "Portfolio Building",
    "Technical Analysis",
    "Market Psychology",
    "Advanced Strategies"
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="pb-20">
        <div className="p-4">
          <div className="flex items-center mb-6">
            <button 
              onClick={() => setLocation("/")}
              className="mr-4 touch-target text-brand-brown hover:text-brand-orange transition-colors"
            >
              <i className="fas fa-arrow-left text-xl"></i>
            </button>
            <h2 className="text-2xl font-bold text-brand-brown">Your Progress</h2>
          </div>
          
          {/* Overall Progress Card */}
          <div className="bg-gradient-to-br from-brand-blue to-brand-light-green rounded-2xl p-6 text-white mb-6">
            <h3 className="text-xl font-bold mb-4">Learning Journey</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <p className="text-3xl font-bold">{completedModules}</p>
                <p className="text-sm opacity-80">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">{totalModules - completedModules}</p>
                <p className="text-sm opacity-80">Remaining</p>
              </div>
            </div>
            <ProgressBar progress={progressPercentage} variant="white" className="mb-2" />
            <p className="text-center text-sm opacity-80">{Math.round(progressPercentage)}% Complete</p>
          </div>
          
          {/* Achievement Badges */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-brand-brown mb-4">Achievements</h3>
            <div className="grid grid-cols-3 gap-3">
              <Card className={`border ${completedModules >= 1 ? "border-brand-light-green" : "border-gray-200"}`}>
                <CardContent className="p-4 text-center">
                  <i className={`fas fa-medal text-2xl mb-2 ${
                    completedModules >= 1 ? "text-brand-light-green" : "text-gray-300"
                  }`}></i>
                  <p className="text-xs font-medium text-brand-brown">First Lesson</p>
                </CardContent>
              </Card>
              
              <Card className={`border ${completedModules >= 3 ? "border-brand-orange" : "border-gray-200"}`}>
                <CardContent className="p-4 text-center">
                  <i className={`fas fa-fire text-2xl mb-2 ${
                    completedModules >= 3 ? "text-brand-orange" : "text-gray-300"
                  }`}></i>
                  <p className="text-xs font-medium text-brand-brown">3 Modules</p>
                </CardContent>
              </Card>
              
              <Card className={`border ${completedModules >= 5 ? "border-brand-blue" : "border-gray-200"}`}>
                <CardContent className="p-4 text-center">
                  <i className={`fas fa-brain text-2xl mb-2 ${
                    completedModules >= 5 ? "text-brand-blue" : "text-gray-300"
                  }`}></i>
                  <p className="text-xs font-medium text-brand-brown">Quiz Master</p>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Module Checklist */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-brand-brown mb-4">Module Checklist</h3>
              <div className="space-y-3">
                {moduleChecklist.map((moduleName, index) => {
                  const isCompleted = index < completedModules;
                  return (
                    <div key={index} className="flex items-center space-x-3">
                      <i className={`fas text-xl ${
                        isCompleted 
                          ? "fa-check-circle text-brand-light-green" 
                          : "fa-circle text-gray-300"
                      }`}></i>
                      <span className={isCompleted ? "text-gray-700" : "text-gray-400"}>
                        {moduleName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
