import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  pending?: boolean;
}

interface ChatStore {
  messages: ChatMessage[];
  inputValue: string;
  isStreaming: boolean;

  setInputValue: (value: string) => void;
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, content: string) => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
}

let msgCounter = 0;

export const useChatStore = create<ChatStore>((set) => ({
  messages: [{
    id: 'welcome',
    role: 'assistant',
    content: "I'm your AI assistant. I can help you mix, edit, and produce music. Try asking me to mute a track, set the tempo, or add a new track.",
    timestamp: Date.now(),
  }],
  inputValue: '',
  isStreaming: false,

  setInputValue: (value) => set({ inputValue: value }),
  addMessage: (msg) => {
    const id = `msg-${++msgCounter}-${Date.now()}`;
    set((s) => ({
      messages: [...s.messages, { ...msg, id, timestamp: Date.now() }],
    }));
    return id;
  },
  updateMessage: (id, content) => set((s) => ({
    messages: s.messages.map((m) => m.id === id ? { ...m, content, pending: false } : m),
  })),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  clearMessages: () => set({ messages: [] }),
}));
