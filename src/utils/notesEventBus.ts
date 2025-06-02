import mitt from 'mitt';

// Типизация событий
export type NotesEvents = {
  reset: void;
  noteUpdated: { id: string; timestamp: number };
  notesChanged: void;
};

const notesEventBus = mitt<NotesEvents>();
export default notesEventBus;