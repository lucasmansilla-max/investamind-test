import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { GraduationCap, TrendingUp, Target } from "lucide-react";

interface ExperienceLevelModalProps {
  isOpen: boolean;
  onSelect: (level: string) => void;
}

const ExperienceLevelModal = ({ isOpen, onSelect }: ExperienceLevelModalProps) => {
  const { t } = useTranslation();
  const [selectedLevel, setSelectedLevel] = useState<string>("");

  const levels = [
    {
      id: "beginner",
      title: t("experienceLevel.beginner.title"),
      description: t("experienceLevel.beginner.description"),
      icon: GraduationCap,
      color: "bg-brand-light-green hover:bg-brand-light-green/80"
    },
    {
      id: "intermediate", 
      title: t("experienceLevel.intermediate.title"),
      description: t("experienceLevel.intermediate.description"),
      icon: TrendingUp,
      color: "bg-brand-orange hover:bg-brand-orange/80"
    },
    {
      id: "advanced",
      title: t("experienceLevel.advanced.title"),
      description: t("experienceLevel.advanced.description"),
      icon: Target,
      color: "bg-brand-blue hover:bg-brand-blue/80"
    }
  ];

  const handleConfirm = () => {
    if (selectedLevel) {
      onSelect(selectedLevel);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-brand-dark-green">
            {t("experienceLevel.title")}
          </DialogTitle>
          <p className="text-center text-gray-600 mt-2">
            {t("experienceLevel.subtitle")}
          </p>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {levels.map((level) => {
            const Icon = level.icon;
            return (
              <Card 
                key={level.id}
                className={`cursor-pointer transition-all duration-200 border-2 ${
                  selectedLevel === level.id 
                    ? 'border-brand-light-green shadow-lg scale-105' 
                    : 'border-gray-200 hover:border-brand-light-green/50'
                }`}
                onClick={() => setSelectedLevel(level.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-full ${level.color} text-white`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-brand-dark-green">{level.title}</h3>
                      <p className="text-sm text-gray-600">{level.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button 
          onClick={handleConfirm}
          disabled={!selectedLevel}
          className="w-full mt-6 bg-brand-light-green hover:bg-brand-light-green/80 text-brand-dark-green font-semibold py-3 text-lg"
        >
          {t("experienceLevel.continue")}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default ExperienceLevelModal;