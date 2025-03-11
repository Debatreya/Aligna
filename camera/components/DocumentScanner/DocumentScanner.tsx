'use client';

import { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { DocumentScanner as Scanner } from '@/lib/document-scanner';
import { DocumentScannerProps, Point, EnhancementMode, AspectRatio } from '@/lib/types';
import CameraCapture from '../CameraCapture/CameraCapture';
import ImagePreview from '../ImagePreview/ImagePreview';
import styles from './styles.module.css';

const DocumentScanner = forwardRef<{ handleImageCapture: (canvas: HTMLCanvasElement) => Promise<void> }, DocumentScannerProps>(
  ({ onImageProcessed, onError }, ref) => {
    const [documentScanner, setDocumentScanner] = useState<Scanner | null>(null);
    const [originalImage, setOriginalImage] = useState<HTMLCanvasElement | null>(null);
    const [processedImage, setProcessedImage] = useState<HTMLCanvasElement | null>(null);
    // Store the original detected corners separately
    const [detectedCorners, setDetectedCorners] = useState<Point[] | undefined>();
    // Working corners that can be modified by the user
    const [corners, setCorners] = useState<Point[] | undefined>();
    const [croppedImage, setCroppedImage] = useState<HTMLCanvasElement | null>(null);
    const [enhancementMode, setEnhancementMode] = useState<EnhancementMode>('color');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('auto');
    const [customRatio, setCustomRatio] = useState<{ width: number, height: number }>({ width: 1, height: 1 });
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDocLocked, setIsDocLocked] = useState(false);

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
        
        // Reset locked state when capturing a new image
        setIsDocLocked(false);
        
        // Detect corners and store them - using original detection algorithm
        const detectedCorners = documentScanner.detect(canvas);
        setDetectedCorners([...detectedCorners]); // Store a copy of the detected corners
        setCorners([...detectedCorners]); // Set initial working corners
        
        // Crop with detected corners
        const croppedCanvas = documentScanner.crop(canvas, detectedCorners);
        setCroppedImage(croppedCanvas);
        
        // Apply enhancement
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
      
      try {
        // Update corner points
        setCorners(newCorners);
        
        // Crop with new corners
        const croppedCanvas = documentScanner.crop(originalImage, newCorners);
        setCroppedImage(croppedCanvas);
        
        // Apply enhancement to the cropped image
        const enhancedCanvas = documentScanner.enhance(croppedCanvas, enhancementMode);
        setProcessedImage(enhancedCanvas);
        onImageProcessed?.(enhancedCanvas);
      } catch (error) {
        console.error('Error updating image:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to update image'));
      }
    }, [documentScanner, originalImage, enhancementMode, onImageProcessed, onError]);

    const handleAutoDetect = useCallback(() => {
      if (!detectedCorners || !originalImage || !documentScanner) return;
      
      try {
        console.log('Applying auto-detected corners');
        
        // Reset to the original detected corners (create a fresh copy)
        const originalDetectedCorners = [...detectedCorners];
        setCorners(originalDetectedCorners);
        
        // Re-crop with original detected corners
        const croppedCanvas = documentScanner.crop(originalImage, originalDetectedCorners);
        setCroppedImage(croppedCanvas);
        
        // Apply enhancement to the cropped image
        const enhancedCanvas = documentScanner.enhance(croppedCanvas, enhancementMode);
        setProcessedImage(enhancedCanvas);
        onImageProcessed?.(enhancedCanvas);
      } catch (error) {
        console.error('Error applying auto-detected corners:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to apply auto-detected corners'));
      }
    }, [detectedCorners, documentScanner, originalImage, enhancementMode, onImageProcessed, onError]);

    const handleEnhancementModeChange = useCallback((mode: EnhancementMode) => {
      if (!documentScanner || !croppedImage) return;
      
      // Update enhancement mode state
      setEnhancementMode(mode);

      try {
        // Apply the new enhancement mode to the existing cropped image
        const enhancedCanvas = documentScanner.enhance(croppedImage, mode);
        setProcessedImage(enhancedCanvas);
        onImageProcessed?.(enhancedCanvas);
      } catch (error) {
        console.error('Error updating enhancement:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to update enhancement'));
      }
    }, [documentScanner, croppedImage, onImageProcessed, onError]);

    const handleAspectRatioChange = useCallback((ratio: AspectRatio, newCustomRatio?: { width: number, height: number }) => {
      if (!documentScanner || !croppedImage) return;
      
      // Update aspect ratio state
      setAspectRatio(ratio);
      
      if (ratio === 'custom' && newCustomRatio) {
        setCustomRatio(newCustomRatio);
      }

      try {
        // For locked documents, we only apply aspect ratio changes to the already-cropped image
        let aspectAdjustedCanvas;
        
        if (ratio === 'auto') {
          // Use the current cropped image without changes
          aspectAdjustedCanvas = croppedImage;
        } else {
          // Apply aspect ratio transformation to the cropped image
          const targetWidth = croppedImage.width;
          const targetHeight = croppedImage.height;
          let newWidth, newHeight;
          
          if (ratio === 'custom' && newCustomRatio) {
            // Calculate dimensions for custom ratio
            const customRatioValue = newCustomRatio.width / newCustomRatio.height;
            if (customRatioValue > 1) {
              // Wider than tall
              newWidth = targetWidth;
              newHeight = targetWidth / customRatioValue;
            } else {
              // Taller than wide or square
              newHeight = targetHeight;
              newWidth = targetHeight * customRatioValue;
            }
          } else {
            // Calculate dimensions for predefined ratios
            let ratioValue = 1; // Default to square
            
            switch (ratio) {
              case 'square':
                ratioValue = 1;
                break;
              case '4:3':
                ratioValue = 4/3;
                break;
              case '16:9':
                ratioValue = 16/9;
                break;
              case '3:2':
                ratioValue = 3/2;
                break;
              default:
                ratioValue = 1;
            }
            
            if (ratioValue > 1) {
              // Wider than tall
              newWidth = targetWidth;
              newHeight = targetWidth / ratioValue;
            } else {
              // Taller than wide or square
              newHeight = targetHeight;
              newWidth = targetHeight * ratioValue;
            }
          }
          
          // Create a new canvas with the desired aspect ratio
          const resizedCanvas = document.createElement('canvas');
          resizedCanvas.width = newWidth;
          resizedCanvas.height = newHeight;
          const ctx = resizedCanvas.getContext('2d', { willReadFrequently: true });
          
          if (ctx) {
            // Center the image in the new canvas
            const xOffset = (newWidth - croppedImage.width) / 2;
            const yOffset = (newHeight - croppedImage.height) / 2;
            
            // Clear to white background
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, newWidth, newHeight);
            
            // Draw the cropped image centered
            ctx.drawImage(
              croppedImage, 
              Math.max(0, xOffset), 
              Math.max(0, yOffset), 
              Math.min(newWidth, croppedImage.width), 
              Math.min(newHeight, croppedImage.height)
            );
          }
          
          aspectAdjustedCanvas = resizedCanvas;
        }
        
        // Apply enhancement to the aspect-adjusted canvas
        const enhancedCanvas = documentScanner.enhance(aspectAdjustedCanvas, enhancementMode);
        setProcessedImage(enhancedCanvas);
        onImageProcessed?.(enhancedCanvas);
      } catch (error) {
        console.error('Error updating aspect ratio:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to update aspect ratio'));
      }
    }, [documentScanner, croppedImage, enhancementMode, onImageProcessed, onError]);

    const handleDocLockToggle = useCallback((locked: boolean) => {
      // Update lock state
      setIsDocLocked(locked);
      
      if (locked && originalImage && corners) {
        // When locking, create a fresh crop with current corners
        try {
          if (!documentScanner) return;
          
          // Re-crop the image with current corners
          const croppedCanvas = documentScanner.crop(originalImage, corners);
          setCroppedImage(croppedCanvas);
          
          // Re-apply enhancement with current mode
          const enhancedCanvas = documentScanner.enhance(croppedCanvas, enhancementMode);
          setProcessedImage(enhancedCanvas);
          onImageProcessed?.(enhancedCanvas);
        } catch (error) {
          console.error('Error locking document:', error);
          onError?.(error instanceof Error ? error : new Error('Failed to lock document'));
        }
      } else if (!locked) {
        // When unlocking, we keep the current corners but allow changes
        console.log('Document unlocked - corner adjustments enabled');
      }
    }, [corners, originalImage, documentScanner, enhancementMode, onImageProcessed, onError]);

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
            aspectRatio={aspectRatio}
            onAspectRatioChange={handleAspectRatioChange}
            customRatio={customRatio}
            isDocLocked={isDocLocked}
            onDocLockToggle={handleDocLockToggle}
            onAutoDetect={handleAutoDetect}
          />
        )}
      </div>
    );
  }
);

DocumentScanner.displayName = 'DocumentScanner';

export default DocumentScanner; 