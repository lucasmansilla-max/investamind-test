export const translations = {
  en: {
    // Welcome & Auth
    welcome: {
      title: "Investamind",
      subtitle: "Master Trading & Investing",
      description: "Start your journey to financial literacy with guided lessons designed for beginners",
      getStarted: "Get Started"
    },
    language: {
      title: "Choose Your Language",
      subtitle: "Selecciona tu idioma"
    },
    auth: {
      createAccount: "Create Account",
      joinText: "Join thousands learning to invest",
      firstName: "First Name",
      lastName: "Last Name",
      email: "Email",
      password: "Password",
      createAccountButton: "Create Account",
      demoAccount: "Try Demo Account",
      terms: "By signing up, you agree to our Terms & Privacy Policy"
    },
    // Main App
    home: {
      yourProgress: "Your Learning Progress",
      modulesCompleted: "modules completed",
      complete: "Complete",
      continuelearning: "Continue Learning",
      viewProgress: "View Progress",
      weeklyRecap: "Weekly Market Recap",
      viewAll: "View All",
      readyForMore: "Ready for More?",
      premiumDescription: "Join our premium community and unlock advanced strategies, live sessions, and personalized guidance.",
      joinPremium: "Join Our Premium Community"
    },
    // Dashboard specific
    dashboard: {
      title: "Investamind",
      learningJourney: "Your Learning Journey",
      percentComplete: "Complete",
      lessonsDone: "Lessons",
      dayStreak: "day streak",
      modulesCompleted: "modules completed",
      keepItUp: "Keep it up! 🎯",
      continuelearning: "Continue Learning",
      viewProgress: "View Progress",
      marketNews: "Market News",
      viewAll: "View All"
    },
    // Learning
    learning: {
      learningPath: "Learning Path",
      completed: "Completed",
      available: "Available",
      locked: "Locked",
      start: "Start",
      review: "Review"
    },
    // Progress
    progress: {
      yourProgress: "Your Progress",
      learningJourney: "Learning Journey",
      completed: "Completed",
      remaining: "Remaining",
      achievements: "Achievements",
      firstLesson: "First Lesson",
      moduleChecklist: "Module Checklist"
    },
    // Experience Level
    experienceLevel: {
      title: "What's Your Investment Experience?",
      subtitle: "Help us personalize your learning journey",
      beginner: {
        title: "Beginner",
        description: "New to investing, ready to learn the basics"
      },
      intermediate: {
        title: "Intermediate",
        description: "Some experience, want to improve strategies"
      },
      advanced: {
        title: "Advanced",
        description: "Experienced investor seeking advanced insights"
      },
      continue: "Continue"
    }
  },
  es: {
    // Welcome & Auth
    welcome: {
      title: "Investamind",
      subtitle: "Domina el Trading e Inversión",
      description: "Comienza tu viaje hacia la alfabetización financiera con lecciones guiadas diseñadas para principiantes",
      getStarted: "Comenzar"
    },
    language: {
      title: "Elige tu Idioma",
      subtitle: "Choose your language"
    },
    auth: {
      createAccount: "Crear Cuenta",
      joinText: "Únete a miles aprendiendo a invertir",
      firstName: "Nombre",
      lastName: "Apellido",
      email: "Correo",
      password: "Contraseña",
      createAccountButton: "Crear Cuenta",
      demoAccount: "Probar Cuenta Demo",
      terms: "Al registrarte, aceptas nuestros Términos y Política de Privacidad"
    },
    // Main App
    home: {
      yourProgress: "Tu Progreso de Aprendizaje",
      modulesCompleted: "módulos completados",
      complete: "Completo",
      continuelearning: "Continuar Aprendiendo",
      viewProgress: "Ver Progreso",
      weeklyRecap: "Resumen Semanal del Mercado",
      viewAll: "Ver Todo",
      readyForMore: "¿Listo para Más?",
      premiumDescription: "Únete a nuestra comunidad premium y desbloquea estrategias avanzadas, sesiones en vivo y orientación personalizada.",
      joinPremium: "Únete a Nuestra Comunidad Premium"
    },
    // Dashboard specific
    dashboard: {
      title: "Investamind",
      learningJourney: "Tu Viaje de Aprendizaje",
      percentComplete: "Completo",
      lessonsDone: "Lecciones",
      dayStreak: "días seguidos",
      modulesCompleted: "módulos completados",
      keepItUp: "¡Sigue así! 🎯",
      continuelearning: "Continuar Aprendiendo",
      viewProgress: "Ver Progreso",
      marketNews: "Noticias del Mercado",
      viewAll: "Ver Todo"
    },
    // Learning
    learning: {
      learningPath: "Ruta de Aprendizaje",
      completed: "Completado",
      available: "Disponible",
      locked: "Bloqueado",
      start: "Comenzar",
      review: "Revisar"
    },
    // Progress
    progress: {
      yourProgress: "Tu Progreso",
      learningJourney: "Viaje de Aprendizaje",
      completed: "Completado",
      remaining: "Restante",
      achievements: "Logros",
      firstLesson: "Primera Lección",
      moduleChecklist: "Lista de Módulos"
    },
    // Experience Level
    experienceLevel: {
      title: "¿Cuál es tu Experiencia en Inversiones?",
      subtitle: "Ayúdanos a personalizar tu viaje de aprendizaje",
      beginner: {
        title: "Principiante",
        description: "Nuevo en inversiones, listo para aprender lo básico"
      },
      intermediate: {
        title: "Intermedio",
        description: "Algo de experiencia, quiero mejorar estrategias"
      },
      advanced: {
        title: "Avanzado",
        description: "Inversor experimentado buscando insights avanzados"
      },
      continue: "Continuar"
    }
  }
};

export const useTranslation = () => {
  const language = localStorage.getItem('selectedLanguage') || 'en';

  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[language as keyof typeof translations];

    for (const k of keys) {
      value = value?.[k];
    }

    return value || key;
  };

  return { t, language };
};
