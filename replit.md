# Investamind - Investment Learning Platform

## Overview
Investamind is a mobile-first web application designed to educate users on stock trading and investing. It offers structured learning modules, gamification, and community features, catering to beginners and advanced investors alike. The platform features personalized learning paths, real-time market integration, social learning, and operates on a freemium model with a 7-day trial and premium subscriptions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Technology Stack**: React, TypeScript, Wouter, TanStack Query, Tailwind CSS, shadcn/ui (New York style), React Hook Form, Zod.
- **State Management**: React Context API (global), TanStack Query (server state), local React state, session storage.
- **Routing**: Public, authenticated, and module-specific routes; conditional routing based on authentication and onboarding.
- **UI/UX**: Mobile-first design with a fixed bottom navigation, touch-optimized interactions, responsive typography, PWA capabilities (offline support, installable experience).

### Backend
- **Technology Stack**: Express.js, TypeScript, Socket.IO (real-time communication), bcrypt (password hashing), session-based authentication, PostgreSQL, Drizzle ORM.
- **API Design**: RESTful with modular endpoints for authentication, learning modules, user progress, community posts, search, user profiles, subscriptions, and admin functions.
- **Authentication**: Session-based with httpOnly cookies, supporting user profiles, onboarding state, and language preferences.
- **Real-Time Features**: Socket.IO for user-specific channels (e.g., `user:<id>`).
- **Core Features**:
    - **Cursor Pagination**: Efficient, composite cursor-based pagination for large datasets.
    - **Content Parsing**: Extracts and normalizes hashtags, @mentions, and $tickers using regex with Unicode support.
    - **Soft Deletes**: `deletedAt` columns for data recovery on users, community posts, and post interactions.
    - **User Blocking**: Filters content from blocked users in all list endpoints.
    - **Follow System**: Users can follow/unfollow, with notification support via Socket.IO.
    - **Modular Posts System**: CRUD for community posts, including trending/popular scoring, image support, and parsing of entities.
    - **Search System**: Full-text search for posts by text (using `pg_trgm`), hashtag, or ticker with cursor pagination.
    - **Internationalization**: Supports English and Spanish. Server-side localization of content via `Accept-Language` header or query parameter. Database schema includes localized fields (e.g., `title_es`).
    - **Freemium Model**: Free tier with limited access, premium tier unlocking all features, and permanent access for beta users.
    - **Vibecode Mobile App Integration**: Separate `/posts` endpoint with file-based JSON storage (`posts.db.json`) for specific post types (question, trading_signal, price_prediction, win, general).

### Data Storage
- **Database**: PostgreSQL (Neon serverless) with Drizzle ORM.
- **Schema Design**: Includes tables for `users`, `learning_modules`, `user_progress`, `notifications`, `subscriptions`, `payments`, `community_posts`, `post_interactions`, `user_blocks`, and `user_follows`.
- **Key Design Decisions**: Experience level and investment style on user records, separate progress tracking, denormalized subscription status, soft deletes, block relationships, follow system, cursor pagination, and `pg_trgm` for full-text search.
- **Database Extensions**: `pg_trgm` for similarity-based text search.

## External Dependencies

- **Payment Processing**: Stripe for subscriptions; PayPal (planned).
- **File Storage**: AWS S3 / Cloudflare R2 for file uploads (images, documents).
- **UI Components**: Radix UI, Font Awesome, Lucide React.
- **Development Tools**: Vite, esbuild, Drizzle Kit, tsx, AWS SDK v3.
- **Third-Party Services (Planned)**: Market data APIs (Alpha Vantage, Yahoo Finance), push notification service.

## Recent Enhancements (November 2025)

### File Upload System
- **S3/R2 Integration**: Implemented presigned URL generation using AWS SDK v3 for secure file uploads
- **Upload Endpoint**: `POST /api/uploads/sign` validates content types (image/jpeg, image/png, image/webp) and returns upload/public URLs
- **Configuration**: Uses environment variables (S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT, S3_REGION)
- **Security**: Requires authentication, 5-minute URL expiration, content type validation

### Notifications System
- **Module Structure**: `server/modules/notifications/` with service and routes
- **Endpoints**:
  - `GET /api/notifications` - Paginated notifications with unread-first sorting
  - `GET /api/notifications/unread-count` - Count of unread notifications
  - `POST /api/notifications/read` - Mark notifications as read by IDs
- **Features**:
  - Cursor-based pagination with proper unread-first ordering
  - Real-time Socket.IO emission to `user:<id>` rooms
  - Notification types: follow, mention (like, comment, reply pending feature implementation)
