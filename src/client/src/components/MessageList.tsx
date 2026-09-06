import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThumbsUp, ThumbsDown, Copy, Check, Scale, Sparkles, User, Loader2 } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { useFeedback } from "../hooks/useFeedback";
import { InlineFeedbackBox } from "./InlineFeedbackBox";

const SAMPLE_PROMPTS = [
  "Summarize the key liabilities and indemnity clauses",
  "Are there any non-compete or non-solicitation restrictions?",
  "What are the termination conditions and notice periods?",
  "Does this agreement contain any governing law or arbitration clauses?",
];

export const MessageList: React.FC = () => {
  const { messages, activeChat, isSendingQuery: isSending, isFetchingMessages, sendMessage } = useChat();
  const {
    activeResponseId: activeFeedbackResponseId,
    submissionStatus: feedbackStatusMap,
    isSubmitting: isSubmittingFeedback,
    thumbsUp: onThumbsUp,
    toggleFeedback: onToggleFeedback,
    submitFeedback: onSubmitFeedback,
  } = useFeedback();

  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending, activeFeedbackResponseId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isFetchingMessages && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-editorial-muted text-xs">
        <div className="flex items-center gap-2 bg-editorial-surface px-4 py-2 rounded-xl border border-editorial-border shadow-xs">
          <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
          <span>Loading consultation history...</span>
        </div>
      </div>
    );
  }

  if (!activeChat && messages.length === 0 && !isSending) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
        <div className="card-editorial max-w-md w-full p-8 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-editorial-primary text-editorial-primary-fg flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Scale className="w-6 h-6" />
          </div>

          <h3 className="text-base font-semibold text-editorial-text m-0 mb-1">
            New Consultation
          </h3>

          <p className="text-xs text-editorial-muted m-0 mb-6 leading-relaxed">
            Ask targeted questions or upload PDF documents to analyze liabilities,
            compliance risks, and obligations.
          </p>

          <div className="space-y-2 text-left">
            <div className="text-[11px] font-bold uppercase tracking-wider text-editorial-faint mb-1">
              Sample Inquiries
            </div>
            {SAMPLE_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => sendMessage(prompt)}
                className="w-full p-2.5 bg-editorial-bg hover:bg-editorial-hover border border-editorial-border hover:border-editorial-border-strong rounded-lg text-xs text-stone-700 transition-all duration-150 flex items-center justify-between cursor-pointer group text-left"
              >
                <span className="truncate">{prompt}</span>
                <Sparkles className="w-3 h-3 text-editorial-faint group-hover:text-editorial-text flex-shrink-0 ml-2" />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {messages.map((message) => {
          const isFeedbackOpen = activeFeedbackResponseId === message.responseId;
          const feedbackStatus = feedbackStatusMap[message.responseId];
          const isPendingBubble = message.response === "" && isSending;

          return (
            <div
              key={message.responseId || message.createdAt}
              className="space-y-4 animate-in fade-in duration-200"
            >
              <div className="flex items-start justify-end gap-3">
                <div className="max-w-xl p-3.5 bg-editorial-primary text-editorial-primary-fg rounded-2xl rounded-tr-xs shadow-xs text-xs leading-relaxed break-words">
                  {message.query}
                </div>
                <div className="w-7 h-7 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center flex-shrink-0 text-xs font-semibold">
                  <User className="w-3.5 h-3.5" />
                </div>
              </div>

              {isPendingBubble ? (
                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-editorial-primary text-editorial-primary-fg flex items-center justify-center flex-shrink-0 text-xs font-semibold shadow-xs">
                    <Scale className="w-3.5 h-3.5" />
                  </div>
                  <div className="card-editorial px-5 py-4 rounded-2xl rounded-tl-xs shadow-xs text-xs text-editorial-muted flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-editorial-primary animate-pulse"></span>
                    <span className="w-2 h-2 rounded-full bg-editorial-primary animate-pulse delay-75"></span>
                    <span className="w-2 h-2 rounded-full bg-editorial-primary animate-pulse delay-150"></span>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-editorial-primary text-editorial-primary-fg flex items-center justify-center flex-shrink-0 text-xs font-semibold shadow-xs">
                    <Scale className="w-3.5 h-3.5" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="card-editorial p-5 rounded-2xl rounded-tl-xs shadow-xs text-xs leading-relaxed space-y-3">
                      <div className="prose prose-xs max-w-none text-editorial-text leading-relaxed font-serif">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {message.response}
                        </ReactMarkdown>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs">
                      {message.isFeedbackApplicable && (
                        <>
                          {feedbackStatus ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                              <Check className="w-3 h-3" />
                              Feedback recorded
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => onThumbsUp(message.responseId)}
                                title="Accurate and helpful"
                                className="btn-ghost p-1.5 gap-1 hover:text-emerald-700"
                              >
                                <ThumbsUp className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Accurate</span>
                              </button>

                              <button
                                onClick={() => onToggleFeedback(message.responseId)}
                                title="Report inaccurate claim or cite correction"
                                className={`btn-ghost p-1.5 gap-1 ${
                                  isFeedbackOpen
                                    ? "text-amber-700 bg-amber-50 border-amber-200"
                                    : "hover:text-amber-700"
                                }`}
                              >
                                <ThumbsDown className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Correct / Dispute</span>
                              </button>
                            </>
                          )}

                          <div className="w-px h-3 bg-editorial-border mx-1" />
                        </>
                      )}

                      <button
                        onClick={() => handleCopy(message.response, message.responseId)}
                        title="Copy response to clipboard"
                        className="btn-ghost p-1.5 gap-1"
                      >
                        {copiedId === message.responseId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[11px] text-emerald-600 font-medium">
                              Copied
                            </span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span className="text-[11px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {isFeedbackOpen && (
                      <InlineFeedbackBox
                        responseId={message.responseId}
                        isSubmitting={isSubmittingFeedback}
                        onSubmit={onSubmitFeedback}
                        onCancel={() => onToggleFeedback(message.responseId)}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
};
