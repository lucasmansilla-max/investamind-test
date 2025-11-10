import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  Target,
  Lightbulb,
  TrendingUp,
  Calculator
} from "lucide-react";

interface LessonContentProps {
  moduleId: string;
  lessonId: string;
}

// Sample lesson content with rich educational material
const lessonContent = {
  "1": {
    "1": {
      title: "Day 1: Stock Market Basics",
      duration: "12 minutes",
      objectives: [
        "Understand what stocks are and represent",
        "Learn how stock exchanges work",
        "Identify major stock exchanges worldwide",
        "Grasp the concept of market capitalization"
      ],
      content: `
        <h2>What Are Stocks?</h2>
        <p>A stock represents partial ownership in a company. When you buy shares of stock, you become a shareholder and own a piece of that business. This ownership gives you certain rights and potential benefits.</p>
        
        <h3>Key Concepts:</h3>
        <ul>
          <li><strong>Share:</strong> A unit of ownership in a company</li>
          <li><strong>Shareholder:</strong> A person who owns shares in a company</li>
          <li><strong>Dividend:</strong> A payment made by companies to shareholders</li>
          <li><strong>Market Cap:</strong> Total value of all company shares</li>
        </ul>

        <h2>How Stock Exchanges Work</h2>
        <p>Stock exchanges are organized markets where stocks are bought and sold. They provide a platform for companies to raise capital and for investors to trade securities.</p>

        <h3>Major Stock Exchanges:</h3>
        <ul>
          <li><strong>NYSE (New York Stock Exchange):</strong> Largest exchange by market cap</li>
          <li><strong>NASDAQ:</strong> Technology-focused electronic exchange</li>
          <li><strong>London Stock Exchange:</strong> Major European exchange</li>
          <li><strong>Tokyo Stock Exchange:</strong> Largest Asian exchange</li>
        </ul>

        <h2>Market Capitalization</h2>
        <p>Market capitalization (market cap) is calculated by multiplying the number of outstanding shares by the current stock price. Companies are typically categorized as:</p>
        <ul>
          <li><strong>Large-cap:</strong> Over $10 billion</li>
          <li><strong>Mid-cap:</strong> $2-10 billion</li>
          <li><strong>Small-cap:</strong> $300 million - $2 billion</li>
        </ul>
      `,
      keyTakeaways: [
        "Stocks represent ownership in companies",
        "Stock exchanges facilitate trading between buyers and sellers",
        "Market cap indicates the total value of a company",
        "Different exchanges specialize in different types of companies"
      ],
      quiz: {
        question: "What does owning stock in a company represent?",
        options: [
          "A loan to the company",
          "Partial ownership in the company",
          "A guarantee of profits",
          "Employment at the company"
        ],
        correct: 1,
        explanation: "When you buy stock, you purchase shares that represent partial ownership in the company. This makes you a shareholder with certain rights and potential benefits."
      }
    },
    "2": {
      title: "Day 2: How Trading Works",
      duration: "10 minutes",
      objectives: [
        "Understand the mechanics of buying and selling stocks",
        "Learn about bid and ask prices",
        "Grasp the role of brokers and market makers",
        "Understand market hours and trading sessions"
      ],
      content: `
        <h2>The Trading Process</h2>
        <p>Stock trading involves the buying and selling of shares through brokers who execute orders on exchanges. The process connects buyers and sellers to facilitate price discovery and transactions.</p>

        <h3>Key Players:</h3>
        <ul>
          <li><strong>Retail Investors:</strong> Individual investors like you</li>
          <li><strong>Institutional Investors:</strong> Banks, funds, insurance companies</li>
          <li><strong>Brokers:</strong> Facilitate trades between buyers and sellers</li>
          <li><strong>Market Makers:</strong> Provide liquidity by buying and selling</li>
        </ul>

        <h2>Bid and Ask Prices</h2>
        <p>Every stock has two key prices at any given moment:</p>
        <ul>
          <li><strong>Bid Price:</strong> The highest price buyers are willing to pay</li>
          <li><strong>Ask Price:</strong> The lowest price sellers are willing to accept</li>
          <li><strong>Spread:</strong> The difference between bid and ask prices</li>
        </ul>

        <h2>Market Hours</h2>
        <p>Stock markets operate during specific hours:</p>
        <ul>
          <li><strong>Regular Hours:</strong> 9:30 AM - 4:00 PM ET (US markets)</li>
          <li><strong>Pre-market:</strong> 4:00 AM - 9:30 AM ET</li>
          <li><strong>After-hours:</strong> 4:00 PM - 8:00 PM ET</li>
        </ul>

        <h2>Order Execution</h2>
        <p>When you place an order, your broker routes it to the exchange where it's matched with a corresponding buy or sell order. Modern trading happens electronically in milliseconds.</p>
      `,
      keyTakeaways: [
        "Brokers facilitate trades between buyers and sellers",
        "Bid and ask prices determine the cost of trading",
        "Market makers provide liquidity to ensure smooth trading",
        "Trading primarily occurs during regular market hours"
      ],
      quiz: {
        question: "What is the 'spread' in stock trading?",
        options: [
          "The time between market open and close",
          "The difference between bid and ask prices",
          "The number of shares available",
          "The daily price change"
        ],
        correct: 1,
        explanation: "The spread is the difference between the bid price (what buyers will pay) and the ask price (what sellers want). A smaller spread indicates higher liquidity."
      }
    }
  }
};

