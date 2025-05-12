# 🔐 Biometric Key Vault

Это веб-приложение на Node.js с использованием PostgreSQL и Prisma ORM, запускаемое через Docker Compose. Приложение автоматически применяет миграции перед запуском и использует оптимизированную многоступенчатую сборку.

---

## 🔧 Быстрый старт

> Убедитесь, что у вас установлен [Docker](https://www.docker.com/products/docker-desktop/) и [Docker Compose](https://docs.docker.com/compose/install/)

```bash
git clone https://github.com/Kasso4ka/biometric-key-vault
cd biometric-key-vault
docker compose up --build
```

Приложение будет доступно по адресу: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Разработка (dev-режим)

Для запуска проекта локально вне Docker выполните следующие шаги:

### 1. Клонируйте репозиторий

```bash
git clone https://github.com/Kasso4ka/biometric-key-vault
cd biometric-key-vault
```

### 2. Запустите PostgreSQL через Docker

```bash
docker run --name bkv-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=mydb -p 5432:5432 -d postgres:15-alpine
```

> 💡 Убедитесь, что порт 5432 свободен.

### 3. Создайте файл `.env`

Создайте файл `.env` в корне проекта со следующим содержимым:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb?schema=public
```

### 4. Установите зависимости

```bash
pnpm install
```

### 5. Сгенерируйте Prisma клиент

```bash
pnpm prisma generate
```

### 6. Примените миграции

```bash
pnpm prisma migrate deploy
```

### 7. Запустите dev-сервер

```bash
pnpm dev
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

---

## 📂 Сборка образа

Образ собирается в несколько этапов:

1. `deps`: установка зависимостей и генерация Prisma клиента
2. `builder`: сборка приложения
3. `runner`: минимальный образ для запуска приложения Next.JS
