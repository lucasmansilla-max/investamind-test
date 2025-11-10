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
            console.log('Notification permission granted');
            
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
          console.error('Error requesting notification permission:', error);
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
      // For demo purposes, we'll just log it
      console.log('Weekly reminder scheduled');
    };

    scheduleWeeklyReminder();
  }, [isAuthenticated]);
}
