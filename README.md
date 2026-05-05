# ai-chat-frontend

Next.js 14 frontend for AI chat capstone.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment

- `NEXT_PUBLIC_API_URL=https://your-api.onrender.com`

## Routes

- `/auth/login`
- `/auth/register`
- `/dashboard`
- `/chat/[id]`

## Features

- JWT auth with token stored in `localStorage`
- Chat list with pagination and title search
- Chat detail with persisted message history
- Message send flow integrated with backend `POST /messages`
- Loading and inline error states

## Deploy checklist

1. Deploy backend to Render.
2. Set frontend env `NEXT_PUBLIC_API_URL` to backend URL in Vercel.
3. Set backend `CORS_ORIGIN` to frontend URL.
4. Verify:
   - login/register works
   - `/dashboard` loads chats
   - `/chat/[id]` loads history and sends messages
   - unauthorized users are redirected to `/auth/login`
