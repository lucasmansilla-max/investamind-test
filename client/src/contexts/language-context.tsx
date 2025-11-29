import React, { createContext, useContext, useState, useEffect } from 'react';

interface LanguageContextType {
  language: 'en' | 'es';
  setLanguage: (lang: 'en' | 'es') => void;
  t: (key: string) => string;
  isLanguageSelected: boolean;
  setIsLanguageSelected: (selected: boolean) => void;
  hasShownLanguageModal: boolean;
  setHasShownLanguageModal: (shown: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Comprehensive translations object
const translations = {
  en: {
    // Language Selection
    languageSelection: {
      title: "Choose Your Language",
      subtitle: "Select your preferred language for the best learning experience",
      english: "English",
      spanish: "Español",
      continue: "Continue"
    },
    // Onboarding
    onboarding: {
      experienceTitle: "What's Your Investment Experience?",
      experienceSubtitle: "Help us personalize your learning journey",
      beginner: "Beginner",
      beginnerDesc: "New to investing, want to learn the basics",
      intermediate: "Intermediate", 
      intermediateDesc: "Some experience, ready for advanced strategies",
      advanced: "Advanced",
      advancedDesc: "Experienced investor, seeking expert insights",
      investmentStyleTitle: "Investment Style",
      investmentStyleSubtitle: "What type of investment interests you most?",
      daySwingTitle: "Day/Swing Trading",
      daySwingDesc: "Short-term operations, taking advantage of quick movements",
      longTermTitle: "Long-term Investing",
      longTermDesc: "Long-term investment, building wealth gradually", 
      bothTitle: "Both",
      bothDesc: "Combination of both strategies depending on opportunities",
      continueButton: "Continue to Dashboard"
    },
    // Dashboard
    dashboard: {
      title: "Investamind",
      yourProgress: "Your Learning Progress",
      modulesCompleted: "modules completed",
      complete: "Complete",
      keepItUp: "Keep it up!",
      continuelearning: "Continue Learning",
      viewProgress: "View Progress",
      weeklyRecap: "Weekly Market Recap",
      seeAll: "See All",
      readyForMore: "Ready for More?",
      premiumCommunity: "Join our premium community and unlock advanced strategies, live sessions, and personalized guidance.",
      joinPremium: "Join Our Premium Community",
      dayStreak: "day streak",
      lessonsCompleted: "Lessons Completed",
      timeInvested: "Time Invested",
      keepGoing: "Keep Going!",
      progressMessage: "through your investment education journey. Every lesson brings you closer to financial mastery.",
      learningJourney: "Your Learning Journey",
      percentComplete: "Complete",
      lessonsDone: "Lessons Done",
      notifications: "Notifications"
    },
    // Learning
    learning: {
      dashboard: "Learning Dashboard",
      pathToMastery: "Your path to investment mastery",
      learningModules: "Learning Modules",
      modules: "modules",
      lessons: "lessons",
      completed: "Completed",
      inProgress: "In Progress", 
      locked: "Locked",
      continueModule: "Continue Learning",
      reviewModule: "Review Module",
      knowledgeCheck: "Knowledge Check",
      correct: "Correct!",
      wellDone: "You've answered correctly. Well done!",
      notQuite: "Not quite right",
      tryAgain: "Check the explanation and try again in the next lesson.",
      submitAnswer: "Submit Answer",
      nextLesson: "Next Lesson",
      reviewContent: "Review Content",
      lessonNotFound: "Lesson Not Found",
      lessonNotFoundDesc: "The requested lesson could not be loaded.",
      backToLearning: "Back to Learning Dashboard",
      lessonCompleted: "Lesson Completed!",
      greatJob: "Great job! You've successfully completed this lesson.",
      learningObjectives: "Learning Objectives",
      keyTakeaways: "Key Takeaways",
      lessonProgress: "Lesson Progress",
      takeKnowledgeCheck: "Take Knowledge Check",
      explanation: "Explanation:",
      continue: "Continue"
    },
    // Modules
    modules: {
      quickStart: {
        title: "Quick Start Guide",
        subtitle: "7-Day Foundation Course",
        description: "Master the fundamentals of investing in just one week"
      },
      stockFundamentals: {
        title: "Stock Fundamentals", 
        subtitle: "Understanding Company Analysis",
        description: "Deep dive into analyzing and valuing companies"
      },
      technicalAnalysis: {
        title: "Technical Analysis",
        subtitle: "Chart Reading & Patterns", 
        description: "Master the art of reading charts and technical indicators"
      },
      portfolioManagement: {
        title: "Portfolio Management",
        subtitle: "Building Wealth Systematically",
        description: "Advanced portfolio construction and management strategies"
      },
      advancedStrategies: {
        title: "Advanced Strategies",
        subtitle: "Professional Techniques",
        description: "Advanced investing strategies for experienced investors"
      }
    },
    // Navigation
    navigation: {
      home: "Home",
      learning: "Learning",
      progress: "Progress", 
      market: "Market",
      profile: "Profile"
    },
    // Common
    common: {
      loading: "Loading...",
      error: "Error",
      tryAgain: "Try Again",
      save: "Save",
      cancel: "Cancel",
      close: "Close",
      next: "Next",
      previous: "Previous",
      minutes: "minutes",
      hours: "hours",
      days: "days",
      week: "week",
      month: "month"
    },
    // Pricing
    pricing: {
      title: "Choose Your Plan",
      myPlan: "My Plan",
      backToHome: "Back to Home",
      premiumPlan: "Premium Plan",
      monthly: "Monthly",
      yearly: "Yearly",
      perMonth: "per month",
      perYear: "per year",
      year: "year",
      month: "month",
      annually: "annually",
      startFreeTrial: "Start Free Trial",
      upgradeNow: "Upgrade Now",
      switchTo: "Switch to",
      billing: "billing",
      processing: "Processing...",
      daysFree: "7 days free, then",
      noCreditCard: "No credit card required • Cancel anytime",
      freeTrial: "7-Day Free Trial",
      founderMember: "Founder Member",
      founder: "Founder",
      lifetimeDiscount: "50% Lifetime Discount Applied!",
      save: "Save",
      saveYearly: "Save $179.89 yearly!",
      saveFounder: "Save $90",
      discount: "23%",
      billedAs: "Billed as",
      everythingYouGet: "Everything You Get",
      whyChoosePremium: "Why Choose Premium?",
      completeEducation: "Complete trading education curriculum",
      realTimeSignals: "Real-time market signals and alerts",
      unlimitedCommunity: "Unlimited community access and posts",
      prioritySupport: "Priority support and expert guidance",
      successRate: "Success Rate",
      support: "Support",
      securePayment: "Secure payment • Cancel anytime • No hidden fees",
      planActive: "Plan Active",
      trialPeriod: "Trial Period",
      canceled: "Canceled",
      startDate: "Start Date",
      trialStart: "Trial Start",
      trialEnd: "Trial End",
      nextBilling: "Next Billing",
      accessUntil: "Access Until",
      discountLabel: "Discount",
      lifetime: "lifetime",
      includedBenefits: "Included Benefits",
      subscriptionProtected: "Your subscription is protected",
      subscriptionProtectedDesc: "You can cancel at any time. Access continues until the end of the billing period.",
      allModules: "All Modules",
      allModulesDesc: "Access every learning module and lesson",
      tradingSignals: "Trading Signals",
      tradingSignalsDesc: "Real-time trading signals from experts",
      community: "Community",
      communityDesc: "Full community participation",
      expertTips: "Expert Tips",
      expertTipsDesc: "Direct access to trading experts",
      portfolioAnalysis: "Portfolio Analysis",
      portfolioAnalysisDesc: "Professional portfolio tracking",
      marketAlerts: "Market Alerts",
      marketAlertsDesc: "Never miss important market moves",
      completeLibrary: "Complete library",
      expertCalls: "Expert calls",
      unlimitedAccess: "Unlimited access",
      liveInsights: "Live insights",
      advancedTools: "Advanced tools",
      realTimeNotifications: "Real-time notifications"
    }
  },
  es: {
    // Selección de Idioma
    languageSelection: {
      title: "Elige Tu Idioma",
      subtitle: "Selecciona tu idioma preferido para la mejor experiencia de aprendizaje",
      english: "English",
      spanish: "Español", 
      continue: "Continuar"
    },
    // Incorporación
    onboarding: {
      experienceTitle: "¿Cuál es Tu Experiencia en Inversiones?",
      experienceSubtitle: "Ayúdanos a personalizar tu viaje de aprendizaje",
      beginner: "Principiante",
      beginnerDesc: "Nuevo en inversiones, quiero aprender lo básico",
      intermediate: "Intermedio",
      intermediateDesc: "Algo de experiencia, listo para estrategias avanzadas", 
      advanced: "Avanzado",
      advancedDesc: "Inversor experimentado, busco conocimientos expertos",
      investmentStyleTitle: "Estilo de Inversión",
      investmentStyleSubtitle: "¿Qué tipo de inversión te interesa más?",
      daySwingTitle: "Day/Swing Trading",
      daySwingDesc: "Operaciones de corto plazo, aprovechando movimientos rápidos",
      longTermTitle: "Inversión a Largo Plazo", 
      longTermDesc: "Inversión a largo plazo, construyendo riqueza gradualmente",
      bothTitle: "Ambos",
      bothDesc: "Combinación de ambas estrategias según oportunidades",
      continueButton: "Continuar al Dashboard"
    },
    // Panel Principal
    dashboard: {
      title: "Investamind",
      yourProgress: "Tu Progreso de Aprendizaje",
      modulesCompleted: "módulos completados",
      complete: "Completo",
      keepItUp: "¡Sigue así!",
      continuelearning: "Continuar Aprendiendo",
      viewProgress: "Ver Progreso", 
      weeklyRecap: "Resumen Semanal del Mercado",
      seeAll: "Ver Todo",
      readyForMore: "¿Listo para Más?",
      premiumCommunity: "Únete a nuestra comunidad premium y desbloquea estrategias avanzadas, sesiones en vivo y orientación personalizada.",
      joinPremium: "Únete a Nuestra Comunidad Premium",
      dayStreak: "días seguidos",
      lessonsCompleted: "Lecciones Completadas",
      timeInvested: "Tiempo Invertido",
      keepGoing: "¡Sigue Adelante!",
      progressMessage: "de tu viaje de educación en inversiones. Cada lección te acerca más al dominio financiero.",
      learningJourney: "Tu Viaje de Aprendizaje",
      percentComplete: "Completo",
      lessonsDone: "Lecciones Hechas",
      notifications: "Notificaciones"
    },
    // Aprendizaje
    learning: {
      dashboard: "Panel de Aprendizaje",
      pathToMastery: "Tu camino hacia el dominio de las inversiones",
      learningModules: "Módulos de Aprendizaje",
      modules: "módulos",
      lessons: "lecciones",
      completed: "Completado",
      inProgress: "En Progreso",
      locked: "Bloqueado",
      continueModule: "Continuar Aprendiendo",
      reviewModule: "Revisar Módulo", 
      knowledgeCheck: "Verificación de Conocimiento",
      correct: "¡Correcto!",
      wellDone: "Has respondido correctamente. ¡Bien hecho!",
      notQuite: "No es del todo correcto",
      tryAgain: "Revisa la explicación e inténtalo de nuevo en la próxima lección.",
      submitAnswer: "Enviar Respuesta",
      nextLesson: "Próxima Lección",
      reviewContent: "Revisar Contenido",
      lessonNotFound: "Lección No Encontrada",
      lessonNotFoundDesc: "La lección solicitada no pudo ser cargada.",
      backToLearning: "Volver al Panel de Aprendizaje",
      lessonCompleted: "¡Lección Completada!",
      greatJob: "¡Excelente trabajo! Has completado exitosamente esta lección.",
      learningObjectives: "Objetivos de Aprendizaje",
      keyTakeaways: "Puntos Clave",
      lessonProgress: "Progreso de la Lección",
      takeKnowledgeCheck: "Realizar Verificación de Conocimiento",
      explanation: "Explicación:",
      continue: "Continuar"
    },
    // Módulos
    modules: {
      quickStart: {
        title: "Guía de Inicio Rápido",
        subtitle: "Curso de Fundamentos de 7 Días",
        description: "Domina los fundamentos de las inversiones en solo una semana"
      },
      stockFundamentals: {
        title: "Fundamentos de Acciones",
        subtitle: "Entendiendo el Análisis de Empresas", 
        description: "Inmersión profunda en el análisis y valoración de empresas"
      },
      technicalAnalysis: {
        title: "Análisis Técnico",
        subtitle: "Lectura de Gráficos y Patrones",
        description: "Domina el arte de leer gráficos e indicadores técnicos"
      },
      portfolioManagement: {
        title: "Gestión de Cartera",
        subtitle: "Construyendo Riqueza Sistemáticamente",
        description: "Estrategias avanzadas de construcción y gestión de carteras"
      },
      advancedStrategies: {
        title: "Estrategias Avanzadas",
        subtitle: "Técnicas Profesionales",
        description: "Estrategias de inversión avanzadas para inversores experimentados"
      }
    },
    // Navegación
    navigation: {
      home: "Inicio",
      learning: "Aprendizaje",
      progress: "Progreso",
      market: "Mercado", 
      profile: "Perfil"
    },
    // Común
    common: {
      loading: "Cargando...",
      error: "Error",
      tryAgain: "Intentar de Nuevo",
      save: "Guardar",
      cancel: "Cancelar",
      close: "Cerrar",
      next: "Siguiente",
      previous: "Anterior",
      minutes: "minutos",
      hours: "horas",
      days: "días",
      week: "semana",
      month: "mes"
    },
    // Precios
    pricing: {
      title: "Elige Tu Plan",
      myPlan: "Mi Plan",
      backToHome: "Volver al inicio",
      premiumPlan: "Plan Premium",
      monthly: "Mensual",
      yearly: "Anual",
      perMonth: "por mes",
      perYear: "por año",
      year: "año",
      month: "mes",
      annually: "anualmente",
      startFreeTrial: "Iniciar Prueba Gratuita",
      upgradeNow: "Actualizar Ahora",
      switchTo: "Cambiar a",
      billing: "facturación",
      processing: "Procesando...",
      daysFree: "7 días gratis, luego",
      noCreditCard: "No se requiere tarjeta de crédito • Cancela en cualquier momento",
      freeTrial: "Prueba Gratuita de 7 Días",
      founderMember: "Miembro Fundador",
      founder: "Fundador",
      lifetimeDiscount: "¡Descuento de por vida del 50% aplicado!",
      save: "Ahorra",
      saveYearly: "¡Ahorra $179.89 al año!",
      saveFounder: "Ahorra $90",
      discount: "23%",
      billedAs: "Facturado como",
      everythingYouGet: "Todo Lo Que Obtienes",
      whyChoosePremium: "¿Por Qué Elegir Premium?",
      completeEducation: "Currículo completo de educación en trading",
      realTimeSignals: "Señales de mercado en tiempo real y alertas",
      unlimitedCommunity: "Acceso ilimitado a la comunidad y publicaciones",
      prioritySupport: "Soporte prioritario y orientación experta",
      successRate: "Tasa de Éxito",
      support: "Soporte",
      securePayment: "Pago seguro • Cancela en cualquier momento • Sin tarifas ocultas",
      planActive: "Plan Activo",
      trialPeriod: "Período de Prueba",
      canceled: "Cancelado",
      startDate: "Fecha de Inicio",
      trialStart: "Inicio de Prueba",
      trialEnd: "Fin de Prueba",
      nextBilling: "Próxima Facturación",
      accessUntil: "Acceso Hasta",
      discountLabel: "Descuento",
      lifetime: "de por vida",
      includedBenefits: "Beneficios Incluidos",
      subscriptionProtected: "Tu suscripción está protegida",
      subscriptionProtectedDesc: "Puedes cancelar en cualquier momento. El acceso continúa hasta el final del período de facturación.",
      allModules: "Todos los Módulos",
      allModulesDesc: "Acceso a todos los módulos y lecciones de aprendizaje",
      tradingSignals: "Señales de Trading",
      tradingSignalsDesc: "Señales de trading en tiempo real de expertos",
      community: "Comunidad",
      communityDesc: "Participación completa en la comunidad",
      expertTips: "Consejos de Expertos",
      expertTipsDesc: "Acceso directo a expertos en trading",
      portfolioAnalysis: "Análisis de Cartera",
      portfolioAnalysisDesc: "Seguimiento profesional de cartera",
      marketAlerts: "Alertas de Mercado",
      marketAlertsDesc: "Nunca te pierdas movimientos importantes del mercado",
      completeLibrary: "Biblioteca completa",
      expertCalls: "Llamadas de expertos",
      unlimitedAccess: "Acceso ilimitado",
      liveInsights: "Insights en vivo",
      advancedTools: "Herramientas avanzadas",
      realTimeNotifications: "Notificaciones en tiempo real"
    }
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<'en' | 'es'>('en');
  const [isLanguageSelected, setIsLanguageSelected] = useState(false);
  const [hasShownLanguageModal, setHasShownLanguageModal] = useState(() => {
    // Check session storage to see if modal was already shown this session
    return sessionStorage.getItem('languageModalShown') === 'true';
  });

  // Load language preference from localStorage on app start
  useEffect(() => {
    const savedLanguage = localStorage.getItem('investamind_language') as 'en' | 'es';
    const hasSelectedLanguage = localStorage.getItem('investamind_language_selected') === 'true';
    
    if (savedLanguage && hasSelectedLanguage) {
      setLanguageState(savedLanguage);
      setIsLanguageSelected(true);
      setHasShownLanguageModal(true);
      sessionStorage.setItem('languageModalShown', 'true');
    }
  }, []); // Empty dependency array - only run once on mount
  
  // Reset modal shown status when user logs out (detected by clearing localStorage)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'investamind_language_selected' && e.newValue === null) {
        // Language selection was cleared (user logged out)
        setHasShownLanguageModal(false);
        sessionStorage.removeItem('languageModalShown');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save language preference to localStorage
  const setLanguage = (lang: 'en' | 'es') => {
    setLanguageState(lang);
    localStorage.setItem('investamind_language', lang);
    localStorage.setItem('investamind_language_selected', 'true');
    setIsLanguageSelected(true);
    setHasShownLanguageModal(true);
    sessionStorage.setItem('languageModalShown', 'true');
  };

  // Translation function with nested key support
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key; // Return key if translation not found
  };

  return (
    <LanguageContext.Provider value={{
      language,
      setLanguage,
      t,
      isLanguageSelected,
      setIsLanguageSelected,
      hasShownLanguageModal,
      setHasShownLanguageModal
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};