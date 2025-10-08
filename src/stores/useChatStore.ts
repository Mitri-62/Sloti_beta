import { create } from 'zustand';

interface ChatState {
  editingId: string | null;
  editContent: string;
  showEmojiPicker: string | null;
  searchQuery: string;
  error: string | null;
  
  setEditingId: (id: string | null) => void;
  setEditContent: (content: string) => void;
  setShowEmojiPicker: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  editingId: null,
  editContent: '',
  showEmojiPicker: null,
  searchQuery: '',
  error: null,
  
  setEditingId: (id) => set({ editingId: id }),
  setEditContent: (content) => set({ editContent: content }),
  setShowEmojiPicker: (id) => set({ showEmojiPicker: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setError: (error) => set({ error }),
}));