import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Check } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/hooks/use-auth";

export default function LanguageSelectionModal() {
  const { language, setLanguage, t, isLanguageSelected, hasShownLanguageModal, setHasShownLanguageModal } = useLanguage();
  const { isAuthenticated, isLoading } = useAuth();
  const [selectedLang, setSelectedLang] = useState<'en' | 'es'>(language);

  const languages = [
    {
      code: 'en' as const,
      name: "English",
      flag: "🇺🇸",
      description: "Continue in English"
    },
    {
      code: 'es' as const, 
      name: "Español",
      flag: "🇪🇸",
      description: "Continuar en Español"
    }
  ];

  const handleConfirm = () => {
    setLanguage(selectedLang);
    setHasShownLanguageModal(true);
    sessionStorage.setItem('languageModalShown', 'true');
  };

  // Only show modal if:
  // - User is authenticated and loading is complete
  // - Language hasn't been selected
  // - Modal hasn't been shown this session
  const shouldShow = isAuthenticated && 
                     !isLoading && 
                     !isLanguageSelected && 
                     !hasShownLanguageModal;

  if (!shouldShow) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-md mx-auto" aria-describedby="language-selection-description">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-brand-dark-green flex items-center justify-center">
            <Globe className="w-6 h-6 mr-2" />
            Choose Your Language
          </DialogTitle>
          <div id="language-selection-description" className="text-center text-gray-600 mt-2">
            Select your preferred language for the best learning experience
          </div>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {languages.map((lang) => (
            <Card 
              key={lang.code}
              className={`language-option cursor-pointer transition-all duration-200 border-2 ${
                selectedLang === lang.code 
                  ? 'border-brand-light-green shadow-lg scale-105' 
                  : 'border-gray-200 hover:border-brand-light-green/50'
              }`}
              onClick={() => setSelectedLang(lang.code)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">{lang.flag}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg !text-green-800 force-green-text">{lang.name}</h3>
                    <p className="text-sm !text-green-700 force-green-text">{lang.description}</p>
                  </div>
                  {selectedLang === lang.code && (
                    <Check className="w-6 h-6 text-brand-light-green" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button 
          onClick={handleConfirm}
          disabled={!selectedLang}
          className="w-full mt-6 bg-brand-light-green hover:bg-brand-light-green/80 text-brand-dark-green font-semibold py-3 text-lg"
        >
          {selectedLang === 'es' ? 'Continuar' : 'Continue'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}