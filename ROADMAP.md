# ROADMAP

## 1. Ближайшие шаги (1–2 недели)

Критичные задачи, которые блокируют функциональность или явно указаны как незавершенные:

- [ ] **Создать таблицу `analyzer_logs` в Supabase** — результаты Analyzer Pro не сохраняются, статистика не работает (`pages/api/analyzer/logs.ts:33`, `pages/api/user/stats.ts:70-91`, `pages/api/admin/stats.ts:121`). Нужно: SQL-скрипт для создания таблицы, обновить `pages/api/analyzer-pro.ts` для сохранения результатов, обновить endpoints статистики.

- [ ] **Реализовать проверку админа в Navigation** — ссылка на админ-панель не отображается (`components/navigation.tsx:17-18`). Использовать функцию `checkAdmin()` из `lib/auth.ts` вместо хардкода `false`.

- [ ] **Интегрировать админ-дашборд с API** — метрики возвращают 0, не используется `/api/admin/stats` (`app/admin/dashboard/page.tsx:404-408`, `DASHBOARD_UPGRADE_SUMMARY.md:66-99`). Нужно: подключить endpoint, отобразить реальные данные, добавить графики (recharts уже установлен).

- [ ] **Реализовать отображение участников команды** — UI есть, но данные не загружаются (`app/dashboard/page.tsx:987`). Нужно: загрузить список из `agency_members` через Supabase, отобразить в UI.

- [ ] **Доработать интеграцию Stripe с Supabase** — проверка customer только через Prisma, код для Supabase закомментирован (`pages/api/checkout/check-customer.ts:32-48`). Нужно: раскомментировать и доработать проверку через Supabase `subscriptions`.

## 2. Функциональные блоки

### LLM-ядро и аналитика

- [ ] **Развить модуль Analyzer Pro: сейчас сохраняет результаты в БД, но нет истории** — создать таблицу `analyzer_logs` со структурой: `id`, `user_id`, `link_id`, `url`, `score`, `recommendations` (JSONB), `created_at`. Обновить `pages/api/analyzer-pro.ts` для записи результатов, `pages/api/analyzer/logs.ts` для возврата истории.

- [ ] **Реализовать расчет среднего AI Score** — сейчас возвращается 0 (`pages/api/admin/stats.ts:121`). После создания `analyzer_logs` добавить агрегацию: `AVG(score) WHERE created_at > NOW() - INTERVAL '30 days'`.

- [ ] **Добавить историю метаданных** — таблица `metadata_suggestions` создана (`scripts/13-monetization-schema-updates.sql:108-138`), но нет UI для просмотра истории. Создать страницу или раздел в дашборде для отображения сгенерированных метаданных.

### Хранение данных

- [ ] **Унифицировать работу с БД** — сейчас гибрид: Prisma (SQLite) для NextAuth, Supabase (PostgreSQL) для основного функционала. Рассмотреть миграцию NextAuth на Supabase Auth или документировать текущий подход как временное решение.

- [ ] **Документировать RLS политики** — политики определены в SQL-скриптах (`scripts/*.sql`), но не видны в коде проекта. Создать файл `docs/RLS_POLICIES.md` с описанием всех политик или добавить комментарии в SQL-скрипты.

### Интеграции

- [ ] **Реализовать автоматическую регенерацию llms.txt** — должен быть cron job для Pro/Agency пользователей (`MONETIZATION_IMPLEMENTATION.md:85-89`). Создать `pages/api/cron/auto-llms.ts`: проверять `subscriptions.auto_llms=true` и `llms_last_update < NOW() - 90 days`, регенерировать через `app/api/tasks/generate-llms/route.ts`, отправлять email через Resend, добавить в `vercel.json` cron schedule.

- [ ] **Доработать Pricing Page** — добавить Pro ($9/year) и Agency ($30/year) планы (`MONETIZATION_IMPLEMENTATION.md:73-77`, `app/pricing/page.tsx`). Нужно: карточки планов, сравнение функций, обработка checkout для подписок (endpoint уже есть в `app/api/create-checkout-session/route.ts`).

- [ ] **Реализовать смену пароля** — сейчас заглушка "coming soon" (`app/profile/page.tsx:377-379`). NextAuth не поддерживает напрямую, нужно: либо использовать Supabase Auth API для смены пароля, либо создать кастомный endpoint, который отправляет reset link через Resend.

### UI/UX

- [ ] **Доработать Add-Link форму** — проверить полноту полей категоризации (`MONETIZATION_IMPLEMENTATION.md:91-94`). Убедиться, что все поля (`category_type`, `category_subtype`, `category_topic`, `keywords[]`, `short_description`) присутствуют и валидируются (max 5 keywords, max 280 chars для short_description).

- [ ] **Создать страницу Agency Management** — упоминается в документации (`MONETIZATION_IMPLEMENTATION.md:79-83`), но страница `/app/team/page.tsx` отсутствует. Нужно: страница для отображения участников, приглашение через `/api/agency/invite`, удаление через `/api/agency/member`, отображение shared links.

- [ ] **Добавить Settings для Auto llms.txt** — сейчас placeholder (`DASHBOARD_UPGRADE_SUMMARY.md:34`). Создать страницу или модальное окно для управления `subscriptions.auto_llms` (включить/выключить для Pro/Agency пользователей).

- [ ] **Реализовать CSV экспорт в админ-панели** — упоминается в `DASHBOARD_UPGRADE_SUMMARY.md:87`. Добавить кнопки экспорта для таблиц: users, links, subscriptions, payments. Использовать библиотеку для генерации CSV или простой формат.

