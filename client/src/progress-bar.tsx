import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number;
  className?: string;
  variant?: "default" | "white";
}

export default function ProgressBar({ progress, className, variant = "default" }: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn("w-full", className)}>
      <div className={cn(
        "rounded-full h-3 transition-all duration-500",
        variant === "white" ? "bg-white/20" : "bg-gray-200"
      )}>
        <div 
          className={cn(
            "h-3 rounded-full progress-animation",
            variant === "white" ? "bg-white" : "bg-brand-light-green"
          )}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
