# AI Chat Frontend

Фронт для capstone-проекта: чат-приложение на Next.js, где можно логиниться, создавать чаты, стримить ответы и рулить админкой.

## Что внутри

- Auth: регистрация, логин, верификация почты
- Чаты: создание, список, поиск, удаление, rename title
- Сообщения: стриминг, редактирование, история правок
- Админка: роли, права, пользователи, аудит, аналитика
- UI: адаптив, toasts, loading states, empty states

## Стек

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion

## Локальный запуск

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Откроется на `http://localhost:3000`.

## Переменные окружения

`.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Прод:

- Vercel -> `NEXT_PUBLIC_API_URL=https://ai-chat-backend-bjwr.onrender.com`

## Основные роуты

- `/` - стартовая страница чата
- `/auth/login`
- `/auth/register`
- `/dashboard`
- `/chat/[id]`
- `/admin`

## E2E тесты

```bash
pnpm run test:e2e:list
pnpm run test:e2e
```

## Deploy checklist (быстрый)

1. Залить backend на Render/Railway
2. В Vercel прописать `NEXT_PUBLIC_API_URL`
3. На backend выставить `CORS_ORIGIN` под frontend URL
4. Проверить логин, чат, стриминг, админку

## AI tools (как использовал)

Честно и по кайфу:

- Cursor - основной coding flow: быстро править компоненты, гонять рефакторы, тесты и фиксы
- ChatGPT - продумывал архитектуру, декомпозировал сложные куски (auth/rbac/streaming), проверял edge-cases

AI использовался как ассистент, йоу.
