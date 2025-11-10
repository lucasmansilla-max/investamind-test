import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TradingTip {
  title: string;
  content: string;
  icon: string;
  difficulty: string;
  category: string;
}

const tradingTips: TradingTip[] = [
  {
    title: "Diversifica tu Cartera",
    content: "No pongas todos los huevos en la misma canasta. Distribuye tus inversiones entre diferentes sectores y tipos de activos para reducir el riesgo.",
    icon: "📊",
    difficulty: "Principiante",
    category: "Gestión de Riesgo"
  },
  {
    title: "Investiga Antes de Invertir",
    content: "Siempre analiza los fundamentos de una empresa antes de comprar sus acciones. Lee sus estados financieros y entiende su modelo de negocio.",
    icon: "🔍",
    difficulty: "Intermedio",
    category: "Análisis Fundamental"
  },
  {
    title: "Controla las Emociones",
    content: "No dejes que el miedo o la codicia guíen tus decisiones. Mantén un plan de inversión y síguelo disciplinadamente.",
    icon: "🧠",
    difficulty: "Avanzado",
    category: "Psicología del Trading"
  },
  {
    title: "Invierte a Largo Plazo",
    content: "El tiempo es tu mejor aliado. Las inversiones a largo plazo suelen generar mejores rendimientos que el trading a corto plazo.",
    icon: "⏰",
    difficulty: "Principiante",
    category: "Estrategia"
  },
  {
    title: "Establece Stop Loss",
    content: "Define siempre el punto en el que cortarás tus pérdidas antes de entrar en una posición. Esto te protegerá de grandes caídas.",
    icon: "🛡️",
    difficulty: "Intermedio",
    category: "Gestión de Riesgo"
  },
  {
    title: "Mantén un Diario de Trading",
    content: "Registra todas tus operaciones, decisiones y emociones. Esto te ayudará a identificar patrones y mejorar tu estrategia.",
    icon: "📝",
    difficulty: "Avanzado",
    category: "Desarrollo Personal"
  },
  {
    title: "No Sigas Consejos Ciegos",
    content: "Nunca inviertas basándote únicamente en tips de redes sociales. Siempre haz tu propia investigación y análisis.",
    icon: "⚠️",
    difficulty: "Principiante",
    category: "Educación"
  }
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'Principiante': return 'bg-green-100 text-green-800 border-green-200';
    case 'Intermedio': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Avanzado': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function DailyTradingTip() {
  // Get tip based on day of year for consistency
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const todaysTip = tradingTips[dayOfYear % tradingTips.length];

  return (
    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 w-full">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3 mb-3">
          <div 
            className="flex items-center justify-center rounded-xl flex-shrink-0 card-icon-container"
            style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #FF9800, #FFB74D)',
              minWidth: '40px'
            }}
          >
            <span className="emoji-icon" style={{ fontSize: '20px', lineHeight: 1 }}>
              {todaysTip.icon}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 text-sm">Tip de Trading</h3>
              <Badge className={`${getDifficultyColor(todaysTip.difficulty)} text-xs`}>
                {todaysTip.difficulty}
              </Badge>
            </div>
            <Badge variant="outline" className="text-xs mb-2 inline-block">
              {todaysTip.category}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900 text-sm leading-tight">
            {todaysTip.title}
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {todaysTip.content}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}