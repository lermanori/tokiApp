import React, { useState, useRef, useEffect, useCallback } from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const ZOOM_STEP = 0.2;

interface ZoomableImageProps {
  imageUrl: string;
  onSwipeDown?: () => void;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({ imageUrl }) => {
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  const resetPosition = useCallback(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setScale(prev => Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev + delta)));

    if (scale <= MIN_SCALE + ZOOM_STEP) {
      resetPosition();
    }
  }, [scale, resetPosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setLastPos({ x: e.clientX, y: e.clientY });
    }
  }, [scale]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      const deltaX = e.clientX - lastPos.x;
      const deltaY = e.clientY - lastPos.y;

      setTranslateX(prev => prev + deltaX);
      setTranslateY(prev => prev + deltaY);
      setLastPos({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, lastPos, scale]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      resetPosition();
    } else {
      setScale(2);
    }
  }, [scale, resetPosition]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case '+':
        case '=':
          setScale(prev => Math.min(MAX_SCALE, prev + ZOOM_STEP));
          break;
        case '-':
        case '_':
          setScale(prev => {
            const newScale = Math.max(MIN_SCALE, prev - ZOOM_STEP);
            if (newScale === MIN_SCALE) {
              resetPosition();
            }
            return newScale;
          });
          break;
        case 'ArrowLeft':
          if (scale > 1) setTranslateX(prev => prev + 50);
          break;
        case 'ArrowRight':
          if (scale > 1) setTranslateX(prev => prev - 50);
          break;
        case 'ArrowUp':
          if (scale > 1) setTranslateY(prev => prev + 50);
          break;
        case 'ArrowDown':
          if (scale > 1) setTranslateY(prev => prev - 50);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scale, resetPosition]);

  const getCursor = () => {
    if (scale > 1) {
      return isDragging ? 'grabbing' : 'grab';
    }
    return 'default';
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        userSelect: 'none',
      }}
    >
      <div
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: getCursor(),
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          willChange: 'transform',
        }}
      >
        <img
          src={imageUrl}
          alt="User photo"
          style={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            objectFit: 'contain',
            pointerEvents: 'none',
          }}
          draggable={false}
        />
      </div>
    </div>
  );
};

export default ZoomableImage;
