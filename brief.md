# Бриф: Новый главный экран Tofu FSM (4 зоны)

## Описание

Переписать главный экран дашборда (`/dashboard`) в Tofu Dispatch по новой структуре **Action → Operations → Money → Proof**. Экран становится общим для Tofu FSM (полной платформы), а не только для модуля Dispatch: показывает операционку (визиты, эстимейты, инвойсы) + доказывает уникальную ценность Dispatch (эскалации, reminders, переводы).

Источник ТЗ: `/Users/tatyana_k/Projects/BOOST/.claude/skills/expert-analysis/analysis-results.md`

Текущий дашборд (`src/app/(app)/dashboard/page.tsx`) показывает 4 stats-карточки + escalations + таблицу сегодняшних визитов. Этого мало и он не отвечает JTBD-критерию К7 «сводка за 10 секунд» и не даёт proof of Big Job.

## Итоговая структура экрана (сверху вниз)

1. **Header** — «Good morning, James» + дата + 1 строка сводки
2. **ЗОНА 1 — Needs Your Attention** — единая лента действий (aggregator)
3. **ЗОНА 2 — Today** — summary + таблица сегодняшних визитов + бейдж «tomorrow» + ссылка на неделю
4. **ЗОНА 3 — Money** — exception-based блок эстимейтов и инвойсов (если всё ок — схлопывается)
5. **ЗОНА 4 — Tofu worked for you today** — 4 метрики Big Job proof + % team on Worker app
6. **FAB [+ New Job]** — плавающая кнопка справа снизу, открывает модалку создания джобы

## Требования по зонам

### ЗОНА 1 — Needs Your Attention

Aggregator-лента карточек из 4 источников. Сортировка по приоритету (сначала эскалации Dispatch, потом overdue инвойсы, потом стрелочные эстимейты, потом готовые-к-инвойсу джобы).

**Источники:**
- **[Dispatch] Эскалации** — уже есть: `escalations.status='pending'`, поля `esc_type` (`no_response`, `delay`, `overrun`), `description`, worker
  - Кнопки: Call, Message, Dismiss (уже реализованы)
- **[Invoices] Overdue > 14 дней** — `invoices` where `status='unpaid'` and `due_date < NOW() - 14 days`
  - Карточка: «Invoice #123 — Emily Johnson — $450 overdue 18 days»
  - Кнопки: View, Send reminder
- **[Estimates] Застрявшие > 5 дней** — `estimates` where `status='sent'` and `sent_at < NOW() - 5 days`
  - Карточка: «Estimate #045 — Robert Chen — $2,400 — sent 7 days ago, no response»
  - Кнопки: Follow up, View
- **[Jobs] Готовые к инвойсу** — `jobs` where `status='completed'` AND нет связанного `invoice`
  - Карточка: «2 completed jobs ready to invoice — Linda Marsh, Tom Wilson»
  - Кнопки: Create invoice

**Empty state:** Если все 4 источника пустые — показать: «You're all caught up. Nice.» на тёплом фоне.

**Визуал:** карточки в стопке, тёплый фон `#f2ede6`, 1-2 кнопки действия в каждой.

### ЗОНА 2 — Today

**Summary-строка:** `8 visits today · 6 confirmed · 1 overdue` (под заголовком зоны).

**Таблица визитов на сегодня** — переиспользовать существующую вёрстку из текущего дашборда (колонки: Time, Worker, Client, Address, Type, Status, кнопка Chat).

**Строка под таблицей:**
- Бейдж: `+ Tomorrow: 7 visits, 1 unassigned` (если на завтра есть визиты без worker_id — показать count)
- Ссылка: `This week: 23 visits →` (ведёт на `/jobs?range=week`)

**Если визитов на сегодня нет** (empty state):
- Показать: «No visits today. 3 estimates awaiting client response — Dispatch can send a follow-up.» с кнопкой Follow up.

### ЗОНА 3 — Money (exception-based)

**Показывать зону только если есть хоть одна exception-цифра** (unpaid инвойсы > 0 ИЛИ эстимейты waiting > 0). Иначе — скрыть всю зону полностью.

**Два подблока рядом (2 колонки):**

**Estimates**
- `3 awaiting client · $4,500 total · oldest 7 days old`
- Ссылка «View estimates →»

**Invoices**
- `5 unpaid · $3,200 total` + если есть overdue: `2 overdue · $1,240`
- Ссылка «View invoices →»

