# Задача 01 — Сделать русский языком по умолчанию

## Цель
Чтобы приложение по умолчанию открывалось на русском (независимо от языка браузера/ОС),
а английский включался только явной установкой cookie.

## Контекст
- Локаль хранится в cookie `NEXT_LOCALE`, который ставит middleware.
- Текущая логика: `defaultLocale = "en"`, а `ru` выбирается только если `Accept-Language`
  содержит `ru`.
- Из-за этого на машине с английской/другой локалью приложение показывает английский.

## Файлы (только эти)
1. `apps/web/src/middleware.ts`
2. `apps/web/src/i18n/routing.ts`
3. `apps/web/src/i18n/navigation.ts`

## Что сделать
1. В `middleware.ts`: изменить `defaultLocale` с `"en"` на `"ru"`.
   Логику оставить cookie-first: если в cookie валидная локаль (`en`/`ru`) — использовать её;
   иначе ставить `ru` (не зависеть от `Accept-Language`). Проще всего:
   - `defaultLocale = "ru"`;
   - в ветке отсутствия cookie: `detected = "ru"` (вместо проверки `Accept-Language`).
2. В `routing.ts` (`getRequestLocale`): fallback без cookie вернуть `"ru"` вместо `"en"`.
3. В `navigation.ts`: `defaultLocale` заменить на `"ru"`. Остальное (массив `locales`,
   `localePrefix`) не трогать.

## НЕ делать
- Не менять структуру cookie, не трогать matcher в middleware.
- Не переписывать `request.ts`, `layout.tsx`, `next.config.ts`.

## Проверка
- `node "node_modules\typescript\bin\tsc" -p "apps/web/tsconfig.json" --noEmit` — без ошибок.
- В отчёте указать: что изменено, и подтвердить, что новая логика «без cookie → ru».

## Ключи
Не требуются (задача не добавляет переводы).
