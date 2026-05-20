# Walkthrough: Contemporánica Community & Messaging Updates

This document details the user search, direct messaging, navigation/About section, and the Reddit-like Community Discussions forum.

---

## 1. User Search & Profile View

### Landing Page & Script

#### [MODIFY] [index.html](file:///c:/Users/manue/OneDrive/Escritorio/contemporania/web/index.html)
- **Search Modal**: Added `#user-search-backdrop` container with interactive debounced input.
- **Profile Modal**: Added `#user-profile-backdrop` detailing public bios, honors, links, and validated works or performances.

---

## 2. Real-Time Private Messaging (Direct Messages)

### Database Migration

#### [NEW] [crear_tabla_mensajes.sql](file:///c:/Users/manue/OneDrive/Escritorio/contemporania/diseno/crear_tabla_mensajes.sql)
- Creates the `messages` table with automatic timezone stamps.
- Configures Row Level Security (RLS) policies:
  - Users can only read messages they sent or received.
  - Users can only insert messages where they are the sender.
  - Receivers can update the `is_read` status of incoming messages.
- Adds the table to the `supabase_realtime` publication to enable instant real-time events.

### Landing Page & Script

#### [MODIFY] [index.html](file:///c:/Users/manue/OneDrive/Escritorio/contemporania/web/index.html)
- **Navbar Icon**: Added `#navbar-chat-btn` containing a mail icon and a red notification dot (`#unread-chat-badge`) for new unread messages.
- **DM Slide-over Panel**: Added right-aligned glassmorphic panel (`#chat-panel`) consisting of:
  - A conversation list view showing recent chats, avatars, timestamps, and message snippets.
  - An active chat pane containing message bubbles (styled with salmon for sender and slate-800 for receiver) and an input form.
- **Profile Message Action**: Appended a "Send Message" action button in the profile modal.
- **Real-Time Integration**:
  - Subscribes to Postgres INSERT events on the `messages` table.

---

## 3. Navigation & About Section

#### [MODIFY] [index.html](file:///c:/Users/manue/OneDrive/Escritorio/contemporania/web/index.html)
- **Navbar Links**: Removed `Archive`, `Composers`, and `Performers` navigation links to simplify user options.
- **Smooth Scroll**: Configured `scroll-behavior: smooth` in HTML styles.
- **About Link**: Pointed the remaining "About" navbar link to scroll down smoothly to the new `#about-section`.
- **About Section Component**: Created a stunning glassmorphic section detailing:
  - Project mission statement.

---

## 4. Reddit-like Community Discussions Forum

### Database Migration

#### [NEW] [crear_tablas_foro.sql](file:///c:/Users/manue/OneDrive/Escritorio/contemporania/diseno/crear_tablas_foro.sql)
- Creates `posts` table (fields: `id`, `title`, `content`, `media_url`, `external_link`, `author_id`, `created_at`).
- Creates `comments` table (fields: `id`, `post_id`, `author_id`, `content`, `created_at`).
- Enables Row Level Security (RLS):
  - SELECT: Allowed for anyone (public read access).
  - INSERT/UPDATE/DELETE: Restricted to authenticated users / original authors.

### Landing Page & Script

#### [MODIFY] [index.html](file:///c:/Users/manue/OneDrive/Escritorio/contemporania/web/index.html)
- **Navbar Hook**: Added the `Community` link to navigate to the discussions page section.
- **Discussions Section (`#community-section`)**:
  - Displays a feed of recent posts.
  - Includes author profile avatar links, dates, and comment counter badges.
  - Shows preview images if a `media_url` (like an image link) is provided.
  - Shows external link buttons if an `external_link` is specified.
- **Modals**:
  - **Create Post Modal (`#create-post-backdrop`)**: Form to specify Title, Content, Image (Upload file from local computer OR paste URL), and External Link (optional).
  - **Post Detail / Comments Modal (`#post-detail-backdrop`)**: Renders full post body, full-resolution image/link actions, and a chronologically sorted nested comment thread.
- **Local Image Upload support**:
  - Selected files are rendered in a preview container within the creation form (with a click-to-clear button).
  - When submitting, if a local file is chosen, it is uploaded to the existing `Avatar` Supabase Storage bucket under the `posts/` path. The resulting public URL is saved as the post's `media_url`.
  - Fallback: Users can still paste external image URLs directly.
