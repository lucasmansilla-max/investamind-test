import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import ImageUploader from "@/components/ImageUploader";
import { Loader2, X } from "lucide-react";

interface StoryCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StoryCreationModal({ open, onOpenChange }: StoryCreationModalProps) {
  const [content, setContent] = useState("");
  const [imageData, setImageData] = useState(""); // Base64 data URI
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const createStoryMutation = useMutation({
    mutationFn: async (data: { content: string; imageData?: string; mimeType?: string }) => {
      const response = await fetch("/api/stories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create story");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('stories.successTitle') || "Story published!",
        description: t('stories.successDescription') || "Your story has been shared with the community.",
      });
      queryClient.invalidateQueries({ queryKey: ["stories"] });
      queryClient.invalidateQueries({ queryKey: ["user-stories"] });
      setContent("");
      setImageData("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create story. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some content for your story.",
        variant: "destructive",
      });
      return;
    }

    if (content.length > 500) {
      toast({
        title: "Content too long",
        description: "Stories cannot exceed 500 characters.",
        variant: "destructive",
      });
      return;
    }

    // Extract mime type from data URI (e.g., data:image/jpeg;base64,...)
    let mimeType: string | undefined;
    if (imageData) {
      const match = imageData.match(/^data:([^;]+);/);
      mimeType = match ? match[1] : undefined;
    }

    createStoryMutation.mutate({
      content: content.trim(),
      imageData: imageData || undefined,
      mimeType: mimeType,
    });
  };

  const remainingChars = 500 - content.length;
  const isOverLimit = remainingChars < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>{t('stories.createStory') || "Create a Story"}</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">{t('stories.yourStory') || "Your story"}</Label>
            <Textarea
              id="content"
              placeholder={t('stories.placeholder') || "Share a quick market insight, learning highlight, or trading tip..."}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={createStoryMutation.isPending}
            />
            <div className="flex items-center justify-between text-xs">
              <span className={isOverLimit ? "text-destructive" : "text-muted-foreground"}>
                {remainingChars} {t('stories.charactersRemaining') || "characters remaining"}
              </span>
            </div>
          </div>

          {/* Image upload section */}
          <div className="space-y-2">
            <Label>{t('stories.imageOptional') || "Image (optional)"}</Label>
            <div className="flex items-center space-x-2">
              <ImageUploader
                onImageSelected={setImageData}
                buttonText={imageData ? t('stories.changeImage') || "Change image" : t('stories.addImage') || "Add image"}
                buttonVariant="outline"
                buttonSize="sm"
              />
              {imageData && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setImageData("")}
                  disabled={createStoryMutation.isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            {imageData && imageData.trim() !== '' && (
              <div className="mt-2 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                <img
                  src={imageData}
                  alt="Preview"
                  className="w-full h-auto object-contain"
                  style={{ 
                    maxHeight: '300px',
                    display: 'block',
                    margin: '0 auto'
                  }}
                  onError={() => {
                    toast({
                      title: t('stories.invalidImage') || "Invalid image",
                      description: t('stories.invalidImageDesc') || "The image could not be loaded.",
                      variant: "destructive",
                    });
                    setImageData("");
                  }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {t('stories.expiresInfo') || "Stories expire after 24 hours"}
            </p>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createStoryMutation.isPending}
              >
                {t('common.cancel') || "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={createStoryMutation.isPending || !content.trim() || isOverLimit}
              >
                {createStoryMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t('stories.publishing') || "Publishing..."}
                  </>
                ) : (
                  t('stories.publishStory') || "Publish story"
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
