import { useState, useMemo } from "react";
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

type ForgotPasswordForm = {
  email: string;
};

export default function ForgotPassword() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [emailSent, setEmailSent] = useState(false);

  // Create schema dynamically based on language
  const forgotPasswordSchema = useMemo(() => {
    const language = localStorage.getItem('selectedLanguage') || 'en';
    const emailError = language === 'es' 
      ? "Por favor ingresa un email válido" 
      : "Please enter a valid email address";
    
    return z.object({
      email: z.string().email(emailError),
    });
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordForm) => {
      return apiRequest("POST", "/api/auth/forgot-password", data);
    },
    onSuccess: () => {
      setEmailSent(true);
      const language = localStorage.getItem('selectedLanguage') || 'en';
      toast({
        title: t("forgotPassword.emailSentTitle"),
        description: language === 'es' 
          ? `Si existe una cuenta con ese email, se ha enviado un link de recuperación.`
          : `If an account with that email exists, a password reset link has been sent.`,
      });
    },
    onError: (error: any) => {
      const language = localStorage.getItem('selectedLanguage') || 'en';
      toast({
        title: "Error",
        description: error.message || (language === 'es' 
          ? "Ocurrió un error. Por favor intenta de nuevo."
          : "An error occurred. Please try again."),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ForgotPasswordForm) => {
    forgotPasswordMutation.mutate(data);
  };

  if (emailSent) {
    return (
      <div className="page-wrapper" style={{ height: '100vh', maxHeight: '100vh', overflow: 'auto' }}>
        <div className="h-screen flex flex-col justify-center items-center p-6 bg-white slide-in">
          <div className="w-full max-w-sm">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <i className="fas fa-check text-green-600 text-2xl"></i>
              </div>
              <h2 className="text-3xl font-bold text-brand-brown mb-2">{t("forgotPassword.emailSentTitle")}</h2>
              <p className="text-gray-600 mb-2">
                {t("forgotPassword.emailSentMessage")} <strong>{getValues("email")}</strong>, 
                {t("forgotPassword.emailSentInstructions")}
              </p>
              <p className="text-sm text-gray-500">
                {t("forgotPassword.emailSentCheck")}
              </p>
            </div>

            <div className="space-y-4">
              <Button
                onClick={() => setLocation("/login")}
                className="w-full text-white font-semibold py-4 rounded-xl text-lg transition-colors touch-target"
                style={{ backgroundColor: '#E89047' }}
              >
                {t("login.signInButton") || "Sign In"}
              </Button>

              <Button
                onClick={() => {
                  setEmailSent(false);
                  forgotPasswordMutation.reset();
                }}
                variant="outline"
                className="w-full border-2 text-sm py-3"
                style={{ borderColor: '#5C5D47', color: '#5C5D47' }}
              >
                {t("forgotPassword.sendAnother")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper" style={{ height: '100vh', maxHeight: '100vh', overflow: 'auto' }}>
      <div className="h-screen flex flex-col justify-center items-center p-6 bg-white slide-in">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <button 
              onClick={() => setLocation("/login")}
              className="mb-4 text-brand-brown hover:text-brand-orange transition-colors"
            >
              <i className="fas fa-arrow-left text-xl"></i>
            </button>
            <h2 className="text-3xl font-bold text-brand-brown mb-2">{t("forgotPassword.title")}</h2>
            <p className="text-gray-600">
              {t("forgotPassword.subtitle")}
            </p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-brand-brown">{t("forgotPassword.emailLabel")}</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder={t("forgotPassword.emailPlaceholder")}
                className="mt-2"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={forgotPasswordMutation.isPending}
              className="w-full text-white font-semibold py-4 rounded-xl text-lg transition-colors touch-target"
              style={{ backgroundColor: '#E89047' }}
            >
              {forgotPasswordMutation.isPending ? t("forgotPassword.sending") : t("forgotPassword.sendButton")}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <button
              onClick={() => setLocation("/login")}
              className="text-brand-brown hover:text-brand-orange text-sm transition-colors"
            >
              {t("login.noAccount") || "Remember your password?"} <span className="underline">{t("login.signInButton") || "Sign In"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

