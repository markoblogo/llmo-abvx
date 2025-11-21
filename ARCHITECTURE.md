# ARCHITECTURE

## Цель проекта

LLMO Directory — веб-приложение, которое представляет собой каталог сайтов, оптимизированных для видимости в больших языковых моделях (LLM). Проект позволяет пользователям добавлять свои сайты в каталог, анализировать их видимость для AI через Analyzer Pro, генерировать метаданные и автоматически создавать файлы `llms.txt` для лучшей индексации контентом AI-системами. Монетизация реализована через подписки (Free/Pro/Agency) и разовые платежи за boost-листинги и генерацию метаданных. Согласно README, проект развернут на Vercel и синхронизируется с v0.app.

## Общая архитектура

### Frontend (Next.js App Router)

**Расположение:** `app/`, `components/`

Приложение построено на Next.js 16 с использованием App Router. Страницы организованы в `app/` с поддержкой локализации через директорию `app/[locale]/`. UI-компоненты (58 компонентов на базе Radix UI) находятся в `components/ui/`, общие компоненты (Navigation, Footer, ThemeToggle) — в корне `components/`. Клиентские компоненты помечены директивой `"use client"`, серверные компоненты используются по умолчанию.

### Backend API

**Расположение:** `app/api/`, `pages/api/`

Архитектура API использует двойную структуру: новые endpoints в `app/api/` (App Router) и legacy endpoints в `pages/api/` (Pages Router). Основные API-маршруты включают обработку платежей (`create-checkout-session`, `stripe-webhook`), анализ контента (`analyze-content`), генерацию метаданных (`metadata`), генерацию `llms.txt` и sitemap (`tasks/generate-llms`, `tasks/generate-sitemap`), а также административные операции (`admin/*`).

### Аутентификация и авторизация

**Расположение:** `pages/api/auth/[...nextauth].ts`, `lib/auth.ts`, `lib/checkAdmin.ts`

Система использует NextAuth.js с провайдерами Google OAuth и Email (magic links через Resend). Адаптер Prisma (`@next-auth/prisma-adapter`) интегрирован с локальной SQLite БД для хранения сессий. Проверка прав администратора реализована через функцию `checkAdmin()` в `lib/auth.ts`, которая проверяет роль в таблице `profiles` Supabase и хардкод-email суперадмина. Row Level Security (RLS) в Supabase обеспечивает дополнительную защиту на уровне БД.

### Хранение данных

**Расположение:** `prisma/schema.prisma`, `scripts/*.sql`, `lib/supabaseClient.ts`

Проект использует гибридный подход к БД: Prisma с SQLite (`prisma/dev.db`) для локальной разработки и NextAuth, а Supabase (PostgreSQL) для продакшена. Основная схема БД определена в SQL-скриптах в `scripts/` (13 миграций), которые создают таблицы `links`, `subscriptions`, `profiles`, `downloads`, `email_logs`, `analyses`, `agency_members`, `metadata_suggestions` с включенным RLS. Supabase клиент инициализируется в `lib/supabaseClient.ts` и используется для всех операций с данными в продакшене.

### LLM-интеграции

**Расположение:** `app/api/analyze-content/route.ts`, `pages/api/metadata.ts`, `pages/api/analyzer-pro.ts`

Все LLM-операции используют OpenAI API через пакет `ai` (Vercel AI SDK) и нативный OpenAI SDK. Analyzer Pro (`pages/api/analyzer-pro.ts`) анализирует видимость сайта для AI, генерируя score 0-100. Генерация метаданных (`pages/api/metadata.ts`) создает SEO title, description, keywords через GPT-4o-mini. Анализ контента (`app/api/analyze-content/route.ts`) оценивает machine legibility контента. Все запросы требуют аутентификации и используют переменную окружения `OPENAI_API_KEY`.

### Платежная система

**Расположение:** `lib/stripe.ts`, `app/api/create-checkout-session/route.ts`, `pages/api/stripe/webhooks.ts`

Интеграция со Stripe реализована через официальный SDK. Создание checkout-сессий происходит в `app/api/create-checkout-session/route.ts`, webhook-обработка — в `pages/api/stripe/webhooks.ts`. Webhook обрабатывает события `checkout.session.completed`, `invoice.payment_succeeded` и обновляет статусы подписок, featured-листингов и платежей в Supabase. Конфигурация Stripe находится в `lib/stripe.ts` и `lib/stripeClient.ts`.

