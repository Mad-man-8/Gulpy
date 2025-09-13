import React, { useState } from "react";

const ChatFrame: React.FC = () => {
  const [open, setOpen] = useState(false);

  // Compute transform once
  const iframeTransform = open
    ? "translateY(-50%) translateX(0)"
    : "translateY(-50%) translateX(-100%)";

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          top: "50%",
          left: 0,
          transform: "translateY(-50%)",
          backgroundColor: "purple",
          color: "white",
          padding: "10px 16px",
          borderTopRightRadius: "8px",
          borderBottomRightRadius: "8px",
          fontWeight: "bold",
          cursor: "pointer",
          border: "none",
          zIndex: 1000,
        }}
      >
        Chat
      </button>

      {/* Chat Iframe (always mounted, just hidden via transform) */}
      <iframe
        src="https://chat.gulpies.io"
        title="Gulpies Chat"
        style={{
          position: "fixed",
          top: "50%",
          left: 0,
          transform: iframeTransform,
          width: "340px",
          height: "800px",
          border: "2px solid #7e22ce18",
          borderRadius: "8px",
          zIndex: 999,
          transition: "transform 0.3s ease",
          pointerEvents: open ? "auto" : "none", // prevent clicking when hidden
        }}
      />
    </>
  );
};

export default ChatFrame;
