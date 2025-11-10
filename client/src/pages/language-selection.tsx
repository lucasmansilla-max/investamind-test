import { useState } from "react";
import { useLocation } from "wouter";

export default function LanguageSelection() {
  const [, setLocation] = useLocation();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");

  const handleLanguageSelect = (lang: string) => {
    setSelectedLanguage(lang);
    localStorage.setItem("selectedLanguage", lang);
    setLocation("/signup");
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center p-6 bg-white slide-in">
      <div className="text-center mb-12">
        <i className="fas fa-globe text-5xl text-brand-brown mb-4"></i>
        <h2 className="text-3xl font-bold text-brand-brown mb-2">Choose Your Language</h2>
        <p className="text-gray-600">Selecciona tu idioma</p>
      </div>
      
      <div className="w-full space-y-4 max-w-sm">
        <button 
          onClick={() => handleLanguageSelect("en")}
          className="w-full bg-white border-2 border-brand-brown text-brand-brown font-semibold py-4 px-6 rounded-xl text-lg hover:bg-brand-brown hover:text-white transition-colors touch-target flex items-center justify-center space-x-3"
        >
          <span className="text-2xl">🇺🇸</span>
          <span>English</span>
        </button>
        
        <button 
          onClick={() => handleLanguageSelect("es")}
          className="w-full bg-white border-2 border-brand-brown text-brand-brown font-semibold py-4 px-6 rounded-xl text-lg hover:bg-brand-brown hover:text-white transition-colors touch-target flex items-center justify-center space-x-3"
        >
          <span className="text-2xl">🇪🇸</span>
          <span>Español</span>
        </button>
      </div>
    </div>
  );
}
