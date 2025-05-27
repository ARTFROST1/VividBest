import { createClient } from '@supabase/supabase-js';

// Типы задач и напоминаний
export interface TaskData {
  id: string;
  title: string;
  completed: boolean;
  dueDate: string; // YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  repeatInterval: 'none' | 'daily' | 'weekly' | 'monthly';
  reminderTime?: string; // HH:mm
  notificationId?: string;
}

export interface ReminderData {
  id: string;
  taskId: string;
  remindAt: string; // ISO string
  isSent: boolean;
}

// TODO: заменить на реальные ключи
// Временно: чтобы не падало приложение, если переменные окружения не заданы
const supabaseUrl = 'https://fhbzxfwihphbbqymnwfh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoYnp4ZndpaHBoYmJxeW1ud2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MzM5MzksImV4cCI6MjA2MzUwOTkzOX0.-AtEWzpvOC4vwHiuK5TKi99vjbdfKkex8VAwIVqdm68';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const tasksService = {
  async fetchTasks(userId: string): Promise<TaskData[]> {
    // TODO: получить задачи пользователя из Supabase
    return [];
  },
  async createTask(task: TaskData): Promise<TaskData> {
    // TODO: создать задачу в Supabase
    return task;
  },
  async updateTask(task: TaskData): Promise<TaskData> {
    // TODO: обновить задачу в Supabase
    return task;
  },
  async deleteTask(id: string): Promise<void> {
    // TODO: удалить задачу и связанные напоминания из Supabase
    return;
  },
  async fetchReminders(userId: string): Promise<ReminderData[]> {
    // TODO: получить напоминания пользователя из Supabase
    return [];
  },
  async createReminder(reminder: ReminderData): Promise<ReminderData> {
    // TODO: создать напоминание в Supabase
    return reminder;
  },
  async deleteReminder(id: string): Promise<void> {
    // TODO: удалить напоминание из Supabase
    return;
  },
}; 