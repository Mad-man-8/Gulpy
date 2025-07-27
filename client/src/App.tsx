import { useEffect, useRef } from 'react';

const SNAKE_LENGTH = 200;
const PLAY_AREA_RADIUS = 3000;

type Point = { x: number; y: number };
type Bot = {
  pos: Point;
  trail: Point[];
  direction: number; // radians
  speed: number;
  colorHue: number; // added random hue for each bot
};

const getRandomHue = () => Math.floor(Math.random() * 360);

const App = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const playerPos = useRef<Point>({ x: 0, y: 0 });
  const mousePos = useRef<Point>({ x: 0, y: 0 });
  const speed = useRef(2);
  const body = useRef<Point[]>([]);

  // Initialize 8 bots with random positions inside the play area and random colors
  const bots = useRef<Bot[]>(
    Array.from({ length: 8 }).map(() => ({
      pos: {
        x: (Math.random() * 2 - 1) * PLAY_AREA_RADIUS * 0.8, // inside 80% radius for safety
        y: (Math.random() * 2 - 1) * PLAY_AREA_RADIUS * 0.8,
      },
      trail: [],
      direction: Math.random() * Math.PI * 2,
      speed: 2,
      colorHue: getRandomHue(),
    }))
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;

    playerPos.current = {
      x: canvas.width / 2,
      y: canvas.height / 2,
    };

    const changeDirectionProbability = 0.01;

    const update = () => {
      if (!ctxRef.current || !canvasRef.current) return;

      const ctx = ctxRef.current;
      const canvas = canvasRef.current;

      // Background with grid
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid
      const gridSize = 40;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 2;

      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Move player toward cursor
      const dx = mousePos.current.x - canvas.width / 2;
      const dy = mousePos.current.y - canvas.height / 2;
      const dist = Math.hypot(dx, dy);

      if (dist > 1) {
        const nextX = playerPos.current.x + (dx / dist) * speed.current;
        const nextY = playerPos.current.y + (dy / dist) * speed.current;

        if (Math.hypot(nextX - canvas.width / 2, nextY - canvas.height / 2) < PLAY_AREA_RADIUS) {
          playerPos.current.x = nextX;
          playerPos.current.y = nextY;
        }
      }

      // Add current position to player snake body
      body.current.unshift({ ...playerPos.current });
      if (body.current.length > SNAKE_LENGTH) {
        body.current.pop();
      }

      // Update bots
      bots.current.forEach(bot => {
        if (Math.random() < changeDirectionProbability) {
          bot.direction += (Math.random() - 0.5) * Math.PI / 2;
        }

        const nextX = bot.pos.x + Math.cos(bot.direction) * bot.speed;
        const nextY = bot.pos.y + Math.sin(bot.direction) * bot.speed;

        // Keep bots inside play area circle (relative to center 0,0)
        if (Math.hypot(nextX, nextY) < PLAY_AREA_RADIUS) {
          bot.pos.x = nextX;
          bot.pos.y = nextY;
        } else {
          bot.direction += Math.PI;
        }

        bot.trail.unshift({ ...bot.pos });
        if (bot.trail.length > SNAKE_LENGTH) {
          bot.trail.pop();
        }
      });

      // Translate so player stays centered on screen
      ctx.save();
      ctx.translate(canvas.width / 2 - playerPos.current.x, canvas.height / 2 - playerPos.current.y);

      // Draw play area border
      ctx.beginPath();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 15;
      ctx.arc(canvas.width / 2, canvas.height / 2, PLAY_AREA_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      // Draw player snake body
      ctx.beginPath();
      for (let i = 0; i < body.current.length - 1; i++) {
        const p1 = body.current[i];
        const p2 = body.current[i + 1];
        ctx.strokeStyle = `hsl(${(i / SNAKE_LENGTH) * 360}, 100%, 50%)`;
        ctx.lineWidth = 40 * (1 - i / SNAKE_LENGTH);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }

      // Draw player head
      const head = body.current[0];
      ctx.fillStyle = 'orange';
      ctx.beginPath();
      ctx.arc(head.x, head.y, 25, 0, Math.PI * 2);
      ctx.fill();

      // Draw bots snakes with their colors
      bots.current.forEach(bot => {
        ctx.beginPath();
        for (let i = 0; i < bot.trail.length - 1; i++) {
          const p1 = bot.trail[i];
          const p2 = bot.trail[i + 1];
          ctx.strokeStyle = `hsl(${bot.colorHue}, 100%, 50%)`;
          ctx.lineWidth = 40 * (1.4 - i / SNAKE_LENGTH);
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();

        // Draw bot head
        if (bot.trail.length > 0) {
          const botHead = bot.trail[0];
          ctx.fillStyle = `hsl(${bot.colorHue}, 100%, 50%)`;
          ctx.beginPath();
          ctx.arc(botHead.x, botHead.y, 25, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();

      requestAnimationFrame(update);
    };

    update();
  }, []);

  // Mouse position tracking
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mousePos.current.x = e.clientX - rect.left;
      mousePos.current.y = e.clientY - rect.top;
    };

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  // Mouse click for acceleration
  useEffect(() => {
    const down = (e: MouseEvent) => {
      if (e.button === 0) speed.current = 5;
    };
    const up = (e: MouseEvent) => {
      if (e.button === 0) speed.current = 2;
    };

    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full fixed top-0 left-0" />;
};

export default App;
