import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, Play, CheckCircle, Lock, Clock, BookOpen, Trophy, Crown } from "lucide-react";
import { useLocation } from "wouter";
import type { LearningModule } from "@shared/schema";
import UpgradePrompt from "@/components/upgrade-prompts/UpgradePrompt";
import { useHasPremiumAccess, type SubscriptionStatusData } from "@/hooks/use-subscription-status";

interface Lesson {
  id: number;
  title: string;
  duration: string;
  status: "completed" | "current" | "locked";
  description?: string;
}

interface ModuleCardProps {
  module: {
    id: number;
    title: string;
    subtitle: string;
    icon: string;
    totalLessons: number;
    completedLessons: number;
    estimatedTime: string;
    status: "completed" | "in-progress" | "locked";
    lessons: Lesson[];
    description?: string;
  };
  onLessonClick: (moduleId: number, lessonId: number) => void;
  subscriptionData?: SubscriptionStatusData;
}

export default function ExpandableModuleCard({ 
  module, 
  onLessonClick,
  subscriptionData: propSubscriptionData 
}: ModuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [, setLocation] = useLocation();
  const progress = (module.completedLessons / module.totalLessons) * 100;

  // Get premium access status using the hook (avoids duplicate logic)
  const { hasPremiumAccess, subscriptionData: hookSubscriptionData } = useHasPremiumAccess();
  
  // Use prop data if available, otherwise use hook data
  const subscriptionData = propSubscriptionData || hookSubscriptionData;

  const handleUpgradeClick = () => {
    setLocation('/pricing');
  };

  // Check if user is Free (not premium/legacy/admin)
  // Use the hook's logic instead of duplicating it
  const isFreeUser = !hasPremiumAccess;

  // Memoize access check to avoid recalculating on every render
  const hasAccess = useMemo(() => {
    // If user is not free, they have premium access
    if (!isFreeUser) return true;
    
    // Free users only have access to first module
    return module.id === 1;
  }, [isFreeUser, module.id]);

  // Module is locked only for Free users when they don't have access
  // For Premium/Legacy/Admin users, "locked" status means "available" (not started)
  const isModuleLocked = useMemo(() => {
    // Premium users can access all modules regardless of status
    if (!isFreeUser) return false;
    
    // Free users: module is locked if they don't have access (not module 1)
    return !hasAccess;
  }, [isFreeUser, hasAccess]);

  // Get effective status considering user role
  // For Free users: "locked" means truly locked
  // For Premium/Legacy/Admin: "locked" means "available" (not started yet)
  const effectiveStatus = useMemo(() => {
    // If user is Free and module status is "locked", it's truly locked
    if (isFreeUser && module.status === "locked") {
      return "locked";
    }
    
    // If user is Premium/Legacy/Admin and module status is "locked", it means "available" (not started)
    if (!isFreeUser && module.status === "locked") {
      return "available";
    }
    
    // For other statuses (completed, in-progress), use as is
    return module.status;
  }, [isFreeUser, module.status]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-brand-light-green" />;
      case "in-progress":
        return <Play className="w-5 h-5 text-brand-orange" />;
      case "available":
        return <BookOpen className="w-5 h-5 text-brand-dark-green" />;
      case "locked":
        return <Lock className="w-5 h-5 text-gray-400" />;
      default:
        return <BookOpen className="w-5 h-5 text-brand-dark-green" />;
    }
  };

  const getLessonStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-brand-light-green" />;
      case "current":
        return <Play className="w-4 h-4 text-brand-orange" />;
      case "locked":
        return <Lock className="w-4 h-4 text-gray-400" />;
      default:
        return <BookOpen className="w-4 h-4 text-brand-dark-green" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-brand-light-green/10 text-brand-dark-green border-brand-light-green/20";
      case "in-progress":
        return "bg-brand-orange/10 text-brand-orange border-brand-orange/20";
      case "available":
        return "bg-brand-dark-green/10 text-brand-dark-green border-brand-dark-green/20";
      case "locked":
        return "bg-gray-100 text-gray-600 border-gray-200";
      default:
        return "bg-brand-dark-green/10 text-brand-dark-green border-brand-dark-green/20";
    }
  };

  return (
    <Card className={`mb-4 transition-all duration-300 hover:shadow-lg ${
      isModuleLocked ? "opacity-60" : ""
    } ${isExpanded ? "shadow-xl" : "shadow-md"}`}>
      <CardContent className="p-0">
        {/* Module Header */}
        <div
          className={`p-6 cursor-pointer transition-all duration-200 ${
            !isModuleLocked ? "hover:bg-gray-50" : "hover:bg-blue-50"
          }`}
          onClick={() => {
            if (isModuleLocked) {
              handleUpgradeClick();
            } else {
              setIsExpanded(!isExpanded);
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              {/* Module Icon */}
              <div className="flex-shrink-0">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                  effectiveStatus === "completed" 
                    ? "bg-green-100" 
                    : effectiveStatus === "in-progress" 
                    ? "bg-blue-100" 
                    : effectiveStatus === "locked"
                    ? "bg-gray-100"
                    : "bg-blue-100"
                }`}>
                  {module.icon}
                </div>
              </div>

              {/* Module Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-bold text-lg text-gray-900 truncate">{module.title}</h3>
                  {getStatusIcon(effectiveStatus)}
                </div>
                <p className="text-sm text-gray-600 mb-2">{module.subtitle}</p>
                
                {/* Progress and Stats */}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <BookOpen className="w-4 h-4" />
                    <span>{module.totalLessons} lessons</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{module.estimatedTime}</span>
                  </div>
                  {effectiveStatus === "completed" && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <Trophy className="w-4 h-4" />
                      <span>Completed</span>
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                {!isModuleLocked && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">
                        {module.completedLessons} of {module.totalLessons} completed
                      </span>
                      <span className="text-xs font-medium text-gray-700">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </div>
            </div>

            {/* Expand/Collapse Icon */}
            <div className="flex-shrink-0 ml-4">
              {!isModuleLocked && (
                isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-4">
            <Badge className={`${getStatusColor(effectiveStatus)} border`}>
              {effectiveStatus === "completed" && "✅ Completed"}
              {effectiveStatus === "in-progress" && "🔄 In Progress"}
              {effectiveStatus === "available" && "📚 Available"}
              {effectiveStatus === "locked" && "🔒 Locked"}
            </Badge>
          </div>
        </div>

        {/* Upgrade Prompt for Locked Modules */}
        {isModuleLocked && (
          <div className="border-t p-4">
            <UpgradePrompt 
              message={`Unlock ${module.title}`}
              ctaText="Upgrade to Access"
              size="medium"
            />
          </div>
        )}

        {/* Expanded Lessons List */}
        {isExpanded && !isModuleLocked && (
          <div className="border-t bg-gray-50">
            <div className="p-4">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <BookOpen className="w-4 h-4 mr-2" />
                Lessons ({module.lessons.length})
              </h4>
              <div className="space-y-2">
                {module.lessons.map((lesson, index) => (
                  
                  <div
                    key={lesson.id}
                    className={`flex items-center p-3 rounded-lg border transition-all duration-200 ${
                      lesson.status === "locked" 
                        ? "bg-gray-100 cursor-not-allowed opacity-60" 
                        : "bg-white hover:shadow-md cursor-pointer"
                    }`}
                    onClick={() => lesson.status !== "locked" && onLessonClick(module.id, lesson.id)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {/* Lesson Number */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        lesson.status === "completed" 
                          ? "bg-green-500 text-white" 
                          : lesson.status === "current"
                          ? "bg-brand-orange text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}>
                        {lesson.status === "completed" ? "✓" : index + 1}
                      </div>

                      {/* Lesson Info */}
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{lesson.title}</h5>
                        {lesson.description && (
                          <p className="text-sm text-gray-600 mt-1">{lesson.description}</p>
                        )}
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{lesson.duration}</span>
                          </div>
                        </div>
                      </div>

                      {/* Lesson Status */}
                      <div className="flex-shrink-0">
                        {getLessonStatusIcon(lesson.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Continue/Start Buttons */}
              <div className="mt-4 space-y-2">
                <Button 
                  className="w-full bg-brand-orange hover:bg-orange-600 text-white font-semibold py-3"
                  onClick={() => {
                    // Navigate directly to module page to see video and full content
                    setLocation(`/module/${module.id}`);
                  }}
                >
                  {effectiveStatus === "completed" ? "Ver Módulo Completo" : "Abrir Módulo"}
                  <Play className="w-4 h-4 ml-2" />
                </Button>
                {module.lessons.length > 0 && (
                  <Button 
                    variant="outline"
                    className="w-full border-brand-dark-green text-brand-dark-green hover:bg-brand-light-green/10 font-semibold py-3"
                    onClick={() => {
                      const nextLesson = module.lessons.find(l => l.status !== "completed");
                      if (nextLesson) {
                        onLessonClick(module.id, nextLesson.id);
                      }
                    }}
                  >
                    Continuar con Lecciones
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}