# CoBuy

**Платформа совместных покупок — объединяйтесь и покупайте по групповым ценам.**

![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16.2-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)
![Express](https://img.shields.io/badge/Express-5.2-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)

---

## Оглавление

- [О проекте](#о-проекте)
- [Функционал](#функционал)
- [Технологический стек](#технологический-стек)
- [Установка и запуск](#установка-и-запуск)
- [Автоматические тесты](#автоматические-тесты)
- [Фаззинг-тестирование API](#фаззинг-тестирование-api)
- [Переменные окружения](#переменные-окружения)
- [Структура проекта](#структура-проекта)
- [Демо и скриншоты](#демо-и-скриншоты)
- [Деплой на Render](#деплой-на-render)

---

## О проекте

**CoBuy** — учебный fullstack-проект интернет-магазина формата **совместных закупок**. Пользователи присоединяются к сделке, пока не наберётся минимальное число участников; после закрытия набора оформляют заказ и оплачивают организатору по указанным реквизитам.

|               |                                                                                    |
| ------------- | ---------------------------------------------------------------------------------- |
| **Аудитория** | Участники закупок, организаторы сделок, администраторы платформы                   |
| **Проблема**  | Разрозненные заказы без прозрачного статуса сбора и единого каталога групповых цен |
| **Решение**   | Единый каталог сделок, корзина, личный кабинет, модерация заявок и админ-панель    |

Архитектура: **отдельный Next.js-фронтенд** и **Express REST API** с общей PostgreSQL. Бизнес-логика сосредоточена на бэкенде; фронтенд — App Router и клиентское состояние (localStorage для сессии и корзины).

---

## Функционал

### Пользовательские возможности

- Регистрация и вход (JWT, сессия в браузере)
- Публичный **каталог** с фильтрами: открытые сделки, закрытые группы, выкупленные, «все»
- Карточка сделки: описание, прогресс набора, участники, отзывы, обсуждение
- **Корзина** и **оформление заказа** (доставка, способ оплаты, реквизиты организатора)
- Личный кабинет: профиль, заказы, уведомления, настройки (аватар, реквизиты)
- **Заявка на новую сделку** (модерация администратором)

### Административные возможности

- Панель `/admin`: CRUD товаров/закупок, смена статусов
- Вкладка **заявок на сделки** (одобрение / отклонение)
- Управление пользователями (роль администратора)
- Управление статусами участников (сборка → обработка → доставка → вручен)

### API и интеграции

- REST API с префиксом `/api` (auth, purchases, admin, uploads, notifications)
- Загрузка изображений на сервер (`POST /api/uploads`, раздача `/uploads/*`)
- In-app уведомления при смене статусов и новых заявках

### Автоматизация в бизнес-логике

- Автозакрытие сделки при достижении `min_participants`
- Перевод участников из «Сборка» в «Обработка» после закрытия набора
- Автозавершение сделки, когда всем участникам выставлен статус «Вручен»

---

## Технологический стек

| Категория       | Технологии                                                                   |
| --------------- | ---------------------------------------------------------------------------- |
| **Фронтенд**    | Next.js 16 (App Router), React 19, TypeScript, CSS Modules, axios            |
| **Бэкенд**      | Node.js, Express 5, `pg` (raw SQL), bcryptjs, jsonwebtoken, multer           |
| **База данных** | PostgreSQL 16 (схема через `initDb` при старте API)                          |
| **Деплой**      | Docker Compose (локально), Render / [указать live URL] (прод)                |
| **Инструменты** | pnpm, ESLint (`eslint-config-next`), Jest, Supertest, concurrently, nodemon, скрипты фаззинга |

---

## Установка и запуск

### Требования

- **Node.js** 20+ (в Docker используется 22)
- **pnpm** (рекомендуется) или npm
- **PostgreSQL** 14+ (локально или через Docker)

### 1. Клонирование

```bash
git clone <URL-репозитория>
cd shop
```

### 2. Установка зависимостей

```bash
pnpm install
pnpm --dir frontend install
pnpm --dir backend install
```

### 3. Настройка окружения

Скопируйте пример и отредактируйте `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

Для фронтенда при необходимости создайте `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3020/api
```

### 4. База данных

Создайте БД PostgreSQL и укажите параметры в `backend/.env`. При первом запуске API выполнится `initDb` (таблицы + демо-данные, если каталог пуст).

### 5. Режим разработки

Из **корня** репозитория (фронт `:3000`, API `:3020`):

```bash
pnpm run dev
```

Отдельно:

```bash
pnpm run dev:frontend
pnpm run dev:backend
```

Откройте [http://localhost:3000](http://localhost:3000).

### 6. Production-сборка

```bash
pnpm run build
pnpm run start
```

> `pnpm run start` запускает **собранный** Next.js (`next start`). Перед этим обязательно выполните `pnpm run build`, иначе откроется устаревшая версия UI. API для prod запускайте отдельно: `pnpm --dir backend run start`.

### 7. Docker (весь стек)

```bash
pnpm run docker:up
# или в фоне:
pnpm run docker:up:detached

pnpm run docker:down
```

Порты по умолчанию: фронт **3000**, API **3020**, Postgres **5432**.

### 8. Линтер

```bash
pnpm run lint
```

(ESLint только для `frontend/`.)

### 9. Автоматические тесты

См. также отдельный раздел [Автоматические тесты](#автоматические-тесты) (команды, структура, покрытие).

### Windows

- Используйте **PowerShell** или **Git Bash**.
- В PowerShell вместо `&&` можно писать команды через `;` или запускать скрипты из корня: `pnpm run dev`.
- Пути с кириллицей в каталоге проекта иногда мешают CLI — при ошибках попробуйте клонировать в путь без пробелов и кириллицы.

---

## Автоматические тесты

В проекте настроены **unit-** и **API-тесты** на [Jest](https://jestjs.io/). Для HTTP-проверок бэкенда используется [Supertest](https://github.com/ladjs/supertest). Логика приложения в тестах **не подменяется**: проверяются реальные модули и роуты; база данных **мокается** (`jest.mock` на `config/db`), поэтому PostgreSQL для прогона тестов **не нужен**.

Точка входа продакшн-сервера [`backend/src/server.js`](backend/src/server.js) (`listen`, `initDb`) в тестах **не запускается**. API поднимается через [`backend/tests/helpers/createApp.js`](backend/tests/helpers/createApp.js) — тот же набор роутов `/api`, но без прослушивания порта.

### Запуск

Из **корня** репозитория:

```bash
pnpm test
```

С отчётом о покрытии (порог **100%** по включённым в отчёт файлам):

```bash
pnpm test:coverage
```

Отдельно:

```bash
pnpm --dir backend run test
pnpm --dir backend run test:coverage

pnpm --dir frontend run test
pnpm --dir frontend run test:coverage
```

Отчёты Istanbul: `backend/coverage/`, `frontend/coverage/`.

### Backend

| Каталог / файл | Назначение |
| -------------- | ---------- |
| [`backend/tests/unit/`](backend/tests/unit/) | Unit-тесты: `parsePgIntId`, `participantPreview`, middleware, сервис уведомлений |
| [`backend/tests/api/`](backend/tests/api/) | API-тесты: `auth`, `purchases`, `admin`, `uploads`, `notifications`, `health` |
| [`backend/tests/helpers/createApp.js`](backend/tests/helpers/createApp.js) | Сборка Express-приложения для Supertest |
| [`backend/tests/setup.js`](backend/tests/setup.js) | `NODE_ENV=test`, тестовый `JWT_SECRET` |
| [`backend/tests/setupAfterEnv.js`](backend/tests/setupAfterEnv.js) | Подавление ожидаемого `console.error` в сценариях с ответом 500 |

В **отчёт покрытия** (`collectCoverageFrom` в [`backend/jest.config.js`](backend/jest.config.js)) входят: `src/lib/`, `src/middleware/`, `src/services/notifications.js`, `src/routes/index.js` (health).

Роуты [`purchases.js`](backend/src/routes/purchases.js) и [`admin.js`](backend/src/routes/admin.js) покрыты **интеграционными** тестами в `backend/tests/api/`, но в проценты Istanbul не включены (большой объём веток). Сценарии: каталог, join/leave, статусы, заявки, модерация, загрузки, уведомления.

### Frontend

Тесты лежат рядом с кодом: `frontend/src/**/*.test.ts` (например [`catalogDisplay.test.ts`](frontend/src/lib/catalogDisplay.test.ts), [`cart.test.ts`](frontend/src/lib/cart.test.ts)).

В отчёт покрытия входят: [`auth.ts`](frontend/src/lib/auth.ts), [`api.ts`](frontend/src/lib/api.ts), [`purchasesMeta.ts`](frontend/src/lib/purchasesMeta.ts), [`resolveUploadUrl.ts`](frontend/src/lib/resolveUploadUrl.ts), [`uploadProductImage.ts`](frontend/src/lib/uploadProductImage.ts), [`accountTier.ts`](frontend/src/app/account/accountTier.ts).

Конфиг: [`frontend/jest.config.js`](frontend/jest.config.js) (Next.js через `next/jest`, окружение `jsdom`).

### Примечания

- При прогоне API-тестов намеренно эмулируются сбои БД (ответ **500**). Сообщения `Register error`, `Auth me:` и т.п. в `console.error` — штатное логирование в `catch`, не падение тестов; в прогоне они заглушаются через `setupAfterEnv.js`.
- Фаззинг ([ниже](#фаззинг-тестирование-api)) дополняет Jest: случайные некорректные запросы к **живому** API; unit-тесты работают **без** запущенного сервера.

---

## Фаззинг-тестирование API

Набор скриптов отправляет на работающий backend случайные и некорректные данные (битый JSON, SQL-подобные строки, огромные payload, неверные id, невалидные JWT). Цель — убедиться, что API **не падает с необработанными 500** и корректно отвечает 4xx там, где нужна валидация.

### Предусловия

1. Запущены PostgreSQL и API (`pnpm run dev` или `pnpm run dev:backend`).
2. В `backend/.env` заданы `JWT_SECRET` и параметры БД.
3. Для сценариев admin/auth/purchases нужен пользователь с правами (по умолчанию bootstrap-админ из `ADMIN_EMAIL` / `ADMIN_PASSWORD`).

### Запуск

Из корня:

```bash
pnpm run fuzz
```

Или из `backend/`:

```bash
pnpm run fuzz
```

### Переменные фаззинга

| Переменная           | Описание                                 | По умолчанию            |
| -------------------- | ---------------------------------------- | ----------------------- |
| `FUZZ_BASE_URL`      | URL API без суффикса `/api`              | `http://localhost:3020` |
| `FUZZ_ITERATIONS`    | Итераций на каждый сьют (1–500)          | `15`                    |
| `FUZZ_SEED`          | Seed для воспроизводимости `Math.random` | случайный               |
| `FUZZ_USER_EMAIL`    | Логин для получения JWT                  | `admin@shop.local`      |
| `FUZZ_USER_PASSWORD` | Пароль                                   | `admin123`              |

Пример с увеличенной нагрузкой:

```bash
FUZZ_ITERATIONS=50 FUZZ_SEED=2026 pnpm run fuzz
```

### Сьюты и файлы

| Сьют        | Файл                                                                               | Что проверяет                                       |
| ----------- | ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| `public`    | [`backend/scripts/fuzz/fuzz-public.js`](backend/scripts/fuzz/fuzz-public.js)       | health, каталог, auth register/login, публичные GET |
| `auth`      | [`backend/scripts/fuzz/fuzz-auth.js`](backend/scripts/fuzz/fuzz-auth.js)           | невалидные токены, profile, password, notifications |
| `purchases` | [`backend/scripts/fuzz/fuzz-purchases.js`](backend/scripts/fuzz/fuzz-purchases.js) | submit, join, reviews, discussion                   |
| `admin`     | [`backend/scripts/fuzz/fuzz-admin.js`](backend/scripts/fuzz/fuzz-admin.js)         | admin CRUD, approve/reject (нужен admin JWT)        |

Точка входа: [`backend/scripts/fuzz/run-fuzz.js`](backend/scripts/fuzz/run-fuzz.js).

### Интерпретация результата

- Код выхода **0** — нет ответов HTTP 5xx.
- Код выхода **1** — есть 5xx (см. отчёт в консоли).
- Код выхода **2** — API недоступен (`/api/health`).

Дополняет [автоматические тесты Jest](#автоматические-тесты): фаззинг бьёт по **работающему** API, Jest проверяет логику с моком БД без поднятия сервера.

---

## Переменные окружения

### Backend (`backend/.env`)

| Переменная        | Описание                                     | Пример                    | Обязательно           |
| ----------------- | -------------------------------------------- | ------------------------- | --------------------- |
| `PORT`            | Порт API                                     | `3020`                    | Нет (default `3020`)  |
| `DB_HOST`         | Хост PostgreSQL                              | `localhost`               | Да                    |
| `DB_PORT`         | Порт БД                                      | `5432`                    | Нет                   |
| `DB_NAME`         | Имя БД                                       | `shop_together`           | Да                    |
| `DB_USER`         | Пользователь БД                              | `postgres`                | Да                    |
| `DB_PASSWORD`     | Пароль БД                                    | `***`                     | Да                    |
| `JWT_SECRET`      | Секрет подписи JWT                           | длинная случайная строка  | Да (prod)             |
| `PUBLIC_BASE_URL` | Публичный URL API (для ссылок на `/uploads`) | `https://api.example.com` | Да (prod)             |
| `ADMIN_EMAIL`     | Email bootstrap-админа                       | `admin@shop.local`        | Нет                   |
| `ADMIN_PASSWORD`  | Пароль bootstrap-админа                      | `***`                     | Нет (сменить в prod!) |

Полный пример: [`backend/.env.example`](backend/.env.example).

### Frontend (`frontend/.env.local`)

| Переменная            | Описание        | Пример                      | Обязательно |
| --------------------- | --------------- | --------------------------- | ----------- |
| `NEXT_PUBLIC_API_URL` | Базовый URL API | `http://localhost:3020/api` | Да (prod)   |

### Docker Compose (корень, опционально)

| Переменная                                         | Описание                  | Default                         |
| -------------------------------------------------- | ------------------------- | ------------------------------- |
| `DB_USER`, `DB_PASSWORD`, `DB_NAME`                | Postgres                  | `postgres` / `shopdev` / `shop` |
| `JWT_SECRET`                                       | JWT для backend           | `docker-dev-change-me`          |
| `NEXT_PUBLIC_API_URL`                              | URL API при сборке фронта | `http://localhost:3020/api`     |
| `BACKEND_PORT`, `FRONTEND_PORT`                    | Проброс портов            | `3020`, `3000`                  |
| `PUBLIC_BASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Backend                   | пусто                           |

---

## Структура проекта

```text
shop/
├── package.json              # dev/build/docker/fuzz (корень)
├── docker-compose.yml
├── frontend/
│   ├── src/app/              # страницы Next.js
│   └── src/lib/              # api, auth, cart
├── backend/
│   ├── src/routes/           # REST API
│   ├── src/services/         # initDb, notifications
│   ├── scripts/
│   │   ├── docker-health.js
│   │   └── fuzz/             # фаззинг API
│   │       ├── run-fuzz.js   # точка входа
│   │       ├── fuzz-utils.js
│   │       ├── fuzz-public.js
│   │       ├── fuzz-auth.js
│   │       ├── fuzz-purchases.js
│   │       └── fuzz-admin.js
│   └── uploads/
├── AGENTS.md
└── README.md
```

---

## Демо и скриншоты

|                |                                                                 |
| -------------- | --------------------------------------------------------------- |
| **Live Demo**  | [указать URL фронтенда на Render/Vercel]                        |
| **API Health** | `{API_URL}/api/health` → `{ "message": "Backend is running." }` |

### Как добавить скриншоты

1. Положите изображения в `docs/images/` (например `catalog.png`, `admin.png`).
2. Вставьте в этот раздел:

```markdown
![Каталог](docs/images/catalog.png)
![Админ-панель](docs/images/admin.png)
```

---

## Деплой на Render

1. **PostgreSQL** — отдельный инстанс; `DB_HOST` = hostname вида `dpg-xxxxx`, **не** `postgres`.
2. **Backend** — Web Service, Root: `backend`, Build: `pnpm install --frozen-lockfile`, Start: `node src/server.js`.
3. **Frontend** — Root: `frontend`, `NEXT_PUBLIC_API_URL=https://<ваш-api>/api`.
4. **Картинки:** на Free tier папка `uploads/` сбрасывается при рестарте — нужен Persistent Disk (платно) или внешнее хранилище; старые URL перезалить вручную.

Health check: `/api/health`.

---

<p align="center">
  <sub>CoBuy · Совместные покупки · ИКБО-11-23</sub>
</p>