**Формат:** сумма + возраст + действие (а не «количество в статусе»). Менеджера волнуют $ под риском.

### ЗОНА 4 — Tofu worked for you today (Big Job proof)

Блок с 4 метриками + процентом команды в Worker app.

**Метрики (за сегодня):**
- **Reminders sent** — `COUNT(messages WHERE msg_type='reminder' AND DATE(created_at)=today)`
- **Confirmations collected** — `COUNT(messages WHERE direction='inbound' AND msg_type='chat' AND DATE(created_at)=today)`
- **Translations done** — `COUNT(messages WHERE content_translated IS NOT NULL AND DATE(created_at)=today)`
- **Minutes saved** — расчётно: `reminders*3 + translations*2 + confirmations*1` (округлить до 10)

**Дополнительно:**
- `% team on Worker app` — добавить столбец `on_worker_app BOOLEAN` в `workers`, сидить рандомом (80% true). Считать: `(COUNT workers WHERE on_worker_app=true AND status='active') / COUNT(active workers) * 100`.

**Визуал:** 4 кубика-метрики (как существующие stats-карточки), под ними 1 строка-прогрессбар «Team on Worker app: 80% (4 of 5)».

**Заголовок зоны:** «Tofu worked for you today» (fixed string, не динамический).

### FAB [+ New Job]

Плавающая кнопка справа внизу экрана (`position: fixed; bottom: 32px; right: 32px;`).

**При клике:**
- Открывает модальное окно поверх дашборда (backdrop + центрированная карточка)
- Форма полей:
  - Worker (select из активных работников)
  - Client name (input)
  - Address (input)
  - Scheduled at (datetime-local input)
  - Estimated duration min (number, default 60)
  - Job type (input, default "General")
  - Instructions (textarea, optional)
- Кнопки: Cancel / Create
- При сабмите — POST на `/api/jobs` с этими полями, status всегда `'scheduled'`
- После успеха — закрыть модалку, `router.refresh()` чтобы обновить дашборд

**Стиль FAB:** тёмный круг 56×56 px, иконка `+`, тень. На hover — чуть темнее.

## Технические требования

### Новые таблицы БД

В `src/lib/db.ts` в `initDb()` добавить:

```sql
CREATE TABLE IF NOT EXISTS estimates (
  id SERIAL PRIMARY KEY,
  client_name TEXT NOT NULL,
  address TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',  -- draft | sent | accepted | rejected
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  job_id INTEGER REFERENCES jobs(id),
  client_name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',  -- unpaid | paid
  due_date TEXT NOT NULL,       -- ISO date
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
);

ALTER TABLE workers ADD COLUMN IF NOT EXISTS on_worker_app BOOLEAN NOT NULL DEFAULT true;
```

### Seed

В `seedIfEmpty()`:
- Добавить seed для `estimates` — создать 5-8 штук со статусами: 1 draft, 3 sent (с разным возрастом, 2 из них старше 5 дней), 1 accepted, 1 rejected. Суммы $500-$5000.
- Добавить seed для `invoices` — 6-10 штук: 2 paid, 5 unpaid (с разным due_date, 2 из них overdue > 14 дней), привязать к части completed jobs (чтобы в Needs Attention были «completed без invoice» ≈ 2 штуки).
- Обновить seed `workers` — 4 из 5 с `on_worker_app=true`, 1 с `false`.

### Новые API endpoints

**`POST /api/jobs`** — создание новой джобы (файл: `src/app/api/jobs/route.ts`).
- Body: `{ worker_id, client_name, address, scheduled_at, estimated_duration, job_type, instructions }`
- Валидация: все обязательные поля есть, `worker_id` — число, `scheduled_at` — валидная ISO, `estimated_duration` — число 15-600.
- Вставить в `jobs` со `status='scheduled'`.
- Возвращает: `{ ok: true, job: {...} }` или `400` при ошибке валидации.

### Вёрстка главного экрана

`src/app/(app)/dashboard/page.tsx` полностью переписать. Структура:

```
<div max-width 1100>
  <Header />
  <NeedsAttention />       // server component
  <Today />                // server component
  <Money />                // server component (conditional)
  <TofuWorkedForYou />     // server component
</div>
<FabNewJob />              // client component
```

Все компоненты — inline в `page.tsx`, НЕ выносить в отдельные файлы, кроме `FabNewJob` (это client component, должен быть отдельным файлом `src/components/FabNewJob.tsx`).

