import { Story } from "./StoryCard";
import { Heart, Eye } from "lucide-react";

interface StoryThumbnailProps {
  story: Story;
  onClick: () => void;
}

export default function StoryThumbnail({ story, onClick }: StoryThumbnailProps) {
  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer rounded-lg overflow-hidden bg-gray-100 aspect-square"
    >
      {/* Story Image or Placeholder */}
      {story.imageData ? (
        <img
          src={story.imageData}
          alt={story.content.substring(0, 50)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-light-green to-brand-dark-green">
          <p className="text-white text-xs px-3 text-center line-clamp-3">
            {story.content}
          </p>
        </div>
      )}
      
      {/* Overlay with likes and views */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center justify-between text-white text-xs">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Heart className="w-3.5 h-3.5 fill-white" />
              <span className="font-medium">{story.likesCount}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="w-3.5 h-3.5" />
              <span className="font-medium">{story.viewsCount}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Always visible likes and views on bottom (subtle) */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/40 to-transparent">
        <div className="flex items-center space-x-3 text-white text-xs">
          <div className="flex items-center space-x-1">
            <Heart className="w-3 h-3 fill-white" />
            <span>{story.likesCount}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Eye className="w-3 h-3" />
            <span>{story.viewsCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
