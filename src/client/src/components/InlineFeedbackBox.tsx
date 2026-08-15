import React, { useState } from "react";
import { AlertTriangle, X, Send } from "lucide-react";
import type { FeedbackType, FeedbackBucket } from "../../../types/feedback";

const FEEDBACK_TYPES: FeedbackType[] = [
  "Factually incorrect",
  "Fabricated information",
  "Irrelevant",
  "Insufficient detail",
  "Partial answer only",
  "Generic / boilerplate",
  "Misinterpreted intent",
];

interface InlineFeedbackBoxProps {
  responseId: string;
  isSubmitting: boolean;
  onSubmit: (data: {
    responseId: string;
    feedbackType: FeedbackType;
    bucket: FeedbackBucket;
    incorrectClaim?: string;
    correctValue?: string;
  }) => void;
  onCancel: () => void;
}

export const InlineFeedbackBox: React.FC<InlineFeedbackBoxProps> = ({
  responseId,
  isSubmitting,
  onSubmit,
  onCancel,
}) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("Factually incorrect");
  const [bucket, setBucket] = useState<FeedbackBucket>("LLM");
  const [incorrectClaim, setIncorrectClaim] = useState("");
  const [correctValue, setCorrectValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const isFactualIssue =
    feedbackType === "Factually incorrect" || feedbackType === "Fabricated information";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isFactualIssue) {
      if (!incorrectClaim.trim()) {
        setValidationError("Please describe what part or claim was incorrect.");
        return;
      }
      if (!correctValue.trim()) {
        setValidationError("Please provide the correct factual value.");
        return;
      }
    }

    setValidationError(null);
    onSubmit({
      responseId,
      feedbackType,
      bucket,
      incorrectClaim: incorrectClaim.trim() || undefined,
      correctValue: correctValue.trim() || undefined,
    });
  };

  return (
    <div className="mt-3 p-4 bg-editorial-bg border border-editorial-border rounded-xl shadow-xs text-xs animate-in fade-in duration-200">
      <div className="flex items-center justify-between pb-2 mb-3 border-b border-editorial-border">
        <div className="flex items-center gap-2 font-semibold text-editorial-text">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Report Response Issue & Suggest Correction</span>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-editorial-faint hover:text-stone-700 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-stone-600 uppercase tracking-wider mb-1">
            Issue Category
          </label>
          <select
            value={feedbackType}
            onChange={(e) => {
              setFeedbackType(e.target.value as FeedbackType);
              setValidationError(null);
            }}
            className="input-editorial"
          >
            {FEEDBACK_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {isFactualIssue ? (
          <>
            <div>
              <label className="block text-[11px] font-semibold text-stone-600 uppercase tracking-wider mb-1">
                Incorrect Claim in AI Answer <span className="text-red-500">*</span>
              </label>
              <textarea
                value={incorrectClaim}
                onChange={(e) => setIncorrectClaim(e.target.value)}
                placeholder="Quote or describe the inaccurate statement made..."
                rows={2}
                className="input-editorial"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-stone-600 uppercase tracking-wider mb-1">
                Correct Value / Truth <span className="text-red-500">*</span>
              </label>
              <textarea
                value={correctValue}
                onChange={(e) => setCorrectValue(e.target.value)}
                placeholder="What is the actual factual information according to the contract?"
                rows={2}
                className="input-editorial"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 uppercase tracking-wider mb-1">
              Details / Explanation (Optional)
            </label>
            <textarea
              value={incorrectClaim}
              onChange={(e) => setIncorrectClaim(e.target.value)}
              placeholder="Why was this answer irrelevant or insufficient?"
              rows={2}
              className="input-editorial"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-editorial-muted font-medium">Audit Pipeline:</span>
            <div className="flex items-center gap-1 bg-editorial-surface p-0.5 rounded-md border border-editorial-border">
              <button
                type="button"
                onClick={() => setBucket("LLM")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                  bucket === "LLM"
                    ? "bg-editorial-primary text-editorial-primary-fg"
                    : "text-editorial-muted hover:text-editorial-text"
                }`}
              >
                Automated Auditor
              </button>
              <button
                type="button"
                onClick={() => setBucket("Human")}
                className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                  bucket === "Human"
                    ? "bg-editorial-primary text-editorial-primary-fg"
                    : "text-editorial-muted hover:text-editorial-text"
                }`}
              >
                Human Queue
              </button>
            </div>
          </div>
        </div>

        {validationError && (
          <div className="text-[11px] font-medium text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
            {validationError}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-editorial-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary gap-1.5"
          >
            {isSubmitting ? (
              <span>Submitting...</span>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Feedback</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
