import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/language-context";

export default function LanguageSelection() {
  const [, setLocation] = useLocation();
  const { setLanguage, t } = useLanguage();

  const handleLanguageSelect = (lang: "en" | "es") => {
    setLanguage(lang);
    // Redirigir a la página de bienvenida después de seleccionar el idioma
    setLocation("/");
  };

  return (
    <div className="h-screen flex flex-col justify-center items-center p-6 bg-white slide-in">
      <div className="text-center mb-12">
        <i className="fas fa-globe text-5xl text-brand-brown mb-4"></i>
        <h2 className="text-3xl font-bold text-brand-brown mb-2">
          {t("languageSelection.title")}
        </h2>
        <p className="text-gray-600">{t("languageSelection.subtitle")}</p>
      </div>
      
      <div className="w-full space-y-4 max-w-sm">
        <button 
          onClick={() => handleLanguageSelect("en")}
          className="w-full bg-white border-2 border-brand-brown text-brand-brown font-semibold py-4 px-6 rounded-xl text-lg hover:bg-brand-brown hover:text-white transition-colors touch-target flex items-center justify-center space-x-3"
        >
          <span className="text-2xl">🇺🇸</span>
          <span>{t("languageSelection.english")}</span>
        </button>
        
        <button 
          onClick={() => handleLanguageSelect("es")}
          className="w-full bg-white border-2 border-brand-brown text-brand-brown font-semibold py-4 px-6 rounded-xl text-lg hover:bg-brand-brown hover:text-white transition-colors touch-target flex items-center justify-center space-x-3"
        >
          <span className="text-2xl">🇪🇸</span>
          <span>{t("languageSelection.spanish")}</span>
        </button>
      </div>
    </div>
  );
}
