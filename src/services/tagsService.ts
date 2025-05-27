import { Tag } from '../hooks/useTags';

// Заглушки для будущей интеграции с Supabase
export const tagsService = {
  async fetchTags(): Promise<Tag[]> {
    return [];
  },
  async createTag(tag: Tag): Promise<Tag> {
    return tag;
  },
  async deleteTag(id: string): Promise<void> {
    return;
  },
  async updateTag(tag: Tag): Promise<Tag> {
    return tag;
  },
}; 