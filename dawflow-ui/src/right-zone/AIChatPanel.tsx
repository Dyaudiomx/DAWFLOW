import React, { useRef, useEffect } from 'react';
import { useChatStore } from '../stores/chat';
import { ipc } from '../services/ipc';
import { useSessionStore } from '../stores/session';
import { useTransportStore } from '../stores/transport';
import styles from './AIChatPanel.module.css';

export const AIChatPanel: React.FC = () => {
  const messages = useChatStore((s) => s.messages);
  const inputValue = useChatStore((s) => s.inputValue);
  const setInputValue = useChatStore((s) => s.setInputValue);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isStreaming) return;

    addMessage({ role: 'user', content: text });
    setInputValue('');
    setStreaming(true);

    const assistantId = addMessage({ role: 'assistant', content: '...', pending: true });

    try {
      const tracks = useSessionStore.getState().tracks;
      const transport = useTransportStore.getState();
      const context = {
        tracks: tracks.map((t) => ({ id: t.id, name: t.name, type: t.type, muted: t.muted, solo: t.solo })),
        playing: transport.playing,
        tempo: transport.tempo,
        position: transport.positionDisplay,
      };

      const result = await ipc.call('daw.ai.chat', { message: text, context });
      const response = typeof result === 'string' ? result
        : (result as Record<string, unknown>).response as string || JSON.stringify(result);
      updateMessage(assistantId, response);
    } catch (e) {
      updateMessage(assistantId, `Sorry, I couldn't process that request. The AI backend may not be configured yet.`);
    } finally {
      setStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>AI Assistant</span>
        <button className={styles.headerBtn} title="Settings">&#9881;</button>
      </div>
      <div className={styles.messages} ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`${styles.message} ${styles[msg.role]}`}>
            <div className={styles.bubble}>
              {msg.pending ? <span className={styles.dots}>&#8226;&#8226;&#8226;</span> : msg.content}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.inputArea}>
        <input
          ref={inputRef}
          className={styles.input}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={isStreaming}
        />
        <button className={styles.sendBtn} onClick={handleSend}
          disabled={isStreaming || !inputValue.trim()}>&#10148;</button>
      </div>
    </div>
  );
};
