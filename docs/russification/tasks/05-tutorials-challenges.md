# Задача 05 — Русификация туториалов и дашборда заданий

## Цель
Перевести обучающие панели (Key Tag, Nameplate) и экран заданий (Challenges).

## Файлы
- `apps/web/src/components/workplane/KeyTagTutorialPanel.tsx`
- `apps/web/src/components/workplane/NameplateTutorialPanel.tsx`
- `apps/web/src/components/official/ChallengesDashboard.tsx`
- Новые ключи — `docs/russification/keys/05-keys.json`.

## Namespace (максимум переиспользования)
- `tutorial.*` — в `en.json` уже есть развёрнутый контент шагов:
  `keyTagSteps.*`, `nameplateSteps.*`, `step`, `previous`, `next`, `finish`, `beforeYouStart`,
  `requiredDimensions`, `expandInstructions`, `minimizeInstructions` и т.п.
- `challenges.*` — `skillsUsed`, `startChallenge`, `keyTag`, `nameplate`, `challenge1/2`,
  описания.
- Проверь `en.json` и подключи существующие ключи; новые добавляй только для отсутствующего.

## Правила (RULES.md)
- Тексты шагов длинные — переводить целиком, сохраняя разметку/эмодзи-маркеры, если есть.
- Не переводить идентификаторы заданий (`keyTag`, `nameplate`) и ключи challenge-типов.

## Вывод ключей
`docs/russification/keys/05-keys.json` (только новые; если туториальный контент уже покрыт
существующими ключами — файл может остаться пустым `{}`, это нормально).

## Проверка
- `node "node_modules\typescript\bin\tsc" -p "apps/web/tsconfig.json" --noEmit` — без ошибок.

## Отчёт
Файлы, число замен, новые ключи, пропущенное и почему.
