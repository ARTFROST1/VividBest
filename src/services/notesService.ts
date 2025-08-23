import AsyncStorage from '@react-native-async-storage/async-storage';

// Локальный сервис для работы с заметками (без синхронизации)
export interface NoteData {
  id: string;
  title: string;
  content: string;
  timestamp?: number; // Время создания/изменения заметки
  mediaAttachments?: Array<{
    id: string;
    uri: string;
    width: number;
    height: number;
    x: number;
    y: number;
    type?: 'image' | 'audio';
    name?: string;
    duration?: number;
  }>;
}

// Локальная заглушка для загрузки изображений (без Supabase)
export async function uploadNoteImage(uri: string, userId: string): Promise<string | null> {
  // Просто возвращаем исходный URI для локального использования
  return uri;
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