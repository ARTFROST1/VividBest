import mitt from 'mitt';

// Типизация событий
export type NotesEvents = {
  reset: void;
  noteUpdated: { id: string; timestamp: number };
};

const notesEventBus = mitt<NotesEvents>();
export default notesEventBus;