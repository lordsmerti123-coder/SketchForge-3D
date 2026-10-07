# Задача 06 — Русификация меток данных и ошибок API

## Цель
Перевести отображаемые метки, которые приходят из данных/библиотек, и тексты ошибок API.

## Файлы
- `apps/web/src/lib/shapeCatalog.ts` — названия фигур в меню (использовать уже
  существующий `shapeKindLabelKey` / `textFontLabelKey`, ничего не менять в данных!).
- `apps/web/src/lib/measurementUnits.ts` — метки единиц/масштабов (уже есть
  `unitLabelKey`/`scaleLabelKey`/`displayUnitLabelKey` — подключить, если не подключены).
- `apps/web/src/lib/exportNames.ts`, `apps/web/src/lib/importExtensions.ts` — названия
  типов файлов (STL/OBJ/STEP/SVG/SKF) в окнах импорта/экспорта.
- `apps/web/src/lib/challenges.ts` — названия/описания заданий (если отображаются).
- `apps/web/src/app/api/*/route.ts` — тексты ошибок, возвращаемые клиенту
  (`shared-projects`, `app-update`, `local-download`, `project-thumbnail`, `codex-screenshot`).

## Namespace
- Новый `importExport` — для названий типов файлов/операций импорта-экспорта.
- Новый `apiErrors` — для сообщений об ошибках API.
- Переиспользовать `shapes.*`, `units.*`.

## Подход для API-ошибок
Route-хендлеры работают на сервере без React-контекста. Простейший вариант:
- в каждом route читать `request.headers.get("accept-language")`;
- если содержит `ru` — возвращать русский текст, иначе английский;
- реализовать через маленький локальный helper/объект в каждом файле (или общий
  `lib/apiMessages.ts` — на усмотрение агента, но не ломать существующие сигнатуры ответов).
Клиентская часть (`page.tsx`) показывает `payload.error` как есть — её не менять.

## Правила (RULES.md)
- Метки единиц/пресетов — только отображение; хранимые значения не менять.
- Не менять названия экспортируемых файлов/расширений (это логика).

## Вывод ключей
`docs/russification/keys/06-keys.json` (для `importExport`/`apiErrors` и недостающих).

## Проверка
- `node "node_modules\typescript\bin\tsc" -p "apps/web/tsconfig.json" --noEmit` — без ошибок.

## Отчёт
Файлы, число замен, новые ключи, пропущенное и почему.
