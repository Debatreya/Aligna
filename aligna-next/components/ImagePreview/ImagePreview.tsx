'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ImagePreviewProps, Point, AspectRatio, EnhancementMode } from '@/lib/types';
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
  customRatio = { width: 1, height: 1 },
  isDocLocked = false,
  onDocLockToggle,
  onAutoDetect
}: ImagePreviewProps) {
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement>(null);
  const [draggingPoint, setDraggingPoint] = useState<number | null>(null);
  const [localCorners, setLocalCorners] = useState<Point[] | undefined>(corners);
  const [showCustomRatio, setShowCustomRatio] = useState(aspectRatio === 'custom');
  const [localCustomRatio, setLocalCustomRatio] = useState(customRatio);
  const [autoDetectedRatio, setAutoDetectedRatio] = useState<string>('Auto');
  const [timestamp, setTimestamp] = useState<string>('');
  const cornerPointRadius = 20; // Increased for better touch support

  // Keep a reference to the latest corners
  const latestCornersRef = useRef(localCorners);
  const originalRef = useRef(original);
  const isDocLockedRef = useRef(isDocLocked);
  const cornersUpdateKey = useRef(0); // Used to track when corners are updated
  const debounceTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined); // Add ref for debounce timeout with proper type and initial value

  // Helper function to find greatest common divisor (for simplifying ratios)
  const getGCD = (a: number, b: number): number => {
    return b === 0 ? a : getGCD(b, a % b);
  };

  // Calculate the aspect ratio from corners
  const calculateAutoDetectedRatio = useCallback((corners: Point[]) => {
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
  }, []);

  // Draw corners on the canvas
  const drawCorners = useCallback(() => {
    if (!originalCanvasRef.current || !localCorners) return;
    const ctx = originalCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Clear previous drawings
    ctx.clearRect(0, 0, originalCanvasRef.current.width, originalCanvasRef.current.height);
    
    // Create an image object if original is a string
    let img: HTMLImageElement | HTMLCanvasElement;
    if (typeof originalRef.current === 'string') {
      img = new Image();
      img.src = originalRef.current;
      // Make sure the image is loaded before drawing
      if (!(img as HTMLImageElement).complete) {
        img.onload = () => drawCorners();
        return;
      }
    } else if (originalRef.current) {
      img = originalRef.current;
    } else {
      return;
    }
    
    // Draw the image
    ctx.drawImage(img, 0, 0);

    // Don't draw corners if document is locked
    if (isDocLockedRef.current) return;

    // Draw connecting lines with improved rendering for better visibility
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';  // Slightly transparent green
    ctx.lineWidth = 3;  // Thicker line for better visibility
    ctx.beginPath();
    localCorners.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.closePath();
    ctx.stroke();

    // Draw corner points with improved visibility
    localCorners.forEach(point => {
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
  }, [localCorners, cornerPointRadius, originalRef]);

  // Update refs when props change
  useEffect(() => {
    originalRef.current = original;
    isDocLockedRef.current = isDocLocked;
  }, [original, isDocLocked]);
  
  // Update local corners when props change
  useEffect(() => {
    if (!corners) return;
    
    setLocalCorners(corners);
    latestCornersRef.current = corners;
    
    // Calculate the auto-detected aspect ratio when corners change
    if (corners.length === 4) {
      calculateAutoDetectedRatio(corners);
    }
    
    // Increment the update key to trigger a redraw
    cornersUpdateKey.current += 1;
    
    // Redraw corners on the canvas whenever they change
    setTimeout(() => {
      drawCorners();
    }, 0);
    
  }, [corners, calculateAutoDetectedRatio, drawCorners]);

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
  }, [original, drawCorners]);

  // Update processed image when it changes
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

  // Redraw corners when lock state changes
  useEffect(() => {
    drawCorners();
  }, [isDocLocked, drawCorners]);

  useEffect(() => {
    if (corners) {
      calculateAutoDetectedRatio(corners);
      drawCorners();
    }
  }, [corners, calculateAutoDetectedRatio, drawCorners]);

  // Debounced version of onCornersChange to avoid excessive processing
  const debouncedProcessCorners = useCallback((corners: Point[]) => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      onCornersChange?.(corners);
      debounceTimeoutRef.current = undefined;
    }, 100);
  }, [onCornersChange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!localCorners || isDocLocked) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
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
    if (draggingPoint === null || !localCorners || isDocLocked) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;

    const newCorners = [...localCorners];
    newCorners[draggingPoint] = { x: scaledX, y: scaledY };
    
    // Update local state immediately for responsive UI
    setLocalCorners(newCorners);
    latestCornersRef.current = newCorners;
    
    // Redraw corners immediately 
    drawCorners();
    
    // Process corners with debounce
    debouncedProcessCorners(newCorners);
  };

  const handleMouseUp = () => {
    if (draggingPoint !== null && latestCornersRef.current) {
      // On mouse up, make sure we've applied the final position
      onCornersChange?.(latestCornersRef.current);
    }
    setDraggingPoint(null);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!localCorners || isDocLocked) return;
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

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (draggingPoint === null || !localCorners || isDocLocked) return;
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
    
    // Update local state immediately for responsive UI
    setLocalCorners(newCorners);
    latestCornersRef.current = newCorners;
    
    // Redraw corners immediately 
    drawCorners();
    
    // Process corners with debounce
    debouncedProcessCorners(newCorners);
  };

  const handleTouchEnd = () => {
    if (draggingPoint !== null && latestCornersRef.current) {
      // On touch end, make sure we've applied the final position
      onCornersChange?.(latestCornersRef.current);
    }
    setDraggingPoint(null);
  };

  const handleAutoDetect = () => {
    if (!onAutoDetect || isDocLocked) return;
    
    // Call the onAutoDetect callback from the parent component
    onAutoDetect();
    
    // Note: The corners prop will be updated by the parent component,
    // which will trigger the useEffect to update localCorners and redraw
  };

  const handleToggleLock = () => {
    // Toggle the lock state and notify parent component
    const newLockState = !isDocLocked;
    onDocLockToggle?.(newLockState);
    // Update the ref immediately for UI updates
    isDocLockedRef.current = newLockState;
    
    // Ensure corners are properly drawn after lock state changes
    setTimeout(() => {
      drawCorners();
    }, 0);
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
    if (!isDocLocked) return; // Only allow changes if document is locked
    
    const newRatio = e.target.value as AspectRatio;
    setShowCustomRatio(newRatio === 'custom');
    onAspectRatioChange?.(newRatio, newRatio === 'custom' ? localCustomRatio : undefined);
  };

  const handleCustomWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isDocLocked) return; // Only allow changes if document is locked
    
    const width = parseInt(e.target.value) || 1;
    const newCustomRatio = { ...localCustomRatio, width };
    setLocalCustomRatio(newCustomRatio);
    if (aspectRatio === 'custom') {
      onAspectRatioChange?.('custom', newCustomRatio);
    }
  };

  const handleCustomHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isDocLocked) return; // Only allow changes if document is locked
    
    const height = parseInt(e.target.value) || 1;
    const newCustomRatio = { ...localCustomRatio, height };
    setLocalCustomRatio(newCustomRatio);
    if (aspectRatio === 'custom') {
      onAspectRatioChange?.('custom', newCustomRatio);
    }
  };

  const handleEnhancementModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!isDocLocked) return; // Only allow changes if document is locked
    onEnhancementModeChange?.(e.target.value as EnhancementMode);
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
            {!isDocLocked && (
              <button onClick={handleAutoDetect} className={styles.button}>
                Auto Detect
              </button>
            )}
            <button 
              onClick={handleToggleLock} 
              className={`${styles.button} ${isDocLocked ? styles.unlockButton : styles.lockButton}`}
            >
              {isDocLocked ? 'Unlock Doc' : 'Lock Doc'}
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
      
      <div className={`${styles.controls} ${!isDocLocked ? styles.disabledControls : ''}`}>
        <div className={styles.controlGroup}>
          <label className={styles.label}>Enhancement Mode:</label>
          <select
            value={enhancementMode}
            onChange={handleEnhancementModeChange}
            className={styles.select}
            disabled={!isDocLocked}
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
            disabled={!isDocLocked}
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
                disabled={!isDocLocked}
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
                disabled={!isDocLocked}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 