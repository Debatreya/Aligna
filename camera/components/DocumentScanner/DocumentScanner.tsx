'use client';

import { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { DocumentScanner as Scanner } from '@/lib/document-scanner';
import { DocumentScannerProps, Point, EnhancementMode } from '@/lib/types';
import CameraCapture from '../CameraCapture/CameraCapture';
import ImagePreview from '../ImagePreview/ImagePreview';
import styles from './styles.module.css';

const DocumentScanner = forwardRef<{ handleImageCapture: (canvas: HTMLCanvasElement) => Promise<void> }, DocumentScannerProps>(
  ({ onImageProcessed, onError }, ref) => {
    const [documentScanner, setDocumentScanner] = useState<Scanner | null>(null);
    const [originalImage, setOriginalImage] = useState<HTMLCanvasElement | null>(null);
    const [processedImage, setProcessedImage] = useState<HTMLCanvasElement | null>(null);
    const [corners, setCorners] = useState<Point[] | undefined>();
    const [enhancementMode, setEnhancementMode] = useState<EnhancementMode>('original');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
      const script = document.createElement('script');
      script.src = '/opencv/opencv.js';
      script.async = true;
      script.onload = () => {
        cv.onRuntimeInitialized = () => {
          setDocumentScanner(new Scanner());
        };
      };
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }, []);

    const handleImageCapture = useCallback(async (canvas: HTMLCanvasElement) => {
      if (!documentScanner) return;

      try {
        setIsProcessing(true);
        setOriginalImage(canvas);
        const detectedCorners = documentScanner.detect(canvas);
        setCorners(detectedCorners);
        
        const croppedCanvas = documentScanner.crop(canvas, detectedCorners);
        const enhancedCanvas = documentScanner.enhance(croppedCanvas, enhancementMode);
        setProcessedImage(enhancedCanvas);
        onImageProcessed?.(enhancedCanvas);
      } catch (error) {
        console.error('Error processing image:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to process image'));
      } finally {
        setIsProcessing(false);
      }
    }, [documentScanner, enhancementMode, onImageProcessed, onError]);

    useImperativeHandle(ref, () => ({
      handleImageCapture
    }), [handleImageCapture]);

    const handleCornersChange = useCallback((newCorners: Point[]) => {
      if (!documentScanner || !originalImage) return;
      setCorners(newCorners);

      try {
        const croppedCanvas = documentScanner.crop(originalImage, newCorners);
        const enhancedCanvas = documentScanner.enhance(croppedCanvas, enhancementMode);
        setProcessedImage(enhancedCanvas);
        onImageProcessed?.(enhancedCanvas);
      } catch (error) {
        console.error('Error updating image:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to update image'));
      }
    }, [documentScanner, originalImage, enhancementMode, onImageProcessed, onError]);

    const handleEnhancementModeChange = useCallback((mode: EnhancementMode) => {
      if (!documentScanner || !originalImage || !corners) return;
      setEnhancementMode(mode);

      try {
        const croppedCanvas = documentScanner.crop(originalImage, corners);
        const enhancedCanvas = documentScanner.enhance(croppedCanvas, mode);
        setProcessedImage(enhancedCanvas);
        onImageProcessed?.(enhancedCanvas);
      } catch (error) {
        console.error('Error updating enhancement:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to update enhancement'));
      }
    }, [documentScanner, originalImage, corners, onImageProcessed, onError]);

    return (
      <div className={styles.container}>
        <CameraCapture
          onCapture={handleImageCapture}
          onError={onError}
        />
        
        {isProcessing && (
          <div className={styles.loading}>Processing...</div>
        )}

        {originalImage && (
          <ImagePreview
            original={originalImage}
            processed={processedImage}
            corners={corners}
            onCornersChange={handleCornersChange}
            enhancementMode={enhancementMode}
            onEnhancementModeChange={handleEnhancementModeChange}
          />
        )}
      </div>
    );
  }
);

DocumentScanner.displayName = 'DocumentScanner';

export default DocumentScanner; 