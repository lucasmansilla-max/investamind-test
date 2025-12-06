import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ExpandableModuleCard from "@/expandable-module-card";
import BottomNavigation from "@/bottom-navigation";
import PremiumGate from "@/components/upgrade-prompts/PremiumGate";
import { useAuth } from "@/hooks/use-auth";
import { useHasPremiumAccess } from "@/hooks/use-subscription-status";
import { useProgress } from "@/hooks/use-progress";
import { apiRequest } from "@/lib/queryClient";
import type { LearningModule, ModuleVideo, UserProgress } from "@shared/schema";
import { Trophy, Target, Flame, Clock, BookOpen, ChevronLeft, Lock } from "lucide-react";

interface ModuleWithVideos extends LearningModule {
  videos?: ModuleVideo[];
}

interface Lesson {
  id: number;
  title: string;
  duration: string;
  status: "completed" | "current" | "locked";
  description?: string;
}

export default function LearningDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  // Get subscription status and check course access
  const { hasPremiumAccess, subscriptionData } = useHasPremiumAccess();
  
  // Get real user progress from database
  const { progress: userProgress } = useProgress();

  // Fetch modules from API
  const { data: modules = [], isLoading: modulesLoading } = useQuery<ModuleWithVideos[]>({
    queryKey: ["/api/modules"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/modules");
        return (await res.json()) as ModuleWithVideos[];
      } catch (err) {
        console.error("Error fetching modules:", err);
        return [];
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Transform modules from API to format compatible with ExpandableModuleCard
  const modulesWithProgress = useMemo(() => {
    return modules.map(module => {
      // Find progress for this module
      const moduleProgress = userProgress.find(p => p.moduleId === module.id);
      const videos = module.videos || [];
      const totalVideos = videos.length;
      
      // Calculate completed videos (we'll need to fetch video progress separately)
      // For now, if module is completed, assume all videos are completed
      const isModuleCompleted = moduleProgress?.completed === true;
      const completedVideos = isModuleCompleted ? totalVideos : 0;
      
      // Determine module status
      let moduleStatus: "completed" | "in-progress" | "locked" = "locked";
      
      if (isModuleCompleted) {
        moduleStatus = "completed";
      } else if (moduleProgress || totalVideos > 0) {
        // Module has progress or has videos available
        moduleStatus = "in-progress";
      } else {
        // No videos yet - module is locked
        moduleStatus = "locked";
      }
      
      // Convert videos to lessons format for ExpandableModuleCard
      const lessons: Lesson[] = videos.map((video, index) => {
        let lessonStatus: "completed" | "current" | "locked" = "locked";
        
        if (isModuleCompleted) {
          lessonStatus = "completed";
        } else if (index === 0 && moduleStatus === "in-progress") {
          // First video is current if module is in progress
          lessonStatus = "current";
        } else if (index < completedVideos) {
          lessonStatus = "completed";
        } else if (index === completedVideos) {
          lessonStatus = "current";
        }
        
        return {
          id: video.id,
          title: video.title,
          duration: "Video", // Videos don't have duration in the schema
          status: lessonStatus,
          description: video.description || undefined,
        };
      });
      
      // Calculate estimated time (rough estimate: 10 min per video)
      const estimatedMinutes = totalVideos * 10;
      const estimatedTime = estimatedMinutes >= 60 
        ? `${Math.floor(estimatedMinutes / 60)}.${Math.floor((estimatedMinutes % 60) / 10)} hours`
        : `${estimatedMinutes} minutes`;
      
      return {
        id: module.id,
        title: module.title,
        subtitle: `${totalVideos} ${totalVideos === 1 ? 'video' : 'videos'}`,
        icon: "📚", // Default icon
        totalLessons: totalVideos,
        completedLessons: completedVideos,
        estimatedTime,
        status: moduleStatus,
        description: module.description,
        lessons,
      };
    });
  }, [modules, userProgress]);

  // Filter modules based on user role and premium status
  const availableModules = useMemo(() => {
    if (hasPremiumAccess) {
      // Premium/Legacy/Admin users can see all modules
      return modulesWithProgress;
    } else {
      // Free users can only see non-premium modules
      // Note: We need to check module.isPremium, but we're using transformed data
      // For now, show all modules and let PremiumGate handle access
      return modulesWithProgress;
    }
  }, [hasPremiumAccess, modulesWithProgress]);

  // Calculate overall progress (only for available modules)
  const totalLessons = useMemo(() => {
    return availableModules.reduce((acc, module) => acc + module.totalLessons, 0);
  }, [availableModules]);

  const completedLessons = useMemo(() => {
    return availableModules.reduce((acc, module) => acc + module.completedLessons, 0);
  }, [availableModules]);

  const overallProgress = totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  // Calculate learning streak (mock data)
  const learningStreak = 5;
  const totalTimeSpent = "12.5 hours";

  const handleLessonClick = (moduleId: number, lessonId: number) => {
    // Navigate directly to module page (videos are shown there)
    setLocation(`/module/${moduleId}`);
  };

  if (modulesLoading) {
    return (
      <div className="page-wrapper" style={{ height: '100vh', maxHeight: '100vh', overflow: 'auto' }}>
        <div className="min-h-screen bg-brand-light-green/10 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
              <BookOpen className="text-white text-xl" />
            </div>
            <p className="text-brand-brown font-medium">Cargando módulos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ height: '100vh', maxHeight: '100vh', overflow: 'auto' }}>
      <div className="min-h-screen bg-brand-light-green/10" style={{ marginTop: 0, paddingTop: 0 }}>
        {/* Header */}
        <header className="bg-brand-light-green border-b border-brand-dark-green/20 sticky top-0 z-40" style={{ marginTop: 0 }}>
          <div className="flex items-center justify-between p-4" style={{ marginTop: 0, paddingTop: '16px' }}>
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="text-brand-dark-green hover:text-brand-orange"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
              <h1 className="text-xl font-bold text-brand-dark-green">Panel de Aprendizaje</h1>
              <p className="text-sm text-brand-dark-green/70">Tu camino hacia el dominio de las inversiones</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-brand-orange/10 text-brand-orange border-brand-orange/20">
                <Flame className="w-3 h-3 mr-1" />
                {learningStreak} day streak
              </Badge>
            </div>
        </div>
      </header>

      <div className="pb-20">
        {/* Progress Overview */}
        <div className="p-4">
          <div className="bg-gradient-to-r from-brand-dark-green to-brand-orange rounded-2xl p-6 mb-6">
                <h2 className="text-xl font-bold mb-2">Tu Jornada de Aprendizaje</h2>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
                    <div className="text-sm opacity-90">Completado</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{completedLessons}</div>
                    <div className="text-sm opacity-90">Videos Completados</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{learningStreak}</div>
                    <div className="text-sm opacity-90">Racha de Días</div>
                  </div>
                </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-brand-light-green">
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-brand-orange mx-auto mb-2" />
                <div className="text-lg font-bold text-brand-dark-green">{completedLessons}</div>
                <div className="text-sm text-brand-dark-green/70">Videos Completados</div>
              </CardContent>
            </Card>
            <Card className="border-brand-light-green">
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-brand-orange mx-auto mb-2" />
                <div className="text-lg font-bold text-brand-dark-green">{totalTimeSpent}</div>
                <div className="text-sm text-brand-dark-green/70">Tiempo Invertido</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Learning Modules */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-brand-dark-green flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-brand-orange" />
              Módulos de Aprendizaje
            </h2>
            <Badge variant="outline" className="text-brand-dark-green border-brand-dark-green/30">
              {availableModules.length} {availableModules.length === 1 ? 'módulo' : 'módulos'}
            </Badge>
          </div>

          {/* Modules List */}
          <div className="space-y-4">
            {availableModules.map((module) => (
              <ExpandableModuleCard
                key={module.id}
                module={module}
                onLessonClick={handleLessonClick}
                subscriptionData={subscriptionData}
              />
            ))}

            {/* Show message if no modules available */}
            {availableModules.length === 0 && !modulesLoading && (
              <Card className="border-brand-light-green">
                <CardContent className="p-6 text-center">
                  <BookOpen className="w-12 h-12 text-brand-orange mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-brand-dark-green mb-2">
                    No hay módulos disponibles
                  </h3>
                  <p className="text-brand-brown">
                    Los módulos se crearán desde el panel de administración.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Motivation Section */}
          <div className="mt-8 mb-6">
            {hasPremiumAccess ? (
              <Card className="bg-gradient-to-r from-brand-dark-green to-brand-orange text-white">
                <CardContent className="p-6 text-center">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-90" />
                  <h3 className="text-xl font-bold mb-2">¡Sigue Adelante!</h3>
                  <p className="opacity-90 mb-4">
                    Has completado {Math.round(overallProgress)}% de tu educación en inversiones. 
                    Cada video te acerca más al dominio financiero.
                  </p>
                  <Button 
                    className="bg-white text-brand-dark-green hover:bg-brand-light-green font-semibold"
                    onClick={() => {
                      // Find next available module
                      const currentModule = availableModules.find(m => m.status === "in-progress" || m.status === "locked");
                      if (currentModule) {
                        setLocation(`/module/${currentModule.id}`);
                      } else if (availableModules.length > 0) {
                        // If no in-progress module, go to first module
                        setLocation(`/module/${availableModules[0].id}`);
                      }
                    }}
                  >
                    Continuar Aprendiendo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gradient-to-r from-brand-dark-green to-brand-orange text-white">
                <CardContent className="p-6 text-center">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-90" />
                  <h3 className="text-xl font-bold mb-2">Unlock Your Full Potential!</h3>
                  <p className="opacity-90 mb-4">
                    Has completado {Math.round(overallProgress)}% de los módulos disponibles. 
                    Actualiza a Premium para acceder a todos los módulos premium y desbloquear tu educación completa en inversiones.
                  </p>
                  <Button 
                    className="bg-white text-brand-dark-green hover:bg-brand-light-green font-semibold"
                    onClick={() => setLocation("/pricing")}
                  >
                    Actualizar a Premium
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation />
      </div>
    </div>
  );
}