import { useAuth } from "@/hooks/use-auth";
import { useProgress } from "@/hooks/use-progress";
import { useGamification } from "@/hooks/use-gamification";
import { useLanguage } from "@/contexts/language-context";
import BottomNavigation from "@/bottom-navigation";
import ProgressBar from "@/progress-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { BarChart3, BookOpen, Clock, Film, MessageCircle, PlayCircle, Stars, UserCircle } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { completedModules, totalModules, progressPercentage } = useProgress();
  const { userStats } = useGamification();
  const [, setLocation] = useLocation();

  const completedVideos = userStats.lessonsCompleted; // Proxy until we have dedicated video-progress aggregation

  // Derived labels
  const displayName = user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email : "Guest";
  // Type of user from useAuth already includes username in practice, but keep fallback just in case
  const username = (user as any)?.username || "@investor";
  const roleLabel = user?.role ? user.role.toUpperCase() : "FREE";

  return (
    <div className="page-wrapper">
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setLocation("/")}
              className="text-brand-brown hover:text-brand-orange transition-colors"
              aria-label="Back to home"
            >
              <i className="fas fa-arrow-left text-xl"></i>
            </button>
            <div className="flex items-center space-x-2">
              <UserCircle className="w-7 h-7 text-brand-dark-green" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">Profile</h1>
                <p className="text-xs text-gray-500">Your learning and community snapshot</p>
              </div>
            </div>
          </div>
        </header>

        <main className="px-4 pt-4 space-y-6">
          {/* User summary */}
          <section>
            <Card className="shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-light-green to-brand-dark-green flex items-center justify-center text-white text-xl font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base font-semibold text-gray-900 truncate">{displayName}</h2>
                    <p className="text-xs text-gray-500 truncate">{username}</p>
                    <div className="mt-1 flex items-center space-x-2">
                      <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
                        {roleLabel}
                      </Badge>
                      {user?.onboardingCompleted && (
                        <Badge variant="outline" className="text-[10px] flex items-center space-x-1">
                          <Stars className="w-3 h-3 mr-1" />
                          <span>Onboarding complete</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Stories section (UI shell for Milestone 4) */}
          <section>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <PlayCircle className="w-4 h-4 text-brand-dark-green" />
                    <span>Your stories</span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => {
                      // Placeholder action - will open story composer in future iterations
                    }}
                  >
                    Create story
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <p className="text-xs text-gray-500">
                  Share quick market insights or learning highlights with short stories. This section will show your recent stories once the backend is connected.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Skeleton cards to illustrate layout */}
                  {[1, 2, 3, 4].map((idx) => (
                    <div
                      key={idx}
                      className="h-24 rounded-xl bg-gradient-to-br from-brand-light-green/20 to-brand-dark-green/10 border border-gray-100 flex flex-col justify-between p-2 text-[11px] text-gray-700"
                    >
                      <div className="line-clamp-2 text-xs font-medium text-gray-800">
                        Story preview will appear here
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                        <span>Likes: 0</span>
                        <span>Just now</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Course & video progress */}
          <section>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-brand-dark-green" />
                    <span>Learning progress</span>
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs px-0"
                    onClick={() => setLocation("/learning")}
                  >
                    Go to Learn
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                {/* Overall courses progress */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 flex items-center space-x-1">
                      <BookOpen className="w-3 h-3" />
                      <span>Courses</span>
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      {completedModules}/{totalModules} completed
                    </span>
                  </div>
                  <ProgressBar progress={progressPercentage} />
                  <p className="mt-1 text-[11px] text-gray-500">
                    Keep going! Each completed module unlocks new skills and badges.
                  </p>
                </div>

                {/* Videos summary (derived) */}
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 flex items-center space-x-1">
                      <Film className="w-3 h-3" />
                      <span>Videos</span>
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      {completedVideos} completed
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-gray-600">
                    <div className="p-2 rounded-lg bg-gray-50 flex flex-col items-center space-y-1">
                      <PlayCircle className="w-4 h-4 text-brand-dark-green" />
                      <span>Watch more lessons</span>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50 flex flex-col items-center space-y-1">
                      <Clock className="w-4 h-4 text-brand-orange" />
                      <span>Resume where you left off</span>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50 flex flex-col items-center space-y-1">
                      <Stars className="w-4 h-4 text-brand-blue" />
                      <span>Unlock achievements</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* User questions (UI shell, data wiring later) */}
          <section>
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <MessageCircle className="w-4 h-4 text-brand-dark-green" />
                    <span>Your questions</span>
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs px-0"
                    onClick={() => setLocation("/community")}
                  >
                    Ask in Community
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* Placeholder list - will be replaced with real query when Q&A module is ready */}
                <p className="text-xs text-gray-500">
                  Soon you will see the questions you have asked in the community here, with quick links back to each discussion.
                </p>
                <div className="grid gap-2 text-xs">
                  <div className="p-3 rounded-lg bg-gray-50 border border-dashed border-gray-200">
                    <p className="font-medium text-gray-700 mb-1">No questions tracked yet</p>
                    <p className="text-[11px] text-gray-500">
                      Start by posting a question in the community. We will surface it here with your progress and answers.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </main>

        <BottomNavigation />
      </div>
    </div>
  );
}
