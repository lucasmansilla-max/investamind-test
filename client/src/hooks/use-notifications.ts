import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export function useNotifications(isAuthenticated: boolean) {
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Request notification permission
    const requestPermission = async () => {
      if ('Notification' in window && 'serviceWorker' in navigator) {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            // Schedule a demo notification
            setTimeout(() => {
              if (document.visibilityState === 'visible') {
                toast({
                  title: "💡 Learning Tip",
                  description: "Complete one lesson daily to build good habits!",
                });
              } else {
                new Notification('Investamind - Learning Reminder', {
                  body: 'Time to continue your learning journey!',
                  icon: '/manifest-icon-192.png',
                  badge: '/manifest-icon-192.png',
                  tag: 'learning-reminder'
                });
              }
            }, 10000); // Demo notification after 10 seconds
          }
        } catch (error) {
          // Silently fail - notification permission is optional
        }
      }
    };

    // Request permission after user interaction
    const timer = setTimeout(requestPermission, 3000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, toast]);

  // Set up weekly learning reminders
  useEffect(() => {
    if (!isAuthenticated) return;

    const scheduleWeeklyReminder = () => {
      // In a real app, this would be handled by the service worker
      // Service worker handles the actual scheduling
    };

    scheduleWeeklyReminder();
  }, [isAuthenticated]);
}
