import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Trophy, Sparkles, Volume2, VolumeX, RotateCcw, Clock, Heart, ShieldAlert, Award } from 'lucide-react';

// ============================================================================
// MOTEUR AUDIO WEB AUDIO API (100% autonome, zéro dépendance, zéro latence)
// ============================================================================
class GameAudio {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.enabled) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Whoosh du tir / swipe
  playShoot() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.15);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, ctx.currentTime);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch {}
  }

  // Rebond sur la planche (son sourd bois/acrylique)
  playBackboard() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {}
  }

  // Tintement métallique sur l'arceau
  playRim() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(980, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    } catch {}
  }

  // Swish du filet (froissement soyeux)
  playSwish() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      // White noise synthétisé pour le froissement du filet
      const bufferSize = ctx.sampleRate * 0.18;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + 0.19);
    } catch {}
  }

  // Tintement de pièce de monnaie (épargne financière)
  playCoin() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      // Double note carillon B5 -> E6
      [987.77, 1318.51].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.22, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.3);
      });
    } catch {}
  }

  // Collision avec obstacle (Facture imprévue)
  playObstacle() {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(90, ctx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.21);
    } catch {}
  }
}

const audio = new GameAudio();

// ============================================================================
// COMPOSANT BASKETBALLGAME
// ============================================================================
export type GameMode = 'series' | 'time_attack';