- **Post Deletion Capability & Custom Confirm Dialog**:
  - Post authors see a **Delete Post** button in the post details view.
  - Clicking it triggers `#delete-confirm-backdrop`, a premium, custom glassmorphic warning modal asking the user to confirm or cancel the deletion.
  - Confirming the deletion securely deletes the post from Supabase via RLS.
- **Authentication Safeguards**:
  - Non-logged-in users can browse all posts and comments, but the "New Post" button redirects to login, and the "Comment Form" is replaced with an elegant login call-to-action placeholder.

---

## 5. Post & Comment Voting, Real-Time Notifications Bell, Threaded Replies

### Database Migration

#### [NEW] [crear_tablas_votos_notificaciones.sql](file:///c:/Users/manue/OneDrive/Escritorio/contemporania/diseno/crear_tablas_votos_notificaciones.sql)
- Creates `votes` table linking users and posts with constraints to allow only one vote (positive +1 or negative -1) per post.
- Creates `notifications` table containing sender/receiver profiles, action types (`upvote`, `comment`, `comment_upvote`, `reply`), read states (`is_read`), and creation timestamps.
- Enables Row Level Security (RLS) policies for both tables.
- Adds the `notifications` table to the `supabase_realtime` publication.

#### [NEW] [crear_tabla_votos_comentarios_y_respuestas.sql](file:///c:/Users/manue/OneDrive/Escritorio/contemporania/diseno/crear_tabla_votos_comentarios_y_respuestas.sql)
- Alters `comments` table to add a `parent_id` column referencing other comments to allow nesting.
- Creates `comment_votes` table linking users and comments with upvote/downvote capability.
- Configures Row Level Security (RLS) policies for `comment_votes`.

### Landing Page & Script

#### [MODIFY] [index.html](file:///c:/Users/manue/OneDrive/Escritorio/contemporania/web/index.html)
- **Post Voting Widget**: Embedded upvote/downvote widget next to feed cards and inside post details view.
- **Comment Voting Widget**: Added a inline upvote/downvote widget with score indicator beneath each comment.
- **Threaded Comment Replies**:
  - Organizes comment threads in parent-child hierarchy.
  - Comments with a `parent_id` set are rendered indented (`ml-8`) with a border accent (`border-l-2`) and subtle shading (`bg-white/[0.02]`).
  - Added a "Reply" hook that toggles an inline reply form.
  - Submitting a reply creates a new comment with `parent_id` and fires a notification trigger for the parent author.
- **Notifications Bell & Dropdown**:
  - Appended `#navbar-notif-btn` bell icon to the header.
  - Created `#notifications-dropdown` dropdown container showing a list of recent events (marked with a left border highlight if unread).
  - Includes a "Mark all read" utility.
  - Clicking a notification marks it as read, closes the dropdown, and opens the corresponding discussion topic details.
- **Real-Time Integration**: Subscribes to insert events on the notifications channel to trigger instant notification delivery.

---

## Verification

### Manual Verification Steps
1. **Run Database Migrations**: Run the scripts [crear_tabla_mensajes.sql](file:///c:/Users/manue/OneDrive/Escritorio/contemporania/diseno/crear_tabla_mensajes.sql), [crear_tablas_foro.sql](file:///c:/Users/manue/OneDrive/Escritorio/contemporania/diseno/crear_tablas_foro.sql), [crear_tablas_votos_notificaciones.sql](file:///c:/Users/manue/OneDrive/Escritorio/contemporania/diseno/crear_tablas_votos_notificaciones.sql), and [crear_tabla_votos_comentarios_y_respuestas.sql](file:///c:/Users/manue/OneDrive/Escritorio/contemporania/diseno/crear_tabla_votos_comentarios_y_respuestas.sql) in your Supabase SQL Editor.
2. **Open Sessions**: Open two different browser sessions (e.g. Chrome normal and Incognito) logged in as two different users.
3. **Voting Test**:
   - In Session A, click the Upvote arrow on a post or a comment. Observe the count incrementing by 1.
   - Click it again. The vote toggles off and returns to the initial score.
4. **Replies & Threading Test**:
   - In Session A, look at comments. Click "Reply" under a comment.
   - Type a reply and click submit. Verify the reply is rendered indented below the parent comment.
5. **Notifications Bell Test**:
   - In Session B, reply to Session A's comment or upvote a comment.
   - Observe Session A's notifications bell lighting up instantly. Click the bell to view details.
6. **Smooth Scroll**: Click **Community** or **About** in the navigation bar to test smooth-scroll targeting.