### Стиль

- Палитра: `#1a1a18` (чёрный), `#eeece8` (светлая граница), `#f6f5f3` (фон карточки), `#f2ede6` (attention-фон), `#555550` (тёмно-серый), `#999990` (серый), `#faf9f7` (чередование строк).
- Inline styles (как в текущем коде).
- Никакого Tailwind.
- Шрифт — наследуется, размеры как в существующем коде (13-26 px).

### Ограничения

- **Не добавлять npm-пакеты.**
- **Не ломать существующие страницы** (`/jobs`, `/workers`, `/chat`) — они тестируются отдельно.
- **БД на Railway** — менять локальный `data/dispatch.db` бессмысленно. После мержа кода `seedIfEmpty()` отработает только если таблицы ПУСТЫЕ. Значит, чтобы на Railway появились `estimates`/`invoices` — либо (а) применить схемные изменения отдельно, либо (б) вставлять seed-строки через отдельный endpoint/скрипт. **Упростим: добавить endpoint `POST /api/seed-fsm`** (только при `process.env.ALLOW_SEED === '1'`), который проверяет пустоту новых таблиц и сидит их. Пользователь вызовет его руками.
- Timezone: все вычисления «сегодня» идут по UTC (как в существующем коде).
- Авторизация: все новые роуты автоматически защищены middleware через cookie `access=granted`. Не дублировать.
- SQL — только параметризованный.
- Nested file reads: перед правкой — всегда `Read` актуального содержимого.
- Следовать `AGENTS.md`: нестандартный Next.js, при сомнениях смотреть `node_modules/next/dist/docs/`.

## Ожидаемый результат

1. Экран `/dashboard` показывает 4 зоны в правильном порядке и структуре.
2. Needs Your Attention собирает данные из 4 источников с правильными кнопками; empty state работает.
3. Today показывает summary-строку + таблицу + бейдж-завтра + ссылку-неделю.
4. Money зона скрывается, если нет unpaid инвойсов/waiting эстимейтов.
5. Tofu worked for you today показывает 4 метрики + % team on Worker app.
6. FAB открывает модалку, создание джобы работает, после создания джоба появляется в Today.
7. `npm run build` проходит без TypeScript-ошибок.
8. Никаких ошибок в консоли браузера.

---

# UX-правки v2 (апрель 2026)

Экран уже реализован по спецификации выше. Нужно внести 8 правок по результатам UX-анализа (источник: `.claude/skills/expert-analysis/analysis-results.md`). Цель — чтобы экран реально отвечал JTBD К7 «сводка за 10 секунд».

Работы ведутся ТОЛЬКО в `product-mvp/` (Next.js приложение).

## ЗАДАЧА 1 — Единый скор приоритета в Needs Your Attention (HIGH)

**Проблема:** сейчас сортировка фиксирована: эскалации → invoices → estimates → jobs. Овердью-invoice на $5000 25 дней оказывается ниже свежей эскалации «worker delayed 10 min». Нужен единый скор по срочности × деньгам.

**Что сделать:**
- Собрать все 4 источника в один массив `attentionItems` до рендера.
- Для каждого item вычислить `priorityScore = urgencyScore × moneyFactor`, где:
  - **Эскалация:** urgency 100 если `esc_type='no_response'`, 80 если `overrun`, 60 если `delay`. moneyFactor = 1.
  - **Overdue invoice:** urgency = `min(100, daysOverdue * 3)`. moneyFactor = `1 + min(2, amount_cents / 100000)` (1 при $0, 2 при $1000, 3 при $2000+).
  - **Stuck estimate:** urgency = `min(70, daysAgo * 5)`. moneyFactor = тот же.
  - **Jobs ready to invoice:** urgency = 30 × количество (но общий карточка одна). moneyFactor = 1.
- Отсортировать массив `attentionItems` по `priorityScore DESC`, отрендерить в одном цикле.
- Рендер каждого типа — оставить как сейчас (карточки визуально одинаковые по стилю, разные по содержимому).

**Где правим:** `src/app/(app)/dashboard/page.tsx` — заменить 4 отдельных `.map()` в зоне Attention на один.

## ЗАДАЧА 2 — 2-колоночная раскладка (HIGH)

**Проблема:** сейчас 4 зоны друг под другом = длинный вертикальный скролл. «10-секундная сводка» не помещается в первый экран.

