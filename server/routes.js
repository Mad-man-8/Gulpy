import { Router } from 'express';
import path from 'path';

const router = Router();

// Route for /chat
router.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/chat/index.html'));
});

export default router;
