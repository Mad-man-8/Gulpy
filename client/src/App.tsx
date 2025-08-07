import { useEffect, useRef, useState } from 'react';

type Point = { x: number; y: number };
type Food = { pos: Point; eaten: boolean };
type Bot = {
  pos: Point;
  trail: Point[];
  direction: number;
  speed: number;
  colorHue: number;
  dead: boolean;
};
type Glitter = { pos: Point; colorHue: number };

// Constants

const INITIAL_SNAKE_LENGTH = 300;
const PLAY_AREA_RADIUS = 3000;
const FOOD_COUNT = 1050;
const FOOD_RADIUS = 10;

const getRandomHue = () => Math.floor(Math.random() * 360);

// Helper function to format seconds as MM:SS
const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const App = () => {
  const [score, setScore] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [gameRunning, setGameRunning] = useState(false);

  const startGame = () => {
    setScore(0);
    setElapsedTime(0);
    setGameRunning(true);
  };

  /*const stopGame = () => {
    setGameRunning(false);
  };*/


  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const playerPos = useRef<Point>({ x: 0, y: 0 });
  const mousePos = useRef<Point>({ x: 0, y: 0 });
  const speed = useRef(2);
  const body = useRef<Point[]>([]);
  const glitter = useRef<Glitter[]>([]); // Glitter particles array

  const [fps, setFps] = useState(0);
  const [memMB, setMemMB] = useState<number | null>(null);

  const [food] = useState<Food[]>(() =>
    Array.from({ length: FOOD_COUNT }).map(() => ({
      pos: {
        x: (Math.random() * 2 - 1) * PLAY_AREA_RADIUS,
        y: (Math.random() * 2 - 1) * PLAY_AREA_RADIUS,
      },
      eaten: false,
    }))
  );

  const bots = useRef<Bot[]>(
    Array.from({ length: 100 }).map(() => ({
      pos: {
        x: (Math.random() * 2 - 1) * PLAY_AREA_RADIUS * 0.8,
        y: (Math.random() * 2 - 1) * PLAY_AREA_RADIUS * 0.8,
      },
      trail: [],
      direction: Math.random() * Math.PI * 2,
      speed: 2,
      colorHue: getRandomHue(),
      dead: false,
    }))
  );

  useEffect(() => {
    if (!gameRunning) return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameRunning]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctxRef.current = ctx;
    playerPos.current = { x: canvas.width / 2, y: canvas.height / 2 };

    let frames = 0;
    let lastFpsUpdate = performance.now();



    const update = () => {
      if (!ctxRef.current || !canvasRef.current) return;
      const now = performance.now();
      frames++;
      if (now - lastFpsUpdate > 1000) {
        setFps(frames);
        frames = 0;
        lastFpsUpdate = now;
        if (
          (performance as any).memory &&
          (performance as any).memory.usedJSHeapSize
        ) {
          const used = (performance as any).memory.usedJSHeapSize;
          setMemMB((used / 1024 / 1024).toFixed(2) as unknown as number);
        }
      }

      const ctx = ctxRef.current;
      const { width, height } = canvas;

      // Background + grid
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 2;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Move player
      const dx = mousePos.current.x - width / 2;
      const dy = mousePos.current.y - height / 2;
      const dist = Math.hypot(dx, dy);
      if (dist > 1) {
        const nx = playerPos.current.x + (dx / dist) * speed.current;
        const ny = playerPos.current.y + (dy / dist) * speed.current;
        if (Math.hypot(nx - width / 2, ny - height / 2) < PLAY_AREA_RADIUS) {
          playerPos.current.x = nx;
          playerPos.current.y = ny;
        }
      }

      // Update player trail (fixed length, no growth)
      body.current.unshift({ ...playerPos.current });
      if (body.current.length > INITIAL_SNAKE_LENGTH) {
        body.current.pop();
      }

      // Check food collisions (no growth)
      const headX = body.current[0].x;
      const headY = body.current[0].y;
      food.forEach((f) => {
        if (!f.eaten) {
          if (Math.hypot(f.pos.x - headX, f.pos.y - headY) < FOOD_RADIUS + 25) {
            f.eaten = true;
            setScore((prev) => prev + 10); // ✅ Increase score by 10
            // no growth
          }
        }
      });

      // Player hits bot body → player dies
      const playerHead = body.current[0];
      let playerDied = false;
      for (const bot of bots.current) {
        for (let i = 1; i < bot.trail.length; i++) {
          const segment = bot.trail[i];
          const distance = Math.hypot(playerHead.x - segment.x, playerHead.y - segment.y);
          if (distance < 20) {
            playerDied = true;
            break;
          }
        }
        if (playerDied) break;
      }

      if (playerDied) {
        alert("You died!");
        window.location.reload();
        return;
      }

      // Bot hits player body → bot dies + spawn glitter
      for (const bot of bots.current) {
        if (bot.trail.length === 0) continue;
        const botHead = bot.trail[0];
        for (let i = 1; i < body.current.length; i++) {
          const segment = body.current[i];
          const distance = Math.hypot(botHead.x - segment.x, botHead.y - segment.y);
          if (distance < 20) {
            bot.dead = true;
            // ✅ +50 points when bot dies hitting player
            setScore((prev) => prev + 50);
            // Spawn glitter dust from bot trail
            for (const segment of bot.trail) {
              glitter.current.push({
                pos: { ...segment },
                colorHue: bot.colorHue,
              });
            }

            break;
          }
        }
      }

      // Remove dead bots
      bots.current = bots.current.filter((bot) => !bot.dead);

      // Player eats glitter dust
      glitter.current = glitter.current.filter((dust) => {
        const dist = Math.hypot(playerHead.x - dust.pos.x, playerHead.y - dust.pos.y);
        return dist >= 20; // remove glitter if close to player head
      });

      // Update bots
      bots.current.forEach((bot) => {
        if (Math.random() < 0.01) {
          bot.direction += (Math.random() - 0.5) * (Math.PI / 2);
        }
        const nx = bot.pos.x + Math.cos(bot.direction) * bot.speed;
        const ny = bot.pos.y + Math.sin(bot.direction) * bot.speed;
        if (Math.hypot(nx, ny) < PLAY_AREA_RADIUS + 10) {
          bot.pos.x = nx;
          bot.pos.y = ny;
        } else {
          bot.direction += Math.PI;
        }
        bot.trail.unshift({ ...bot.pos });
        if (bot.trail.length > INITIAL_SNAKE_LENGTH) bot.trail.pop();
      });

      // Draw centered view
      ctx.save();
      ctx.translate(width / 2 - playerPos.current.x, height / 2 - playerPos.current.y);

      // Draw play area circle
      ctx.beginPath();
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 15;
      ctx.arc(width / 2, height / 2, PLAY_AREA_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      // Draw food
      food.forEach((f) => {
        if (!f.eaten) {
          ctx.fillStyle = 'lime';
          ctx.beginPath();
          ctx.arc(f.pos.x, f.pos.y, FOOD_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw glitter dust
      glitter.current.forEach((dust) => {
        ctx.beginPath();
        ctx.arc(dust.pos.x, dust.pos.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${dust.colorHue}, 100%, 70%)`;
        ctx.fill();
      });

      // Draw player snake
      for (let i = 0; i < body.current.length - 1; i++) {
        const p1 = body.current[i];
        const p2 = body.current[i + 1];
        ctx.strokeStyle = `hsl(${(i / INITIAL_SNAKE_LENGTH) * 360},100%,50%)`;
        ctx.lineWidth = 40 * (1 - i / INITIAL_SNAKE_LENGTH);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      // Player head circle
      const head = body.current[0];
      ctx.fillStyle = 'orange';
      ctx.beginPath();
      ctx.arc(head.x, head.y, 25, 0, Math.PI * 2);
      ctx.fill();

      // Draw bots
      bots.current.forEach((bot) => {
        if (bot.dead) return;
        for (let i = 0; i < bot.trail.length - 1; i++) {
          const p1 = bot.trail[i];
          const p2 = bot.trail[i + 1];
          ctx.strokeStyle = `hsl(${bot.colorHue},100%,50%)`;
          ctx.lineWidth = 40 * (1.4 - i / INITIAL_SNAKE_LENGTH);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }
        if (bot.trail.length > 0) {
          const bh = bot.trail[0];
          ctx.fillStyle = `hsl(${bot.colorHue},100%,50%)`;
          ctx.beginPath();
          ctx.arc(bh.x, bh.y, 25, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.restore();

      requestAnimationFrame(update);
    };

    update();
  }, [food]);
  
  // Touch controls
    useEffect(() => {
  const handleTouchMove = (e: TouchEvent) => {
    if (!canvasRef.current) return;

    // Prevent two-finger pinch zoom
    if (e.touches.length > 1) {
      e.preventDefault();
    }

    const rect = canvasRef.current.getBoundingClientRect();

    // First touch controls direction
    const touch = e.touches[0];
    mousePos.current.x = touch.clientX - rect.left;
    mousePos.current.y = touch.clientY - rect.top;
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 1) {
      speed.current = 20; // Accelerate
      e.preventDefault(); // Prevent zoom
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    // If fewer than 2 touches remain, return to normal speed
    if (e.touches.length < 2) {
      speed.current = 10;
    }
  };

  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchstart', handleTouchStart, { passive: false });
  window.addEventListener('touchend', handleTouchEnd, { passive: false });

  return () => {
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchend', handleTouchEnd);
  };
}, []);


  // Mouse tracking
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mousePos.current.x = e.clientX - rect.left;
      mousePos.current.y = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', handle);
    return () => window.removeEventListener('mousemove', handle);
  }, []);

  // Click acceleration
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

  return (
    <>
      <canvas ref={canvasRef} className="w-full h-full fixed top-0 left-0" />
      <div
        style={{
          position: 'fixed',
          bottom: 10,
          left: 10,
          backgroundColor: 'rgba(0,0,0,0.6)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: 8,
          fontFamily: 'monospace',
          fontSize: 14,
          zIndex: 10,
        }}
      ><button
    onClick={startGame}
    style={{
      padding: '4px 8px',
      fontSize: 14,
      cursor: 'pointer',
      borderRadius: 4,
      border: 'none',
      backgroundColor: '#28a745',
      color: 'white',
    }}
  >
    Start Timer
  </button> <br />
        Elapsed time: {formatTime(elapsedTime)} <br />
        Score: {score} <br />
        FPS: {fps} <br />
        Memory: {memMB !== null ? `${memMB} MB` : 'N/A'}
      </div>
    </>
  );
};

export default App;
