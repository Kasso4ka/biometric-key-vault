
# 🚀 Проект на Node.js + Prisma + PostgreSQL

Это веб-приложение на Node.js с использованием PostgreSQL и Prisma ORM, запускаемое через Docker Compose. Приложение автоматически применяет миграции перед запуском и использует оптимизированную многоступенчатую сборку.

---

## 📦 Стек технологий

- **Node.js 20 (alpine)**
- **PostgreSQL 15 (alpine)**
- **Prisma ORM**
- **pnpm** для управления зависимостями
- **Docker Compose** для контейнеризации

---

## 🔧 Быстрый старт

> Убедитесь, что у вас установлен [Docker](https://www.docker.com/products/docker-desktop/) и [Docker Compose](https://docs.docker.com/compose/install/)

```bash
git clone https://github.com/your-org/your-project.git
cd your-project
docker compose up --build
```

Приложение будет доступно по адресу: [http://localhost:3000](http://localhost:3000)

---

## 🛠 Структура `docker-compose`

- **`app`** – основной контейнер приложения
- **`migrate`** – отдельный контейнер, применяющий миграции Prisma (`npx prisma migrate deploy`)
- **`db`** – PostgreSQL 15, с `healthcheck` для ожидания готовности

---

## ⚙️ Переменные окружения

В файле `docker-compose.yml` заданы следующие переменные:

- `DATABASE_URL` – строка подключения к PostgreSQL
- `NODE_ENV=production`

---

## 🧰 Полезные команды (локально)

Если вы хотите запускать миграции или работать с Prisma CLI локально:

```bash
# Установка зависимостей
pnpm install

# Генерация Prisma клиента
pnpm prisma generate

# Применение миграций
pnpm prisma migrate deploy

# Запуск dev-сервера (если реализован)
pnpm dev
```

---

## 🗃️ Хранилище данных

PostgreSQL использует именованный volume:

```yaml
volumes:
  postgres_data:
```

Данные сохраняются между перезапусками контейнеров.

---

## 🧪 Healthcheck для PostgreSQL

Контейнер БД ждёт готовности перед запуском других сервисов:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U postgres"]
  interval: 5s
  timeout: 5s
  retries: 5
```

---

## 📂 Сборка образа

Образ собирается в несколько этапов:

1. `deps`: установка зависимостей и генерация Prisma клиента
2. `builder`: сборка приложения
3. `runner`: минимальный образ для запуска

---

## 📃 Лицензия

Этот проект распространяется под лицензией MIT. Подробнее в [LICENSE](./LICENSE) (если добавите).
