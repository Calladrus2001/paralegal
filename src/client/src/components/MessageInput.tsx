import React, { useState, useRef, useEffect } from "react";
import { ArrowUp, Paperclip } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { useFileUpload } from "../hooks/useFileUpload";

export const MessageInput: React.FC = () => {
  const { activeChat, isSendingQuery: isSending, sendMessage: onSendMessage } = useChat();
  const { openModal: onOpenUpload } = useFileUpload();

  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSending) return;
    onSendMessage(text);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="p-4 bg-editorial-bg border-t border-editorial-border flex-shrink-0">
      <div className="max-w-3xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-2 p-2.5 bg-editorial-surface border border-editorial-border-strong focus-within:border-editorial-primary focus-within:ring-1 focus-within:ring-editorial-primary rounded-2xl shadow-xs transition-all duration-150"
        >
          <button
            type="button"
            onClick={onOpenUpload}
            title="Attach PDF Document to this Consultation"
            className="p-2 text-editorial-muted hover:text-editorial-text hover:bg-editorial-hover rounded-xl transition-colors cursor-pointer flex-shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeChat
                ? `Ask a question in "${activeChat.chatTitle}"...`
                : "Type a legal question or attach a PDF..."
            }
            disabled={isSending}
            rows={1}
            className="flex-1 max-h-[180px] bg-transparent text-xs text-editorial-text placeholder:text-editorial-faint resize-none focus:outline-hidden py-1 px-1 leading-relaxed"
          />

          <button
            type="submit"
            disabled={!text.trim() || isSending}
            className="w-8 h-8 rounded-xl bg-editorial-primary hover:bg-editorial-primary-hover disabled:bg-editorial-border-strong disabled:cursor-not-allowed text-editorial-primary-fg flex items-center justify-center transition-all duration-150 cursor-pointer flex-shrink-0 shadow-xs"
            aria-label="Send message"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-2 text-center text-[11px] text-editorial-faint">
          Paralegal answers with grounded citations from your uploaded contract. Always
          verify critical legal clauses.
        </div>
      </div>
    </div>
  );
};
