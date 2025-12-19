import { Dialog, DialogContent } from "@/components/ui/dialog";
import StoryCard, { Story } from "./StoryCard";

interface StoryDetailModalProps {
  story: Story | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StoryDetailModal({ story, open, onOpenChange }: StoryDetailModalProps) {
  if (!story) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <StoryCard story={story} showDelete={true} />
      </DialogContent>
    </Dialog>
  );
}