- **Implementation**:
  - Follow notifications: Emitted when a user follows another user
  - Mention notifications: Emitted when a user is mentioned in a post (@username)
  - Prevents self-mention and self-follow notifications
  - Includes sender information in notification messages

### Enhanced Modules
- **Posts Module**: 
  - Socket.IO integration for mention notifications
  - Normalized hashtag/mention tracking with separate tables (post_hashtags, post_mentions)
  - Hashtag and mention parsing on create/edit with automatic table updates
  - Open Graph meta tags for post sharing (GET /api/posts/:id serves HTML with OG tags)
  - Single post retrieval endpoint with blocking checks
- **Users Module**: 
  - Socket.IO integration for follow notifications
  - User suggestion endpoint (GET /api/users/suggest?q={query}) for mention typeahead
  - Username-based search with case-insensitive prefix matching
- **All Routes**: Socket.IO instance available via `req.app.io` for real-time features

### Hashtag and Mention System (November 2025)
- **Normalized Tables**: post_hashtags and post_mentions track parsed entities separately from JSON
- **Automatic Parsing**: On post create/edit, content is parsed for #hashtags and @mentions
- **Mention Resolution**: @mentions resolved by username (case-insensitive) and linked to user IDs
- **Clean Updates**: Upsert functions always delete existing rows first to handle edits properly
- **Notifications**: Mentioned users receive real-time notifications via Socket.IO
- **Search Ready**: Normalized tables enable efficient hashtag/mention search queries

### Social Sharing (November 2025)
- **Open Graph Tags**: GET /api/posts/:id serves HTML with OG meta tags for social media crawlers
- **Content Preview**: Post content truncated to 200 characters for og:description
- **Image Support**: Post images included in og:image when present
- **Auto-Redirect**: HTML pages redirect to main app after OG tags are scraped
- **Twitter Cards**: Includes Twitter-specific meta tags (summary/summary_large_image)

### Nested Comments System (November 2025)
- **Module Structure**: `server/modules/comments/` with service and routes
- **Endpoints**:
  - `POST /api/posts/:id/comments` - Create a comment (supports parentCommentId for nested replies)
  - `GET /api/posts/:id/comments` - Get top-level comments with cursor pagination
  - `GET /api/posts/:id/comments?parentId={id}` - Get replies to a specific comment
- **Features**:
  - Nested comment support with parentCommentId field
  - Increments post.commentsCount only for top-level comments
  - Increments parent comment repliesCount for nested replies
  - Real-time notifications to post author and parent comment author
  - Cursor-based pagination with composite key (createdAt, id)
  - Includes user info (firstName, lastName, username) in responses
- **Database Schema**: post_comments table with soft deletes, repliesCount tracking

### User Blocking System (November 2025)
- **Module Structure**: `server/modules/blocking/` with service and routes
- **Endpoints**:
  - `POST /api/users/:id/block` - Block a user (bidirectional)
  - `DELETE /api/users/:id/block` - Unblock a user
- **Features**:
  - Bidirectional blocking (both users blocked from seeing each other's content)
  - Service layer ready for filtering across all list/search endpoints
  - Prevents duplicate block relationships
  - Error handling for self-blocking attempts
- **Database Schema**: user_blocks table with composite unique constraint on (blockerId, blockedId)
- **Status**: Core blocking implemented; endpoint filtering deferred to follow-up task

### Drafts System (November 2025)
- **Module Structure**: `server/modules/drafts/` with service and routes
- **Endpoints**:
  - `GET /api/drafts` - List all drafts for current user
  - `POST /api/drafts` - Create new draft
  - `GET /api/drafts/:id` - Get single draft
  - `PATCH /api/drafts/:id` - Update draft
  - `DELETE /api/drafts/:id` - Delete draft
  - `POST /api/drafts/:id/publish` - Publish draft as post and delete draft
- **Features**:
  - CRUD operations for draft management
  - Atomic publish-to-post flow using database transactions
  - Auto-updated timestamps (createdAt, updatedAt)
  - Image URL support
  - Converts drafts to posts with hashtag/mention parsing via posts service
- **Database Schema**: drafts table with userId foreign key

### Production Middleware (November 2025)
- **Helmet**: Security headers (CSP, X-Frame-Options, etc.) for all requests
- **Rate Limiting**: 60 requests/minute for write operations (POST/PATCH/DELETE)
  - Applied globally to all write routes
  - Separate limiter instance to avoid conflicts
  - Returns 429 status when limit exceeded
- **Structured Logging**: pino-http JSON logging with request/response details
  - Includes session userId when available for user-specific request tracking
  - Logs request method, URL, status code, and response time
  - Production-ready JSON format for log aggregation tools
- **Health Endpoint**: GET /health returns {status: 'ok', timestamp, environment}