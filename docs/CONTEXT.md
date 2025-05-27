# Обзор приложения

Приложение объединяет функциональность заметок, планировщика задач и напоминаний в одном инструменте для повышения личной продуктивности. Интерфейс вдохновлён стилем **Obsidian** — с поддержкой Markdown, древовидной структурой заметок и гибкими связями между ними. Заметки и задачи можно хранить локально или в облаке, используя привычный формат Markdown.

**Цель:** предоставить пользователю единое пространство для планирования дел и ведения записей, где заметки, списки дел и напоминания тесно интегрированы друг с другом, поддерживая быстрый ввод и удобную навигацию.

---

## Основные возможности

### Экран «Добро пожаловать»
- Приветственный онбординг при первом запуске
- Краткое объяснение возможностей
- Запрос разрешений (уведомления, доступ к хранилищу)
- Настройка первой папки или быстрая задача

### Нижняя навигационная панель
- Три вкладки: **Все заметки**, **Ежедневные задачи**, **Настройки**
- Быстрый доступ к ключевым разделам
- Стилизация под Material You, поддержка светлой/тёмной темы

---

## Раздел «Все заметки»
- **Полнотекстовый поиск** по заголовкам и содержимому
- **Древовидная структура папок** (drag-and-drop для организации)
- **Свайп-действия**: удалить, переместить, закрепить заметку
- **Режимы просмотра**: список и Канбан-доска (колонки по статусу)

---

## Раздел «Ежедневные задачи»
- **Список задач с чекбоксами** (круги выполнения)
- **Прогресс-бар** (линейный или круговой) для отслеживания выполнения
- **Гибкое планирование**: задачи на даты, дни недели, месяцы
- **Приоритеты и метки** (цветовое выделение, сортировка)
- **Повторяющиеся задачи** (ежедневно, еженедельно и т.д.)
- **Уведомления**: обязательные напоминания, гибкая настройка

---

## Раздел «Настройки»
- **Темная/светлая тема** (Material Design)
- **Порядок задач**: сортировка по дате, приоритету, алфавиту, ручная
- **Язык интерфейса**: минимум русский и английский
- **Уведомления**: типы, график «не беспокоить»
- **Параметры редактора**: номера строк, шрифты, автосохранение, шифрование, резервное копирование

---

## Интерфейс заметки
- **Простой редактор**: поле для заголовка и текста
- с панелью форматирования (жирный, курсив, списки, цитаты, код, таблицы)
- **Вложения**: фото, файлы, рисунки
- **Превью ссылок** (автоматическая подгрузка)

---

## Технический стек и архитектура

- **Frontend:** React Native + TypeScript, Expo, Expo Router
- **UI:** React Native Paper (Material Design, Material You)
- **Backend:** Supabase (Postgres, REST/Realtime API, аутентификация, хранение файлов)
- **ИИ:** DeepSeek 2 (анализ задач, генерация, ранжирование)
- **Модульность:** хуки (useNotes, useTasks), сервисы, строго типизированные интерфейсы
- **Тестирование:** Jest, React Native Testing Library, мокирование API, CI/CD (ESLint, StyleLint, автосборка, автотесты)

---

## Вдохновение и источники
- **TechneNotes** — иерархия заметок, drag-and-drop
- **AI-менеджеры задач** — usemotion.com, naumanbodla.com
- **UX-гайды:** Onboarding (toptal.com), табы (docs.expo.dev), Material Design (callstack.github.io)

---

> **Приложение сочетает лучшие практики современных заметочников и менеджеров задач, делая акцент на простоте, гибкости и интеграции ИИ для повышения продуктивности.**

---

## Схема базы данных

```sql
-- Таблица пользователей
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Таблица заметок
CREATE TABLE notes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    parent_id uuid REFERENCES notes(id) ON DELETE SET NULL,
    title text NOT NULL,
    content text,
    is_pinned boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Таблица задач
CREATE TABLE tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    note_id uuid REFERENCES notes(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    due_date date,
    repeat_interval text, -- daily, weekly, monthly
    priority integer DEFAULT 0,
    status text DEFAULT 'pending', -- pending, in_progress, done
    is_recurring boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Таблица меток
CREATE TABLE tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    color text
);

-- Связь заметок/задач с метками
CREATE TABLE note_tags (
    note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
    tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

CREATE TABLE task_tags (
    task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id uuid REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

-- Таблица напоминаний
CREATE TABLE reminders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    task_id uuid REFERENCES tasks(id) ON DELETE CASCADE,
    remind_at timestamp with time zone NOT NULL,
    is_sent boolean DEFAULT false
);

-- Таблица вложений
CREATE TABLE attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
    file_url text NOT NULL,
    file_type text,
    created_at timestamp with time zone DEFAULT now()
);
```

---

## Рекомендуемая структура папок

```
/src
  /components      # Переиспользуемые UI-компоненты
  /screens         # Экраны приложения (Notes, Tasks, Settings и т.д.)
  /navigation      # Навигация (стек, табы)
  /hooks           # Кастомные хуки (useNotes, useTasks и т.д.)
  /services        # Работа с API, Supabase, ИИ
  /context         # React Context для глобального состояния
  /utils           # Утилиты, хелперы
  /assets          # Изображения, иконки, шрифты
  /locales         # Локализация (ru, en)
  /theme           # Темы, стили Material You
  /mocks           # Моки для тестов
/tests             # Интеграционные и unit-тесты
/app.json          # Конфиг Expo
```
