import { useQuery } from "@tanstack/react-query";
import type { UserProgress } from "@shared/schema";

export function useProgress() {
  const { data: progress = [] } = useQuery<UserProgress[]>({
    queryKey: ["/api/progress"],
  });

  const completedModules = progress.filter(p => p.completed).length;
  const totalModules = 8; // Total number of modules in the learning path
  const progressPercentage = totalModules > 0 ? (completedModules / totalModules) * 100 : 0;

  const achievements = [
    {
      id: "first_lesson",
      name: "First Lesson",
      description: "Complete your first module",
      icon: "fas fa-medal",
      unlocked: completedModules >= 1,
      color: "brand-light-green"
    },
    {
      id: "three_modules",
      name: "3 Modules",
      description: "Complete 3 learning modules",
      icon: "fas fa-fire",
      unlocked: completedModules >= 3,
      color: "brand-orange"
    },
    {
      id: "quiz_master",
      name: "Quiz Master",
      description: "Pass 5 module quizzes",
      icon: "fas fa-brain",
      unlocked: completedModules >= 5,
      color: "brand-blue"
    },
    {
      id: "graduate",
      name: "Graduate",
      description: "Complete all modules",
      icon: "fas fa-graduation-cap",
      unlocked: completedModules >= totalModules,
      color: "brand-brown"
    }
  ];

  return {
    progress,
    completedModules,
    totalModules,
    progressPercentage,
    achievements,
  };
}
