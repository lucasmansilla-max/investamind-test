import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, ArrowRight, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

interface UpgradePromptProps {
  message?: string;
  ctaText?: string;
  showTrial?: boolean;
  className?: string;
  size?: "small" | "medium" | "large";
}

export default function UpgradePrompt({ 
  message = "Upgrade for unlimited access",
  ctaText = "Go Premium",
  showTrial = true,
  className = "",
  size = "medium"
}: UpgradePromptProps) {
  const [, navigate] = useLocation();

  const handleUpgradeClick = () => {
    navigate('/pricing');
  };

  const sizeClasses = {
    small: "p-3",
    medium: "p-4",
    large: "p-6"
  };

  const buttonSizes = {
    small: "sm",
    medium: "default",
    large: "lg"
  } as const;

  return (
    <Card className={`border-2 border-dashed border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50 ${className}`}>
      <CardContent className={sizeClasses[size]}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Crown className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-blue-900">{message}</span>
            </div>
            {showTrial && (
              <p className="text-xs text-blue-700">
                Start with 7-day free trial
              </p>
            )}
          </div>
          
          <Button
            onClick={handleUpgradeClick}
            size={buttonSizes[size]}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white ml-3"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            {ctaText}
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}