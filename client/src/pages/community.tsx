import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Award, Gift, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";
import CommunityFeed from "@/community/CommunityFeedSimple";
import BadgeProgressDashboard from "@/badges/BadgeProgressDashboard";
import ReferralDashboard from "@/referrals/ReferralDashboard";
import BottomNavigation from "@/bottom-navigation";

export default function Community() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("feed");

  return (
    <div className="min-h-screen bg-brand-light-green/10" style={{ paddingBottom: '90px' }}>
        {/* Header */}
        <header className="bg-brand-light-green border-b border-brand-dark-green/20 sticky top-0 z-40">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="text-brand-dark-green hover:text-brand-orange"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-bold text-brand-dark-green">Community</h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <Badge className="bg-brand-orange/10 text-brand-orange border-brand-orange/20">
                TRADER
              </Badge>
              <div className="w-8 h-8 bg-brand-dark-green rounded-full flex items-center justify-center text-white font-bold text-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
            </div>
          </div>
        </header>

        <div className="pb-24">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Tab Navigation */}
            <div className="bg-brand-light-green border-b border-brand-dark-green/20 px-4">
              <TabsList className="grid w-full grid-cols-3 bg-transparent p-0">
                <TabsTrigger 
                  value="feed" 
                  className="flex items-center space-x-2 py-3 data-[state=active]:border-b-2 data-[state=active]:border-brand-orange data-[state=active]:bg-transparent rounded-none text-brand-dark-green"
                >
                  <Users className="w-4 h-4" />
                  <span>Feed</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="badges"
                  className="flex items-center space-x-2 py-3 data-[state=active]:border-b-2 data-[state=active]:border-brand-orange data-[state=active]:bg-transparent rounded-none text-brand-dark-green"
                >
                  <Award className="w-4 h-4" />
                  <span>Badges</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="referrals"
                  className="flex items-center space-x-2 py-3 data-[state=active]:border-b-2 data-[state=active]:border-brand-orange data-[state=active]:bg-transparent rounded-none text-brand-dark-green"
                >
                  <Gift className="w-4 h-4" />
                  <span>Referrals</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="p-4">
              <TabsContent value="feed" className="mt-0">
                <CommunityFeed />
              </TabsContent>
              
              <TabsContent value="badges" className="mt-0">
                <BadgeProgressDashboard />
              </TabsContent>
              
              <TabsContent value="referrals" className="mt-0">
                <ReferralDashboard />
              </TabsContent>
            </div>
          </Tabs>
        </div>

      <BottomNavigation />
    </div>
  );
}