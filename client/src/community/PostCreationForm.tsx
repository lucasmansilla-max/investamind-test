import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Tag } from "lucide-react";
import { MessageType } from "./MessageTypeModal";

interface PostCreationFormProps {
  isOpen: boolean;
  onClose: () => void;
  messageType: MessageType;
  onSubmit: (postData: any) => void;
}

interface FormField {
  type: string;
  placeholder: string;
  required?: boolean;
  options?: string[];
  min?: number;
  max?: number;
  readonly?: boolean;
}

const getFormFields = (messageType: string): Record<string, FormField> => {
  const baseFields = {
    content: { type: 'textarea', placeholder: 'Share your thoughts...', required: true },
    tags: { type: 'tag-input', placeholder: 'Add relevant tags...' }
  };

  const typeSpecificFields: Record<string, Record<string, FormField>> = {
    signal: {
      ticker: { type: 'text', placeholder: 'Stock Symbol (e.g., AAPL)', required: true },
      signalType: { type: 'select', placeholder: 'Select signal type', options: ['BUY', 'SELL', 'HOLD'], required: true },
      entryPrice: { type: 'number', placeholder: 'Entry Price', required: true },
      targetPrice: { type: 'number', placeholder: 'Target Price' },
      stopLoss: { type: 'number', placeholder: 'Stop Loss' },
      timeframe: { type: 'select', placeholder: 'Select timeframe', options: ['Intraday', '1-3 days', '1 week', '1 month', 'Long term'] }
    },
    prediction: {
      ticker: { type: 'text', placeholder: 'Stock Symbol', required: true },
      predictedPrice: { type: 'number', placeholder: 'Predicted Price', required: true },
      timeframe: { type: 'select', placeholder: 'Select timeframe', options: ['1 day', '1 week', '1 month', '3 months', '6 months'], required: true },
      confidence: { type: 'range', min: 1, max: 10, placeholder: 'Confidence Level (1-10)' }
    },
    analysis: {
      ticker: { type: 'text', placeholder: 'Stock Symbol (optional)' },
      analysisType: { type: 'select', placeholder: 'Select analysis type', options: ['Technical', 'Fundamental', 'Sentiment', 'Mixed'] }
    }
  };

  return { ...baseFields, ...(typeSpecificFields[messageType] || {}) };
};

export default function PostCreationForm({ isOpen, onClose, messageType, onSubmit }: PostCreationFormProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const formFields = getFormFields(messageType.id);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = () => {
    const postData = {
      ...formData,
      messageType: messageType.id,
      tags,
      xpReward: messageType.xpReward
    };
    onSubmit(postData);
    setFormData({});
    setTags([]);
    onClose();
  };

  const isFormValid = () => {
    return Object.entries(formFields).every(([field, config]) => {
      if (!config.required) return true;
      if (field === 'tags') return true;
      return formData[field] && formData[field].toString().trim() !== '';
    });
  };

  const renderFormField = (fieldName: string, config: FormField) => {
    if (fieldName === 'tags') {
      return (
        <div key={fieldName} className="space-y-2">
          <Label className="text-brand-dark-green">Tags</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="bg-brand-light-green/20 text-brand-dark-green"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder={config.placeholder}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleAddTag}
              variant="outline"
              size="sm"
              className="px-3"
            >
              <Tag className="w-4 h-4" />
            </Button>
          </div>
        </div>
      );
    }

    if (config.type === 'textarea') {
      return (
        <div key={fieldName} className="space-y-2">
          <Label className="text-brand-dark-green">
            Content {config.required && <span className="text-red-500">*</span>}
          </Label>
          <Textarea
            value={formData[fieldName] || ''}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            placeholder={config.placeholder}
            className="min-h-[100px] resize-none"
          />
        </div>
      );
    }

    if (config.type === 'select') {
      return (
        <div key={fieldName} className="space-y-2">
          <Label className="text-brand-dark-green">
            {fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1')}
            {config.required && <span className="text-red-500">*</span>}
          </Label>
          <Select
            value={formData[fieldName] || ''}
            onValueChange={(value) => handleInputChange(fieldName, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${fieldName}`} />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (config.type === 'range') {
      return (
        <div key={fieldName} className="space-y-2">
          <Label className="text-brand-dark-green">
            {config.placeholder}
            {formData[fieldName] && ` (${formData[fieldName]})`}
          </Label>
          <input
            type="range"
            min={config.min}
            max={config.max}
            value={formData[fieldName] || config.min}
            onChange={(e) => handleInputChange(fieldName, parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      );
    }

    return (
      <div key={fieldName} className="space-y-2">
        <Label className="text-brand-dark-green">
          {fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1')}
          {config.required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          type={config.type}
          value={formData[fieldName] || ''}
          onChange={(e) => handleInputChange(fieldName, e.target.value)}
          placeholder={config.placeholder}
          readOnly={config.readonly}
          step={config.type === 'number' ? '0.01' : undefined}
        />
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl text-brand-dark-green">
            <span className="text-2xl">{messageType.icon}</span>
            Create {messageType.name}
            <Badge className="bg-brand-light-green/20 text-brand-dark-green">
              +{messageType.xpReward} XP
            </Badge>
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute right-4 top-4 p-0 w-8 h-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {Object.entries(formFields).map(([fieldName, config]) =>
            renderFormField(fieldName, config)
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isFormValid()}
            className="flex-1 bg-brand-orange hover:bg-brand-orange/80 text-white"
          >
            Post
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}