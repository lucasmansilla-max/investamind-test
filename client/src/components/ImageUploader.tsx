import React, { useState } from "react";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Camera as CameraIcon, Image as ImageIcon } from "lucide-react";

interface ImageUploaderProps {
  onImageSelected: (imageUrl: string) => void;
  buttonText?: string;
  buttonVariant?: "default" | "outline" | "ghost";
  buttonSize?: "default" | "sm" | "lg";
  currentImage?: string | null;
}

export default function ImageUploader({
  onImageSelected,
  buttonText = "Upload Image",
  buttonVariant = "outline",
  buttonSize = "default",
  currentImage,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const { toast } = useToast();
  const isNative = Capacitor.isNativePlatform();
  // Generate unique ID for this instance using ref to persist across renders
  const inputIdRef = React.useRef(`image-upload-${Math.random().toString(36).substr(2, 9)}`);
  const inputId = inputIdRef.current;

  const compressAndConvertToBase64 = (file: File | Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas for compression
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Calculate new dimensions (max 1920px width, maintain aspect ratio)
          const maxWidth = 1920;
          const maxHeight = 1920;
          let width = img.width;
          let height = img.height;

          // Calculate scaling factor to fit within max dimensions
          const widthRatio = maxWidth / width;
          const heightRatio = maxHeight / height;
          const ratio = Math.min(widthRatio, heightRatio, 1); // Don't upscale

          // Apply scaling if needed
          if (ratio < 1) {
            width = Math.floor(width * ratio);
            height = Math.floor(height * ratio);
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress with high quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with quality compression (0.85 = 85% quality for better images)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          resolve(compressedBase64);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const uploadToServer = async (file: File | Blob): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/uploads", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to upload image");
    }

    const data = await response.json();
    return data.url;
  };

  const handleWebUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // Compress and convert to base64
      const compressedBase64 = await compressAndConvertToBase64(file);
      onImageSelected(compressedBase64);
      toast({
        title: "Success",
        description: "Image loaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Failed to load image",
        description: error.message || "Failed to process image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleNativeCamera = async () => {
    setShowSourceDialog(false);
    setIsUploading(true);

    try {
      const image = await Camera.getPhoto({
        quality: 90, // Good quality balance
        allowEditing: false, // No editing, publish directly
        resultType: CameraResultType.DataUrl, // Base64 format
        source: CameraSource.Camera,
        width: 1920, // Max width for compression
        height: 1920, // Max height for compression
      });

      if (image.dataUrl) {
        // image.dataUrl is already compressed and in base64 format
        onImageSelected(image.dataUrl);
        toast({
          title: "Success",
          description: "Photo captured successfully",
        });
      }
    } catch (error: any) {
      if (error.message !== "User cancelled photos app") {
        toast({
          title: "Camera error",
          description: error.message || "Failed to capture photo",
          variant: "destructive",
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleNativeGallery = async () => {
    setShowSourceDialog(false);
    setIsUploading(true);

    try {
      const image = await Camera.getPhoto({
        quality: 90, // Good quality balance
        allowEditing: false, // No editing, publish directly
        resultType: CameraResultType.DataUrl, // Base64 format
        source: CameraSource.Photos,
        width: 1920, // Max width for compression
        height: 1920, // Max height for compression
      });

      if (image.dataUrl) {
        // image.dataUrl is already compressed and in base64 format
        onImageSelected(image.dataUrl);
        toast({
          title: "Success",
          description: "Image selected successfully",
        });
      }
    } catch (error: any) {
      if (error.message !== "User cancelled photos app") {
        toast({
          title: "Gallery error",
          description: error.message || "Failed to select photo",
          variant: "destructive",
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    if (isNative) {
      setShowSourceDialog(true);
    } else {
      document.getElementById(inputId)?.click();
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        onClick={handleButtonClick}
        disabled={isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            {buttonText}
          </>
        )}
      </Button>

      {/* Hidden file input for web - each instance has unique ID */}
      {!isNative && (
        <input
          key={inputId}
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handleWebUpload(e);
            // Reset input value to allow selecting same file again
            e.target.value = '';
          }}
          disabled={isUploading}
        />
      )}

      {/* Source selection dialog for native */}
      {isNative && (
        <Dialog open={showSourceDialog} onOpenChange={setShowSourceDialog}>
          <DialogContent className="sm:max-w-[350px]">
            <DialogHeader>
              <DialogTitle>Select image source</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 pt-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleNativeCamera}
              >
                <CameraIcon className="w-4 h-4 mr-2" />
                Take a photo
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleNativeGallery}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Choose from gallery
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
