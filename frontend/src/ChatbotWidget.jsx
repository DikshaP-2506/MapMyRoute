import React from "react";

function ChatbotWidget() {
  const openChatbot = () => {
    window.open(
      "https://landbot.online/v3/H-3022502-8EU14B8QYAUP44MI/index.html",
      "_blank",
      "noopener,noreferrer,width=400,height=600"
    );
  };

  return (
    <button
      onClick={openChatbot}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: "#14b8a6",
        color: "#fff",
        border: "none",
        borderRadius: "50%",
        width: 60,
        height: 60,
        boxShadow: "0 2px 12px #14b8a622",
        fontSize: "2rem",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      title="Chat with us"
    >
      💬
    </button>
  );
}

export default ChatbotWidget; 