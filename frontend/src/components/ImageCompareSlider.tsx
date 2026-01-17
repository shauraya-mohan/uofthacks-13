'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface ImageCompareSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export default function ImageCompareSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Before',
  afterLabel = 'After',
  className = '',
}: ImageCompareSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleMove(e.clientX);
  }, [handleMove]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      handleMove(e.touches[0].clientX);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleMove]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-lg select-none cursor-col-resize ${className}`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* After image (full width, bottom layer) */}
      <div className="relative w-full h-56 bg-[#262626]">
        <img
          src={afterImage}
          alt="After fix"
          className="w-full h-full object-contain"
          draggable={false}
        />
        {/* After label */}
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-green-600/90 backdrop-blur-sm rounded text-xs font-medium text-white shadow-lg">
          {afterLabel}
        </div>
      </div>

      {/* Before image (clipped, top layer) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <div className="relative w-full h-56 bg-[#262626]" style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '100%' }}>
          <img
            src={beforeImage}
            alt="Before fix"
            className="w-full h-full object-contain"
            draggable={false}
          />
          {/* Before label */}
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-red-600/90 backdrop-blur-sm rounded text-xs font-medium text-white shadow-lg">
            {beforeLabel}
          </div>
        </div>
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-10"
        style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
      >
        {/* Handle circle */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transition-transform ${
            isDragging ? 'scale-110' : 'hover:scale-105'
          }`}
        >
          {/* Arrows icon */}
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>

      {/* Drag hint (shows briefly on first render) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 animate-fade-hint">
        <div className="px-3 py-1.5 bg-black/70 backdrop-blur rounded-full text-white text-xs font-medium">
          Drag to compare
        </div>
      </div>
    </div>
  );
}
