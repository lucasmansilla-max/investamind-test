import { useEffect } from "react";
import { X } from "lucide-react";

interface MessageType {
  id: string;
  name: string;
  icon: string;
  description: string;
  xpReward: number;
  color: string;
}

const messageTypes: MessageType[] = [
  {
    id: 'analysis',
    name: 'Market Analysis',
    icon: '📊',
    description: 'Share your technical or fundamental analysis',
    xpReward: 15,
    color: '#4CAF50'
  },
  {
    id: 'prediction',
    name: 'Price Prediction',
    icon: '🎯',
    description: 'Make a price prediction with reasoning',
    xpReward: 25,
    color: '#FF9800'
  },
  {
    id: 'signal',
    name: 'Trading Signal',
    icon: '⚡',
    description: 'Share entry/exit points with targets',
    xpReward: 30,
    color: '#F44336'
  },
  {
    id: 'education',
    name: 'Educational Content',
    icon: '🎓',
    description: 'Teach others about trading concepts',
    xpReward: 20,
    color: '#9C27B0'
  },
  {
    id: 'news',
    name: 'Market News',
    icon: '📰',
    description: 'Share and discuss market news',
    xpReward: 10,
    color: '#2196F3'
  },
  {
    id: 'question',
    name: 'Ask Question',
    icon: '❓',
    description: 'Get help from the community',
    xpReward: 5,
    color: '#607D8B'
  },
  {
    id: 'general',
    name: 'General Discussion',
    icon: '💬',
    description: 'General trading discussion',
    xpReward: 8,
    color: '#795548'
  }
];

interface MessageTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: MessageType) => void;
}

export default function MessageTypeModal({ isOpen, onClose, onSelectType }: MessageTypeModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSelectType = (type: MessageType) => {
    onSelectType(type);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-5 overflow-y-auto"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 py-5 border-b border-gray-100 rounded-t-3xl z-10">
          <h2 className="text-xl font-bold text-center text-brand-dark-green">
            Choose Post Type
          </h2>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Message Type Grid */}
        <div className="grid grid-cols-2 gap-4 p-6 pb-6">
          {messageTypes.map((type) => (
            <div
              key={type.id}
              onClick={() => handleSelectType(type)}
              className="bg-white border-2 border-gray-200 rounded-2xl p-5 text-center cursor-pointer transition-all duration-300 hover:border-brand-orange hover:-translate-y-1 hover:shadow-lg min-h-[140px] flex flex-col justify-between"
            >
              {/* Icon Container */}
              <div 
                className="mx-auto mb-3 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ 
                  width: '48px',
                  height: '48px',
                  background: `linear-gradient(135deg, ${type.color}, ${type.color}dd)`,
                  color: 'white',
                  fontSize: '24px',
                  aspectRatio: '1 / 1',
                  objectFit: 'contain'
                }}
              >
                <span style={{ 
                  fontSize: '24px', 
                  lineHeight: 1, 
                  width: 'auto', 
                  height: 'auto', 
                  display: 'block' 
                }}>
                  {type.icon}
                </span>
              </div>
              
              {/* Content */}
              <div className="flex-grow">
                <div className="font-bold text-sm text-brand-dark-green mb-2 leading-tight">
                  {type.name}
                </div>
                <div className="text-xs text-gray-600 mb-3 leading-relaxed">
                  {type.description}
                </div>
                <div 
                  className="inline-block px-3 py-1 rounded-lg text-xs font-bold text-white"
                  style={{ backgroundColor: type.color }}
                >
                  +{type.xpReward} XP
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { messageTypes };
export type { MessageType };