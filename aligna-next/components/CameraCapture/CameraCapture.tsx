'use client';

import { useEffect, useRef, useState } from 'react';
import { CameraCaptureProps } from '@/lib/types';
import styles from './styles.module.css';

export default function CameraCapture({ onCapture, onError }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Check if the browser supports getUserMedia
  const checkCameraSupport = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      // For older browsers and iOS Safari which may not support navigator.mediaDevices
      const mediaDevices = navigator.mediaDevices || 
        ((navigator as any).mozGetUserMedia || 
        (navigator as any).webkitGetUserMedia || 
        (navigator as any).msGetUserMedia);
        
      if (!mediaDevices) {
        setError('Camera access is not supported by this browser');
        onError?.(new Error('Camera access is not supported by this browser'));
        return false;
      }
    }
    return true;
  };

  const startCamera = async () => {
    // First clear any previous errors
    setError(null);
    
    // Check browser support
    if (!checkCameraSupport()) return;
    
    try {
      // Handle iOS Safari and other browsers that may have different getUserMedia implementations
      const getUserMedia = navigator.mediaDevices?.getUserMedia || 
        ((navigator as any).mozGetUserMedia || 
        (navigator as any).webkitGetUserMedia || 
        (navigator as any).msGetUserMedia);
      
      if (!getUserMedia) {
        throw new Error('Camera access is not supported by this browser');
      }
      
      // Use appropriate constraints for mobile devices
      const constraints = { 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      
      // Get the stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Apply stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(e => {
              console.error('Error playing video:', e);
              setError('Could not play video stream. Please check your browser settings.');
              onError?.(new Error('Could not play video stream'));
            });
          }
        };
      }
      
      setIsStreaming(true);
    } catch (err) {
      console.error('Camera access error:', err);
      let errorMessage = 'Failed to access camera';
      
      if (err instanceof Error) {
        // Provide more specific error messages for common issues
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Camera access was denied. Please allow camera access in your browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Camera is already in use by another application.';
        } else if (err.name === 'OverconstrainedError') {
          errorMessage = 'Camera does not meet requirements. Try with a different camera.';
        } else {
          errorMessage = `Camera error: ${err.message}`;
        }
      }
      
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

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(videoRef.current, 0, 0);
      onCapture(canvas);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture image';
      setError(errorMessage);
      onError?.(new Error(errorMessage));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const img = new Image();
      img.onload = () => {
        // Create a canvas and draw the image on it
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }
        ctx.drawImage(img, 0, 0);
        
        // Pass the canvas to the onCapture handler
        onCapture(canvas);
      };
      
      img.onerror = () => {
        throw new Error('Failed to load image');
      };
      
      img.src = URL.createObjectURL(file);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process image';
      setError(errorMessage);
      onError?.(new Error(errorMessage));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.videoContainer}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={styles.video}
        />
      </div>
      
      <div className={styles.controls}>
        {!isStreaming ? (
          <>
            <button 
              onClick={startCamera}
              className={styles.button}
            >
              Start Camera
            </button>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className={styles.fileInput}
              ref={fileInputRef}
              id="fileInput"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className={styles.fileUploadLabel}
            >
              Upload Image
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={stopCamera}
              className={`${styles.button} ${styles.stopButton}`}
            >
              Stop Camera
            </button>
            <button 
              onClick={captureImage}
              className={styles.button}
            >
              Capture Document
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