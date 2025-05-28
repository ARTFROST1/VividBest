import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fhbzxfwihphbbqymnwfh.supabase.co'; // <-- Вставьте сюда свой Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoYnp4ZndpaHBoYmJxeW1ud2ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MzM5MzksImV4cCI6MjA2MzUwOTkzOX0.-AtEWzpvOC4vwHiuK5TKi99vjbdfKkex8VAwIVqdm68'; // <-- Вставьте сюда свой Supabase ANON KEY

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY); 