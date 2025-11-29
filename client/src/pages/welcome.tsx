import { useLocation } from "wouter";
import { useTranslation } from "@/lib/i18n";
import investamindLogo from "@assets/Investamind Logo transparent.png";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen box-border overflow-hidden flex flex-col justify-center items-center p-6 slide-in relative bg-gradient-to-br from-brand-light-green via-brand-orange to-brand-blue">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 400 600" fill="none">
          <circle cx="100" cy="150" r="80" fill="currentColor" />
          <rect
            x="250"
            y="200"
            width="120"
            height="120"
            rx="20"
            fill="currentColor"
            opacity="0.7"
          />
          <path
            d="M50 400 Q200 350 350 400 T650 400"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            opacity="0.5"
          />
        </svg>
      </div>

      <div className="relative z-10 text-center">
        <div className="mb-8 animate-fadeInUp">
          {/* Investamind Logo - Bigger and more engaging */}
          <div className="w-48 h-48 mx-auto mb-8 flex items-center justify-center animate-pulse-gentle">
            <img
              src={investamindLogo}
              alt="Investamind Logo"
              className="w-full h-full object-contain drop-shadow-2xl transform hover:scale-110 transition-all duration-500"
            />
          </div>
          <h1
            className="text-4xl font-bold mb-2 text-brand-dark-green drop-shadow-md animate-fadeInUp"
            style={{ animationDelay: "0.2s" }}
          >
            {t("welcome.title")}
          </h1>
          <p
            className="text-xl text-brand-dark-green/90 drop-shadow-sm animate-fadeInUp"
            style={{ animationDelay: "0.3s" }}
          >
            {t("welcome.subtitle")}
          </p>
        </div>

        <p
          className="text-lg mb-8 text-brand-dark-green/80 leading-relaxed max-w-sm drop-shadow-sm animate-fadeInUp"
          style={{ animationDelay: "0.4s" }}
        >
          {t("welcome.description")}
        </p>

        <div className="space-y-4 w-full max-w-sm animate-fadeInUp" style={{ animationDelay: "0.5s" }}>
          <button
            onClick={() => {
              setLocation("/login");
            }}
            className="w-full bg-white text-brand-dark-green font-bold py-4 px-8 rounded-full text-lg btn-hover touch-target shadow-xl border-2 border-brand-dark-green/20 animate-glow"
          >
            {t("login.signInButton") || "Sign In"}
          </button>
          
          <button
            onClick={() => {
              setLocation("/signup");
            }}
            className="w-full bg-brand-orange text-white font-bold py-4 px-8 rounded-full text-lg btn-hover touch-target shadow-xl border-2 border-brand-orange/20"
          >
            {t("auth.createAccount") || "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}
