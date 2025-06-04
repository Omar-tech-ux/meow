import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../ButterflyGame.css';

// Flower images (adjust paths if necessary)
import lilyTopImg from '../assets/lilyTop.png';
import lilyBottomImg from '../assets/lilyBottom.png';

// Background music (adjust path if necessary)
import bgmFile from '../assets/anniversary-bgm.mp3';

// Your 12 anniversary photos (adjust filenames/paths as needed)
import pic1 from '../assets/pic1.jpg';
import pic2 from '../assets/pic2.jpg';
import pic3 from '../assets/pic3.jpg';
import pic4 from '../assets/pic4.jpg';
import pic5 from '../assets/pic5.jpg';
import pic6 from '../assets/pic6.jpg';
import pic7 from '../assets/pic7.jpg';
import pic8 from '../assets/pic8.jpg';
import pic9 from '../assets/pic9.jpg';
import pic10 from '../assets/pic10.jpg';
import pic11 from '../assets/pic11.jpg';
import pic12 from '../assets/pic12.jpg';

type Flower = {
  id: number;
  top: number;
  left: number;
  height: number;
  isTop: boolean;
};

const ButterflyGame: React.FC = () => {
  // ─────── Game State ───────
  const [gameStarted, setGameStarted] = useState(false);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showAnniversaryMessage, setShowAnniversaryMessage] = useState(false);
  const [gameFrozen, setGameFrozen] = useState(false);

  // ─────── Refs ───────
  const butterflyRef = useRef<HTMLDivElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // ─────── Physics & Flowers State ───────
  const [position, setPosition] = useState(250);
  const [velocity, setVelocity] = useState(0);
  const [flowers, setFlowers] = useState<Flower[]>([]);
  const flowerId = useRef(0);
  const lastSpawnTimeRef = useRef<number>(0);

  // ─────── Constants ───────
  const FPS = 60;
  const GRAVITY = 0.5;
  const FLAP_STRENGTH = -10;
  const SPAWN_INTERVAL = 2000; // ms between each flower pair
  const GAP = 160; // vertical gap between flower petals

  // ─────── Raindrop Constants (DOM‐only approach) ───────
  const RAINDROP_SPAWN_INTERVAL = 1200; // ms between raindrops
  const MAX_RAINDROPS = 8; // max simultaneous raindrops

  // ─────── FLAP HANDLER ───────
  const flap = useCallback(() => {
    if (!gameStarted) {
      setGameStarted(true);
      audioRef.current?.play().catch(() => {
        /* user interaction already happened on tap, so it should play */
      });
    }
    if (gameFrozen) return;
    setVelocity(FLAP_STRENGTH);
  }, [gameStarted, gameFrozen]);

  // ─────── SPACEBAR LISTENER ───────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flap]);

  // ─────── MAIN GAME LOOP ───────
  useEffect(() => {
    if (!gameStarted || gameOver || gameFrozen) return;

    const interval = setInterval(() => {
      // 1) Physics: gravity + position
      setVelocity((v) => v + GRAVITY);
      setPosition((p) => p + velocity);

      // 2) Spawn flower pairs at fixed intervals
      const now = Date.now();
      if (
        gameAreaRef.current &&
        now - lastSpawnTimeRef.current > SPAWN_INTERVAL
      ) {
        lastSpawnTimeRef.current = now;
        const gameHeight = gameAreaRef.current.clientHeight;
        const gameWidth = gameAreaRef.current.clientWidth;

        // Choose random topHeight between 10% and 50% of gameHeight
        const minFraction = 0.1;
        const maxFraction = 0.5;
        const minHeight = gameHeight * minFraction;
        const maxHeight = gameHeight * maxFraction;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
        const bottomHeight = gameHeight - topHeight - GAP;
        const spawnX = gameWidth;

        const topFlower: Flower = {
          id: flowerId.current++,
          left: spawnX,
          top: 0,
          height: topHeight,
          isTop: true,
        };
        const bottomFlower: Flower = {
          id: flowerId.current++,
          left: spawnX,
          top: topHeight + GAP,
          height: bottomHeight,
          isTop: false,
        };

        setFlowers((f) => [...f, topFlower, bottomFlower]);
      }

      // 3) Move all flowers left by 5px; remove offscreen
      setFlowers((f) =>
        f
          .map((flower) => ({ ...flower, left: flower.left - 5 }))
          .filter((flower) => flower.left > -100)
      );

      // 4) Scoring: when a top petal crosses x=100, +1 once
      setFlowers((f) =>
        f.map((flower) => {
          if (flower.isTop && flower.left < 100 && flower.height !== -1) {
            setScore((s) => s + 1);
            return { ...flower, height: -1 }; // mark “scored”
          }
          return flower;
        })
      );

      // 5) Collision detection
      const butterfly = butterflyRef.current;
      const gameArea = gameAreaRef.current;
      if (butterfly && gameArea) {
        const bRect = butterfly.getBoundingClientRect();
        const gRect = gameArea.getBoundingClientRect();

        // A) Hitting ceiling/floor?
        if (bRect.top < gRect.top || bRect.bottom > gRect.bottom) {
          setGameOver(true);
        }

        // B) Hitting any flower
        flowers.forEach((flower) => {
          const fLeft = flower.left + gRect.left;
          const fTop = flower.top + gRect.top;
          const fWidth = 80;
          const fHeight = flower.height;

          // Shrink collision box by 10px on each side
          const COLLISION_SHRINK = 10;
          const fRect = {
            left: fLeft + COLLISION_SHRINK,
            right: fLeft + fWidth - COLLISION_SHRINK,
            top: fTop + COLLISION_SHRINK,
            bottom: fTop + fHeight - COLLISION_SHRINK,
          };

          if (
            bRect.right > fRect.left &&
            bRect.left < fRect.right &&
            bRect.bottom > fRect.top &&
            bRect.top < fRect.bottom
          ) {
            setGameOver(true);
          }
        });
      }

      // 6) Stop & show message at 10 points
      if (score >= 26) {
        setGameFrozen(true);
        setShowAnniversaryMessage(true);
      }
    }, 1000 / FPS);

    return () => clearInterval(interval);
  }, [gameStarted, gameOver, gameFrozen, velocity, flowers, score]);

  // ─────── PAUSE MUSIC ON GAME OVER ───────
  useEffect(() => {
    if (gameOver) {
      audioRef.current?.pause();
    }
  }, [gameOver]);

  // ─────── RAINDROPS (DOM‐ONLY) ───────
  useEffect(() => {
    const spawnRaindrop = () => {
      if (!gameAreaRef.current) return;
      const container = gameAreaRef.current;
      // Count existing raindrops in DOM
      const existing = container.querySelectorAll('.raindrop').length;
      if (existing >= MAX_RAINDROPS) return;

      // Create a new <div class="raindrop">
      const drop = document.createElement('div');
      drop.className = 'raindrop';
      // Random horizontal position 0–100%
      const leftPct = Math.random() * 100;
      drop.style.left = `${leftPct}%`;
      // Random 5–8s duration
      const duration = Math.random() * 3 + 5; // [5,8]
      drop.style.animationDuration = `${duration}s`;
      // Randomly choose 'O' or 'L'
      drop.textContent = Math.random() < 0.5 ? 'O' : 'L';

      // When animation ends, remove this <div> from DOM
      drop.addEventListener('animationend', () => {
        if (drop.parentElement) {
          drop.parentElement.removeChild(drop);
        }
      });

      container.appendChild(drop);
    };

    const interval = setInterval(spawnRaindrop, RAINDROP_SPAWN_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // ─────── RESET GAME ───────
  const resetGame = () => {
    setPosition(250);
    setVelocity(0);
    setFlowers([]);
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    setGameFrozen(false);
    setShowAnniversaryMessage(false);
    lastSpawnTimeRef.current = 0;

    // Remove any leftover raindrop DIVs
    if (gameAreaRef.current) {
      gameAreaRef.current
        .querySelectorAll('.raindrop')
        .forEach((d) => d.remove());
    }

    // Reset & rewind music
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // ─────── Images array in pairs ───────
  const pics: string[] = [
    pic1,
    pic2,
    pic3,
    pic4,
    pic5,
    pic6,
    pic7,
    pic8,
    pic9,
    pic10,
    pic11,
    pic12,
  ];

  return (
    <div className='game-container' onClick={flap} ref={gameAreaRef}>
      {/* Background Music */}
      <audio ref={audioRef} src={bgmFile} loop preload='auto' />

      {/* Butterfly */}
      <div
        className='butterfly'
        ref={butterflyRef}
        style={{ top: `${position}px` }}
      >
        🦋
      </div>

      {/* Flower Obstacles */}
      {flowers.map((flower) => (
        <div
          key={flower.id}
          className={`flower-obstacle ${flower.isTop ? 'top' : 'bottom'}`}
          style={{
            top: `${flower.top}px`,
            left: `${flower.left}px`,
            height: `${flower.height}px`,
          }}
        >
          <img
            src={flower.isTop ? lilyTopImg : lilyBottomImg}
            className='flower-image'
            alt='flower obstacle'
          />
        </div>
      ))}

      {/* Score Display */}
      <div className='score'>Score: {score}</div>

      {/* Start Screen */}
      {!gameStarted && !gameOver && (
        <div className='start-screen'>
          <h1>Fly your way in👅</h1>
          <p>Press SPACE or tap to flap!</p>
        </div>
      )}

      {/* Game Over Screen */}
      {gameOver && (
        <div className='game-over'>
          <h2>
            Oh no you lost! it's okay my love this game is all about trying,
            just like real life you have to work hard and keep trying to achieve
            the things you want hehe :*{' '}
          </h2>
          <p>Score: {score}</p>
          <button onClick={resetGame}>Try Again Bobo🤭😚💖</button>
        </div>
      )}

      {/* Anniversary Message (Scroll Animation) */}
      {showAnniversaryMessage && !gameOver && (
        <div className='anniversary-message'>
          <div className='scroll-container'>
            <div className='scroll-content'>
              {/* Render pictures two per row */}
              {Array.from({ length: 6 }).map((_, rowIdx) => (
                <div className='scroll-row' key={rowIdx}>
                  <img
                    src={pics[rowIdx * 2]}
                    className='scroll-img'
                    alt={`Anniversary pic ${rowIdx * 2 + 1}`}
                  />
                  <img
                    src={pics[rowIdx * 2 + 1]}
                    className='scroll-img'
                    alt={`Anniversary pic ${rowIdx * 2 + 2}`}
                  />
                </div>
              ))}

              {/* Final Message at bottom of scroll */}
              <div className='scroll-final'>
                <h2>Happy 2 Year Anniversary my Bobo🤭😚💖!</h2>
                <p>
                  I Love you thoooo muchth im so proud of us, reaching 2 years
                  in this relationship was nothing but an achievement and it
                  took a lot of hard work from the both of us and im so glad to
                  have you in my life my bobo, i hope we stay like this forever
                  and ever bye bye saddy waddy! no saddy waddy, keep studying
                  and working hard and i love you thooo muchth🤭😚💖,, Howsmichu
                  from instagram🚬
                </p>
                <button onClick={resetGame}>Restart</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ButterflyGame;
