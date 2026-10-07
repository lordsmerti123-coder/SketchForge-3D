# Как устроена русификация SketchForge-3D

Краткая памятка: где лежат переводы, как переименовывать слова (в т.ч. названия фигур)
и что нельзя трогать. Рассчитано на то, что переименование будет делать агент.

---

## 1. Общая схема

- Фреймворк: **next-intl v4** (Next.js 15).
- Каталоги переводов (единственный источник отображаемого текста):
  - `apps/web/src/i18n/messages/en.json`
  - `apps/web/src/i18n/messages/ru.json`
- Оба файла всегда должны быть **в паритете** (одинаковый набор ключей, 1:1).
- Локаль по умолчанию — `ru` (задаётся в `apps/web/src/middleware.ts`,
  `i18n/routing.ts`, `i18n/navigation.ts`).

## 2. Namespace'ы (верхний уровень en.json / ru.json)

`align`, `alignHandles`, `appShell`, `challenges`, `dashboard`, `desktop`,
`edgeModifier`, `editor`, `importExport`, `layout`, `shapes`, `sketchImage`,
`snapGrid`, `theme`, `transforms`, `tutorial`, `units`, `viewport`, `workspaceSettings`.

Каждый namespace — объект `{ ключ: "текст" }`. Вложенность выражается **вложенными
объектами**, НЕ точками в имени ключа.

## 3. Как код достаёт текст

В React-компонентах — хук `useTranslations`:

```ts
const t = useTranslations("editor"); // скоуп "editor" → t("undo") = editor.undo
const rt = useTranslations();        // root-скоуп → rt("shapes.box") = shapes.box
```

Правило скоупа:
- `useTranslations("X")` → `t("foo")` ищет `X.foo`.
- `useTranslations("X")` → `t("shapes.box")` ищет `X.shapes.box` (НЕ root!). Это частая
  ошибка — см. «Подводные камни».
- `useTranslations()` без аргумента → `t("shapes.box")` ищет `shapes.box` (root).

## 4. Названия фигур — как переименовать

**Сначала найди все места, где термин встречается** (не читая код целиком):

```powershell
node docs/russification/find-ui-term.mjs "Коробка"     # ищет по значению в ru/en.json → показывает ключ
node docs/russification/find-ui-term.mjs "shapes.box"  # ищет по полному ключу → где используется в коде
node docs/russification/find-ui-term.mjs "Solid cube"  # ищет по коду (instance-имена и т.п.)
```

Скрипт печатает: точный ключ каталога (где править значение) + все вхождения в `apps/web/src`.
Он же подсвечивает «дубли» термина в других ключах (например, слово встречается и в
`challenges.*` списке навыков, и в `shapes.*`) — такие места легко пропустить.

Отображаемое имя фигуры в меню/инспекторе строится так:

```
kind фигуры (например "box")  →  shapeKindLabelKey(kind)  →  ключ "shapes.box"  →  ru.json → "Коробка"
```

- Маппинг `kind → ключ` находится в `apps/web/src/lib/shapeCatalog.ts`
  (функция `shapeKindLabelKey`, объект `SHAPE_KIND_LABEL_KEYS`).
- Сами тексты — в `ru.json` → namespace `shapes` (и в `en.json`).

### Чтобы переименовать «box» с «Коробка» на «Куб»:

1. Открой `apps/web/src/i18n/messages/ru.json`.
2. В namespace `shapes` поменяй значение: `"box": "Коробка"` → `"box": "Куб"`.
3. Если нужно — так же в `en.json`: `"box": "Box"` → `"box": "Cube"`.
4. **Ключи НЕ менять** (`"box"` остаётся `"box"`). Меняются только значения.
5. Проверка: `node "node_modules\typescript\bin\tsc" -p "apps/web/tsconfig.json" --noEmit`
   (для таких правок не обязателен, но полезен) + обновить страницу.

Полный список `kind` фигур (ключи в `shapes`): `box`, `cylinder`, `sphere`, `cone`,
`pyramid`, `wedge`, `text`, `roundRoof` (он же `roof`), `halfSphere`, `torus`, `tube`,
`gear`, `ring`, `sketch`, `scribble`, `importedMesh`, `imagePlate`.

