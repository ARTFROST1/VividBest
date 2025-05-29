import mitt from 'mitt';

// Типизация событий
export type NotesEvents = {
  reset: void;
};

const notesEventBus = mitt<NotesEvents>();
export default notesEventBus; 