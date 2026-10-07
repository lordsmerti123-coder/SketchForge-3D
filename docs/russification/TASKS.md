# Мастер-список задач русификации

Статусы: `[ ]` не начата · `[~]` в работе · `[x]` готова · `[-]` пропущена.

| ID | Задача | Файлы (владение) | Namespace / каталог | Зависит от | Параллельно с | Статус |
|---|---|---|---|---|---|---|
| 01 | Язык по умолчанию `ru` | `middleware.ts`, `i18n/routing.ts`, `i18n/navigation.ts` | — | — | 02–07 | [ ] |
| 02 | Каркас редактора | `components/SketchForgeEditor.tsx` | `editor`, `appShell` | — | 01, 03–07 | [ ] |
| 03 | Сцена + тулбар | `components/WorkplaneViewport.tsx`, `components/SketchWorkspace.tsx` | `viewport` (+ reuse `editor`) | — | 01, 02, 04–07 | [ ] |
| 04 | Фаска/скругление + overlay | `workplane/EdgeModifierPanel.tsx`, `workplane/ActionOverlays.tsx`, `workplane/TransformOverlay.tsx`, `workplane/MoveDimensionOverlay.tsx`, `SketchRevolvePreview.tsx` | reuse `edgeModifier`, `transforms`, `alignHandles` | — | 01, 02, 03, 05–07 | [ ] |
| 05 | Туториалы + задания | `workplane/KeyTagTutorialPanel.tsx`, `workplane/NameplateTutorialPanel.tsx`, `official/ChallengesDashboard.tsx` | reuse `tutorial`, `challenges` | — | 01, 02, 03, 04, 06, 07 | [ ] |
| 06 | Метки данных + ошибки API | `lib/shapeCatalog.ts`, `lib/measurementUnits.ts`, `lib/exportNames.ts`, `lib/importExtensions.ts`, `lib/challenges.ts`, `app/api/*/route.ts` | `importExport`, `apiErrors` (+ reuse `shapes`, `units`) | — | 01, 02, 03, 04, 05, 07 | [ ] |
| 07 | Трей десктопа | `apps/desktop/main.cjs` | локальная карта в main.cjs (не JSON) | — | 01–06 | [ ] |
| 08 | Сборка каталога | `i18n/messages/en.json`, `i18n/messages/ru.json` | — (мёржит `keys/*.json`) | 02–06 | — | [ ] |
| 09 | QA + финальная сборка | всё | — | 01–08 | — | [ ] |

## Кто что делает с JSON

- `en.json`/`ru.json` редактирует **только задача 08**.
- Задачи 02–06 пишут новые ключи в `docs/russification/keys/<id>.json`.
- Задача 08 объединяет их и добавляет недостающие ключи в оба каталога.

## Порядок запуска

1. Запустить 01 + (02–07) — можно параллельно (разные файлы).
2. Дождаться 02–06, запустить 08 (сборка каталога).
3. Запустить 09 (QA) и при необходимости пересобрать десктоп-бандл.
