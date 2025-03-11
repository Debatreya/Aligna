'use client';

import { useState, useRef } from 'react';
import DocumentScanner from '@/components/DocumentScanner/DocumentScanner';
import styles from './page.module.css';

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentScannerRef = useRef<any>(null);

  const handleProcessedImage = (canvas: HTMLCanvasElement) => {
    setProcessedImage(canvas);
    console.log('Image processed:', canvas);
  };

  const handleError = (error: Error) => {
    setError(error.message);
    console.error('Scanner error:', error);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          // Pass the canvas to the DocumentScanner's handleImageCapture
          if (documentScannerRef.current?.handleImageCapture) {
            documentScannerRef.current.handleImageCapture(canvas);
          }
        } else {
          setError('Could not create canvas context');
        }
      };
      img.onerror = () => {
        setError('Failed to load image');
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Document Scanner</h1>
      
      <div className={styles.uploadSection}>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          ref={fileInputRef}
          style={{ display: 'none' }}
        />
        <button 
          className={styles.uploadButton}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload Image
        </button>
      </div>
      
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <DocumentScanner
        ref={documentScannerRef}
        onImageProcessed={handleProcessedImage}
        onError={handleError}
      />
    </main>
  );
}
