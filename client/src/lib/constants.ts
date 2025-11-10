export const BRAND_COLORS = {
  brown: "#5C5D47",
  orange: "#E89047", 
  blue: "#689FC5",
  lightGreen: "#9ADB74",
  darkGreen: "#304535"
} as const;

export const LEARNING_MODULES = [
  {
    id: 1,
    title: "Basics of Investing",
    description: "Learn fundamental concepts",
    orderIndex: 1,
  },
  {
    id: 2,
    title: "Introduction to Trading", 
    description: "Understanding market basics",
    orderIndex: 2,
  },
  {
    id: 3,
    title: "Key Terms & Concepts",
    description: "Financial vocabulary essentials", 
    orderIndex: 3,
  },
  {
    id: 4,
    title: "Risk Management",
    description: "Protecting your investments",
    orderIndex: 4,
  },
  {
    id: 5,
    title: "Portfolio Building", 
    description: "Diversification strategies",
    orderIndex: 5,
  },
  {
    id: 6,
    title: "Technical Analysis",
    description: "Chart reading basics",
    orderIndex: 6,
  },
  {
    id: 7,
    title: "Market Psychology",
    description: "Emotional trading pitfalls", 
    orderIndex: 7,
  },
  {
    id: 8,
    title: "Advanced Strategies",
    description: "Professional techniques",
    orderIndex: 8,
  },
] as const;

export const NOTIFICATION_TYPES = {
  LEARNING_REMINDER: "learning_reminder",
  ACHIEVEMENT: "achievement", 
  GENERAL: "general",
} as const;

export const PWA_CONFIG = {
  name: "Investamind",
  shortName: "Investamind",
  description: "Learn Trading & Investing",
  themeColor: "#5C5D47",
  backgroundColor: "#ffffff",
  display: "standalone",
  orientation: "portrait",
  scope: "/",
  startUrl: "/",
} as const;
