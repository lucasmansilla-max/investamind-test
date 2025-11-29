import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import ExperienceLevelModal from "@/experience-level-modal";

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  betaCode: z.string().optional(),
  experienceLevel: z.string().optional(),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState<SignupForm | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupForm) => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      return apiRequest("POST", "/api/auth/signup", {
        ...data,
        selectedLanguage,
      });
    },
    onSuccess: (response: any) => {
      toast({
        title: response.user?.isBetaUser ? "Premium Access Activated!" : "Account created successfully!",
        description: response.user?.isBetaUser 
          ? "Welcome to Investamind Premium! You have full access to all features." 
          : "Welcome to Investamind. Let's start learning!",
      });
      // Force page reload to update authentication state
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Error creating account",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SignupForm) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="page-wrapper" style={{ height: '100vh', maxHeight: '100vh', overflow: 'auto' }}>
      <div className="h-screen flex flex-col justify-center items-center p-6 bg-white slide-in">
        <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <button 
            onClick={() => setLocation("/language")}
            className="mb-4 text-brand-brown hover:text-brand-orange transition-colors"
          >
            <i className="fas fa-arrow-left text-xl"></i>
          </button>
          <h2 className="text-3xl font-bold text-brand-brown mb-2">Create Account</h2>
          <p className="text-gray-600">Join thousands learning to invest</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-brand-brown">First Name</Label>
              <Input
                id="firstName"
                {...register("firstName")}
                placeholder="John"
                className="mt-2"
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="lastName" className="text-brand-brown">Last Name</Label>
              <Input
                id="lastName"
                {...register("lastName")}
                placeholder="Doe"
                className="mt-2"
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
              )}
            </div>
          </div>
          
          <div>
            <Label htmlFor="email" className="text-brand-brown">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="your@email.com"
              className="mt-2"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="password" className="text-brand-brown">Password</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              placeholder="••••••••"
              className="mt-2"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="betaCode" className="text-brand-brown">Beta Access Code (Optional)</Label>
            <Input
              id="betaCode"
              {...register("betaCode")}
              placeholder="Enter beta code for premium access"
              className="mt-2"
            />
            <p className="text-sm text-gray-500 mt-1">
              Have a beta code? Get instant premium access!
            </p>
          </div>
          
          <Button 
            type="submit" 
            disabled={signupMutation.isPending}
            className="w-full text-white font-semibold py-4 rounded-xl text-lg transition-colors touch-target"
            style={{ backgroundColor: '#E89047' }}
          >
            {signupMutation.isPending ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm mb-3">
            {t("login.noAccount") || "Already have an account?"}
          </p>
          <Button 
            onClick={() => setLocation("/login")}
            variant="outline"
            className="w-full border-2 text-sm py-3"
            style={{ borderColor: '#5C5D47', color: '#5C5D47' }}
          >
            {t("login.signInButton") || "Sign In"}
          </Button>
        </div>
        
          <p className="text-center text-sm text-gray-500 mt-6">
            By signing up, you agree to our Terms & Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