**Что сделать:**
- На десктопе (min-width: 1024px): раскладка в 2 колонки внутри `max-width: 1280` (не 1100 как сейчас).
  - Левая колонка (~62% ширины): Header + Needs Your Attention + Today.
  - Правая колонка (~38%, sticky top): Money (если показывается) + «Automation — today».
- На мобильном и планшете до 1024px: всё в одну колонку как сейчас (просто stack).
- Использовать `display: grid` + `grid-template-columns` с `@media` через inline CSS невозможно — добавить `<style jsx global>` либо простую утилитарную вставку `<style>` в page.tsx с медиа-запросами. Выбрать простейший вариант, работающий в текущем Next.js (смотреть `node_modules/next/dist/docs/` если нужно).

**Где правим:** `src/app/(app)/dashboard/page.tsx`.

## ЗАДАЧА 3 — Переименование и переработка зоны 4 (HIGH)

**Проблема:** заголовок «Tofu worked for you today» — маркетинг, не операционная информация. Метрики одиночные, без сравнения — непонятно, хорошо это или плохо. Формула «Minutes saved» непрозрачна.

**Что сделать:**
- Переименовать заголовок зоны с `Tofu worked for you today` → `Automation — today`.
- Рядом с каждой из 4 метрик показать delta к вчерашнему дню (↑12 / ↓3 / —). Для этого:
  - Добавить 4 SQL-запроса в тот же `Promise.all`, считающие те же метрики за вчера (DATE(created_at::timestamptz) = ((NOW() AT TIME ZONE 'UTC')::date - INTERVAL '1 day')).
  - Minutes saved yesterday — считать по тем же данным тем же алгоритмом.
  - Показывать `value` + мелкой строкой под лейблом: `vs 42 yesterday (↑5)`. Цвет delta: положительный — `#1a1a18`, отрицательный — `#7f1d1d`, ноль — `#999990`.
- К метрике «Minutes saved» добавить тултип (`title=` HTML-атрибут достаточно): `Reminders×3 + Translations×2 + Confirmations×1, rounded to 5 min`.

**Где правим:** `src/app/(app)/dashboard/page.tsx` — зона 4 + SQL-батч наверху.

## ЗАДАЧА 4 — Акцент на сигнал в summary-строках (MEDIUM)

**Проблема:** «8 visits today · 6 confirmed · 1 overdue» — все три факта равнозначны. Но только `1 overdue` требует действия.

**Что сделать:**
- В Header summary-строке (`{confirmedCount} of ... confirmed today · {attentionCount} item(s) need attention`):
  - Если `attentionCount > 0` — слова «X items need attention» завернуть в `<span>` с `color: #7f1d1d; font-weight: 600`. Если `attentionCount === 0` — вся строка светло-серая (`#999990`), текст «Nothing needs attention».
- В summary-строке зоны Today (`{n} visits today · {c} confirmed · {o} overdue`):
  - `{o} overdue` с `color: #7f1d1d; font-weight: 600`, если `o > 0`.
- В «Tomorrow» бейдже: если `tomorrowUnassigned > 0` — цифра `{n} unassigned` красно-коричневая (`#7f1d1d`, bold); иначе бейдж как сейчас.

**Где правим:** `src/app/(app)/dashboard/page.tsx`.

## ЗАДАЧА 5 — Primary «+ New Job» в header + FAB как вторичный (MEDIUM)

**Проблема:** FAB — мобильная конвенция. Менеджеры SaaS (Jobber, ServiceTitan) ищут кнопку в header.

**Что сделать:**
- В `<Header>` дашборда справа от заголовка «Good morning, James» добавить primary-кнопку `+ New Job` (стиль `btnDark`, padding чуть больше: `9px 18px`).
- Кнопка должна открывать ту же модалку, что и FAB. Для этого: вынести state модалки из `FabNewJob` в отдельный client-компонент `NewJobButton.tsx`, или сделать новый компонент `HeaderNewJobButton.tsx`, открывающий ту же модалку (модалку тоже вынести в отдельный компонент `NewJobModal.tsx`, если это упрощает).
- FAB оставить в правом нижнем углу, но уменьшить визуально: 48×48 вместо 56×56, полупрозрачный hover.
- Обе кнопки ведут к ОДНОЙ модалке и одному POST-запросу — дублирования логики быть не должно.

**Где правим:** `src/app/(app)/dashboard/page.tsx` (header), `src/components/FabNewJob.tsx` (рефактор). Возможно создание `src/components/NewJobModal.tsx`.

