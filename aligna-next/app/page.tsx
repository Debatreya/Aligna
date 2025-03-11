'use client';

import { useState, useRef } from 'react';
import DocumentScanner from '@/components/DocumentScanner/DocumentScanner';
import styles from './page.module.css';

type DocumentScannerRef = {
  handleImageCapture: (canvas: HTMLCanvasElement) => Promise<void>;
};

export default function Home() {
  const [error, setError] = useState<string | null>(null);
  const documentScannerRef = useRef<DocumentScannerRef | null>(null);

  const handleProcessedImage = (canvas: HTMLCanvasElement) => {
    console.log('Image processed:', canvas);
  };

  const handleError = (error: Error) => {
    setError(error.message);
    console.error('Scanner error:', error);
  };

  return (
    <main className={styles.main}>
      <div className={styles.titleContainer}>
        <h1 className={styles.title}>Aligna</h1>
        <h2 className={styles.subtitle}>The Document Scanner</h2>
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
