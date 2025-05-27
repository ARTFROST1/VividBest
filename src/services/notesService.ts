import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Сервис для работы с заметками (заглушка, позже будет Supabase)
export interface NoteData {
  id: string;
  title: string;
  content: string;
}

const SUPABASE_URL = 'https://fhbzxfwihphbbqymnwfh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoYnp4ZndpaHBoYmJxeW1ud2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MzM5MzksImV4cCI6MjA2MzUwOTkzOX0.-AtEWzpvOC4vwHiuK5TKi99vjbdfKkex8VAwIVqdm68';

// Отключаем realtime для Expo/React Native
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function saveNote(note: NoteData): Promise<void> {
  await supabase.from('notes').upsert({
    id: note.id,
    title: note.title,
    content: note.content,
    updated_at: new Date().toISOString(),
  });
}

export async function loadNote(id: string): Promise<NoteData | null> {
  const { data, error } = await supabase.from('notes').select('id, title, content').eq('id', id).single();
  if (error || !data) return null;
  return {
    id: data.id,
    title: data.title,
    content: data.content,
  };
}

export async function uploadNoteImage(uri: string, userId: string): Promise<string | null> {
  try {
    // Получаем расширение файла
    const ext = uri.split('.').pop();
    const fileName = `note-image-${Date.now()}.${ext}`;
    // Получаем содержимое файла как blob
    const response = await fetch(uri);
    const blob = await response.blob();
    // Загружаем в Supabase Storage (bucket: 'attachments')
    const { data, error } = await supabase.storage.from('attachments').upload(`${userId}/${fileName}`, blob, {
      cacheControl: '3600',
      upsert: true,
      contentType: blob.type,
    });
    if (error) return null;
    // Получаем публичную ссылку
    const { data: publicData } = supabase.storage.from('attachments').getPublicUrl(`${userId}/${fileName}`);
    return publicData?.publicUrl || null;
  } catch (e) {
    return null;
  }
}

export async function saveNoteLocal(note: NoteData): Promise<void> {
  await AsyncStorage.setItem(`note_${note.id}`, JSON.stringify(note));
}

export async function loadNoteLocal(id: string): Promise<NoteData | null> {
  const raw = await AsyncStorage.getItem(`note_${id}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
} 