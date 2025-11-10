import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { LearningModule } from "@shared/schema";

export default function Module() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [quizCompleted, setQuizCompleted] = useState(false);

  const moduleId = parseInt(params.id);

  const { data: module, isLoading } = useQuery<LearningModule>({
    queryKey: ["/api/modules", moduleId],
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (data: { moduleId: number; completed: boolean; quizPassed: boolean }) => {
      return apiRequest("POST", "/api/progress", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      toast({
        title: "Progress updated!",
        description: "Great job completing this module!",
      });
    },
  });

  const handleSubmitQuiz = () => {
    if (!selectedAnswer) {
      toast({
        title: "Please select an answer",
        description: "Choose one of the options before submitting.",
        variant: "destructive",
      });
      return;
    }

    const isCorrect = selectedAnswer === module?.correctAnswer;
    
    if (isCorrect) {
      toast({
        title: "Correct! 🎉",
        description: "Excellent understanding of the concept!",
      });
      
      // Update progress
      updateProgressMutation.mutate({
        moduleId,
        completed: true,
        quizPassed: true,
      });
      
      setQuizCompleted(true);
    } else {
      toast({
        title: "Not quite right",
        description: "Review the lesson and try again.",
        variant: "destructive",
      });
    }
  };

  const handleContinue = () => {
    setLocation("/learning");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-brand-orange rounded-full flex items-center justify-center mb-4 mx-auto animate-pulse">
            <i className="fas fa-book text-white text-xl"></i>
          </div>
          <p className="text-brand-brown font-medium">Loading module...</p>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <i className="fas fa-exclamation-circle text-4xl text-gray-400 mb-4"></i>
          <h2 className="text-xl font-bold text-gray-600 mb-2">Module not found</h2>
          <Button onClick={() => setLocation("/learning")}>
            Back to Learning Path
          </Button>
        </div>
      </div>
    );
  }

  if (showQuiz) {
    return (
      <div className="min-h-screen bg-white">
        <div className="bg-brand-brown text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setShowQuiz(false)}
              className="text-white touch-target"
            >
              <i className="fas fa-arrow-left text-xl"></i>
            </button>
            <h1 className="font-semibold">Quick Quiz</h1>
            <div className="w-6"></div>
          </div>
        </div>

        <div className="p-6">
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-brand-brown mb-4">Question</h2>
              <p className="text-gray-700 mb-6">{module.quizQuestion}</p>
              
              <div className="space-y-4">
                {module.quizOptions?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedAnswer(option)}
                    className={`w-full text-left p-4 border-2 rounded-xl transition-colors ${
                      selectedAnswer === option
                        ? "border-brand-blue bg-brand-blue/5"
                        : "border-gray-200 hover:border-brand-blue/50"
                    }`}
                  >
                    <span className="font-medium text-brand-brown">
                      {String.fromCharCode(65 + index)}.
                    </span>{" "}
                    <span>{option}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {quizCompleted ? (
            <Button 
              onClick={handleContinue}
              className="w-full bg-brand-light-green hover:bg-green-500 text-brand-dark-green font-semibold py-4 rounded-xl transition-colors touch-target"
            >
              Continue to Learning Path
            </Button>
          ) : (
            <Button 
              onClick={handleSubmitQuiz}
              disabled={!selectedAnswer || updateProgressMutation.isPending}
              className="w-full bg-brand-orange hover:bg-orange-600 text-white font-semibold py-4 rounded-xl transition-colors touch-target disabled:opacity-50"
            >
              {updateProgressMutation.isPending ? "Submitting..." : "Submit Answer"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-brand-brown text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setLocation("/learning")}
            className="text-white touch-target"
          >
            <i className="fas fa-arrow-left text-xl"></i>
          </button>
          <h1 className="font-semibold">{module.title}</h1>
          <div className="w-6"></div>
        </div>
      </div>

      <div className="p-6">
        <div className="mb-8">
          {/* Module illustration placeholder */}
          <div className="w-full h-48 bg-gradient-to-br from-brand-blue/10 to-brand-light-green/10 rounded-xl mb-6 flex items-center justify-center">
            <i className="fas fa-graduation-cap text-4xl text-brand-blue"></i>
          </div>
          
          <h2 className="text-2xl font-bold text-brand-brown mb-4">{module.title}</h2>
          
          <div className="prose max-w-none text-gray-700 space-y-4">
            <div className="whitespace-pre-line leading-relaxed">
              {module.content}
            </div>
            
            <div className="bg-brand-light-green/10 border-l-4 border-brand-light-green p-4 rounded-r-lg mt-6">
              <h4 className="font-semibold text-brand-dark-green mb-2">💡 Key Takeaway</h4>
              <p className="text-brand-dark-green text-sm">
                This module covers essential concepts that will help you make better investment decisions.
              </p>
            </div>
          </div>
        </div>
        
        <Button 
          onClick={() => setShowQuiz(true)}
          className="w-full bg-brand-orange hover:bg-orange-600 text-white font-semibold py-4 rounded-xl transition-colors touch-target"
        >
          Take Quiz
        </Button>
      </div>
    </div>
  );
}
