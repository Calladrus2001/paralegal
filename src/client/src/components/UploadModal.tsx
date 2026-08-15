import React, { useState, useRef } from "react";
import { UploadCloud, FileText, X, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useFileUpload } from "../hooks/useFileUpload";
import { useChat } from "../hooks/useChat";

export const UploadModal: React.FC = () => {
  const {
    isModalOpen: isOpen,
    isUploading,
    uploadError,
    closeModal: onClose,
    uploadFile,
    clearError: onClearError,
  } = useFileUpload();

  const { activeChatId, createChat } = useChat();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedFile(null);
    setClientError(null);
    onClearError();
    onClose();
  };

  const handleFileSelect = (file: File) => {
    setClientError(null);
    onClearError();
    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setClientError("Only PDF documents (.pdf) are supported.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setClientError("File size exceeds the 50MB limit.");
      return;
    }
    setSelectedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isUploading) return;

    const uploaded = await uploadFile(selectedFile, activeChatId || undefined);
    if (uploaded) {
      if (!activeChatId) {
        await createChat(selectedFile.name, uploaded.chatId);
      }
      setSelectedFile(null);
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="card-editorial max-w-lg w-full p-6 shadow-xl relative animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-editorial-border mb-4">
          <div>
            <h3 className="text-sm font-semibold text-editorial-text m-0">
              Attach Legal Document
            </h3>
            <p className="text-xs text-editorial-muted m-0 mt-0.5">
              Upload a PDF contract, brief, or agreement to this consultation
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-editorial-faint hover:text-editorial-text transition-colors p-1 rounded-md cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-150 ${
                dragOver
                  ? "border-editorial-primary bg-editorial-sidebar"
                  : selectedFile
                  ? "border-emerald-300 bg-emerald-50/50"
                  : "border-editorial-border-strong hover:border-editorial-faint bg-editorial-bg"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center">
                  <FileText className="w-9 h-9 text-emerald-600 mb-2" />
                  <span className="font-semibold text-xs text-editorial-text max-w-[320px] truncate">
                    {selectedFile.name}
                  </span>
                  <span className="text-[11px] text-editorial-muted mt-0.5">
                    {formatFileSize(selectedFile.size)}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-700 mt-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready for upload
                  </span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-9 h-9 text-editorial-faint mb-2" />
                  <span className="font-semibold text-xs text-editorial-text">
                    Click to browse or drag and drop
                  </span>
                  <span className="text-[11px] text-editorial-faint mt-1">
                    PDF files only (up to 50MB)
                  </span>
                </>
              )}
            </div>
          </div>

          {(clientError || uploadError) && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{clientError || uploadError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-editorial-border">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="btn-primary gap-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading & Indexing...</span>
                </>
              ) : (
                <span>Upload & Index Document</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
