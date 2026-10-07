# Задача 08 — Сборка каталога переводов (merge keys)

## Цель
Собрать все новые ключи из `docs/russification/keys/*.json` в
`apps/web/src/i18n/messages/en.json` и `apps/web/src/i18n/messages/ru.json`.

## Зависимость
Запускать после задач 02–06.

## Файлы (только эти)
- `apps/web/src/i18n/messages/en.json`
- `apps/web/src/i18n/messages/ru.json`
- (читать, не менять) `docs/russification/keys/02-keys.json` … `06-keys.json`.

## Алгоритм
1. Для каждого `keys/0X-keys.json`:
   - для каждого `namespace.key` добавить в `en.json` запись `en`, в `ru.json` запись `ru`.
2. Если ключ **уже существует** в `en.json`:
   - сравнить текст; если совпадает — пропустить; если отличается — это конфликт,
     **не затирать молча**, записать в отчёт (на каком ключе расхождение).
3. Вложенность: ключи вида `namespace.key` в JSON лежат вложенно
   (`"namespace": { "key": "..." }`). Соблюдать существующую структуру файла.
4. Сохранить валидный JSON (без trailing comma, корректные кавычки/экранирование).

## Проверка
- Валидность JSON:
  ```powershell
  Get-Content apps/web/src/i18n/messages/en.json -Raw | ConvertFrom-Json
  Get-Content apps/web/src/i18n/messages/ru.json -Raw | ConvertFrom-Json
  ```
- `node "node_modules\typescript\bin\tsc" -p "apps/web/tsconfig.json" --noEmit` — без ошибок.
- Убедиться, что пары `en`/`ru` имеют одинаковый набор ключей в одном namespace.

## Отчёт
Сколько ключей добавлено, сколько пропущено (совпали), какие конфликты найдены.
