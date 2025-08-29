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
type Glitter = {
  pos: Point;
  colorHue: number;
  vx: number;
  vy: number;
  alpha: number;
  radius: number;
};
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
  const [showDeathPopup, setShowDeathPopup] = useState(false);
  const joystickTouchId = useRef<number | null>(null);
  const joystick = useRef<{
    origin: Point;
    current: Point;
    active: boolean;
  }>({
    origin: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
    active: false,
  });

  const [score, setScore] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0); // in seconds
  const [gameRunning, setGameRunning] = useState(false);

  const startGame = () => {
    setScore(0);
    setElapsedTime(0);
    setGameRunning(true);
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const playerPos = useRef<Point>({ x: 0, y: 0 });
  const mousePos = useRef<Point>({ x: 0, y: 0 });
  const speed = useRef(2);
  const body = useRef<Point[]>([]);
  const glitter = useRef<Glitter[]>([]); // Glitter particles array

  const [fps, setFps] = useState(0);
  const [ping, setPing] = useState<number | null>(null);
  
//initialise food
      const [food] = useState<Food[]>(() =>
        Array.from({ length: FOOD_COUNT }).map(() => {
          let pos;
          do {
            pos = {
              x: (Math.random() * 2 - 1) * PLAY_AREA_RADIUS,
              y: (Math.random() * 2 - 1) * PLAY_AREA_RADIUS,
            };
          } while (Math.hypot(pos.x, pos.y) > PLAY_AREA_RADIUS - FOOD_RADIUS);
          return { pos, eaten: false };
        })
      );

  const bots = useRef<Bot[]>(
    Array.from({ length: 22 }).map(() => ({
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

  // Track if mobile acceleration is active (second finger down)
  const mobileAccelerating = useRef(false);

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

      // Radial gradient background
      
      if (!ctxRef.current || !canvasRef.current) return;

        const ctx = ctxRef.current;
        const { width, height } = canvasRef.current;

        // Background gradient
        const bgGrad = ctx.createRadialGradient(
          width / 2, height / 2, width * 0.1,
          width / 2, height / 2, width * 0.7
        );
        bgGrad.addColorStop(0, "#232946");
        bgGrad.addColorStop(0.7, "#16161a");
        bgGrad.addColorStop(1, "#0d0d0d");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // FPS + memory tracking
        const now = performance.now();
        frames++;
        if (now - lastFpsUpdate > 1000) {
          setFps(frames);
          frames = 0;
          lastFpsUpdate = now;

        }

        // Grid
        
      

      // Move player (unified for desktop and mobile)
      let moveX = 0, moveY = 0;
      let currentSpeed = mobileAccelerating.current ? 20 : 10;
      //let currentSpeed = speed.current;

      if (joystick.current.active) {
        // Mobile: use joystick direction
        const dx = joystick.current.current.x - joystick.current.origin.x;
        const dy = joystick.current.current.y - joystick.current.origin.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length > 0) {
          const maxDist = 100;
          const normX = (dx / length) * Math.min(length, maxDist) / maxDist;
          const normY = (dy / length) * Math.min(length, maxDist) / maxDist;
          moveX = normX * currentSpeed;
          moveY = normY * currentSpeed;
        }
      } else {
        // Desktop: use mouse position
        const dx = mousePos.current.x - width / 2;
        const dy = mousePos.current.y - height / 2;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          moveX = (dx / dist) * (speed.current);
          moveY = (dy / dist) * (speed.current);
        }
      }

      const nx = playerPos.current.x + moveX;
      const ny = playerPos.current.y + moveY;
            if (Math.hypot(nx, ny) < PLAY_AREA_RADIUS - 20) {
        playerPos.current.x = nx;
        playerPos.current.y = ny;
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
        setShowDeathPopup(true);
        setGameRunning(true);
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
            // ...inside bot death handling...
          for (const segment of bot.trail) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 2;
            glitter.current.push({
              pos: { ...segment },
              colorHue: bot.colorHue,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              alpha: 1,
              radius: 8 + Math.random() * 6,
            });
          }

            break;
          }
        }
      }

      // Bot hits another bot's body → bot dies
      for (let i = 0; i < bots.current.length; i++) {
        const botA = bots.current[i];
        if (botA.dead || botA.trail.length === 0) continue;
        const botAHead = botA.trail[0];
        for (let j = 0; j < bots.current.length; j++) {
          if (i === j) continue; // Don't check self
          const botB = bots.current[j];
          if (botB.dead) continue;
          // Start from 1 to skip botB's head
          for (let k = 1; k < botB.trail.length; k++) {
            const segment = botB.trail[k];
            const distance = Math.hypot(botAHead.x - segment.x, botAHead.y - segment.y);
            if (distance < 20) {
              botA.dead = true;
              // Spawn glitter dust from botA's trail
              for (const seg of botA.trail) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 2;
                glitter.current.push({
                  pos: { ...seg },
                  colorHue: botA.colorHue,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  alpha: 1,
                  radius: 8 + Math.random() * 6,
                });
              }
              break;
            }
          }
          if (botA.dead) break;
        }
      }


      // Respawn dead bots at a random position
      bots.current.forEach((bot) => {
        if (bot.dead) {
          bot.pos = {
            x: (Math.random() * 2 - 1) * PLAY_AREA_RADIUS * 0.8,
            y: (Math.random() * 2 - 1) * PLAY_AREA_RADIUS * 0.8,
          };
          bot.trail = [];
          bot.direction = Math.random() * Math.PI * 2;
          bot.speed = 2;
          bot.colorHue = getRandomHue();
          bot.dead = false;
        }
      });


      // Player eats glitter dust
      glitter.current = glitter.current.filter((dust) => {
        const dist = Math.hypot(playerHead.x - dust.pos.x, playerHead.y - dust.pos.y);
        return dist >= 20; // remove glitter if close to player head
      });

      // Update bots

      bots.current.forEach((bot) => {
        // Calculate vector from bot to player head
      const playerHead = body.current[0];
      const dx = playerHead.x - bot.pos.x;
      const dy = playerHead.y - bot.pos.y;
      const distToPlayer = Math.hypot(dx, dy);

      // If player is within a certain distance, steer away
      if (distToPlayer < 600) { // 600 can be tweaked for "fear" radius
        const angleAway = Math.atan2(bot.pos.y - playerHead.y, bot.pos.x - playerHead.x);
        // Smoothly steer away (lerp direction)
        const angleDiff = ((angleAway - bot.direction + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        bot.direction += angleDiff * 0.75; // 0.15 = steering strength, tweak as needed
      }


        if (Math.random() < 0.01) {
          bot.direction += (Math.random() - 0.5) * (Math.PI / 2);
        }
        const nx = bot.pos.x + Math.cos(bot.direction) * bot.speed;
        const ny = bot.pos.y + Math.sin(bot.direction) * bot.speed;
        if (Math.hypot(nx, ny) < PLAY_AREA_RADIUS - 20) { // -20 for a small margin
          bot.pos.x = nx;
          bot.pos.y = ny;
        } else {
          bot.direction += Math.PI; // bounce back
        }
        bot.trail.unshift({ ...bot.pos });
        if (bot.trail.length > INITIAL_SNAKE_LENGTH) bot.trail.pop();
      });

      // Draw centered view
      ctx.save();
      ctx.translate(width / 2 - playerPos.current.x, height / 2 - playerPos.current.y);

      // Draw play area circle
      ctx.beginPath();
      ctx.strokeStyle = '#00f2ffff';
      ctx.lineWidth = 15;
      ctx.arc(
        width / 2 - 985,   // move left (increase/decrease 50 to taste)
        height / 2 - 525,  // move up
        PLAY_AREA_RADIUS,
        0,
        Math.PI * 2
      );
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
        ctx.save();
        ctx.globalAlpha = dust.alpha;
        ctx.beginPath();
        ctx.arc(dust.pos.x, dust.pos.y, dust.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${dust.colorHue}, 100%, 70%)`;
        ctx.shadowColor = `hsl(${dust.colorHue}, 100%, 80%)`;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
      });

      glitter.current = glitter.current.filter((dust) => {
        // Animate
        dust.pos.x += dust.vx;
        dust.pos.y += dust.vy;
        dust.vx *= 0.96; // friction
        dust.vy *= 0.96;
        dust.radius *= 0.97; // shrink
        dust.alpha -= 0.015; // fade out

        // Remove if invisible or too small
        return dust.alpha > 0.05 && dust.radius > 1;
      });

      // Draw player snake with smooth skin
      for (let i = 0; i < body.current.length; i++) {
        const p = body.current[i];
        // Head is bigger, tail is smaller
        const radius = 25 * (1 - i / INITIAL_SNAKE_LENGTH) + 10;
        // Gradient for shiny effect
        const grad = ctx.createRadialGradient(
          p.x, p.y, radius * 0.2,
          p.x, p.y, radius
        );
        grad.addColorStop(0, 'white');
        grad.addColorStop(0.3, `hsl(${(i / INITIAL_SNAKE_LENGTH) * 360}, 100%, 60%)`);
        grad.addColorStop(1, `hsl(${(i / INITIAL_SNAKE_LENGTH) * 360}, 100%, 40%)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Draw player head outline for clarity
      const head = body.current[0];
      ctx.beginPath();
      ctx.arc(head.x, head.y, 25, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.stroke();

      // Draw bots with smooth skin
      bots.current.forEach((bot) => {
        if (bot.dead) return;
        for (let i = 0; i < bot.trail.length; i+=5) {
          const p = bot.trail[i];
          const radius = 25 * (1 - i / INITIAL_SNAKE_LENGTH) + 10;
          const grad = ctx.createRadialGradient(
            p.x, p.y, radius * 0.2,
            p.x, p.y, radius
          );
          grad.addColorStop(0, 'white');
          grad.addColorStop(0.3, `hsl(${bot.colorHue}, 100%, 60%)`);
          grad.addColorStop(1, `hsl(${bot.colorHue}, 100%, 40%)`);
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.shadowColor = 'rgba(0,0,0,0.3)';
          ctx.shadowBlur = 2;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
        // Bot head outline
        if (bot.trail.length > 0) {
          const bh = bot.trail[0];
          ctx.beginPath();
          ctx.arc(bh.x, bh.y, 25, 0, Math.PI * 2);
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.stroke();
        }
      });

      ctx.restore();

      requestAnimationFrame(update);
    };

    update();
  }, [food]);

  // Touch controls (joystick + acceleration)
  useEffect(() => {
  const handleTouchStart = (e: TouchEvent) => {
    if (joystickTouchId.current === null && e.touches.length >= 1) {
      const touch = e.touches[0];
      joystickTouchId.current = touch.identifier;
      joystick.current.origin = { x: touch.clientX, y: touch.clientY };
      joystick.current.current = { x: touch.clientX, y: touch.clientY };
      joystick.current.active = true;
    }

    if (e.touches.length >= 2) {
      mobileAccelerating.current = true;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!joystick.current.active || joystickTouchId.current === null) return;

    // Find the touch that matches the joystick's touch ID
    const touch = Array.from(e.touches).find(
      t => t.identifier === joystickTouchId.current
    );
    if (touch) {
      joystick.current.current = { x: touch.clientX, y: touch.clientY };
    }

    // Update acceleration based on total fingers
    if (e.touches.length >= 2) {
      mobileAccelerating.current = true;
    } else {
      mobileAccelerating.current = false;
    }

    e.preventDefault();
  };

  const handleTouchEnd = (e: TouchEvent) => {
    // Check if the joystick finger was lifted
    const liftedTouch = Array.from(e.changedTouches).find(
      t => t.identifier === joystickTouchId.current
    );

    if (liftedTouch) {
      joystick.current.active = false;
      joystickTouchId.current = null;
    }

    // Recheck how many fingers remain for acceleration
    if (e.touches.length < 2) {
      mobileAccelerating.current = false;
    }
  };

  window.addEventListener("touchstart", handleTouchStart, { passive: false });
  window.addEventListener("touchmove", handleTouchMove, { passive: false });
  window.addEventListener("touchend", handleTouchEnd, { passive: false });

  return () => {
    window.removeEventListener("touchstart", handleTouchStart);
    window.removeEventListener("touchmove", handleTouchMove);
    window.removeEventListener("touchend", handleTouchEnd);
  };
}, []);

  // Mouse tracking (desktop)
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

  // Click acceleration (desktop)
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

  //get ping latency
      useEffect(() => {
      let interval: any;
      let isMounted = true;

      const pingTest = async () => {
        const start = performance.now();
        try {
          // You can use any lightweight endpoint, here using Google
          await fetch("https://gulpy-delta.vercel.app/", { mode: "no-cors" });
        } catch {}
        const end = performance.now();
        if (isMounted) setPing(Math.round(end - start));
      };

      interval = setInterval(pingTest, 2000); // update ping every 2 seconds
      pingTest();

      return () => {
        isMounted = false;
        clearInterval(interval);
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
        Ping: {ping !== null ? `${ping} ms` : '...'}

      </div>

      {showDeathPopup && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            color: 'white',
            fontSize: 32,
            fontFamily: 'monospace',
          }}
        >
          <div style={{ marginBottom: 24 }}>You died!</div>
          <button
            style={{
              padding: '10px 24px',
              fontSize: 20,
              borderRadius: 8,
              border: 'none',
              background: '#28a745',
              color: 'white',
              cursor: 'pointer',
            }}
            onClick={() => window.location.reload()}
          >
            Restart
          </button>
        </div>
      )}
    </>
  );
};

export default App;