import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useTranslation } from "@/lib/i18n";

type ResetPasswordForm = {
  password: string;
  confirmPassword: string;
};

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [token, setToken] = useState<string | null>(null);
  const [passwordReset, setPasswordReset] = useState(false);

  // Create schema dynamically based on language
  const resetPasswordSchema = useMemo(() => {
    const language = localStorage.getItem('selectedLanguage') || 'en';
    const minLengthError = language === 'es' 
      ? "La contraseña debe tener al menos 6 caracteres" 
      : "Password must be at least 6 characters long";
    const passwordsDontMatch = language === 'es'
      ? "Las contraseñas no coinciden"
      : "Passwords don't match";
    
    return z.object({
      password: z.string().min(6, minLengthError),
      confirmPassword: z.string().min(6, minLengthError),
    }).refine((data) => data.password === data.confirmPassword, {
      message: passwordsDontMatch,
      path: ["confirmPassword"],
    });
  }, []);

  useEffect(() => {
    // Get token from URL query parameter
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    
    if (!tokenParam) {
      const language = localStorage.getItem('selectedLanguage') || 'en';
      toast({
        title: t("resetPassword.invalidToken"),
        description: language === 'es'
          ? "El link de recuperación no es válido o ha expirado."
          : "The recovery link is not valid or has expired.",
        variant: "destructive",
      });
      setLocation("/forgot-password");
      return;
    }
    
    setToken(tokenParam);
    
    // Try to open app with deeplink if on mobile web browser
    // This helps when user clicks the web link from email
    if (typeof window !== 'undefined' && !window.location.href.includes('capacitor://')) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        // Try to open app with deeplink
        const deeplinkUrl = `investamind:///reset-password?token=${encodeURIComponent(tokenParam)}`;
        
        // Try to open the app (will fail silently if app is not installed)
        const timeout = setTimeout(() => {
          // If we're still here after 2 seconds, the app didn't open
          // User can continue with web version
        }, 2000);
        
        // Attempt to open app
        window.location.href = deeplinkUrl;
        
        // Clean up timeout
        return () => clearTimeout(timeout);
      }
    }
  }, [setLocation, toast, t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordForm) => {
      if (!token) {
        const language = localStorage.getItem('selectedLanguage') || 'en';
        throw new Error(language === 'es' ? "Token no válido" : "Invalid token");
      }
      return apiRequest("POST", "/api/auth/reset-password", {
        token,
        newPassword: data.password,
      });
    },
    onSuccess: () => {
      setPasswordReset(true);
      const language = localStorage.getItem('selectedLanguage') || 'en';
      toast({
        title: t("resetPassword.successTitle"),
        description: language === 'es'
          ? "Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión."
          : "Your password has been reset successfully. You can now sign in.",
      });
    },
    onError: (error: any) => {
      const language = localStorage.getItem('selectedLanguage') || 'en';
      toast({
        title: "Error",
        description: error.message || (language === 'es'
          ? "El token no es válido o ha expirado. Por favor solicita un nuevo link."
          : "The token is not valid or has expired. Please request a new link."),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ResetPasswordForm) => {
    if (!token) {
      const language = localStorage.getItem('selectedLanguage') || 'en';
      toast({
        title: "Error",
        description: language === 'es' ? "Token no válido" : "Invalid token",
        variant: "destructive",
      });
      return;
    }
    resetPasswordMutation.mutate(data);
  };

  if (passwordReset) {
    return (
      <div className="page-wrapper" style={{ height: '100vh', maxHeight: '100vh', overflow: 'auto' }}>
        <div className="h-screen flex flex-col justify-center items-center p-6 bg-white slide-in">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <i className="fas fa-check text-green-600 text-2xl"></i>
              </div>
              <h2 className="text-3xl font-bold text-brand-brown mb-2">{t("resetPassword.successTitle")}</h2>
              <p className="text-gray-600">
                {t("resetPassword.successMessage")}
              </p>
            </div>

            <Button
              onClick={() => setLocation("/login")}
              className="w-full text-white font-semibold py-4 rounded-xl text-lg transition-colors touch-target"
              style={{ backgroundColor: '#E89047' }}
            >
              {t("resetPassword.goToSignIn")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="page-wrapper" style={{ height: '100vh', maxHeight: '100vh', overflow: 'auto' }}>
        <div className="h-screen flex flex-col justify-center items-center p-6 bg-white slide-in">
          <div className="w-full max-w-sm text-center">
            <p className="text-gray-600 mb-4">{t("resetPassword.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  const password = watch("password");

  return (
    <div className="page-wrapper" style={{ height: '100vh', maxHeight: '100vh', overflow: 'auto' }}>
      <div className="h-screen flex flex-col justify-center items-center p-6 bg-white slide-in">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <button 
              onClick={() => setLocation("/forgot-password")}
              className="mb-4 text-brand-brown hover:text-brand-orange transition-colors"
            >
              <i className="fas fa-arrow-left text-xl"></i>
            </button>
            <h2 className="text-3xl font-bold text-brand-brown mb-2">{t("resetPassword.title")}</h2>
            <p className="text-gray-600">
              {t("resetPassword.subtitle")}
            </p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="password" className="text-brand-brown">{t("resetPassword.passwordLabel")}</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder={t("resetPassword.passwordPlaceholder")}
                className="mt-2"
                autoComplete="new-password"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
              {password && password.length < 6 && (
                <p className="text-gray-500 text-sm mt-1">
                  {t("resetPassword.minLength")}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword" className="text-brand-brown">{t("resetPassword.confirmPasswordLabel")}</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                placeholder={t("resetPassword.passwordPlaceholder")}
                className="mt-2"
                autoComplete="new-password"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={resetPasswordMutation.isPending}
              className="w-full text-white font-semibold py-4 rounded-xl text-lg transition-colors touch-target"
              style={{ backgroundColor: '#E89047' }}
            >
              {resetPasswordMutation.isPending ? t("resetPassword.resetting") : t("resetPassword.resetButton")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

