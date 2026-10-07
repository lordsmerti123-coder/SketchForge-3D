# Задача 10 — фикс `shapes.minimize` + перевод failureNotice

## Цель
1. Исправить видимый баг `MISSING_MESSAGE: shapes.minimize` в инспекторе фигур.
2. Перевести 3 служебных сообщения `failureNotice` (уведомления при булевых операциях).

Ключи уже добавлены в `en.json`/`ru.json` (namespace `editor`) — **ключи не создавать,
только править код**.

## 1. Баг `shapes.minimize` (файл `apps/web/src/components/workplane/ShapeInspector.tsx`)

Строка 466 сейчас:
```tsx
aria-label={minimized ? t("shapes.expand") : t("shapes.minimize")}
```
Ключей `shapes.expand`/`shapes.minimize` нет. Нужные ключи уже существуют в каталоге:
`shapes.expandSettings` и `shapes.minimizeSettings`.

**Фикс (одна строка):**
```tsx
aria-label={minimized ? t("shapes.expandSettings") : t("shapes.minimizeSettings")}
```
Больше ничего в этом файле не менять.

## 2. failureNotice (файл `apps/web/src/components/SketchForgeEditor.tsx`)

Три места возвращают английскую строку, которая затем попадает в `setNotice(...)`:
- строка **4541** — `"Select at least one solid and one hole for Intersection"`
- строка **4577** — `"Could not calculate this Intersection cleanly"`
- строка **5216** — тройной тернарник `"Could not cut this imported mesh cleanly" /
  "Could not cut this selection" / "Could not group this selection"`

Эти хелперы модульные (вне компонента, `t` недоступен), а `failureNotice` также
используется в MCP-ветках. Поэтому используем паттерн «стабильный код → перевод в
компоненте, английский fallback для MCP».

### Шаг A. Модульная мапа английского (добавить рядом с хелперами, например после
`const ALIGN_TARGETS = ["min", "center", "max"];` на строке 2777):

```ts
const FAILURE_NOTICE_EN: Record<string, string> = {
  intersectionNeedSolidAndHole: "Select at least one solid and one hole for Intersection",
  intersectionFailed: "Could not calculate this Intersection cleanly",
  cutImportedFailed: "Could not cut this imported mesh cleanly",
  cutSelectionFailed: "Could not cut this selection",
  groupSelectionFailed: "Could not group this selection",
};
```

### Шаг B. Заменить строки на стабильные коды:
- строка 4541 → `failureNotice: "intersectionNeedSolidAndHole",`
- строка 4577 → `failureNotice: "intersectionFailed",`
- строка 5216 → `failureNotice: hasImportedMesh && hasSolid && hasHole ? "cutImportedFailed" : hasSolid && hasHole ? "cutSelectionFailed" : "groupSelectionFailed",`

(Остальные `failureNotice: ""` — пустые, не трогать.)

### Шаг C. Перевод в точках отображения (внутри компонента, `t` скоуп `editor`):

Добавить локальный хелпер внутри компонента (рядом с `intersectSelected`, например перед
`const groupSelected = useCallback`), типобезопасный (передавать в `t` только литералы):

```ts
const failureNoticeText = (code: string) =>
  code === "intersectionNeedSolidAndHole" ? t("intersectionNeedSolidAndHole")
  : code === "intersectionFailed" ? t("intersectionFailed")
  : code === "cutImportedFailed" ? t("cutImportedFailed")
  : code === "cutSelectionFailed" ? t("cutSelectionFailed")
  : code === "groupSelectionFailed" ? t("groupSelectionFailed")
  : code;
```

- строка **7859** → `setNotice(failureNoticeText(result.failureNotice));`
- строка **7884** → `setNotice(failureNoticeText(result.failureNotice));`

### Шаг D. MCP-ветки — английский fallback (не переводить, не кидать коды наружу):

- строка **8176** → `throw new Error(FAILURE_NOTICE_EN[result.failureNotice] ?? result.failureNotice);`
- строка **8219** → `throw new Error(FAILURE_NOTICE_EN[result.failureNotice] ?? result.failureNotice);`
- строка **8495** → `const noticeText = result.consumed ? "Grouped: hole consumed solid" : (FAILURE_NOTICE_EN[result.failureNotice] ?? result.failureNotice);`
- строка **8505** → `error: result.consumed ? undefined : (FAILURE_NOTICE_EN[result.failureNotice] ?? result.failureNotice),`

## Проверка
```
node "D:\scetch\SketchForge-3D\node_modules\typescript\bin\tsc" -p "apps/web/tsconfig.json" --noEmit
```
Должно быть 0 ошибок.

## Отчёт (≤ 12 строк)
Файлы, сколько строк заменено, результат tsc, что пропущено (если что-то).
