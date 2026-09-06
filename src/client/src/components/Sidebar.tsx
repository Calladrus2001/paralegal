import { Plus, Upload, MessageSquare, Scale, Trash2, Sparkles, Zap } from "lucide-react";
import { useAppSelector } from "../store";
import { useChat } from "../hooks/useChat";
import { useFileUpload } from "../hooks/useFileUpload";

export const Sidebar: React.FC = () => {
  const userId = useAppSelector((state) => state.user.userId);
  const { remaining, total, isConnected } = useAppSelector((state) => state.quota);
  const { chats, activeChatId, selectChat, createChat, deleteChat } = useChat();
  const { openModal: onOpenUpload } = useFileUpload();

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMin / 60);

      if (diffMin < 1) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  return (
    <aside className="w-80 h-screen bg-editorial-sidebar border-r border-editorial-border flex flex-col flex-shrink-0 select-none">
      <div className="p-5 border-b border-editorial-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-editorial-primary text-editorial-primary-fg flex items-center justify-center shadow-xs">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-editorial-text m-0 leading-tight">
                PARALEGAL
              </h1>
              <span className="text-[11px] text-editorial-muted font-medium tracking-wide uppercase">
                Legal AI Auditor
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-2.5 bg-editorial-surface rounded-lg border border-editorial-border text-xs">
          <div className="flex items-center justify-between text-editorial-muted mb-1">
            <span className="font-medium text-[11px] uppercase tracking-wider">Active User</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="font-semibold text-editorial-text truncate">{userId}</div>
        </div>

        <div className="mt-2.5 p-2.5 bg-editorial-surface rounded-lg border border-editorial-border text-xs">
          <div className="flex items-center justify-between text-editorial-muted mb-1.5">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-editorial-muted" />
              <span className="font-medium text-[11px] uppercase tracking-wider">Daily Queries</span>
            </div>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <span className="text-sm font-semibold text-editorial-text">
              {remaining !== null ? remaining : "--"}{" "}
              <span className="text-xs font-normal text-editorial-muted">/ {total} remaining</span>
            </span>
            <span className="text-[11px] font-medium text-editorial-muted">
              {remaining !== null ? `${Math.round((remaining / total) * 100)}%` : ""}
            </span>
          </div>

          <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                remaining === null || remaining > 25
                  ? "bg-editorial-primary"
                  : remaining > 10
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{
                width: `${
                  remaining !== null ? Math.min(100, Math.max(0, (remaining / total) * 100)) : 100
                }%`,
              }}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[10px] text-editorial-faint">
            <span>Global daily limit</span>
            <span>Resets 00:00 UTC</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2 border-b border-editorial-border">
        <button
          onClick={() => createChat("New Legal Consultation")}
          className="btn-primary w-full gap-2 py-2.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {!activeChatId && (
          <button
            onClick={onOpenUpload}
            className="btn-secondary w-full gap-2 py-2"
          >
            <Upload className="w-3.5 h-3.5 text-editorial-muted" />
            <span>Upload PDF Document</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-2 py-1.5 text-[11px] font-bold tracking-wider text-editorial-faint uppercase">
          Recent Consultations
        </div>

        {chats.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-editorial-faint">
            <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-40 text-editorial-muted" />
            No previous chats found.
            <div className="mt-1 text-[11px]">Upload a PDF or type a message below</div>
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = chat.chatId === activeChatId;
            return (
              <div
                key={chat.chatId}
                onClick={() => selectChat(chat.chatId)}
                className={`group w-full text-left p-2.5 rounded-lg text-xs transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer ${
                  isActive
                    ? "bg-editorial-surface text-editorial-text font-semibold border border-editorial-border-strong shadow-xs"
                    : "text-stone-600 hover:bg-editorial-sidebar-hover hover:text-editorial-text"
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <MessageSquare
                    className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                      isActive ? "text-editorial-text" : "text-editorial-faint"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs">{chat.chatTitle || "Untitled Consultation"}</div>
                    <div className="text-[11px] text-editorial-faint mt-0.5 font-normal">
                      {formatTime(chat.createdAt)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChat(chat.chatId);
                  }}
                  title="Delete consultation"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-editorial-faint hover:text-red-600 hover:bg-red-50 transition-all duration-150 cursor-pointer flex-shrink-0"
                  aria-label="Delete chat"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-editorial-border text-[11px] text-editorial-faint flex items-center justify-between">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("open-onboarding"))}
          className="hover:text-editorial-text hover:underline transition-colors cursor-pointer"
        >
          Platform Guide
        </button>
      </div>
    </aside>
  );
};
