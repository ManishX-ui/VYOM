import React, { useEffect, useRef, useState, useCallback } from 'react';

interface InteractiveUAVViewerProps {
  className?: string;
  onBearingChange?: (bearing: number, frame: number) => void;
}

const TOTAL_FRAMES = 300;
const FRAME_PATH_PREFIX = '/assets/drone-frames/ezgif-frame-';

function getFrameUrl(index: number): string {
  const normalized = ((((index - 1) % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES) + 1;
  const padded = String(normalized).padStart(3, '0');
  return `${FRAME_PATH_PREFIX}${padded}.jpg`;
}

export const InteractiveUAVViewer: React.FC<InteractiveUAVViewerProps> = ({
  className = '',
  onBearingChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Loaded images cache
  const imagesCacheRef = useRef<Map<number, HTMLImageElement>>(new Map());

  // Interaction & animation refs
  const currentFrameRef = useRef<number>(1);
  const targetFrameRef = useRef<number>(1);
  const isDraggingRef = useRef<boolean>(false);
  const lastPointerXRef = useRef<number>(0);
  const lastMouseXRef = useRef<number | null>(null);
  const rafIdRef = useRef<number>(0);

  // Component UI state
  const [isInitialLoaded, setIsInitialLoaded] = useState<boolean>(false);

  // Draw current frame to canvas
  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const normalized = ((((Math.round(frameIndex) - 1) % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES) + 1;

    // Try target image
    let img = imagesCacheRef.current.get(normalized);

    // If not loaded yet, find nearest loaded frame
    if (!img || !img.complete || img.naturalWidth === 0) {
      let nearestDist = Infinity;
      let nearestIndex = 1;
      for (const [key, cachedImg] of imagesCacheRef.current.entries()) {
        if (cachedImg.complete && cachedImg.naturalWidth > 0) {
          const dist = Math.min(
            Math.abs(key - normalized),
            TOTAL_FRAMES - Math.abs(key - normalized)
          );
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestIndex = key;
          }
        }
      }
      img = imagesCacheRef.current.get(nearestIndex);
    }

    if (img && img.complete && img.naturalWidth > 0) {
      if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Preload frame assets progressively
  useEffect(() => {
    let isCancelled = false;

    const loadImage = (index: number): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        if (imagesCacheRef.current.has(index)) {
          resolve(imagesCacheRef.current.get(index)!);
          return;
        }
        const img = new Image();
        img.src = getFrameUrl(index);
        img.onload = () => {
          if (!isCancelled) {
            imagesCacheRef.current.set(index, img);
            resolve(img);
          }
        };
        img.onerror = reject;
      });
    };

    // Stage 1: Load frame 1 immediately and draw
    loadImage(1).then(() => {
      if (!isCancelled) {
        setIsInitialLoaded(true);
        drawFrame(1);
      }
    });

    // Stage 2: Load keyframes around the full 360 circle (every 4th frame = 75 frames)
    const keyframes: number[] = [];
    for (let i = 1; i <= TOTAL_FRAMES; i += 4) {
      if (i !== 1) keyframes.push(i);
    }

    Promise.all(keyframes.map((idx) => loadImage(idx))).then(() => {
      if (isCancelled) return;
      // Stage 3: Load remaining frames in batches of 20
      const remaining: number[] = [];
      for (let i = 1; i <= TOTAL_FRAMES; i++) {
        if (!imagesCacheRef.current.has(i)) {
          remaining.push(i);
        }
      }

      const batchSize = 20;
      let batchIndex = 0;

      const loadNextBatch = () => {
        if (isCancelled || batchIndex >= remaining.length) return;
        const currentBatch = remaining.slice(batchIndex, batchIndex + batchSize);
        batchIndex += batchSize;
        Promise.all(currentBatch.map((idx) => loadImage(idx))).then(() => {
          if (!isCancelled) {
            if ('requestIdleCallback' in window) {
              (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(loadNextBatch);
            } else {
              setTimeout(loadNextBatch, 40);
            }
          }
        });
      };

      loadNextBatch();
    });

    return () => {
      isCancelled = true;
    };
  }, [drawFrame]);

  // Main Animation Loop with smooth lerping (Strictly reacts to cursor)
  useEffect(() => {
    const animate = () => {
      let diff = targetFrameRef.current - currentFrameRef.current;
      if (diff > TOTAL_FRAMES / 2) diff -= TOTAL_FRAMES;
      if (diff < -TOTAL_FRAMES / 2) diff += TOTAL_FRAMES;

      if (Math.abs(diff) > 0.01) {
        currentFrameRef.current += diff * 0.16;
        while (currentFrameRef.current > TOTAL_FRAMES) currentFrameRef.current -= TOTAL_FRAMES;
        while (currentFrameRef.current < 1) currentFrameRef.current += TOTAL_FRAMES;

        const renderedFrame = Math.round(currentFrameRef.current);
        drawFrame(renderedFrame);
        const bearing = Math.round(((renderedFrame - 1) / TOTAL_FRAMES) * 360) % 360;
        if (onBearingChange) {
          onBearingChange(bearing, renderedFrame);
        }
      }

      rafIdRef.current = requestAnimationFrame(animate);
    };

    rafIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [drawFrame, onBearingChange]);

  // Window-level cursor tracking: Reacts to cursor movement anywhere across the page
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) return;

      const width = window.innerWidth;
      if (lastMouseXRef.current !== null) {
        const deltaX = e.clientX - lastMouseXRef.current;
        const frameShift = (deltaX / width) * TOTAL_FRAMES * 1.25;
        let nextTarget = targetFrameRef.current + frameShift;
        while (nextTarget > TOTAL_FRAMES) nextTarget -= TOTAL_FRAMES;
        while (nextTarget < 1) nextTarget += TOTAL_FRAMES;
        targetFrameRef.current = nextTarget;
      }
      lastMouseXRef.current = e.clientX;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, []);

  // Pointer/Touch Drag handlers for direct drag or mobile touch
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    lastPointerXRef.current = e.clientX;

    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // fallback
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastPointerXRef.current;
    lastPointerXRef.current = e.clientX;

    const frameShift = deltaX * 0.55;
    let nextTarget = targetFrameRef.current + frameShift;
    while (nextTarget > TOTAL_FRAMES) nextTarget -= TOTAL_FRAMES;
    while (nextTarget < 1) nextTarget += TOTAL_FRAMES;

    targetFrameRef.current = nextTarget;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    if (e.currentTarget.releasePointerCapture) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // fallback
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full h-full select-none overflow-hidden flex items-center justify-center cursor-ew-resize ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* 360 Canvas */}
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        className="w-full h-full object-contain filter drop-shadow-[0_25px_50px_rgba(0,0,0,0.85)] pointer-events-none"
      />

      {/* Subtle Initial Loading Indicator */}
      {!isInitialLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070b14] text-white z-20">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin mb-3" />
        </div>
      )}
    </div>
  );
};
