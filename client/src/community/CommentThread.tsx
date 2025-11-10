import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Comment {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

interface CommentThreadProps {
  postId: number;
  isExpanded: boolean;
  onToggle: () => void;
  commentsCount: number;
}

export default function CommentThread({ postId, isExpanded, onToggle, commentsCount }: CommentThreadProps) {
  // Fetch comments for the post
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: [`/api/community/posts/${postId}/comments`],
    enabled: isExpanded,
  });

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - commentDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (commentsCount === 0) return null;

  return (
    <div className="mt-3 border-t pt-3">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors mb-3"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-4 h-4" />
            <span>Hide {commentsCount} comment{commentsCount !== 1 ? 's' : ''}</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-4 h-4" />
            <span>View {commentsCount} comment{commentsCount !== 1 ? 's' : ''}</span>
          </>
        )}
      </button>

      {/* Comments List */}
      {isExpanded && (
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="text-gray-500 text-sm">Loading comments...</div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex space-x-2 bg-gray-50 p-3 rounded-lg">
                <Avatar className="w-7 h-7 flex-shrink-0">
                  <AvatarFallback className="text-xs">
                    {comment.user?.firstName?.[0] || 'U'}{comment.user?.lastName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <p className="font-medium text-sm">
                      {comment.user?.firstName || 'Unknown'} {comment.user?.lastName || 'User'}
                    </p>
                    <p className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</p>
                  </div>
                  <p className="text-sm text-gray-700 break-words">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}