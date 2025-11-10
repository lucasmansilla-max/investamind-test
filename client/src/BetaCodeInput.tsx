
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function BetaCodeInput() {
  const [betaCode, setBetaCode] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const validateBetaCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      return apiRequest("POST", "/api/auth/validate-beta-code", { betaCode: code });
    },
    onSuccess: () => {
      toast({
        title: "Premium Access Activated!",
        description: "You now have full access to all Investamind features!",
      });
      // Refresh user data and subscription status
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      setBetaCode("");
    },
    onError: (error: any) => {
      toast({
        title: "Invalid Beta Code",
        description: error.message || "Please check your code and try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (betaCode.trim()) {
      validateBetaCodeMutation.mutate(betaCode.trim());
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center text-brand-brown">
          🎉 Have a Beta Code?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="betaCode" className="text-brand-brown">
              Enter Beta Access Code
            </Label>
            <Input
              id="betaCode"
              value={betaCode}
              onChange={(e) => setBetaCode(e.target.value)}
              placeholder="Enter your beta code"
              className="mt-2"
            />
          </div>
          <Button 
            type="submit" 
            disabled={validateBetaCodeMutation.isPending || !betaCode.trim()}
            className="w-full text-white font-semibold"
            style={{ backgroundColor: '#E89047' }}
          >
            {validateBetaCodeMutation.isPending ? "Validating..." : "Activate Premium Access"}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          Get instant access to all premium features
        </p>
      </CardContent>
    </Card>
  );
}
