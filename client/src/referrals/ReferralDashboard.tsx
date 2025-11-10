import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Copy, Share2, Users, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ReferralData {
  id: number;
  referredUserId: number;
  referredUserName: string;
  status: "pending" | "valid" | "confirmed" | "invalid";
  signupDate: string;
  validationDate?: string;
  confirmationDate?: string;
  pointsAwarded: number;
  daysRemaining?: number;
}

interface ReferralStats {
  totalReferrals: number;
  confirmedReferrals: number;
  pendingReferrals: number;
  totalPointsEarned: number;
  referralCode: string;
  nextRewardAt: number;
}

export default function ReferralDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shareMethod, setShareMethod] = useState<"link" | "code">("link");

  // Mock referral data
  const mockStats: ReferralStats = {
    totalReferrals: 7,
    confirmedReferrals: 4,
    pendingReferrals: 2,
    totalPointsEarned: 2400,
    referralCode: "INVEST2025",
    nextRewardAt: 10
  };

  const mockReferrals: ReferralData[] = [
    {
      id: 1,
      referredUserId: 101,
      referredUserName: "Alex Johnson",
      status: "confirmed",
      signupDate: "2024-12-01",
      validationDate: "2024-12-15",
      confirmationDate: "2024-12-30",
      pointsAwarded: 600
    },
    {
      id: 2,
      referredUserId: 102,
      referredUserName: "Maria Garcia",
      status: "valid",
      signupDate: "2024-12-10",
      validationDate: "2024-12-25",
      pointsAwarded: 300,
      daysRemaining: 12
    },
    {
      id: 3,
      referredUserId: 103,
      referredUserName: "David Chen",
      status: "pending",
      signupDate: "2024-12-20",
      pointsAwarded: 0,
      daysRemaining: 8
    },
    {
      id: 4,
      referredUserId: 104,
      referredUserName: "Sarah Wilson",
      status: "confirmed",
      signupDate: "2024-11-15",
      validationDate: "2024-11-30",
      confirmationDate: "2024-12-15",
      pointsAwarded: 600
    }
  ];

  const { data: stats = mockStats } = useQuery({
    queryKey: ["/api/referrals/stats"],
    queryFn: async () => mockStats,
  });

  const { data: referrals = mockReferrals } = useQuery({
    queryKey: ["/api/referrals/list"],
    queryFn: async () => mockReferrals,
  });

  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const newCode = `INVEST${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      return { referralCode: newCode };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/referrals/stats"] });
      toast({
        title: "New referral code generated",
        description: `Your new code is: ${data.referralCode}`,
      });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Share this with your friends!",
    });
  };

  const shareReferral = () => {
    const referralLink = `https://investamind.app/signup?ref=${stats.referralCode}`;
    const message = `Join me on Investamind - the best platform to learn investing! Use my referral code: ${stats.referralCode} or click: ${referralLink}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Join Investamind",
        text: message,
        url: referralLink,
      });
    } else {
      copyToClipboard(message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800 border-green-300";
      case "valid": return "bg-blue-100 text-blue-800 border-blue-300";
      case "pending": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "invalid": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed": return <CheckCircle className="w-4 h-4" />;
      case "valid": return <Clock className="w-4 h-4" />;
      case "pending": return <AlertCircle className="w-4 h-4" />;
      case "invalid": return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusDescription = (referral: ReferralData) => {
    switch (referral.status) {
      case "confirmed":
        return "Completed 30 days - Full points awarded";
      case "valid":
        return `Active user - ${referral.daysRemaining} days until confirmation`;
      case "pending":
        return `Needs 3+ posts - ${referral.daysRemaining} days remaining`;
      case "invalid":
        return "Inactive - No points awarded";
      default:
        return "Status unknown";
    }
  };

  const referralLink = `https://investamind.app/signup?ref=${stats.referralCode}`;
  const progressToNext = ((stats.totalReferrals % stats.nextRewardAt) / stats.nextRewardAt) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.totalReferrals}</div>
            <div className="text-sm text-gray-600">Total Referrals</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.confirmedReferrals}</div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingReferrals}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalPointsEarned}</div>
            <div className="text-sm text-gray-600">Points Earned</div>
          </CardContent>
        </Card>
      </div>

      {/* Reward Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Reward Progress</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Progress to next reward milestone</span>
              <span className="font-semibold">{stats.totalReferrals % stats.nextRewardAt}/{stats.nextRewardAt}</span>
            </div>
            <Progress value={progressToNext} className="h-3" />
            <div className="text-sm text-gray-600">
              Refer {stats.nextRewardAt - (stats.totalReferrals % stats.nextRewardAt)} more friends to unlock bonus rewards!
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Share Referral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Share2 className="w-5 h-5" />
            <span>Share Your Referral</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Button
                variant={shareMethod === "link" ? "default" : "outline"}
                onClick={() => setShareMethod("link")}
              >
                Share Link
              </Button>
              <Button
                variant={shareMethod === "code" ? "default" : "outline"}
                onClick={() => setShareMethod("code")}
              >
                Share Code
              </Button>
            </div>

            {shareMethod === "link" ? (
              <div className="flex space-x-2">
                <Input
                  value={referralLink}
                  readOnly
                  className="flex-1"
                />
                <Button
                  onClick={() => copyToClipboard(referralLink)}
                  variant="outline"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <Input
                  value={stats.referralCode}
                  readOnly
                  className="flex-1 text-center text-lg font-bold"
                />
                <Button
                  onClick={() => copyToClipboard(stats.referralCode)}
                  variant="outline"
                >
                  <Copy className="w-4 h-4" />
                </Button>
                <Button
                  onClick={() => generateCodeMutation.mutate()}
                  variant="outline"
                  disabled={generateCodeMutation.isPending}
                >
                  New Code
                </Button>
              </div>
            )}

            <Button onClick={shareReferral} className="w-full" size="lg">
              <Share2 className="w-4 h-4 mr-2" />
              Share with Friends
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Referral List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Your Referrals</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {referrals.map((referral) => (
              <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-semibold">{referral.referredUserName}</h4>
                    <Badge className={getStatusColor(referral.status)}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(referral.status)}
                        <span>{referral.status.toUpperCase()}</span>
                      </div>
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    <div>Joined: {new Date(referral.signupDate).toLocaleDateString()}</div>
                    <div>{getStatusDescription(referral)}</div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-green-600">
                    +{referral.pointsAwarded}
                  </div>
                  <div className="text-sm text-gray-500">points</div>
                </div>
              </div>
            ))}
            
            {referrals.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No referrals yet. Start sharing your code!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Referrals Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">1</div>
              <div>
                <h4 className="font-semibold">Share Your Code</h4>
                <p className="text-sm text-gray-600">Send your referral link or code to friends</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 font-bold">2</div>
              <div>
                <h4 className="font-semibold">Friend Signs Up (Pending)</h4>
                <p className="text-sm text-gray-600">They create an account using your code - 15 days to validate</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">3</div>
              <div>
                <h4 className="font-semibold">Validation (Day 15)</h4>
                <p className="text-sm text-gray-600">If they make 3+ community posts, you get 300 points</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">4</div>
              <div>
                <h4 className="font-semibold">Confirmation (Day 30)</h4>
                <p className="text-sm text-gray-600">If they're still active, you get 300 more points (600 total)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}