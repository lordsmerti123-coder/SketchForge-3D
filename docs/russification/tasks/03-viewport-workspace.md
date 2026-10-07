# Задача 03 — Русификация сцены и тулбара (Viewport + Workspace)

## Цель
Перевести видимый текст в 3D-сцене и тулбаре рабочей области:
`WorkplaneViewport.tsx` (8 000 строк) и `SketchWorkspace.tsx` (1 360 строк).

## Файлы
- `apps/web/src/components/WorkplaneViewport.tsx`
- `apps/web/src/components/SketchWorkspace.tsx`
- Новые ключи — `docs/russification/keys/03-keys.json`.

## Namespace
- Переиспользовать `editor.*`, `shapes.*`, `transforms.*`, `alignHandles.*` из `en.json`.
- Новые ключи — в новый namespace `viewport` (виды камеры, оси, действия с точками).

## Что переводить
### WorkplaneViewport
- Подписи видов камеры: `FRONT`, `BACK`, `LEFT`, `RIGHT`, `TOP`, `BOTTOM` (кнопки/ярлыки).
- Aria/подписи осей, заголовки viewport, статусы.
- Строки, показываемые пользователю (подсказки, сообщения).
### SketchWorkspace
- Действия с точками: `Corner`, `Smooth`, `Split`, `Make corner`, `Make smooth`,
  `Split handles`, `Properties`, `REVOLVE AXIS`.

## Правила (RULES.md)
- НЕ переводить: размеры сетки, пресеты, единицы, имена фигур как данные.
- Строки-идентификаторы (по которым идёт `===`/`includes`) — не трогать; для отображения
  вводить отдельный переведённый лейбл (паттерн из RULES §1).
- Оба файла — client-компоненты: добавить `useTranslations`.

## Вывод ключей
В `docs/russification/keys/03-keys.json` (формат из RULES.md), namespace `viewport` и
недостающие в reuse-неймспейсах.

## Проверка
- `node "node_modules\typescript\bin\tsc" -p "apps/web/tsconfig.json" --noEmit` — без ошибок.

## Отчёт
Файлы, число замен, новые ключи, пропущенное и почему.