### Локализация

**Расположение:** `lib/i18n.ts`, `lib/i18n-constants.ts`, `locales/`, `middleware.ts`

Поддержка 6 языков (en, fr, es, uk, ru, zh) реализована через JSON-файлы переводов в `locales/` и `public/locales/`. Middleware (`middleware.ts`) определяет язык из заголовков браузера и редиректит корневой путь на локализованную версию. Функция `getTranslation()` в `lib/i18n.ts` загружает переводы с fallback на английский.

### Административная панель

**Расположение:** `app/admin/`, `pages/api/admin/*`

Админ-панель находится в `app/admin/` с разделами dashboard, links, users, subscriptions, emails. API endpoints для админ-операций (`promote-user`, `delete-user`, `remove-link`, `verify-backlink`, `stats`) находятся в `pages/api/admin/`. Проверка прав доступа выполняется через `requireAdminAccess()` из `lib/auth.ts`.

## Поток данных / основной сценарий

### Сценарий 1: Добавление ссылки и анализ

1. **Пользователь регистрируется/логинится** → `pages/api/auth/[...nextauth].ts` обрабатывает аутентификацию через NextAuth, создает сессию в Prisma SQLite, возвращает JWT токен.

2. **Пользователь добавляет ссылку** → `app/add-link/page.tsx` отправляет POST запрос, который обрабатывается через Supabase клиент (`lib/supabaseClient.ts`), данные сохраняются в таблицу `links` со статусом `pending`.

3. **Админ одобряет ссылку** → Админ через `app/admin/links/page.tsx` обновляет статус на `approved` в Supabase, RLS политики проверяют права доступа.

4. **Пользователь запускает Analyzer Pro** → `app/dashboard/page.tsx` вызывает `pages/api/analyzer-pro.ts`, который:
   - Получает контент сайта через fetch
   - Отправляет запрос к OpenAI API (GPT-4o-mini) с промптом для анализа видимости
   - Возвращает score 0-100 и рекомендации
   - **Примечание:** Результаты не сохраняются в БД (таблица `analyzer_logs` не реализована)

5. **Генерация llms.txt** → Cron job (`vercel.json`) вызывает `app/api/tasks/generate-llms/route.ts`, который:
   - Запрашивает все approved ссылки из Supabase
   - Генерирует `llms.txt` контент
   - Сохраняет в `public/llms.txt` (локально) или отдает через API (serverless)

### Сценарий 2: Платеж и активация подписки

1. **Пользователь выбирает план** → `app/pricing/page.tsx` отображает тарифы, пользователь нажимает "Upgrade".

2. **Создание checkout-сессии** → `app/api/create-checkout-session/route.ts`:
   - Проверяет существование Stripe customer в Supabase `subscriptions`
   - Создает нового customer в Stripe, если нужно
   - Создает checkout session через Stripe SDK
   - Возвращает `sessionId` клиенту

3. **Пользователь оплачивает** → Stripe обрабатывает платеж, редиректит на `success_url`.

4. **Webhook обрабатывает событие** → `pages/api/stripe/webhooks.ts`:
   - Верифицирует подпись webhook
   - Обрабатывает `checkout.session.completed` или `invoice.payment_succeeded`
   - Обновляет `subscriptions` в Supabase: устанавливает `plan`, `expiry_date`, `stripe_customer_id`
   - Для boost-платежей обновляет `links.is_featured = true`, `featured_until = +30 days`

5. **Обновление UI** → Пользователь видит обновленный статус подписки в `app/dashboard/page.tsx` после перезагрузки.

## Используемые технологии и сервисы

### Языки и фреймворки

- **TypeScript 5.x** — основной язык (`tsconfig.json`)
- **Next.js 16.0.0** — React-фреймворк с App Router (`package.json`, `next.config.mjs`)
- **React 19.2.0** — UI библиотека (`package.json`)
- **Tailwind CSS 4.1.9** — стилизация (`package.json`, `postcss.config.mjs`)

### Базы данных

- **Prisma 6.19.0** — ORM для локальной разработки (`prisma/schema.prisma`, `package.json`)
- **SQLite** — локальная БД для Prisma (`prisma/dev.db`)
- **Supabase (PostgreSQL)** — продакшн БД (`lib/supabaseClient.ts`, SQL-скрипты в `scripts/`)

### Аутентификация

