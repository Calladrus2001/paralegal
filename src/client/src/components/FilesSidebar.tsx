import React, { useEffect, useRef } from "react";
import {
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  UploadCloud,
  FileBox,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "../store";
import { fetchChatFiles, toggleSidebar } from "../store/slices/filesSlice";
import { openUploadModal } from "../store/slices/uploadSlice";
import { showToast } from "../store/slices/toastSlice";

export const FilesSidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeChatId = useAppSelector((state) => state.chat.activeChatId);
  const { files, isSidebarOpen, isFetching } = useAppSelector((state) => state.files);
  const prevFilesRef = useRef(files);

  useEffect(() => {
    if (activeChatId) {
      dispatch(fetchChatFiles(activeChatId));
    }
  }, [dispatch, activeChatId]);

  useEffect(() => {
    if (!activeChatId) return;

    const hasProcessingFiles = files.some((f) => f.status === "PROCESSING");
    if (!hasProcessingFiles) return;

    const interval = setInterval(() => {
      dispatch(fetchChatFiles(activeChatId));
    }, 2000);

    return () => clearInterval(interval);
  }, [dispatch, activeChatId, files]);

  useEffect(() => {
    files.forEach((file) => {
      const prevFile = prevFilesRef.current.find((f) => f.fileId === file.fileId);
      if (prevFile && prevFile.status === "PROCESSING" && file.status === "PROCESSED") {
        dispatch(
          showToast({
            message: `"${file.fileName}" is processed and ready for questions!`,
            type: "success",
          })
        );
      } else if (prevFile && prevFile.status === "PROCESSING" && file.status === "ERROR") {
        dispatch(
          showToast({
            message: `Failed to process "${file.fileName}": ${file.errorMessage || "Unknown error"}`,
            type: "error",
          })
        );
      }
    });
    prevFilesRef.current = files;
  }, [files, dispatch]);

  if (!activeChatId) {
    return null;
  }

  return (
    <>
      {/* Collapsed Toggle Button (visible when sidebar is closed) */}
      {!isSidebarOpen && (
        <div className="flex items-center pl-2 pr-1 py-3 bg-editorial-sidebar border-r border-editorial-border z-10">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-1.5 rounded-lg text-editorial-muted hover:text-editorial-text hover:bg-editorial-hover transition-colors cursor-pointer"
            title="Expand Documents Panel"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Files Sidebar Drawer */}
      <aside
        className={`bg-editorial-sidebar border-r border-editorial-border flex flex-col transition-all duration-200 z-10 select-none ${
          isSidebarOpen ? "w-64 min-w-[16rem]" : "w-0 min-w-0 border-r-0 hidden"
        }`}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-editorial-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileBox className="w-4 h-4 text-editorial-text" />
            <span className="text-xs font-semibold text-editorial-text uppercase tracking-wider">
              Documents
            </span>
            {files.length > 0 && (
              <span className="text-[10px] font-semibold bg-stone-200 text-stone-700 px-1.5 py-0.5 rounded-full">
                {files.length}
              </span>
            )}
          </div>
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-1 rounded-md text-editorial-faint hover:text-editorial-text hover:bg-editorial-hover transition-colors cursor-pointer"
            title="Collapse Documents Panel"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {files.length === 0 ? (
            <div className="p-4 text-center text-editorial-muted text-xs">
              <FileText className="w-8 h-8 mx-auto mb-2 text-editorial-faint stroke-1" />
              <p className="font-medium text-stone-700 m-0">No documents attached</p>
              <p className="text-[11px] text-editorial-faint m-0 mt-1">
                Upload a PDF to analyze clauses and risks
              </p>
            </div>
          ) : (
            files.map((file) => {
              return (
                <div
                  key={file.fileId}
                  className="p-2.5 rounded-lg border border-editorial-border bg-editorial-bg hover:bg-editorial-hover transition-colors group flex items-start gap-2.5"
                >
                  {/* Status Badge */}
                  <div className="mt-0.5 flex-shrink-0">
                    {file.status === "PROCESSED" && (
                      <span title="Processed & Indexed">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </span>
                    )}
                    {file.status === "PROCESSING" && (
                      <span title="Processing & Indexing vectors...">
                        <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
                      </span>
                    )}
                    {file.status === "ERROR" && (
                      <span title={file.errorMessage || "Processing failed"}>
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      </span>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-medium text-editorial-text truncate m-0"
                      title={file.fileName}
                    >
                      {file.fileName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-editorial-muted">
                      {file.status === "PROCESSED" && (
                        <span className="text-emerald-700 font-medium">Ready</span>
                      )}
                      {file.status === "PROCESSING" && (
                        <span className="text-amber-600 font-medium">Indexing...</span>
                      )}
                      {file.status === "ERROR" && (
                        <span className="text-red-600 font-medium truncate" title={file.errorMessage}>
                          Error
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer / CTA */}
        <div className="p-3 border-t border-editorial-border bg-editorial-sidebar">
          <button
            onClick={() => dispatch(openUploadModal())}
            className="w-full btn-secondary text-xs py-2 gap-2 justify-center"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Attach Document</span>
          </button>
        </div>
      </aside>
    </>
  );
};
