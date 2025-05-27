import { useState } from 'react';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export function useTags(initialTags: Tag[] = []) {
  const [tags, setTags] = useState<Tag[]>(initialTags);

  const addTag = (name: string, color: string) => {
    const newTag: Tag = {
      id: Date.now().toString() + Math.random(),
      name,
      color,
    };
    setTags(prev => [...prev, newTag]);
    return newTag;
  };

  const removeTag = (id: string) => {
    setTags(prev => prev.filter(tag => tag.id !== id));
  };

  const updateTag = (id: string, name: string, color: string) => {
    setTags(prev => prev.map(tag => tag.id === id ? { ...tag, name, color } : tag));
  };

  return {
    tags,
    addTag,
    removeTag,
    updateTag,
  };
} 