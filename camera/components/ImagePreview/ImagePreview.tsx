'use client';

import { useEffect, useRef, useState } from 'react';
import { ImagePreviewProps, Point, AspectRatio } from '@/lib/types';
import { downloadCanvas } from '@/utils/canvas-helpers';
import styles from './styles.module.css';

export default function ImagePreview({
  original,
  processed,
  corners,
  onCornersChange,
  enhancementMode = 'color',
  onEnhancementModeChange,
  aspectRatio = 'auto',
  onAspectRatioChange,
  customRatio = { width: 1, height: 1 }
}: ImagePreviewProps) {
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingPoint, setDraggingPoint] = useState<number | null>(null);
  const [localCorners, setLocalCorners] = useState<Point[] | undefined>(corners);
  const [showCustomRatio, setShowCustomRatio] = useState(aspectRatio === 'custom');
  const [localCustomRatio, setLocalCustomRatio] = useState(customRatio);
  const [autoDetectedRatio, setAutoDetectedRatio] = useState<string>('Auto');
  const [timestamp, setTimestamp] = useState<string>('');
  const cornerPointRadius = 12; // Increased from 5 for better touch support

  useEffect(() => {
    setLocalCorners(corners);
    // Calculate the auto-detected aspect ratio when corners change
    if (corners && corners.length === 4) {
      calculateAutoDetectedRatio(corners);
    }
  }, [corners]);

  useEffect(() => {
    setShowCustomRatio(aspectRatio === 'custom');
  }, [aspectRatio]);

  // Set timestamp when the image is first loaded
  useEffect(() => {
    if (original && !timestamp) {
      // Generate a timestamp string in the format YYYYMMDD_HHmmss
      const now = new Date();
      const timestampStr = now.getFullYear() +
                          (now.getMonth() + 1).toString().padStart(2, '0') +
                          now.getDate().toString().padStart(2, '0') + '_' +
                          now.getHours().toString().padStart(2, '0') +
                          now.getMinutes().toString().padStart(2, '0') +
                          now.getSeconds().toString().padStart(2, '0');
      setTimestamp(timestampStr);
    }
  }, [original, timestamp]);

  // Calculate the aspect ratio from corners
  const calculateAutoDetectedRatio = (corners: Point[]) => {
    if (!corners || corners.length !== 4) return;
    
    // Calculate width and height based on corners
    const width = Math.max(
      Math.sqrt(Math.pow(corners[1].x - corners[0].x, 2) + Math.pow(corners[1].y - corners[0].y, 2)),
      Math.sqrt(Math.pow(corners[2].x - corners[3].x, 2) + Math.pow(corners[2].y - corners[3].y, 2))
    );
    
    const height = Math.max(
      Math.sqrt(Math.pow(corners[3].x - corners[0].x, 2) + Math.pow(corners[3].y - corners[0].y, 2)),
      Math.sqrt(Math.pow(corners[2].x - corners[1].x, 2) + Math.pow(corners[2].y - corners[1].y, 2))
    );
    
    // Find the simplified ratio
    const gcd = getGCD(Math.round(width), Math.round(height));
    const simplifiedWidth = Math.round(width / gcd);
    const simplifiedHeight = Math.round(height / gcd);
    
    // Format as string with actual ratio value
    const ratioText = `${simplifiedWidth}:${simplifiedHeight}`;
    setAutoDetectedRatio(ratioText);
  };
  
  // Helper function to find greatest common divisor (for simplifying ratios)
  const getGCD = (a: number, b: number): number => {
    return b === 0 ? a : getGCD(b, a % b);
  };

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

    // Draw connecting lines with improved rendering for better visibility
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';  // Slightly transparent green
    ctx.lineWidth = 3;  // Thicker line for better visibility
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

    // Draw corner points with improved visibility
    localCorners.forEach((point, index) => {
      // Outer circle (border)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';  // Black border
      ctx.beginPath();
      ctx.arc(point.x, point.y, cornerPointRadius + 2, 0, 2 * Math.PI);
      ctx.fill();
      
      // Inner circle
      ctx.fillStyle = '#00ff00';  // Bright green
      ctx.beginPath();
      ctx.arc(point.x, point.y, cornerPointRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add a white center for better visibility
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(point.x, point.y, cornerPointRadius / 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Update auto-detected ratio when corners change
    calculateAutoDetectedRatio(localCorners);
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
      (point) => Math.hypot(point.x - scaledX, point.y - scaledY) < cornerPointRadius * 2  // Increased touch area
    );

    if (pointIndex !== -1) {
      setDraggingPoint(pointIndex);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!localCorners) return;
    e.preventDefault(); // Prevent scrolling

    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;

    const pointIndex = localCorners.findIndex(
      (point) => Math.hypot(point.x - scaledX, point.y - scaledY) < cornerPointRadius * 2
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

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (draggingPoint === null || !localCorners) return;
    e.preventDefault(); // Prevent scrolling

    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
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

  const handleTouchEnd = () => {
    setDraggingPoint(null);
  };

  const handleAutoDetect = () => {
    if (corners) {
      onCornersChange?.(corners);
    }
  };

  const handleSaveOriginal = () => {
    if (originalCanvasRef.current) {
      const filename = `original_${timestamp || 'document'}.png`;
      downloadCanvas(originalCanvasRef.current, filename);
    }
  };

  const handleSaveProcessed = () => {
    if (processedCanvasRef.current) {
      const filename = `processed_${timestamp || 'document'}.png`;
      downloadCanvas(processedCanvasRef.current, filename);
    }
  };

  const handleAspectRatioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRatio = e.target.value as AspectRatio;
    setShowCustomRatio(newRatio === 'custom');
    onAspectRatioChange?.(newRatio, newRatio === 'custom' ? localCustomRatio : undefined);
  };

  const handleCustomWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const width = parseInt(e.target.value) || 1;
    const newCustomRatio = { ...localCustomRatio, width };
    setLocalCustomRatio(newCustomRatio);
    if (aspectRatio === 'custom') {
      onAspectRatioChange?.('custom', newCustomRatio);
    }
  };

  const handleCustomHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const height = parseInt(e.target.value) || 1;
    const newCustomRatio = { ...localCustomRatio, height };
    setLocalCustomRatio(newCustomRatio);
    if (aspectRatio === 'custom') {
      onAspectRatioChange?.('custom', newCustomRatio);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.imageContainer}>
        <div className={styles.imageWrapper}>
          <canvas
            ref={originalCanvasRef}
            className={styles.canvas}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          <div className={styles.buttonGroup}>
            <button onClick={handleAutoDetect} className={styles.button}>
              Auto Detect
            </button>
            <button onClick={handleSaveOriginal} className={styles.button}>
              Save Original
            </button>
          </div>
        </div>

        {processed && (
          <div className={styles.imageWrapper}>
            <canvas
              ref={processedCanvasRef}
              className={styles.canvas}
            />
            <div className={styles.buttonGroup}>
              <button onClick={handleSaveProcessed} className={styles.button}>
                Save Processed
              </button>
            </div>
          </div>
        )}
      </div>
      
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label className={styles.label}>Enhancement Mode:</label>
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

        <div className={styles.controlGroup}>
          <label className={styles.label}>Aspect Ratio:</label>
          <select
            value={aspectRatio}
            onChange={handleAspectRatioChange}
            className={styles.select}
          >
            <option value="auto">Auto ({autoDetectedRatio})</option>
            <option value="square">Square (1:1)</option>
            <option value="4:3">4:3</option>
            <option value="16:9">16:9</option>
            <option value="3:2">3:2</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {showCustomRatio && (
          <div className={styles.customRatioContainer}>
            <div className={styles.customRatioGroup}>
              <label className={styles.smallLabel}>Width:</label>
              <input
                type="number"
                min="1"
                value={localCustomRatio.width}
                onChange={handleCustomWidthChange}
                className={styles.numberInput}
              />
            </div>
            <span className={styles.ratioSeparator}>:</span>
            <div className={styles.customRatioGroup}>
              <label className={styles.smallLabel}>Height:</label>
              <input
                type="number"
                min="1"
                value={localCustomRatio.height}
                onChange={handleCustomHeightChange}
                className={styles.numberInput}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 