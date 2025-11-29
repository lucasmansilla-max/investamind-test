import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      return apiRequest("POST", "/api/auth/signin", data);
    },
    onSuccess: () => {
      // Invalidar la query del usuario para refrescar después del login
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("login.successTitle") || "Welcome back!",
        description: t("login.successMessage") || "You have successfully signed in.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: t("login.errorTitle") || "Error signing in",
        description: error.message || t("login.errorMessage") || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="page-wrapper" style={{ height: '100vh', maxHeight: '100vh', overflow: 'auto' }}>
      <div className="h-screen flex flex-col justify-center items-center p-6 bg-white slide-in">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <button 
              onClick={() => setLocation("/")}
              className="mb-4 text-brand-brown hover:text-brand-orange transition-colors"
            >
              <i className="fas fa-arrow-left text-xl"></i>
            </button>
            <h2 className="text-3xl font-bold text-brand-brown mb-2">
              {t("login.title") || "Sign In"}
            </h2>
            <p className="text-gray-600">
              {t("login.subtitle") || "Welcome back! Please sign in to continue"}
            </p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-brand-brown">
                {t("auth.email") || "Email"}
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="your@email.com"
                className="mt-2"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="password" className="text-brand-brown">
                {t("auth.password") || "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
                placeholder="••••••••"
                className="mt-2"
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setLocation("/forgot-password")}
                  className="text-sm text-brand-brown hover:text-brand-orange transition-colors underline"
                >
                  {t("auth.forgotPassword") || "Forgot Password?"}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={loginMutation.isPending}
              className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold py-4 rounded-xl text-lg transition-colors touch-target"
            >
              {loginMutation.isPending 
                ? (t("login.signingIn") || "Signing in...") 
                : (t("login.signInButton") || "Sign In")}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm mb-3">
              {t("login.noAccount") || "Don't have an account?"}
            </p>
            <Button 
              onClick={() => setLocation("/signup")}
              variant="outline"
              className="w-full border-2 border-brand-brown text-brand-brown hover:bg-brand-brown/10 text-sm py-3"
            >
              {t("login.createAccount") || "Create Account"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

