import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import BottomNavigation from "@/bottom-navigation";
import { useProgress } from "@/hooks/use-progress";
import type { LearningModule } from "@shared/schema";

export default function LearningPath() {
  const [, setLocation] = useLocation();
  const { progress } = useProgress();

  const { data: modules = [] } = useQuery<LearningModule[]>({
    queryKey: ["/api/modules"],
  });

  const isModuleCompleted = (moduleId: number) => {
    return progress.some(p => p.moduleId === moduleId && p.completed);
  };

  const isModuleAccessible = (module: LearningModule) => {
    if (module.orderIndex === 1) return true;

    // Check if previous module is completed
    const previousModule = modules.find(m => m.orderIndex === module.orderIndex - 1);
    return previousModule ? isModuleCompleted(previousModule.id) : false;
  };

  const getModuleStatus = (module: LearningModule) => {
    if (isModuleCompleted(module.id)) return "completed";
    if (isModuleAccessible(module)) return "available";
    return "locked";
  };

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
            <h2 className="text-2xl font-bold text-brand-brown">Learning Path</h2>
          </div>

          <div className="space-y-4">
            {modules.map((module) => {
              const status = getModuleStatus(module);
              const completed = status === "completed";
              const available = status === "available";
              const locked = status === "locked";

              return (
                <Card
                  key={module.id}
                  className={`shadow-sm border-2 ${
                    completed ? "border-brand-light-green" :
                    available ? "border-brand-orange" :
                    "border-gray-200 opacity-60"
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        completed ? "bg-brand-light-green text-brand-dark-green" :
                        available ? "bg-brand-orange text-white" :
                        "bg-gray-300 text-gray-500"
                      }`}>
                        {completed ? (
                          <i className="fas fa-check"></i>
                        ) : available ? (
                          <i className="fas fa-play"></i>
                        ) : (
                          <i className="fas fa-lock"></i>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className={`font-semibold ${locked ? "text-gray-600" : "text-brand-brown"}`}>
                          {module.orderIndex}. {module.title}
                        </h3>
                        <p className={`text-sm ${locked ? "text-gray-500" : "text-gray-600"}`}>
                          {module.description}
                        </p>
                        <div className="mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            completed ? "bg-brand-light-green text-brand-dark-green" :
                            available ? "bg-brand-orange text-white" :
                            "bg-gray-200 text-gray-600"
                          }`}>
                            {completed ? "Completed" : available ? "Available" : "Locked"}
                          </span>
                        </div>
                      </div>
                      {available && !completed && (
                        <Button
                          onClick={() => setLocation(`/module/${module.id}`)}
                          className="bg-brand-orange text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-600 transition-colors touch-target"
                        >
                          Start
                        </Button>
                      )}
                      {completed && (
                        <Button
                          onClick={() => setLocation(`/module/${module.id}`)}
                          variant="outline"
                          className="border-brand-light-green text-brand-dark-green px-4 py-2 rounded-lg font-medium hover:bg-brand-light-green/10 transition-colors touch-target"
                        >
                          Review
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