### Административная панель

- [ ] **Завершить интеграцию админ-дашборда** — частично сделано (`DASHBOARD_UPGRADE_SUMMARY.md:66-99`). Нужно: подключить `/api/admin/stats`, добавить графики (revenue breakdown, plan distribution pie chart), новые табы (Overview, Tasks), кнопки действий (regenerate sitemap/llms.txt, send reminders), realtime обновления через Supabase subscriptions.

- [ ] **Добавить расчет недостающих метрик** — сейчас возвращаются 0 (`app/admin/dashboard/page.tsx:404-408`): `analyzedTotal`, `unpaidLinksTotal`, `expiredSubs`. После создания `analyzer_logs` добавить расчеты в `/api/admin/stats` или напрямую в компонент.

- [ ] **Реализовать функционал отправки напоминаний** — упоминается в `DASHBOARD_UPGRADE_SUMMARY.md:86`. Создать endpoint `/api/admin/send-llms-reminder` для отправки email через Resend пользователям с устаревшими `llms.txt` (проверка `llms_last_update < NOW() - 90 days`).

## 3. Технический долг

### Архитектурные проблемы

- [ ] **Унифицировать структуру API** — двойная структура: `app/api/` (App Router) и `pages/api/` (Pages Router). Причина неочевидна из кода. Решение: либо мигрировать все endpoints в `app/api/`, либо документировать причины разделения и критерии выбора структуры.

- [ ] **Централизовать обработку ошибок** — используется `withErrorHandling` из `lib/api-error-wrapper.ts` только в некоторых endpoints (`app/api/analyze-content/route.ts`), в других (`pages/api/*`) обработка разная. Создать единый подход: обертку для всех API routes или middleware для обработки ошибок.

- [ ] **Улучшить логирование** — сейчас используется `console.log` и `console.error` без структуры. Добавить централизованный logger (например, через библиотеку `pino` или `winston`), логировать в структурированном формате (JSON), добавить уровни логирования (debug, info, warn, error).

- [ ] **Документировать стратегию кеширования** — Next.js кеширует по умолчанию, но для API routes стратегия неясна. Определить: какие endpoints кешировать, какие TTL использовать, как инвалидировать кеш. Добавить комментарии в код или создать `docs/CACHING.md`.

### Хардкоды и временные решения

- [ ] **Вынести суперадмин email в конфигурацию** — сейчас хардкод в `lib/auth.ts:27` (`a.biletskiy@gmail.com`). Переместить в переменную окружения `SUPER_ADMIN_EMAIL` или в конфигурационный файл.

- [ ] **Убрать placeholder файл книги** — `public/books/LLMO_Quick_Start_placeholder.txt` содержит placeholder текст. Либо заменить на реальный файл, либо удалить, если функциональность не используется.

- [ ] **Документировать причины гибридной БД** — Prisma (SQLite) для NextAuth, Supabase для основного функционала. Либо мигрировать NextAuth на Supabase Auth (убрать Prisma), либо документировать текущий подход как постоянное решение с описанием причин.

### Качество кода

- [ ] **Добавить валидацию входных данных** — используется Zod (`package.json`), но не везде. Добавить схемы валидации для всех API endpoints (использовать `zod` для валидации body, query params, headers).

- [ ] **Добавить TypeScript типы для Supabase** — сейчас используются `any` в некоторых местах (например, `pages/api/user/stats.ts:28`). Сгенерировать типы через `@supabase/supabase-js` или создать вручную типы для таблиц.

- [ ] **Унифицировать формат ответов API** — разные endpoints возвращают разный формат (иногда `{ data }`, иногда просто объект, иногда `{ error }`). Создать стандартный формат ответа (например, `{ success: boolean, data?: T, error?: string }`) и использовать везде.

### Тестирование

- [ ] **Настроить тестовую инфраструктуру** — тесты отсутствуют полностью. Добавить: Jest или Vitest, тестовые скрипты в `package.json`, базовые unit-тесты для утилит (`lib/utils.ts`, `lib/auth.ts`), интеграционные тесты для критичных API endpoints (аутентификация, платежи).

- [ ] **Добавить E2E тесты** — для критичных пользовательских сценариев: регистрация, добавление ссылки, запуск Analyzer Pro, оплата подписки. Использовать Playwright или Cypress.

### Мониторинг и производительность

- [ ] **Добавить мониторинг ошибок** — сейчас только `console.error`. Интегрировать Sentry или аналогичный сервис для отслеживания ошибок в продакшене.

- [ ] **Добавить метрики производительности** — Vercel Analytics подключен только для frontend. Добавить мониторинг API endpoints: время ответа, количество запросов, ошибки. Использовать Vercel Analytics для API или внешний сервис.

- [ ] **Оптимизировать запросы к БД** — проверить наличие индексов в SQL-скриптах, добавить индексы для часто используемых полей (например, `links.user_id`, `subscriptions.user_id`, `links.status`). Проверить N+1 проблемы в запросах.

### Документация

- [ ] **Дополнить README** — сейчас только информация о синхронизации с v0.app. Добавить: описание проекта, инструкции по установке, переменные окружения, команды для разработки, ссылки на документацию.

- [ ] **Создать CONTRIBUTING.md** — описать процесс разработки: как запустить проект локально, как создать миграцию, как добавить новый endpoint, стиль кода, процесс code review.

- [ ] **Документировать переменные окружения** — создать `.env.example` с описанием всех переменных, их назначением и примерами значений. Убедиться, что все переменные из кода задокументированы.


