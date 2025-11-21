# Локализация (i18n)

## Поддерживаемые языки

- `en` - English (по умолчанию)
- `fr` - Français
- `es` - Español
- `uk` - Українська
- `ru` - Русский
- `zh` - 中文

## Структура

### Файлы переводов

Переводы хранятся в `public/locales/{locale}.json` в формате плоского JSON:

```json
{
  "hero_title": "LLMO Directory — Visible to AI",
  "hero_subtitle": "Analyze, optimize, and make your site visible to AI.",
  "cta_analyze": "Analyze Your Site",
  "cta_add_link": "Add Your Link"
}
```

### Маршрутизация

- Локализованные страницы: `app/[locale]/page.tsx`
- Оригинальные страницы: `app/page.tsx` (без локализации)

### Поддержка локализации по страницам

#### ✅ Полностью локализованы

- **Главная страница** (`app/[locale]/page.tsx`)
  - Использует `getTranslation()` для загрузки переводов
  - Поддерживает все языки

#### ⚠️ Частично локализованы

- **Pricing** (`app/[locale]/pricing/page.tsx`)
  - Реэкспортирует оригинальную страницу
  - Текст не переводится, только URL меняется

- **About** (`app/[locale]/about/page.tsx`)
  - Реэкспортирует оригинальную страницу
  - Текст не переводится, только URL меняется

#### ❌ Не локализованы

- Dashboard, Admin, Analyzer, My Links, Profile
- Эти страницы находятся в `app/` без `[locale]` сегмента
- Не поддерживают смену языка

## Как работает смена языка

1. Пользователь кликает на LanguageSwitcher
2. Компонент определяет текущий путь и убирает locale префикс
3. Добавляет новый locale префикс к пути
4. Использует `window.location.href` для полной перезагрузки страницы
5. Next.js загружает соответствующую страницу из `app/[locale]/`
6. Страница загружает переводы через `getTranslation(locale)`

## API

### Server-side (Server Components)

```typescript
import { getTranslation } from "@/lib/i18n";

export default async function Page({ params }: { params: { locale: string } }) {
  const t = await getTranslation(params.locale);
  return <h1>{t.hero_title}</h1>;
}
```

### Client-side (Client Components)

```typescript
import { useTranslation } from "@/lib/i18n-client";

export default function Component() {
  const { t, locale } = useTranslation();
  return <h1>{t("hero_title", "Fallback text")}</h1>;
}
```

## Middleware

`middleware.ts` автоматически перенаправляет корневой путь `/` на `/{locale}/` на основе языка браузера.

## Добавление новых переводов

1. Добавьте ключи в `public/locales/en.json`
2. Добавьте переводы в остальные файлы (`fr.json`, `es.json`, и т.д.)
3. Используйте ключи в страницах через `getTranslation()` или `useTranslation()`

