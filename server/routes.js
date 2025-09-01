import express from "express";

const router = express.Router();

// Example API route
router.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from backend!" });
});

// Add more API routes here
router.get("/api/chat", (req, res) => {
  res.json({ message: "This is the chat API route" });
});

export default router;