### Другие labelKey-хелперы (тот же принцип «данные → ключ»)

- `textFontLabelKey(font)` — `lib/shapeCatalog.ts` → ключи `shapes.multilanguage`,
  `shapes.sans`, `shapes.serif`, `shapes.script`, `shapes.monospace`, `shapes.rounded`,
  `shapes.stencil`.
- `exportFormatLabelKey(format)` — `lib/exportNames.ts` → `importExport.stl/obj/step/svg/skf`.
- `importExtensionLabelKey(ext)` — `lib/importExtensions.ts` → `importExport.stl/obj/svg`.

## 5. Что НЕ переводится (хранимые данные/идентификаторы)

Переводится только **отображение**. Не трогать:
- `kind` фигур (`"box"`, `"pyramid"`, …) — это идентификаторы в коде и данных.
- Внутренние значения: шрифты (`Multilanguage`, `Sans`, …), единицы измерения,
  пресеты размеров/сетки, `gearType`, имена SVG/STL/форматов.
- `shape.name` — имя **экземпляра** фигуры (хранится в данных проекта, пользователь
  может переименовать). Для новых фигур это английский дефолт (`"Solid cube"`,
  `"Sketch extrusion"` и т.п.), он НЕ связан с ключом `shapes.*`.

  Если нужно русифицировать дефолтные `name` новых фигур — это отдельная задача
  (правка `toolbarShapeAssets`/`makeShapeFromAsset` в `shapeCatalog.ts` и мест
  создания фигур в `SketchForgeEditor.tsx`), а не правка ru.json.

## 6. Подводные камни (обязательно для агента)

1. **Точки в именах ключей запрещены.** next-intl считает `a.b` вложенностью.
   Ключ вроде `"shared-projects.notFound"` внутри `apiErrors` ломает провайдер
   (`INVALID_KEY`). Правильно — вложенные объекты: `"shared-projects": { "notFound": … }`.
   Скрипт `merge-keys.mjs` теперь пропускает ключи с точкой.
2. **Скоуп и полные ключи.** `useTranslations("editor")` + `t("shapes.box")` даёт
   `editor.shapes.box` (ошибка `MISSING_MESSAGE`). Для полного ключа нужен root-скоуп
   (`useTranslations()`), см. `rt` в `SecondaryToolbar` (SketchForgeEditor.tsx).
3. **Серверные API-ошибки — отдельно.** Роуты `app/api/*` используют НЕ next-intl,
   а `lib/apiMessages.ts` (`getApiMessage(id, locale)`). Переводы API-ошибок лежат там
   (плоские ключи с точкой — это ОК, потому что это не next-intl). В `en.json/ru.json`
   namespace `apiErrors` не нужен и удалён.

## 7. Как новые ключи попадают в каталоги

1. Новые ключи пишутся в `docs/russification/keys/0X-keys.json` в формате:
   `{ "namespace": { "ключ": { "en": "…", "ru": "…" } } }`.
2. Слияние: `node docs/russification/merge-keys.mjs` → добавляет их в `en.json`/`ru.json`
   (сортирует, ведёт счётчики added/conflicts, пропускает точки и пустые).
3. Правила и задания для агентов: `docs/russification/RULES.md`, `tasks/*.md`,
   `.opencode/dispatch.md`.

## 8. Текущий статус и известные хвосты

- Все экраны/тулбары/уведомления переведены; `tsc` без ошибок; `en == ru == 918` ключей.
- Известный баг (на потом): в `ShapeInspector.tsx` (строки ~464–466) используется
  `t("shapes.expand")` / `t("shapes.minimize")`, а в каталоге ключи называются
  `shapes.expandSettings` / `shapes.minimizeSettings` → `MISSING_MESSAGE`. Фикс —
  либо переименовать ключи в коде на `expandSettings`/`minimizeSettings`, либо добавить
  `shapes.expand`/`shapes.minimize` в каталоги.
