// Mock data for testing

export const mockNotes = [
  {
    id: '1',
    title: 'Shopping List',
    content: '- Milk\n- Bread\n- Eggs',
    createdAt: '2025-05-01T10:00:00.000Z',
    updatedAt: '2025-05-01T10:00:00.000Z',
    tags: ['shopping', 'groceries'],
    isPinned: false,
  },
  {
    id: '2',
    title: 'Meeting Notes',
    content: '# Project Meeting\n- Discuss timeline\n- Review tasks\n- Assign responsibilities',
    createdAt: '2025-05-02T14:30:00.000Z',
    updatedAt: '2025-05-02T15:45:00.000Z',
    tags: ['work', 'meeting'],
    isPinned: true,
  },
  {
    id: '3',
    title: 'Ideas',
    content: '1. Mobile app feature\n2. Website redesign\n3. Marketing campaign',
    createdAt: '2025-05-03T09:15:00.000Z',
    updatedAt: '2025-05-03T09:15:00.000Z',
    tags: ['ideas', 'brainstorming'],
    isPinned: false,
  },
];

export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  preferences: {
    theme: 'dark',
    language: 'en',
    notificationsEnabled: true,
  },
};

export const mockTags = [
  { id: '1', name: 'work', color: '#ff5722' },
  { id: '2', name: 'personal', color: '#2196f3' },
  { id: '3', name: 'ideas', color: '#4caf50' },
  { id: '4', name: 'shopping', color: '#9c27b0' },
  { id: '5', name: 'meeting', color: '#ff9800' },
  { id: '6', name: 'groceries', color: '#795548' },
  { id: '7', name: 'brainstorming', color: '#607d8b' },
];