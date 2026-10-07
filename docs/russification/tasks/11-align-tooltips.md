# Задача 11 — tooltip рукояток выравнивания

## Цель
Перевести всплывающие подсказки (`title`/`aria-label`) рукояток выравнивания
(`AlignOverlay`). Сейчас они жёстко заданы английским в модульной функции
`alignmentStatuses`.

Ключи уже добавлены в каталоги: `alignHandles.front/back`, `editor.alignTo`,
`editor.alreadyAlignedTo` — **ключи не создавать, только править код**.

## Файлы
1. `apps/web/src/types/sketchforge.ts` — тип `AlignHandleStatus`.
2. `apps/web/src/components/SketchForgeEditor.tsx` — `alignmentStatuses`.
3. `apps/web/src/components/workplane/ActionOverlays.tsx` — `AlignOverlay`.

## Шаги

### 1. Тип (sketchforge.ts, строка ~98)
В `AlignHandleStatus` заменить поле `title: string;` на:
```ts
labelKey: string;
```
(поле `aligned` оставить — оно уже есть).

### 2. `alignmentStatuses` (SketchForgeEditor.tsx, строки 2801–2834)
Сейчас возвращает:
```ts
const label = alignmentLabel(axis, target);
return { axis, target, aligned, disabled: !wouldMove,
  title: aligned ? `Already aligned ${label}` : `Align ${label}` };
```
Заменить на (без `label` переменной):
```ts
return { axis, target, aligned, disabled: !wouldMove,
  labelKey: `alignHandles.${alignmentLabel(axis, target)}` };
```
`alignmentLabel` возвращает `left/right/center/front/back/middle/bottom/top` — все эти
ключи есть в namespace `alignHandles` (в т.ч. добавленные `front`/`back`).

### 3. `AlignOverlay` (ActionOverlays.tsx, строки 26–63)
Сейчас `const t = useTranslations("align");` (скоуп `align`). Для заголовка нужны ключи
из `editor` и `alignHandles`, поэтому добавить два переводчика:
```ts
const te = useTranslations("editor");
const rt = useTranslations();
```
Внутри `overlay.handles.map((handle) => ...)` вычислить заголовок и использовать его в
`aria-label` и `title`:
```tsx
{overlay.handles.map((handle) => {
  const title = te(handle.aligned ? "alreadyAlignedTo" : "alignTo", { label: rt(handle.labelKey) });
  return (
    <button
      ...
      aria-label={title}
      title={title}
      ...
    />
  );
})}
```
(тело колбэка `map` сделать с `{ return (...) }`). Остальную логику `onClick`/`onFocus`
не менять. `MirrorOverlay` и его `handle.title` НЕ трогать.

## Проверка
```
node "D:\scetch\SketchForge-3D\node_modules\typescript\bin\tsc" -p "apps/web/tsconfig.json" --noEmit
```
Должно быть 0 ошибок (в т.ч. нет обращений к удалённому полю `.title` для
`AlignHandleStatus`).

## Отчёт (≤ 10 строк)
Файлы, что изменено, результат tsc.
