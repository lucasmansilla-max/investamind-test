import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Clock, BarChart3 } from "lucide-react";

interface InvestmentStyleModalProps {
  isOpen: boolean;
  onSelect: (style: string) => void;
}

const InvestmentStyleModal = ({ isOpen, onSelect }: InvestmentStyleModalProps) => {
  const [selectedStyle, setSelectedStyle] = useState<string>("");

  const styles = [
    {
      id: "day-swing",
      title: "Day/Swing Trading",
      description: "Operaciones de corto plazo, aprovechando movimientos rápidos",
      icon: TrendingUp,
      color: "bg-red-500 hover:bg-red-600"
    },
    {
      id: "long-term",
      title: "Long-term Investing",
      description: "Inversión a largo plazo, construyendo riqueza gradualmente",
      icon: Clock,
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      id: "both",
      title: "Both",
      description: "Combinación de ambas estrategias según oportunidades",
      icon: BarChart3,
      color: "bg-green-500 hover:bg-green-600"
    }
  ];

  const handleConfirm = () => {
    if (selectedStyle) {
      onSelect(selectedStyle);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-brand-dark-green">
            Estilo de Inversión
          </DialogTitle>
          <p className="text-center text-gray-600 mt-2">
            ¿Qué tipo de inversión te interesa más?
          </p>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {styles.map((style) => {
            const Icon = style.icon;
            return (
              <Card 
                key={style.id}
                className={`cursor-pointer transition-all duration-200 border-2 ${
                  selectedStyle === style.id 
                    ? 'border-brand-light-green shadow-lg scale-105' 
                    : 'border-gray-200 hover:border-brand-light-green/50'
                }`}
                onClick={() => setSelectedStyle(style.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-3 rounded-full ${style.color} text-white`}>
                      <Icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-brand-dark-green">{style.title}</h3>
                      <p className="text-sm text-gray-600">{style.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Button 
          onClick={handleConfirm}
          disabled={!selectedStyle}
          className="w-full mt-6 bg-brand-light-green hover:bg-brand-light-green/80 text-brand-dark-green font-semibold py-3 text-lg"
        >
          Continuar al Dashboard
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default InvestmentStyleModal;