export default function LessonContent({ moduleId, lessonId }: LessonContentProps) {
  const [, setLocation] = useLocation();
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const { toast } = useToast();

  // Get lesson data
  const moduleData = lessonContent[moduleId as keyof typeof lessonContent];
  const lesson = moduleData ? moduleData[lessonId as keyof typeof moduleData] : undefined;
  
  if (!lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Lesson Not Found</h1>
          <p className="text-gray-600 mb-4">The requested lesson could not be loaded.</p>
          <Button onClick={() => setLocation("/learning")}>
            Back to Learning Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const markLessonComplete = useMutation({
    mutationFn: async () => {
      // This would call your API to mark the lesson as completed
      return new Promise(resolve => setTimeout(resolve, 500));
    },
    onSuccess: () => {
      setLessonCompleted(true);
      toast({
        title: "Lesson Completed!",
        description: "Great job! You've successfully completed this lesson.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
    }
  });

  const handleQuizSubmit = () => {
    if (selectedAnswer === null) return;
    
    setQuizCompleted(true);
    const isCorrect = selectedAnswer === lesson.quiz.correct;
    
    if (isCorrect) {
      toast({
        title: "Correct!",
        description: "You've answered correctly. Well done!",
      });
      // Auto-complete lesson after successful quiz
      setTimeout(() => {
        markLessonComplete.mutate();
      }, 1000);
    } else {
      toast({
        title: "Not quite right",
        description: "Check the explanation and try again in the next lesson.",
        variant: "destructive"
      });
    }
  };

  const handleNextLesson = () => {
    const nextLessonId = parseInt(lessonId) + 1;
    const moduleKey = moduleId as keyof typeof lessonContent;
    const nextModuleData = lessonContent[moduleKey];
    const nextExists = nextModuleData ? (nextModuleData as any)[nextLessonId.toString()] : undefined;
    
    if (nextExists) {
      setLocation(`/module/${moduleId}/lesson/${nextLessonId}`);
    } else {
      // Go to next module or back to dashboard
      setLocation("/learning");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/learning")}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{lesson.title}</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{lesson.duration}</span>
                <Badge variant="outline" className="ml-2">
                  Module {moduleId}
                </Badge>
              </div>
            </div>
          </div>
          
          {lessonCompleted && (
            <CheckCircle className="w-6 h-6 text-green-500" />
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="px-4 pb-2">
          <Progress value={showQuiz ? 90 : 60} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Lesson Progress</span>
            <span>{showQuiz ? "90%" : "60%"}</span>
          </div>
        </div>
      </header>

      <div className="pb-20">
        {!showQuiz ? (
          <>
            {/* Learning Objectives */}
            <div className="p-4">
              <Card className="mb-4">
                <CardContent className="p-4">
                  <h2 className="font-bold text-gray-900 mb-3 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-blue-500" />
                    Learning Objectives
                  </h2>
                  <ul className="space-y-2">
                    {lesson.objectives.map((objective: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{objective}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="px-4">
              <Card className="mb-4">
                <CardContent className="p-6">
                  <div 
                    className="prose prose-sm max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: lesson.content }}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Key Takeaways */}
            <div className="px-4">
              <Card className="mb-6">
                <CardContent className="p-4">
                  <h2 className="font-bold text-gray-900 mb-3 flex items-center">
                    <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                    Key Takeaways
                  </h2>
                  <ul className="space-y-2">
                    {lesson.keyTakeaways.map((takeaway: string, index: number) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Continue Button */}
            <div className="px-4">
              <Button 
                onClick={() => setShowQuiz(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
              >
                Take Knowledge Check
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </>
        ) : (
          /* Quiz Section */
          <div className="p-4">
            <Card>
              <CardContent className="p-6">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center">
                  <BookOpen className="w-5 h-5 mr-2 text-purple-500" />
                  Knowledge Check
                </h2>
                
                <div className="mb-6">
                  <p className="text-gray-800 font-medium mb-4">{lesson.quiz.question}</p>
                  
                  <div className="space-y-3">
                    {lesson.quiz.options.map((option: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => !quizCompleted && setSelectedAnswer(index)}
                        disabled={quizCompleted}
                        className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                          selectedAnswer === index
                            ? quizCompleted 
                              ? index === lesson.quiz.correct
                                ? "border-green-500 bg-green-50"
                                : "border-red-500 bg-red-50"
                              : "border-blue-500 bg-blue-50"
                            : quizCompleted && index === lesson.quiz.correct
                            ? "border-green-500 bg-green-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            selectedAnswer === index
                              ? quizCompleted
                                ? index === lesson.quiz.correct
                                  ? "border-green-500 bg-green-500"
                                  : "border-red-500 bg-red-500"
                                : "border-blue-500 bg-blue-500"
                              : quizCompleted && index === lesson.quiz.correct
                              ? "border-green-500 bg-green-500"
                              : "border-gray-300"
                          }`}>
                            {((selectedAnswer === index && quizCompleted && index === lesson.quiz.correct) || 
                              (quizCompleted && index === lesson.quiz.correct)) && (
                              <CheckCircle className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="text-gray-800">{option}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {quizCompleted && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Explanation:</h4>
                    <p className="text-blue-800">{lesson.quiz.explanation}</p>
                  </div>
                )}

                <div className="flex space-x-3">
                  {!quizCompleted ? (
                    <Button 
                      onClick={handleQuizSubmit}
                      disabled={selectedAnswer === null}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Submit Answer
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleNextLesson}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      {lessonCompleted ? "Next Lesson" : "Continue"}
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline"
                    onClick={() => setShowQuiz(false)}
                    className="px-6"
                  >
                    Review Content
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}