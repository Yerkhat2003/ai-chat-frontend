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

## Скриншоты

<p align="center">
  <img src="https://github.com/user-attachments/assets/89a0f453-08fa-4be5-9fbf-58cd310b03fc" alt="Admin panel" width="920" />
  <img src="https://github.com/user-attachments/assets/5e53cd63-f8b7-4e09-99be-27a6369834d7" alt="Admin panel" width="920" />
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/5be03cd6-1164-4616-8f5d-ed83f0dcf05e" alt="Dashboard" width="920" />
  <img src="https://github.com/user-attachments/assets/6c818946-cf65-4247-bab5-5988509c56f3" alt="Chat page" width="920" />
</p>


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


- Cursor - основной coding flow: быстро править компоненты, гонять рефакторы, тесты и фиксы
- ChatGPT - продумывал архитектуру, декомпозировал сложные куски (auth/rbac/streaming), проверял edge-cases

AI использовался как ассистент, йоу.