export const BasketballGame: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Modes & Scores
  const [gameMode, setGameMode] = useState<GameMode>('series');
  const [score, setScore] = useState<number>(0);
  const [savings, setSavings] = useState<number>(0); // En euros fictifs
  const [streak, setStreak] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(45);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [celebrationMsg, setCelebrationMsg] = useState<string | null>(null);

  // High Scores
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('bbc49_basket_high_score') || '0', 10);
  });
  const [highSavings, setHighSavings] = useState<number>(() => {
    return parseInt(localStorage.getItem('bbc49_basket_high_savings') || '0', 10);
  });

  // Synchronisation du son
  useEffect(() => {
    audio.enabled = soundOn;
  }, [soundOn]);

  // Référence d'état pour la boucle de jeu Canvas
  const gameStateRef = useRef({
    gameMode,
    score: 0,
    savings: 0,
    streak: 0,
    lives: 3,
    timeLeft: 45,
    isGameOver: false,
  });

  // Maintenir la ref à jour
  useEffect(() => {
    gameStateRef.current = {
      gameMode,
      score,
      savings,
      streak,
      lives,
      timeLeft,
      isGameOver,
    };
  }, [gameMode, score, savings, streak, lives, timeLeft, isGameOver]);

  // Timer pour le mode Contre-la-montre (45 secondes)
  useEffect(() => {
    if (gameMode !== 'time_attack' || isGameOver) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameMode, isGameOver]);

  // Réinitialisation du jeu
  const handleResetGame = useCallback(() => {
    setScore(0);
    setSavings(0);
    setStreak(0);
    setLives(3);
    setTimeLeft(45);
    setIsGameOver(false);
    setCelebrationMsg(null);
  }, []);

  // Déclenchement haptique doux
  const triggerHaptic = (pattern: number | number[]) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {}
  };

  // Moteur Canvas & Événements
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dimensions virtuelles
    const width = 540;
    const height = 260;
    canvas.width = width;
    canvas.height = height;

    const groundY = 236;
    const ballRadius = 13.5;

    // Position initiale du ballon (zone de tir)
    let ballHomeX = 90;
    let ballHomeY = 175;

    // Panier par défaut
    const baseHoopX = 430;
    const baseHoopY = 90;
    let hoopX = baseHoopX;
    let hoopY = baseHoopY;

    // Arceau & Planche
    const backboardW = 6;
    const backboardH = 68;
    const rimRadius = 18; // demi-diamètre de l'anneau

    // État du ballon
    let ball = {
      x: ballHomeX,
      y: ballHomeY,
      vx: 0,
      vy: 0,
      rotation: 0,
      vRot: 0,
      isFlying: false,
      scored: false,
      swish: true, // reste vrai si n'a touché ni l'arceau ni la planche
      touchedRim: false,
      touchedBackboard: false,
      inNet: false,
    };

    // Traînée lumineuse derrière le ballon
    let trail: Array<{ x: number; y: number; alpha: number; size: number }> = [];

    // Particules (confettis + pièces de monnaie € dorées)
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      color: string;
      size: number;
      alpha: number;
      isCoin?: boolean;
      rot?: number;
      vRot?: number;
    }> = [];

    // Geste de swipe / drag
    let isSwiping = false;
    let swipeStart = { x: 0, y: 0, time: 0 };
    let swipeCurrent = { x: 0, y: 0 };

    // Obstacle « Facture Imprévue » (apparaît dès 8 paniers réussis)
    const obstacle = {
      x: 275,
      y: 110,
      width: 42,
      height: 52,
      vy: 1.2,
    };

    let animationFrameId: number;
    let resetTimer: any = null;

    // Remettre le ballon en jeu
    const resetBall = (penalty = false) => {
      const gs = gameStateRef.current;

      // Si le tir est manqué en mode Série
      if (penalty && !gs.isGameOver) {
        if (gs.gameMode === 'series') {
          const nextLives = gs.lives - 1;
          setLives(nextLives);
          setStreak(0);
          if (nextLives <= 0) {
            setIsGameOver(true);
            triggerHaptic([60, 40, 80]);
          }
        } else {
          setStreak(0);
        }
      }

      // Difficulté progressive : faire varier la distance de tir dès 5 paniers
      if (gs.score >= 5) {
        ballHomeX = 75 + ((gs.score * 17) % 40) - 15;
      } else {
        ballHomeX = 90;
      }

      ball.x = ballHomeX;
      ball.y = ballHomeY;
      ball.vx = 0;
      ball.vy = 0;
      ball.rotation = 0;
      ball.vRot = 0;
      ball.isFlying = false;
      ball.scored = false;
      ball.swish = true;
      ball.touchedRim = false;
      ball.touchedBackboard = false;
      ball.inNet = false;
      trail = [];
    };

    // Déclenchement du panier réussi
    const handleScore = () => {
      ball.scored = true;
      const isSwish = ball.swish;

      // Audio & Haptique
      if (isSwish) {
        audio.playSwish();
        audio.playCoin();
        triggerHaptic([50, 40, 90]);
      } else {
        audio.playCoin();
        triggerHaptic([35, 20, 60]);
      }

      const currentStreak = gameStateRef.current.streak + 1;
      const comboMultiplier = Math.min(currentStreak, 5);

      // Calcul des gains en épargne fictive (€)
      const baseGain = isSwish ? 250 : 100;
      const earned = baseGain * comboMultiplier;

      const newScore = gameStateRef.current.score + 1;
      const newSavings = gameStateRef.current.savings + earned;

      setScore(newScore);
      setSavings(newSavings);
      setStreak(currentStreak);

      // Sauvegarde des records
      setHighScore((prev) => {
        const next = Math.max(prev, newScore);
        localStorage.setItem('bbc49_basket_high_score', String(next));
        return next;
      });
      setHighSavings((prev) => {
        const next = Math.max(prev, newSavings);
        localStorage.setItem('bbc49_basket_high_savings', String(next));
        return next;
      });

      // Message de célébration
      const msg = isSwish
        ? `✨ SWISH PARFAIT ! +${earned} € ÉPARGNÉS ! 🔥`
        : comboMultiplier > 1
        ? `🎯 COMBO x${comboMultiplier} ! +${earned} € DANS LA CAGNOTTE !`
        : `🏀 PANIER ! +${earned} € ÉPARGNÉS !`;
      setCelebrationMsg(msg);
      setTimeout(() => setCelebrationMsg(null), 1800);

      // Explosion de pièces dorées avec symbole €
      for (let i = 0; i < (isSwish ? 18 : 10); i++) {
        particles.push({
          x: hoopX - 18 + Math.random() * 20,
          y: hoopY + 12,
          vx: (Math.random() - 0.5) * 7,
          vy: (Math.random() - 0.8) * 6,
          color: '#F59E0B',
          size: 9 + Math.random() * 4,
          alpha: 1,
          isCoin: true,
          rot: Math.random() * Math.PI,
          vRot: (Math.random() - 0.5) * 0.3,
        });
      }

      // Étincelles multicolores
      for (let i = 0; i < 20; i++) {
        particles.push({
          x: hoopX - 18,
          y: hoopY + 10,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.7) * 5,
          color: ['#C8102E', '#10B981', '#38BDF8', '#FFFFFF'][Math.floor(Math.random() * 4)],
          size: 2.5 + Math.random() * 3,
          alpha: 1,
        });
      }

      // Préparation du tir suivant
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        resetBall(false);
      }, 1100);
    };

    // Coordonnées du pointeur ajustées au canvas
    const getCoords = (e: MouseEvent | TouchEvent) => {
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

    // Gestion du balayage (Swipe / Drag)
    const onPointerStart = (e: MouseEvent | TouchEvent) => {
      if (ball.isFlying || gameStateRef.current.isGameOver) return;
      const pos = getCoords(e);
      const dist = Math.hypot(pos.x - ball.x, pos.y - ball.y);

      // On permet de toucher le ballon ou la zone gauche
      if (dist < 42 || pos.x < 160) {
        isSwiping = true;
        swipeStart = { x: pos.x, y: pos.y, time: Date.now() };
        swipeCurrent = { x: pos.x, y: pos.y };
      }
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isSwiping) return;
      if (e.cancelable) e.preventDefault();
      const pos = getCoords(e);
      swipeCurrent = { x: pos.x, y: pos.y };
    };

    const onPointerEnd = () => {
      if (!isSwiping) return;
      isSwiping = false;

      const dx = swipeCurrent.x - swipeStart.x;
      const dy = swipeCurrent.y - swipeStart.y;
      const dt = Math.max(25, Date.now() - swipeStart.time);
      const dist = Math.hypot(dx, dy);

      // Deux types de gestes sont reconnus :
      // 1. Swipe vers le haut/droite (vers le panier) : dx > 0 et dy < 0
      // 2. Fronde tirée vers l'arrière gauche : dx < 0 et dy > 0
      let vx = 0;
      let vy = 0;

      if (dx > 15 && dy < -10) {
        // Geste balayage direct vers le haut-droite (Swipe dynamique)
        const speed = dist / dt;
        vx = Math.min(13.5, Math.max(6.5, speed * 2.2 + dx * 0.055));
        vy = Math.max(-14.5, Math.min(-7.5, (dy / dt) * 2.1 - 4.5));
      } else if (dx < -15 || dy > 15) {
        // Geste fronde / catapult (Angry birds)
        vx = Math.min(13.5, Math.max(6.0, -dx * 0.16));
        vy = Math.max(-14.5, Math.min(-7.5, -dy * 0.16));
      } else {
        // Mouvement trop court, tir annulé
        return;
      }

      ball.isFlying = true;
      ball.vx = vx;
      ball.vy = vy;
      ball.vRot = 0.08 + vx * 0.01;
      audio.playShoot();

      // Décompte de sécurité : si le ballon ne marque pas au bout de 2.6s, réinitialiser avec pénalité
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        if (!ball.scored) {
          resetBall(true);
        }
      }, 2600);
    };

    // Écouteurs d'événements
    canvas.addEventListener('mousedown', onPointerStart);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerEnd);

    canvas.addEventListener('touchstart', onPointerStart, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerEnd);

    // ========================================================================
    // BOUCLE DE RENDU & PHYSIQUE
    // ========================================================================
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min(32, time - lastTime) / 16.66;
      lastTime = time;

      ctx.clearRect(0, 0, width, height);

      // 1. Fond terrain moderne & néomorphisme sombre
      const courtGrad = ctx.createLinearGradient(0, 0, 0, height);
      courtGrad.addColorStop(0, '#0f1117');
      courtGrad.addColorStop(0.7, '#161922');
      courtGrad.addColorStop(1, '#20181b'); // Teinte parquet
      ctx.fillStyle = courtGrad;
      ctx.fillRect(0, 0, width, height);

      // Lignes de parquet et raquette
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.stroke();

      // Ligne courbe zone 3 points
      ctx.strokeStyle = '#3f3f46';
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(hoopX - 60, groundY, 110, Math.PI, Math.PI * 1.5);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Gestion de la difficulté progressive
      const currentScore = gameStateRef.current.score;

      // À partir de 10 paniers : arceau en mouvement horizontal sinusoïdal
      if (currentScore >= 10) {
        hoopX = baseHoopX + Math.sin(time * 0.0018) * 32;
      } else {
        hoopX = baseHoopX;
      }
      hoopY = baseHoopY;

      // Obstacle « Facture Imprévue » actif dès 8 paniers
      const showObstacle = currentScore >= 8;
      if (showObstacle) {
        obstacle.y += obstacle.vy * dt;
        if (obstacle.y > 155 || obstacle.y < 65) {
          obstacle.vy = -obstacle.vy;
        }
      }

      // 3. Simulation physique du ballon
      if (ball.isFlying) {
        // Gravité & traînée d'air légère
        ball.vy += 0.38 * dt;
        ball.vx *= Math.pow(0.996, dt);
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        ball.rotation += ball.vRot * dt;

        // Traînée lumineuse derrière le ballon
        trail.push({ x: ball.x, y: ball.y, alpha: 0.65, size: ballRadius * 0.85 });
        if (trail.length > 14) trail.shift();

        // Rebond au sol
        if (ball.y + ballRadius >= groundY) {
          ball.y = groundY - ballRadius;
          ball.vy = -ball.vy * 0.58;
          ball.vx *= 0.82;
          ball.vRot *= 0.7;
          if (Math.abs(ball.vy) > 1.5) {
            audio.playBackboard();
            triggerHaptic(20);
          }
        }

        // Murs gauche et droit
        if (ball.x - ballRadius <= 0) {
          ball.x = ballRadius;
          ball.vx = -ball.vx * 0.65;
        }
        if (ball.x + ballRadius >= width) {
          ball.x = width - ballRadius;
          ball.vx = -ball.vx * 0.65;
        }

        // --- COLLISIONS AVEC L'OBSTACLE (Facture Imprévue) ---
        if (showObstacle) {
          const obsLeft = obstacle.x - obstacle.width / 2;
          const obsRight = obstacle.x + obstacle.width / 2;
          const obsTop = obstacle.y - obstacle.height / 2;
          const obsBottom = obstacle.y + obstacle.height / 2;

          if (
            ball.x + ballRadius >= obsLeft &&
            ball.x - ballRadius <= obsRight &&
            ball.y + ballRadius >= obsTop &&
            ball.y - ballRadius <= obsBottom
          ) {
            ball.vx = -Math.abs(ball.vx) * 0.75 - 1;
            ball.vy = Math.max(-4, ball.vy * 0.5);
            audio.playObstacle();
            triggerHaptic(50);
            setCelebrationMsg('⚡ Aïe ! Facture Imprévue contrée !');
            setTimeout(() => setCelebrationMsg(null), 1400);
          }
        }

        // --- COLLISIONS AVEC LE PANIER ---
        const backboardX = hoopX;
        const backboardY1 = hoopY - 35;
        const backboardY2 = hoopY + 33;
        const rimX1 = hoopX - rimRadius * 2; // Arceau avant
        const rimX2 = hoopX;                // Arceau arrière (attaché à la planche)
        const rimY = hoopY + 12;

        // Rebond net sur la planche
        if (
          ball.x + ballRadius >= backboardX - 4 &&
          ball.x - ballRadius <= backboardX + 8 &&
          ball.y >= backboardY1 &&
          ball.y <= backboardY2
        ) {
          ball.x = backboardX - ballRadius - 4;
          ball.vx = -Math.abs(ball.vx) * 0.65;
          ball.swish = false;
          ball.touchedBackboard = true;
          audio.playBackboard();
          triggerHaptic(25);
        }

        // Rebond sur l'arceau avant (rimX1, rimY)
        const distRim1 = Math.hypot(ball.x - rimX1, ball.y - rimY);
        if (distRim1 < ballRadius + 3) {
          const nx = (ball.x - rimX1) / distRim1;
          const ny = (ball.y - rimY) / distRim1;
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 1.85 * dot * nx) * 0.65;
          ball.vy = (ball.vy - 1.85 * dot * ny) * 0.65;
          ball.swish = false;
          ball.touchedRim = true;
          audio.playRim();
          triggerHaptic(30);
        }

        // Rebond sur l'arceau arrière (rimX2, rimY)
        const distRim2 = Math.hypot(ball.x - rimX2, ball.y - rimY);
        if (distRim2 < ballRadius + 3) {
          const nx = (ball.x - rimX2) / distRim2;
          const ny = (ball.y - rimY) / distRim2;
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx = (ball.vx - 1.85 * dot * nx) * 0.65;
          ball.vy = (ball.vy - 1.85 * dot * ny) * 0.65;
          ball.swish = false;
          ball.touchedRim = true;
          audio.playRim();
          triggerHaptic(30);
        }

        // DÉTECTION STRICTE DU POINT : Le ballon doit entrer par le haut (vy > 0)
        if (
          !ball.scored &&
          ball.x > rimX1 + 4 &&
          ball.x < rimX2 - 4 &&
          ball.y > rimY &&
          ball.y < rimY + 16 &&
          ball.vy > 0
        ) {
          ball.inNet = true;
          ball.vy *= 0.45; // Décélération progressive dans le filet
          ball.vx *= 0.6;
          handleScore();
        }
      }

      // Atténuation de la traînée
      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].alpha -= 0.04 * dt;
        if (trail[i].alpha <= 0) trail.splice(i, 1);
      }

      // 4. Rendu de la traînée lumineuse (Trail)
      for (const t of trail) {
        ctx.fillStyle = `rgba(245, 158, 11, ${t.alpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.size * t.alpha, 0, Math.PI * 2);
        ctx.fill();
      }

      // 5. Rendu de l'indicateur de visée lors du Swipe
      if (isSwiping && !ball.isFlying) {
        const dx = swipeCurrent.x - swipeStart.x;
        const dy = swipeCurrent.y - swipeStart.y;
        const isForwardSwipe = dx > 10 && dy < -5;

        // Vecteur simulé
        let simVx = isForwardSwipe ? Math.min(13.5, dx * 0.075 + 6.5) : Math.min(13.5, -dx * 0.16);
        let simVy = isForwardSwipe ? Math.max(-14.5, dy * 0.075 - 7.5) : Math.max(-14.5, -dy * 0.16);

        // Trajectoire parabolique prédictive pointillée
        ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
        let simX = ball.x;
        let simY = ball.y;
        let simVyy = simVy;
        for (let step = 0; step < 16; step++) {
          simX += simVx;
          simY += simVyy;
          simVyy += 0.38;
          if (step % 2 === 0) {
            ctx.beginPath();
            ctx.arc(simX, simY, 2.5 - step * 0.08, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Flèche de guidage
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(ball.x + simVx * 4.5, ball.y + simVy * 4.5);
        ctx.stroke();
      }

      // 6. Rendu de l'obstacle « Facture Imprévue »
      if (showObstacle) {
        ctx.save();
        ctx.translate(obstacle.x, obstacle.y);
        // Ombre portée
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-obstacle.width / 2 + 3, -obstacle.height / 2 + 3, obstacle.width, obstacle.height);

        // Corps de la facture
        ctx.fillStyle = '#FEF2F2';
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.fillRect(-obstacle.width / 2, -obstacle.height / 2, obstacle.width, obstacle.height);
        ctx.strokeRect(-obstacle.width / 2, -obstacle.height / 2, obstacle.width, obstacle.height);

        // Bandeau rouge d'urgence
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(-obstacle.width / 2, -obstacle.height / 2, obstacle.width, 10);

        // Éclair / avertissement
        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FACTURE', 0, -obstacle.height / 2 + 8);

        ctx.fillStyle = '#1F2937';
        ctx.font = '8px sans-serif';
        ctx.fillText('IMPRÉVUE', 0, 5);

        ctx.fillStyle = '#B91C1C';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('⚡ 500 €', 0, 18);
        ctx.restore();
      }

      // 7. Rendu du Ballon de Basket (avec symbole € et relief 3D)
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.rotate(ball.rotation);

      // Ombre au sol
      if (ball.y < groundY - ballRadius) {
        const shadowDist = groundY - ball.y;
        const shadowScale = Math.max(0.2, 1 - shadowDist / 220);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(0, groundY - ball.y, ballRadius * shadowScale, 3.5 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Sphère du ballon (dégradé lumineux orange/doré)
      const ballGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, ballRadius);
      ballGrad.addColorStop(0, '#fde047'); // Reflet lumineux
      ballGrad.addColorStop(0.3, '#f97316');
      ballGrad.addColorStop(0.8, '#ea580c');
      ballGrad.addColorStop(1, '#9a3412');
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(0, 0, ballRadius, 0, Math.PI * 2);
      ctx.fill();

      // Rainures noires du ballon
      ctx.strokeStyle = '#431407';
      ctx.lineWidth = 1.3;
      // Ligne horizontale
      ctx.beginPath();
      ctx.moveTo(-ballRadius + 2, 0);
      ctx.lineTo(ballRadius - 2, 0);
      ctx.stroke();
      // Ligne verticale
      ctx.beginPath();
      ctx.moveTo(0, -ballRadius + 2);
      ctx.lineTo(0, ballRadius - 2);
      ctx.stroke();
      // Arc courbé
      ctx.beginPath();
      ctx.arc(-2, 0, ballRadius * 0.72, -Math.PI / 2.6, Math.PI / 2.6);
      ctx.stroke();

      // Symbole « € » gravé au centre du ballon (Thème Épargne & Budget)
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'black 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('€', 0, 0);

      ctx.restore();

      // 8. Rendu du Poteau & Panier
      // Poteau porteur
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(hoopX + 8, groundY);
      ctx.lineTo(hoopX + 8, hoopY + 10);
      ctx.lineTo(hoopX + backboardW, hoopY + 12);
      ctx.stroke();

      // Planche de basket (Backboard)
      const bY1 = hoopY - 35;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.fillRect(hoopX, bY1, backboardW, backboardH);
      ctx.strokeStyle = '#C8102E'; // Bordure officielle BBC49 rouge
      ctx.lineWidth = 2;
      ctx.strokeRect(hoopX, bY1, backboardW, backboardH);

      // Carré de visée officiel sur la planche
      ctx.strokeStyle = '#C8102E';
      ctx.lineWidth = 1.8;
      ctx.strokeRect(hoopX - 1, hoopY - 8, 4, 24);

      // Arceau métallique
      const rX1 = hoopX - rimRadius * 2;
      const rX2 = hoopX;
      const rY = hoopY + 12;

      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(rX1, rY);
      ctx.lineTo(rX2, rY);
      ctx.stroke();

      // Filet blanc (tressé avec ondulation dynamique si traversé)
      const netH = 26;
      const netW = rimRadius * 2 - 8;
      const netLeft = rX1 + 4;
      const netRight = rX2 - 4;
      const netBottomY = rY + netH;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      // Ficelles verticales du maillage
      for (let s = 0; s <= 4; s++) {
        const topX = netLeft + (netW * s) / 4;
        const bottomX = netLeft + 4 + ((netW - 8) * s) / 4;
        ctx.moveTo(topX, rY);
        ctx.lineTo(bottomX, netBottomY);
      }
      // Ficelles croisées
      for (let s = 0; s <= 4; s++) {
        const topX = netRight - (netW * s) / 4;
        const bottomX = netRight - 4 - ((netW - 8) * s) / 4;
        ctx.moveTo(topX, rY);
        ctx.lineTo(bottomX, netBottomY);
      }
      ctx.stroke();

      // 9. Rendu des Particules & Pièces de monnaie dorées
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.22 * dt; // Gravité des particules
        p.alpha -= 0.018 * dt;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;

        if (p.isCoin) {
          // Pièce de monnaie dorée volante avec €
          p.rot = (p.rot || 0) + (p.vRot || 0.1) * dt;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);

          // Disque doré
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#D97706';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Symbole € au centre de la pièce
          ctx.fillStyle = '#78350F';
          ctx.font = `bold ${Math.round(p.size * 1.1)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('€', 0, 1);
        } else {
          // Étincelle standard
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (resetTimer) clearTimeout(resetTimer);
      canvas.removeEventListener('mousedown', onPointerStart);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerEnd);
      canvas.removeEventListener('touchstart', onPointerStart);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerEnd);
    };
  }, []);

  return (
    <div className="mt-4 p-3 sm:p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl select-none">
      {/* Barre supérieure : Modes & Son */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2 border-b border-slate-800/80">
        {/* Sélecteur de modes */}
        <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              setGameMode('series');
              handleResetGame();
            }}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              gameMode === 'series'
                ? 'bg-[#C8102E] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Mode Série (3 vies)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setGameMode('time_attack');
              handleResetGame();
            }}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
              gameMode === 'time_attack'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Chrono (45s)</span>
          </button>
        </div>

        {/* Contrôles Audio & Recommencer */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setSoundOn(!soundOn)}
            className={`p-1.5 rounded-lg border text-xs transition-colors ${
              soundOn
                ? 'bg-slate-800 border-slate-700 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-500'
            }`}
            title={soundOn ? 'Son activé' : 'Son coupé'}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleResetGame}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Recommencer la partie"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* HUD des scores & Cagnotte Épargne */}
      <div className="grid grid-cols-3 items-center text-xs mb-2 px-1">
        {/* Colonne Gauche : Vies ou Timer */}
        <div className="flex items-center space-x-1.5">
          {gameMode === 'series' ? (
            <div className="flex items-center space-x-1">
              {[...Array(3)].map((_, i) => (
                <span
                  key={i}
                  className={`text-sm transition-transform ${
                    i < lives ? 'scale-100 opacity-100' : 'scale-75 opacity-25 grayscale'
                  }`}
                  title={`${lives} ballons restants`}
                >
                  🏀
                </span>
              ))}
            </div>
          ) : (
            <div className={`flex items-center gap-1 font-mono font-bold text-xs ${timeLeft <= 10 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{timeLeft}s</span>
            </div>
          )}
        </div>

        {/* Colonne Centre : Cagnotte Épargne BBC49 */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs shadow-inner">
            <span className="text-amber-400">💰</span>
            <span>Épargne :</span>
            <span className="font-mono text-emerald-200">{savings.toLocaleString('fr-FR')} €</span>
          </div>
        </div>

        {/* Colonne Droite : Combo & Paniers */}
        <div className="flex items-center justify-end space-x-2 font-mono text-[11px]">
          {streak > 1 && (
            <span className="text-amber-400 font-bold animate-bounce bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-700/50">
              x{streak} 🔥
            </span>
          )}
          <span className="text-slate-300 font-semibold">
            {score} {score > 1 ? 'paniers' : 'panier'}
          </span>
        </div>
      </div>

      {/* Conteneur du Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#0c0d12] shadow-inner">
        <canvas
          ref={canvasRef}
          className="w-full h-auto max-h-[260px] cursor-grab active:cursor-grabbing block touch-none"
          title="Glissez au doigt ou à la souris vers le panier pour ajuster la force et l'angle !"
        />

        {/* Message flottant de célébration / swish */}
        {celebrationMsg && (
          <div className="absolute inset-x-0 top-4 flex justify-center pointer-events-none animate-bounce z-10">
            <div className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-400/80 rounded-full text-white font-black text-xs shadow-xl shadow-emerald-950 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>{celebrationMsg}</span>
            </div>
          </div>
        )}

        {/* Badge d'aide et de mécanique */}
        <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded border border-white/10 pointer-events-none">
          👆 Glissez le doigt ou la souris vers le panier (swipe)
        </div>

        {/* Overlay Fin de Partie */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center z-20 animate-fadeIn">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C8102E] to-amber-600 flex items-center justify-center text-white mb-2 shadow-lg">
              <Award className="w-6 h-6 text-amber-200" />
            </div>

            <h3 className="text-base font-extrabold text-white">
              {gameMode === 'series' ? 'Série terminée !' : 'Temps écoulé !'}
            </h3>

            <p className="text-xs text-slate-300 mt-1">
              Cagnotte fictive récoltée :{' '}
              <span className="text-emerald-400 font-bold font-mono text-sm">
                {savings.toLocaleString('fr-FR')} €
              </span>
            </p>

            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-2">
              <span>Paniers : {score}</span>
              <span>•</span>
              <span className="text-amber-400">Record : {highSavings.toLocaleString('fr-FR')} €</span>
            </div>

            <button
              type="button"
              onClick={handleResetGame}
              className="mt-3 px-4 py-1.5 bg-[#C8102E] hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Rejouer une session</span>
            </button>
          </div>
        )}
      </div>

      {/* Pied du jeu : Meilleurs scores & Thématique */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
        <div className="flex items-center gap-1">
          <Trophy className="w-3 h-3 text-amber-400" />
          <span>Meilleure épargne : <strong className="text-white font-mono">{highSavings.toLocaleString('fr-FR')} €</strong></span>
        </div>
        <span className="text-slate-500">
          BBC49 • Gamification Budgétaire
        </span>
      </div>
    </div>
  );
};
