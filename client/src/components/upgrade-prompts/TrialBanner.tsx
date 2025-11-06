import { Button } from "@/components/ui/button";
import { Calendar, Crown, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

interface TrialBannerProps {
  daysRemaining: number;
  className?: string;
}

export default function TrialBanner({ daysRemaining, className = "" }: TrialBannerProps) {
  const [, navigate] = useLocation();

  const handleUpgradeClick = () => {
    navigate('/pricing');
  };

  const getUrgencyColor = () => {
    if (daysRemaining <= 1) return "from-red-500 to-orange-500";
    if (daysRemaining <= 3) return "from-orange-500 to-yellow-500";
    return "from-blue-500 to-purple-500";
  };

  const getUrgencyText = () => {
    if (daysRemaining <= 0) return "Trial expired";
    if (daysRemaining === 1) return "Last day of trial!";
    return `${daysRemaining} days left in trial`;
  };

  return (
    <div className={`bg-gradient-to-r ${getUrgencyColor()} p-3 ${className}`}>
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <div>
            <p className="font-semibold text-sm">{getUrgencyText()}</p>
            <p className="text-xs opacity-90">
              {daysRemaining > 0 ? "Upgrade to keep full access" : "Upgrade to restore access"}
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleUpgradeClick}
          size="sm"
          className="bg-white text-gray-900 hover:bg-gray-100 font-semibold"
        >
          <Crown className="w-4 h-4 mr-1" />
          Upgrade Now
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}