- **NextAuth.js 4.24.13** — аутентификация (`pages/api/auth/[...nextauth].ts`, `package.json`)
- **PrismaAdapter** — адаптер NextAuth для Prisma (`@next-auth/prisma-adapter`)

### LLM-провайдеры

- **OpenAI API** — все LLM-операции (`app/api/analyze-content/route.ts`, `pages/api/metadata.ts`, `pages/api/analyzer-pro.ts`)
- **Vercel AI SDK** — пакет `ai` для работы с OpenAI (`package.json`, используется в `app/api/analyze-content/route.ts`)

### Платежи

- **Stripe** — обработка платежей (`lib/stripe.ts`, `package.json`, `@stripe/stripe-js`)

### Email

- **Resend** — отправка email (`package.json`, используется в `pages/api/auth/[...nextauth].ts` для magic links)

### UI-компоненты

- **Radix UI** — примитивы UI (`@radix-ui/*` в `package.json`, компоненты в `components/ui/`)
- **Lucide React** — иконки (`lucide-react` в `package.json`)

### Хостинг и деплой

- **Vercel** — хостинг и автоматический деплой (`vercel.json`, упоминается в README)
- **Vercel Analytics** — аналитика (`@vercel/analytics` в `package.json`, используется в `app/layout.tsx`)

### Дополнительные библиотеки

- **Zod** — валидация схем (`zod` в `package.json`)
- **React Hook Form** — управление формами (`react-hook-form` в `package.json`)
- **date-fns** — работа с датами (`date-fns` в `package.json`)
- **Recharts** — графики для админ-панели (`recharts` в `package.json`)

## Ограничения и пробелы

### Незавершенные части архитектуры

1. **Таблица `analyzer_logs` не создана** — результаты анализа Analyzer Pro не сохраняются в БД. API endpoint `pages/api/analyzer/logs.ts` возвращает пустой массив. Это влияет на статистику в дашбордах (`pages/api/user/stats.ts:91`, `pages/api/admin/stats.ts:121`).

2. **Двойная структура API** — проект использует одновременно `app/api/` (App Router) и `pages/api/` (Pages Router). Причина неочевидна из кода, возможно, миграция в процессе.

3. **Гибридная БД архитектура** — Prisma (SQLite) используется только для NextAuth сессий, основная БД — Supabase (PostgreSQL). Схема Prisma минимальна, основная схема определена в SQL-скриптах. Это создает сложность в поддержке двух источников данных.

4. **Проверка админа в UI не реализована** — `components/navigation.tsx:17-18` содержит TODO и всегда возвращает `false`, поэтому ссылка на админ-панель не отображается.

5. **Смена пароля — заглушка** — `app/profile/page.tsx:377-379` показывает сообщение "coming soon", реальная функциональность отсутствует. NextAuth не поддерживает смену пароля напрямую, требуется интеграция с Supabase Auth.

6. **Автоматическая регенерация llms.txt не реализована** — согласно `MONETIZATION_IMPLEMENTATION.md:85-89`, должен быть cron job `/pages/api/cron/auto-llms.ts` для Pro/Agency пользователей, но он отсутствует.

7. **Интеграция Stripe с Supabase неполная** — `pages/api/checkout/check-customer.ts:32-48` содержит закомментированный код для проверки Stripe customer в Supabase, используется только Prisma.

8. **Админ-дашборд не интегрирован с новым API** — `app/admin/dashboard/page.tsx` не использует endpoint `/api/admin/stats`, некоторые метрики возвращают 0 (TODO в коде:404-408).

9. **Отображение участников команды** — `app/dashboard/page.tsx:987` содержит TODO для отображения списка участников агентства, UI есть, но данные не загружаются.

10. **Тесты отсутствуют** — в проекте нет тестовых файлов, тестовых скриптов в `package.json`, нет директории `__tests__/`.

### Архитектурные решения, требующие внимания

- **RLS политики** — включены для всех таблиц Supabase, но детали политик не видны в коде проекта (определены в SQL-скриптах, которые должны выполняться в Supabase Dashboard).

- **Обработка ошибок** — используется обертка `withErrorHandling` из `lib/api-error-wrapper.ts` в некоторых endpoints, но не везде. Нет единообразного подхода к логированию ошибок.

- **Кеширование** — нет явного кеширования данных. Next.js кеширует по умолчанию, но стратегия кеширования для API routes не документирована.

- **Мониторинг и логирование** — используется `console.log` и `console.error`, нет централизованной системы логирования. Vercel Analytics подключен, но только для frontend метрик.

