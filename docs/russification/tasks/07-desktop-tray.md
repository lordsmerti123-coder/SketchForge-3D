# Задача 07 — Русификация трея десктопа (Electron main)

## Цель
Перевести меню в системном трее и нативные диалоги десктопного приложения.

## Файлы
- `apps/desktop/main.cjs` (основной объём).
- (при необходимости) `apps/desktop/preload.cjs` — если там есть видимые строки.

## Контекст
- `main.cjs` — Electron main-процесс, **вне** React и `next-intl`. JSON-каталог тут
  не используется. Перевод — через локальную карту строк.
- Electron даёт локаль ОС через `app.getLocale()` (например `"ru-RU"`).

## Что переводить
- Меню трея: `Open SketchForge`, `Check for Updates`, `Quit SketchForge`, tooltip `SketchForge`.
- Диалоги: `SketchForge updates`, `SketchForge is up to date.`, `Could not check for updates`,
  `Could not update SketchForge`, `SketchForge could not start`, заголовки messageBox.
- Строки обновления (tooltip `downloading update {percent}%`, `{version} ready to install`).

## Подход
1. В начале файла завести объект-карту, например:
   ```js
   const STRINGS = {
     ru: { open: "Открыть SketchForge", checkUpdates: "Проверить обновления", quit: "Выйти", ... },
     en: { open: "Open SketchForge", checkUpdates: "Check for Updates", quit: "Quit SketchForge", ... },
   };
   const isRu = (app.getLocale() || "").toLowerCase().startsWith("ru");
   const t = STRINGS[isRu ? "ru" : "en"];
   ```
2. Заменить все видимые литералы на `t.xxx`. Плейсхолдеры делать через функцию-шаблон или
   простую замену (`t.trayDownloading.replace("{percent}", p)`), если нужно.

## Правила (RULES.md)
- Не менять логику обновления/трея/окон; только тексты.
- Не трогать идентификаторы IPC (`sketchforge:*`), имена событий.
- Сохранить английский вариант в `en` (не удалять).

## Проверка
- `node -c "apps/desktop/main.cjs"` (синтаксис CommonJS) — без ошибок.

## Ключи
Не пишутся в `keys/*.json` (перевод локальный в main.cjs).

## Отчёт
Список заменённых строк, подтверждение, что логика не задета.
