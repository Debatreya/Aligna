'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePreviewProps, Point } from '@/lib/types';
import styles from './styles.module.css';

export default function ImagePreview({
  original,
  processed,
  corners,
  onCornersChange,
  enhancementMode = 'original',
  onEnhancementModeChange
}: ImagePreviewProps) {
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingPoint, setDraggingPoint] = useState<number | null>(null);
  const [localCorners, setLocalCorners] = useState<Point[] | undefined>(corners);

  useEffect(() => {
    setLocalCorners(corners);
  }, [corners]);

  useEffect(() => {
    const drawImage = async () => {
      if (!originalCanvasRef.current) return;
      const ctx = originalCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      if (typeof original === 'string') {
        const img = new Image();
        img.src = original;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        originalCanvasRef.current.width = img.naturalWidth;
        originalCanvasRef.current.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
      } else {
        originalCanvasRef.current.width = original.width;
        originalCanvasRef.current.height = original.height;
        ctx.drawImage(original, 0, 0);
      }

      drawCorners();
    };

    drawImage();
  }, [original]);

  useEffect(() => {
    const drawProcessed = async () => {
      if (!processedCanvasRef.current || !processed) return;
      const ctx = processedCanvasRef.current.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      if (typeof processed === 'string') {
        const img = new Image();
        img.src = processed;
        await new Promise((resolve) => {
          img.onload = resolve;
        });
        processedCanvasRef.current.width = img.naturalWidth;
        processedCanvasRef.current.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
      } else {
        processedCanvasRef.current.width = processed.width;
        processedCanvasRef.current.height = processed.height;
        ctx.drawImage(processed, 0, 0);
      }
    };

    drawProcessed();
  }, [processed]);

  const drawCorners = () => {
    if (!originalCanvasRef.current || !localCorners) return;
    const ctx = originalCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Clear previous drawings
    ctx.clearRect(0, 0, originalCanvasRef.current.width, originalCanvasRef.current.height);
    ctx.drawImage(typeof original === 'string' ? new Image() : original, 0, 0);

    // Draw corner points and connecting lines
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    localCorners.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.closePath();
    ctx.stroke();

    // Draw corner points
    localCorners.forEach((point) => {
      ctx.fillStyle = '#00ff00';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!localCorners) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;

    const pointIndex = localCorners.findIndex(
      (point) => Math.hypot(point.x - scaledX, point.y - scaledY) < 20
    );

    if (pointIndex !== -1) {
      setDraggingPoint(pointIndex);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingPoint === null || !localCorners) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;

    const newCorners = [...localCorners];
    newCorners[draggingPoint] = { x: scaledX, y: scaledY };
    setLocalCorners(newCorners);
    onCornersChange?.(newCorners);
    drawCorners();
  };

  const handleMouseUp = () => {
    setDraggingPoint(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.imageContainer}>
        <canvas
          ref={originalCanvasRef}
          className={styles.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        {processed && (
          <canvas
            ref={processedCanvasRef}
            className={styles.canvas}
          />
        )}
      </div>
      
      <div className={styles.controls}>
        <select
          value={enhancementMode}
          onChange={(e) => onEnhancementModeChange?.(e.target.value as any)}
          className={styles.select}
        >
          <option value="original">Original</option>
          <option value="magic">Magic</option>
          <option value="bw">Black & White</option>
          <option value="color">Color</option>
        </select>
      </div>
    </div>
  );
} 