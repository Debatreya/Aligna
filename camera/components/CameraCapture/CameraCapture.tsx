'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraCaptureProps } from '@/lib/types';
import styles from './styles.module.css';

export default function CameraCapture({ onCapture, onError }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setIsStreaming(true);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
      onError?.(new Error(errorMessage));
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !isStreaming) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    if (!ctx) {
      const error = new Error('Failed to get canvas context');
      setError(error.message);
      onError?.(error);
      return;
    }

    ctx.drawImage(videoRef.current, 0, 0);
    onCapture(canvas);
  };

  return (
    <div className={styles.container}>
      <div className={styles.videoContainer}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={styles.video}
        />
      </div>
      
      <div className={styles.controls}>
        {!isStreaming ? (
          <button 
            onClick={startCamera}
            className={styles.button}
          >
            Start Camera
          </button>
        ) : (
          <>
            <button 
              onClick={captureImage}
              className={styles.button}
            >
              Capture
            </button>
            <button 
              onClick={stopCamera}
              className={`${styles.button} ${styles.stopButton}`}
            >
              Stop Camera
            </button>
          </>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
    </div>
  );
} 