## ЗАДАЧА 6 — Loading, error и stale-state (MEDIUM)

**Проблема:** нет visible loading/error/stale state. Если SQL-батч медленный — видна пустая страница. Если запрос упал — молчаливый пустой экран.

**Что сделать:**
- Создать `src/app/(app)/dashboard/loading.tsx` — skeleton: header-заглушка, 2-3 серые карточки в зоне Attention, скелет-таблица на 4 строки, 4 серых кубика. Стиль — `#eeece8` фоны, `@keyframes pulse` опциональный.
- Создать `src/app/(app)/dashboard/error.tsx` (client component с `"use client"`) — показывает «Couldn't load dashboard data. Try refreshing.» + кнопка `reset()`.
- В Header справа от даты добавить маленький timestamp: `Updated just now` (ISO-время сервера), шрифт 11px, цвет `#999990`. Без client-js: просто `new Date().toISOString()` в момент рендера, формат `HH:mm UTC`.

**Где правим:** новые файлы `loading.tsx` и `error.tsx` в папке дашборда + небольшая правка Header в `page.tsx`.

## ЗАДАЧА 7 — Человекочитаемые формулировки эскалаций (LOW)

**Проблема:** в карточке эскалации показывается `esc_type` через `StatusBadge` — техничные лейблы типа `no_response`. Описание (`e.description`) уже человечное, но бейдж рядом — технический.

**Что сделать:**
- Добавить функцию `humanizeEscType(esc_type: string): string` в `page.tsx`:
  - `no_response` → `Not responding`
  - `delay` → `Running late`
  - `overrun` → `Over time`
  - fallback → `esc_type`
- В `<StatusBadge status={e.esc_type} />` заменить на собственный бейдж с человеческим текстом, сохранив цветовой стиль текущего StatusBadge для этих статусов (прочитать StatusBadge и воспроизвести стили, либо расширить StatusBadge маппингом label — предпочтительнее).
- Если `StatusBadge` легко расширить (добавить внутри него маппинг), правка локальная — сделать там.

**Где правим:** `src/components/StatusBadge.tsx` — если можно расширить, либо правка в `page.tsx`.

## ЗАДАЧА 8 — Responsive до планшета (LOW)

**Проблема:** менеджеры часто смотрят дашборд с планшета в поле. Сейчас много фиксированных `gridTemplateColumns`, которые ломают раскладку на узких экранах.

**Что сделать:**
- Таблица визитов на сегодня (`gridTemplateColumns: '80px 170px 120px 1fr 110px 100px 60px'`): добавить медиа-запрос, на ширине <768px — показывать карточки-строки (flex-column) вместо grid-таблицы. Содержимое то же.
- Зона 4 (`gridTemplateColumns: 'repeat(4, 1fr)'`): на <640px — `repeat(2, 1fr)` (2 ряда по 2).
- Зона Money (`gridTemplateColumns: '1fr 1fr'`): на <768px — `1fr` (один под другим).
- Header: на <640px — primary-кнопка «+ New Job» уходит на вторую строку.
- Все медиа-запросы — через тот же механизм, что выбран в Задаче 2 (style jsx global или inline style-tag).

**Где правим:** `src/app/(app)/dashboard/page.tsx`.

## Общие правила для всех задач

- **Не ломать существующее поведение** — эскалации dismiss, FAB-модалка, ссылки — должны продолжать работать.
- **Не добавлять npm-пакеты.**
- **Не менять схему БД** (все поля уже есть).
- **Inline styles** — остаются основным способом стилизации. Для медиа-запросов допустим один блок `<style>` или `<style jsx global>` в page.tsx, если без него никак.
- **Перед правкой — `Read` актуального содержимого файла.**
- **Читать `AGENTS.md`** — Next.js здесь нестандартный, при сомнениях смотреть `node_modules/next/dist/docs/`.
- **После каждой задачи:**
  - Проверить `npm run build` — ошибок TypeScript нет.
  - Запустить `npm run dev` и проверить вручную в браузере (если UI-задача).

## Приоритеты

HIGH — задачи 1, 2, 3 (самое важное для цели «10 секунд»).
MEDIUM — задачи 4, 5, 6.
LOW — задачи 7, 8.

Если время ограничено — делать в порядке приоритета. Каждая задача самодостаточна и может быть отгружена отдельным коммитом.
