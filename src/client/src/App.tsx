import React from "react";
import { Provider } from "react-redux";
import { store } from "./store";
import { Sidebar } from "./components/Sidebar";
import { MessageList } from "./components/MessageList";
import { MessageInput } from "./components/MessageInput";
import { UploadModal } from "./components/UploadModal";
import { ToastContainer } from "./components/ToastContainer";

const ParalegalApp: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-editorial-bg text-editorial-text relative">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen min-w-0 bg-editorial-bg">
        <MessageList />
        <MessageInput />
      </main>

      <UploadModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <ParalegalApp />
    </Provider>
  );
}
