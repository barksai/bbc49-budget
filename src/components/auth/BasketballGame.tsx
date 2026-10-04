import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw, Trophy, Sparkles } from 'lucide-react';

export const BasketballGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game state
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('bbc49_basket_highscore') || '0', 10);
  });
  const [celebrationMsg, setCelebrationMsg] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 500;
    const height = 230;
    canvas.width = width;
    canvas.height = height;

    // Slingshot anchor
    const anchorX = 85;
    const anchorY = 145;
    const ballRadius = 13;

    // Hoop properties
    const poleX = 430;
    const backboardX = 425;
    const backboardY1 = 45;
    const backboardY2 = 115;
    const rimX1 = 390; // Front rim
    const rimX2 = 425; // Back rim
    const rimY = 95;   // Rim height

    // Ball state
    let ball = {
      x: anchorX,
      y: anchorY,
      vx: 0,
      vy: 0,
      isDragging: false,
      isFlying: false,
      scored: false,
    };

    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      alpha: number;
    }> = [];

    let resetTimer: any = null;
    let animationFrameId: number;

    const resetBall = () => {
      ball.x = anchorX;
      ball.y = anchorY;
      ball.vx = 0;
      ball.vy = 0;
      ball.isDragging = false;
      ball.isFlying = false;
      ball.scored = false;
    };

    const triggerCelebration = () => {
      const messages = ['SWISH ! +3 PTS ! 🏀', 'PANIER ! PARFAIT ! 🔥', 'MAGNIFIQUE ! 🎯', 'DANS LE MILLE ! 👏'];
      const msg = messages[Math.floor(Math.random() * messages.length)];
      setCelebrationMsg(msg);
      setTimeout(() => setCelebrationMsg(null), 2000);

      setScore((s) => {
        const newScore = s + 1;
        setStreak((st) => {
          const newStreak = st + 1;
          setHighScore((hs) => {
            const nextHigh = Math.max(hs, newScore);
            localStorage.setItem('bbc49_basket_highscore', String(nextHigh));
            return nextHigh;
          });
          return newStreak;
        });
        return newScore;
      });

      // Confetti burst
      const colors = ['#C8102E', '#F59E0B', '#10B981', '#3B82F6', '#FFFFFF'];
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: (rimX1 + rimX2) / 2,
          y: rimY + 10,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.8) * 7,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 4 + 2,
          alpha: 1,
        });
      }
    };

    // Input coordinates calculation
    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ('touches' in e && e.touches.length > 0) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        };
      }
      const me = e as MouseEvent;
      return {
        x: (me.clientX - rect.left) * scaleX,
        y: (me.clientY - rect.top) * scaleY,
      };
    };

    const onStart = (e: MouseEvent | TouchEvent) => {
      if (ball.isFlying) return;
      const pos = getPos(e);
      const dist = Math.hypot(pos.x - ball.x, pos.y - ball.y);
      if (dist < 35) {
        ball.isDragging = true;
      }
    };

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!ball.isDragging) return;
      if (e.cancelable) e.preventDefault();
      const pos = getPos(e);

      // Slingshot vector from anchor
      const dx = pos.x - anchorX;
      const dy = pos.y - anchorY;
      const maxPull = 75;
      const pullDist = Math.hypot(dx, dy);

      if (pullDist > maxPull) {
        const angle = Math.atan2(dy, dx);
        ball.x = anchorX + Math.cos(angle) * maxPull;
        ball.y = anchorY + Math.sin(angle) * maxPull;
      } else {
        ball.x = pos.x;
        ball.y = pos.y;
      }
    };

    const onEnd = () => {
      if (!ball.isDragging) return;
      ball.isDragging = false;

      const pullX = anchorX - ball.x;
      const pullY = anchorY - ball.y;

      // Only shoot if pulled significantly
      if (Math.hypot(pullX, pullY) > 10) {
        ball.isFlying = true;
        // Angry Birds power multiplier
        ball.vx = pullX * 0.17;
        ball.vy = pullY * 0.17;

        // Auto reset timer after 3.2s
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          if (!ball.scored) {
            setStreak(0);
          }
          resetBall();
        }, 3200);
      } else {
        resetBall();
      }
    };

    // Event listeners
    canvas.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);

    canvas.addEventListener('touchstart', onStart, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);

    // Physics & Render Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Court Background
      const courtGrad = ctx.createLinearGradient(0, 0, 0, height);
      courtGrad.addColorStop(0, '#101217');
      courtGrad.addColorStop(0.75, '#151821');
      courtGrad.addColorStop(1, '#271c19'); // Parquet tone at ground
      ctx.fillStyle = courtGrad;
      ctx.fillRect(0, 0, width, height);

      // Ground Line
      const groundY = 210;
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.stroke();

      // Free throw arc on ground
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(380, groundY, 70, Math.PI, Math.PI * 1.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Draw Slingshot / Launch Post
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#64748b';
      // Base
      ctx.beginPath();
      ctx.moveTo(anchorX - 10, groundY);
      ctx.lineTo(anchorX, anchorY + 15);
      ctx.lineTo(anchorX + 10, groundY);
      ctx.stroke();

      // Slingshot Left & Right Prongs
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath();
      ctx.moveTo(anchorX, anchorY + 15);
      ctx.lineTo(anchorX - 12, anchorY - 8);
      ctx.moveTo(anchorX, anchorY + 15);
      ctx.lineTo(anchorX + 12, anchorY - 8);
      ctx.stroke();

      // Elastic bands (when dragging)
      if (ball.isDragging) {
        ctx.strokeStyle = '#C8102E';
        ctx.lineWidth = 3.5;
        // Back band
        ctx.beginPath();
        ctx.moveTo(anchorX - 12, anchorY - 8);
        ctx.lineTo(ball.x, ball.y);
        ctx.stroke();

        // Trajectory Dots (Predicted Arc)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        const simVx = (anchorX - ball.x) * 0.17;
        const simVy = (anchorY - ball.y) * 0.17;
        let simX = ball.x;
        let simY = ball.y;
        let simVyy = simVy;
        for (let i = 0; i < 18; i++) {
          simX += simVx;
          simY += simVyy;
          simVyy += 0.38; // gravity
          if (i % 2 === 0) {
            ctx.beginPath();
            ctx.arc(simX, simY, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 3. Physics Simulation
      if (ball.isFlying) {
        ball.vy += 0.38; // Gravity
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Ground Bounce
        if (ball.y + ballRadius >= groundY) {
          ball.y = groundY - ballRadius;
          ball.vy = -ball.vy * 0.6; // Inelastic ground
          ball.vx *= 0.8;
        }

        // Left/Right Walls
        if (ball.x - ballRadius <= 0) {
          ball.x = ballRadius;
          ball.vx = -ball.vx * 0.7;
        }
        if (ball.x + ballRadius >= width) {
          ball.x = width - ballRadius;
          ball.vx = -ball.vx * 0.7;
        }

        // Backboard Collision (vertical line around backboardX, between backboardY1 and backboardY2)
        if (
          ball.x + ballRadius >= backboardX - 4 &&
          ball.x - ballRadius <= backboardX + 6 &&
          ball.y >= backboardY1 &&
          ball.y <= backboardY2
        ) {
          ball.x = backboardX - ballRadius - 4;
          ball.vx = -Math.abs(ball.vx) * 0.65; // Rebound to left
        }

        // Front Rim Collision (small peg at rimX1, rimY)
        const distFrontRim = Math.hypot(ball.x - rimX1, ball.y - rimY);
        if (distFrontRim < ballRadius + 3) {
          const nx = (ball.x - rimX1) / distFrontRim;
          const ny = (ball.y - rimY) / distFrontRim;
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 1.8 * dot * nx) * 0.7;
          ball.vy = (ball.vy - 1.8 * dot * ny) * 0.7;
        }

        // Back Rim Collision (peg at rimX2, rimY)
        const distBackRim = Math.hypot(ball.x - rimX2, ball.y - rimY);
        if (distBackRim < ballRadius + 3) {
          const nx = (ball.x - rimX2) / distBackRim;
          const ny = (ball.y - rimY) / distBackRim;
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 1.8 * dot * nx) * 0.7;
          ball.vy = (ball.vy - 1.8 * dot * ny) * 0.7;
        }

        // HOOP SCORE DETECTION (Passing through rim from top to bottom)
        if (
          !ball.scored &&
          ball.x > rimX1 + 5 &&
          ball.x < rimX2 - 5 &&
          ball.y > rimY &&
          ball.y < rimY + 18 &&
          ball.vy > 0
        ) {
          ball.scored = true;
          triggerCelebration();
        }
      }

      // 4. Draw Basketball
      ctx.save();
      ctx.translate(ball.x, ball.y);

      // Shadow on floor
      if (ball.y < groundY - ballRadius) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        const shadowDist = groundY - ball.y;
        const shadowScale = Math.max(0.3, 1 - shadowDist / 200);
        ctx.beginPath();
        ctx.ellipse(0, groundY - ball.y, ballRadius * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ball Body (Orange Basketball with 3D gradient)
      const ballGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, ballRadius);
      ballGrad.addColorStop(0, '#fb923c');
      ballGrad.addColorStop(0.6, '#ea580c');
      ballGrad.addColorStop(1, '#9a3412');
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // Ball Black Ribs/Seams
      ctx.strokeStyle = '#271c19';
      ctx.lineWidth = 1.2;
      // Cross line
      ctx.beginPath();
      ctx.moveTo(-ballRadius + 2, 0);
      ctx.lineTo(ballRadius - 2, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -ballRadius + 2);
      ctx.lineTo(0, ballRadius - 2);
      ctx.stroke();

      // Curved seam
      ctx.beginPath();
      ctx.arc(-3, 0, ballRadius * 0.75, -Math.PI / 2.5, Math.PI / 2.5);
      ctx.stroke();
      ctx.restore();

      // Front elastic band (when dragging)
      if (ball.isDragging) {
        ctx.strokeStyle = '#C8102E';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(anchorX + 12, anchorY - 8);
        ctx.lineTo(ball.x, ball.y);
        ctx.stroke();
      }

      // 5. Draw Basketball Goal / Hoop Structure
      // Pole
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(poleX, groundY);
      ctx.lineTo(poleX, 70);
      ctx.lineTo(backboardX + 2, 80);
      ctx.stroke();

      // Backboard (Panneau)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(backboardX, backboardY1, 6, backboardY2 - backboardY1);
      ctx.strokeStyle = '#C8102E'; // Red border
      ctx.lineWidth = 2;
      ctx.strokeRect(backboardX, backboardY1, 6, backboardY2 - backboardY1);

      // Inner Target Square on Backboard
      ctx.strokeStyle = '#C8102E';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(backboardX - 1, 75, 4, 25);

      // Rim (Arceau Métallique Orange/Rouge)
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(rimX1, rimY);
      ctx.lineTo(rimX2, rimY);
      ctx.stroke();

      // Net (Filet tressé)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.2;
      const netBottomY = rimY + 28;
      const netBottomX1 = rimX1 + 7;
      const netBottomX2 = rimX2 - 7;

      ctx.beginPath();
      // Outer strings
      ctx.moveTo(rimX1, rimY);
      ctx.lineTo(netBottomX1, netBottomY);
      ctx.lineTo(netBottomX2, netBottomY);
      ctx.lineTo(rimX2, rimY);

      // Mesh lattice strings
      for (let s = 1; s <= 4; s++) {
        const topRatio = s / 5;
        const tx = rimX1 + (rimX2 - rimX1) * topRatio;
        const bx = netBottomX1 + (netBottomX2 - netBottomX1) * (1 - topRatio);
        ctx.moveTo(tx, rimY);
        ctx.lineTo(bx, netBottomY);
      }
      ctx.stroke();

      // 6. Confetti & Sparkle Particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
        p.alpha -= 0.02;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resetTimer) clearTimeout(resetTimer);
      canvas.removeEventListener('mousedown', onStart);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      canvas.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, []);

  return (
    <div className="mt-4 p-3 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-inner relative overflow-hidden select-none">
      {/* Header bar of mini-game */}
      <div className="flex items-center justify-between text-xs mb-2 px-1">
        <div className="flex items-center gap-1.5 font-bold text-white">
          <span className="text-sm">🏀</span>
          <span className="text-slate-200">Mini-Jeu BBC49 : Tirez sur le ballon !</span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Panier : {score}
          </span>
          {streak > 1 && (
            <span className="text-amber-400 font-bold animate-bounce">
              Série : x{streak} 🔥
            </span>
          )}
          <span className="text-slate-400">
            Record : {highScore}
          </span>
        </div>
      </div>

      {/* Interactive Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800/80 shadow-md">
        <canvas
          ref={canvasRef}
          className="w-full h-auto cursor-grab active:cursor-grabbing block touch-none"
          title="Cliquez ou touchez le ballon, glissez en arrière pour viser, puis relâchez pour tirer !"
        />

        {/* Celebration Floating Message */}
        {celebrationMsg && (
          <div className="absolute inset-x-0 top-6 flex justify-center pointer-events-none animate-pulse">
            <div className="px-4 py-1.5 bg-emerald-600/95 border border-emerald-400 rounded-full text-white font-black text-xs shadow-lg shadow-emerald-950/80 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{celebrationMsg}</span>
            </div>
          </div>
        )}

        {/* Instructions hint badge */}
        <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10 pointer-events-none">
          👆 Glissez le ballon vers la gauche puis relâchez (façon Angry Birds)
        </div>
      </div>
    </div>
  );
};
