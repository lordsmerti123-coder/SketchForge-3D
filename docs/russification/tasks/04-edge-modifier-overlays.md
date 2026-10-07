# Задача 04 — Русификация панели фаски/скругления и overlay-компонентов

## Цель
Перевести панель работы с рёбрами (fillet/chamfer) и overlay-слои поверх сцены.

## Файлы
- `apps/web/src/components/workplane/EdgeModifierPanel.tsx`
- `apps/web/src/components/workplane/ActionOverlays.tsx`
- `apps/web/src/components/workplane/TransformOverlay.tsx`
- `apps/web/src/components/workplane/MoveDimensionOverlay.tsx`
- `apps/web/src/components/SketchRevolvePreview.tsx`
- Новые ключи — `docs/russification/keys/04-keys.json`.

## Namespace (максимум переиспользования)
- `edgeModifier.*` — уже 30 ключей в `en.json` (Fillet edges, All sharp edges, Clear,
  Radius, Distance, Angle, Sharp-edge threshold, Preview quality, Draft/Standard/Fine,
  Apply, Cancel, Select tangent chains, Keep edge size when resizing…). Проверь `en.json`
  и используй их вместо новых.
- `transforms.*` (Rotate, Movement dimensions, X/Y/Z movement, Alignment/Mirror handles).
- `alignHandles.*` (Left/Center/Right/Top/Middle/Bottom).
- Новые ключи только если нужного смысла нет.

## Правила (RULES.md)
- Панель фаски содержит значения (радиус/угол/качество) — переводить только подписи, не
  значения и не логику сравнений.
- Не трогать идентификаторы типов рёбер/качества.

## Вывод ключей
`docs/russification/keys/04-keys.json` (только новые).

## Проверка
- `node "node_modules\typescript\bin\tsc" -p "apps/web/tsconfig.json" --noEmit` — без ошибок.

## Отчёт
Файлы, число замен, новые ключи, пропущенное и почему.
