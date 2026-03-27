# LiveBoard

Professional live teaching and presenting platform with real-time whiteboard, presentations, and audio.

## Features
- **Host authentication & Dashboard**: Manage your live sessions.
- **Live Whiteboard**: Collaborative drawing using `tldraw` with Realtime Sync.
- **Live Audio**: Built-in voice narration using `LiveKit`.
- **Presentation Mode**: Upload PDFs or images, sync slide navigation with all attendees.
- **Viewer-only modes**: Enforces host privileges securely using Supabase RLS and server actions.

## Technology Stack
- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS + shadcn/ui
- **Database & Auth**: Supabase (Postgres, Auth, Storage)
- **WebRTC Audio**: LiveKit
- **Canvas / Whiteboard**: tldraw
- **PDF Renderer**: react-pdf

## Environment Configuration

Copy the `.env.example` file to `.env.local` and populate the variables:

```env
# Next.js Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase Platform
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SECRET_KEY=your_supabase_service_role_key

# LiveKit Realtime Audio
LIVEKIT_URL=wss://your-livekit-url
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
```

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Set up Supabase schema:
   Apply the initial database schema located in `supabase/migrations/20260326000000_schema.sql` via the Supabase Dashboard SQL Editor or Supabase CLI.
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000)

## Netlify Deployment Guide

LiveBoard is optimized for **Netlify** natively.

1. Create a new site on Netlify pointing to this Git repository.
2. In Site settings > Build & deploy:
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
3. In Site settings > Environment variables, add all variables from your `.env.local`.
   - **Note**: Ensure `NEXT_PUBLIC_APP_URL` corresponds to your actual live Netlify domain.
4. Trigger a deploy! The Next.js Netlify runtime adapter will handle the `next.config.ts` rules, SSR actions, and static generation automatically.
