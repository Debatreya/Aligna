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
    const [detectedCorners, setDetectedCorners] = useState<Point[] | undefined>();
    const [corners, setCorners] = useState<Point[] | undefined>();
    const [croppedImage, setCroppedImage] = useState<HTMLCanvasElement | null>(null);
    const [enhancementMode, setEnhancementMode] = useState<EnhancementMode>('color');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('auto');
    const [customRatio, setCustomRatio] = useState<{ width: number, height: number }>({ width: 1, height: 1 });
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
        
        // Detect corners and store them - using original detection algorithm
        const corners = documentScanner.detect(canvas);
        setDetectedCorners(corners);
        setCorners(corners);
        
        // Crop with detected corners and store the cropped image
        const croppedCanvas = documentScanner.crop(canvas, corners);
        setCroppedImage(croppedCanvas);
        
        // Apply enhancement to the cropped image
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

    const handleEnhancementModeChange = useCallback((mode: EnhancementMode) => {
      if (!documentScanner || !croppedImage) return;
      setEnhancementMode(mode);

      try {
        // Just apply the new enhancement mode to the existing cropped image
        const enhancedCanvas = documentScanner.enhance(croppedImage, mode);
        setProcessedImage(enhancedCanvas);
        onImageProcessed?.(enhancedCanvas);
      } catch (error) {
        console.error('Error updating enhancement:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to update enhancement'));
      }
    }, [documentScanner, croppedImage, onImageProcessed, onError]);

    const handleAspectRatioChange = useCallback((ratio: AspectRatio, newCustomRatio?: { width: number, height: number }) => {
      if (!documentScanner || !originalImage || !detectedCorners) return;
      setAspectRatio(ratio);
      
      if (ratio === 'custom' && newCustomRatio) {
        setCustomRatio(newCustomRatio);
      }

      try {
        // Apply aspect ratio to a copy of the detected corners
        let adjustedCorners: Point[];
        
        if (ratio === 'auto') {
          // Use the original detected corners
          adjustedCorners = [...detectedCorners];
        } else if (ratio === 'custom' && newCustomRatio) {
          // Apply custom ratio
          adjustedCorners = applyCustomRatioToCorners(detectedCorners, newCustomRatio);
        } else {
          // Apply standard ratio
          adjustedCorners = applyAspectRatioToCorners(detectedCorners, ratio);
        }
        
        // Update corners state
        setCorners(adjustedCorners);
        
        // Crop with adjusted corners
        const croppedCanvas = documentScanner.crop(originalImage, adjustedCorners);
        setCroppedImage(croppedCanvas);
        
        // Apply enhancement
        const enhancedCanvas = documentScanner.enhance(croppedCanvas, enhancementMode);
        setProcessedImage(enhancedCanvas);
        onImageProcessed?.(enhancedCanvas);
      } catch (error) {
        console.error('Error updating aspect ratio:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to update aspect ratio'));
      }
    }, [documentScanner, originalImage, detectedCorners, enhancementMode, onImageProcessed, onError]);

    // Helper function to apply aspect ratio to corners
    const applyAspectRatioToCorners = (corners: Point[], ratio: AspectRatio): Point[] => {
      if (!corners || corners.length !== 4 || ratio === 'auto') return corners;
      
      // Calculate the center of the quadrilateral
      const centerX = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
      const centerY = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;
      
      // Calculate the current width and height
      const width = Math.max(
        Math.sqrt(Math.pow(corners[1].x - corners[0].x, 2) + Math.pow(corners[1].y - corners[0].y, 2)),
        Math.sqrt(Math.pow(corners[2].x - corners[3].x, 2) + Math.pow(corners[2].y - corners[3].y, 2))
      );
      
      const height = Math.max(
        Math.sqrt(Math.pow(corners[3].x - corners[0].x, 2) + Math.pow(corners[3].y - corners[0].y, 2)),
        Math.sqrt(Math.pow(corners[2].x - corners[1].x, 2) + Math.pow(corners[2].y - corners[1].y, 2))
      );
      
      // Determine the target aspect ratio
      let targetRatio = 1; // Default to square
      
      switch (ratio) {
        case 'square':
          targetRatio = 1;
          break;
        case '4:3':
          targetRatio = 4/3;
          break;
        case '16:9':
          targetRatio = 16/9;
          break;
        case '3:2':
          targetRatio = 3/2;
          break;
        default:
          return corners; // Return original corners if ratio is not recognized
      }
      
      // Calculate new dimensions while preserving area
      const currentArea = width * height;
      const newWidth = Math.sqrt(currentArea * targetRatio);
      const newHeight = newWidth / targetRatio;
      
      // Adjust corners to match the new aspect ratio
      // This is a simplified approach - we're adjusting the rectangle around the center
      const halfWidth = newWidth / 2;
      const halfHeight = newHeight / 2;
      
      return [
        { x: centerX - halfWidth, y: centerY - halfHeight }, // Top-left
        { x: centerX + halfWidth, y: centerY - halfHeight }, // Top-right
        { x: centerX + halfWidth, y: centerY + halfHeight }, // Bottom-right
        { x: centerX - halfWidth, y: centerY + halfHeight }  // Bottom-left
      ];
    };

    // Helper function to apply custom aspect ratio
    const applyCustomRatioToCorners = (corners: Point[], ratio: { width: number, height: number }): Point[] => {
      if (!corners || corners.length !== 4 || !ratio || ratio.width <= 0 || ratio.height <= 0) return corners;
      
      // Calculate the center of the quadrilateral
      const centerX = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
      const centerY = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;
      
      // Calculate the current width and height
      const width = Math.max(
        Math.sqrt(Math.pow(corners[1].x - corners[0].x, 2) + Math.pow(corners[1].y - corners[0].y, 2)),
        Math.sqrt(Math.pow(corners[2].x - corners[3].x, 2) + Math.pow(corners[2].y - corners[3].y, 2))
      );
      
      const height = Math.max(
        Math.sqrt(Math.pow(corners[3].x - corners[0].x, 2) + Math.pow(corners[3].y - corners[0].y, 2)),
        Math.sqrt(Math.pow(corners[2].x - corners[1].x, 2) + Math.pow(corners[2].y - corners[1].y, 2))
      );
      
      // Calculate the target aspect ratio
      const targetRatio = ratio.width / ratio.height;
      
      // Calculate new dimensions while preserving area
      const currentArea = width * height;
      const newWidth = Math.sqrt(currentArea * targetRatio);
      const newHeight = newWidth / targetRatio;
      
      // Adjust corners to match the new aspect ratio
      const halfWidth = newWidth / 2;
      const halfHeight = newHeight / 2;
      
      return [
        { x: centerX - halfWidth, y: centerY - halfHeight }, // Top-left
        { x: centerX + halfWidth, y: centerY - halfHeight }, // Top-right
        { x: centerX + halfWidth, y: centerY + halfHeight }, // Bottom-right
        { x: centerX - halfWidth, y: centerY + halfHeight }  // Bottom-left
      ];
    };

    // Add a function to improve corner alignment
    const alignCorners = (corners: Point[], width: number, height: number): Point[] => {
      if (!corners || corners.length !== 4) {
        // Fallback to image boundaries if corners are invalid
        return [
          { x: 0, y: 0 },
          { x: width, y: 0 },
          { x: width, y: height },
          { x: 0, y: height }
        ];
      }

      // Sort corners to ensure they're in the correct order (top-left, top-right, bottom-right, bottom-left)
      const center = {
        x: (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4,
        y: (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4
      };

      // Correctly sort corners based on their position relative to the center
      const sortedCorners = [...corners].sort((a, b) => {
        const aQuadrant = getQuadrant(a, center);
        const bQuadrant = getQuadrant(b, center);
        return aQuadrant - bQuadrant;
      });

      // Function to determine the quadrant (0: top-left, 1: top-right, 2: bottom-right, 3: bottom-left)
      function getQuadrant(point: Point, center: Point): number {
        if (point.x < center.x && point.y < center.y) return 0; // top-left
        if (point.x >= center.x && point.y < center.y) return 1; // top-right
        if (point.x >= center.x && point.y >= center.y) return 2; // bottom-right
        return 3; // bottom-left
      }

      // Adjust corners to have better alignment with document edges
      const alignedCorners = fixPerspectiveDistortion(sortedCorners);
      
      return alignedCorners;
    };

    // Function to fix perspective distortion in detected corners
    const fixPerspectiveDistortion = (corners: Point[]): Point[] => {
      if (!corners || corners.length !== 4) return corners;
      
      // Calculate average width and height
      const topWidth = Math.hypot(corners[1].x - corners[0].x, corners[1].y - corners[0].y);
      const bottomWidth = Math.hypot(corners[2].x - corners[3].x, corners[2].y - corners[3].y);
      const leftHeight = Math.hypot(corners[3].x - corners[0].x, corners[3].y - corners[0].y);
      const rightHeight = Math.hypot(corners[2].x - corners[1].x, corners[2].y - corners[1].y);
      
      const avgWidth = (topWidth + bottomWidth) / 2;
      const avgHeight = (leftHeight + rightHeight) / 2;
      
      // Calculate center point
      const centerX = (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4;
      const centerY = (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4;
      
      // If there is significant distortion, create a more rectangular shape
      const distortionThreshold = 0.2; // 20% difference
      const widthDiff = Math.abs(topWidth - bottomWidth) / avgWidth;
      const heightDiff = Math.abs(leftHeight - rightHeight) / avgHeight;
      
      if (widthDiff > distortionThreshold || heightDiff > distortionThreshold) {
        // Calculate half-width and half-height for the adjusted rectangle
        const halfWidth = avgWidth / 2;
        const halfHeight = avgHeight / 2;
        
        // Create a more rectangular shape while preserving the document's orientation
        const slope = {
          top: (corners[1].y - corners[0].y) / (corners[1].x - corners[0].x || 0.001),
          right: (corners[2].y - corners[1].y) / (corners[2].x - corners[1].x || 0.001),
          bottom: (corners[3].y - corners[2].y) / (corners[3].x - corners[2].x || 0.001),
          left: (corners[0].y - corners[3].y) / (corners[0].x - corners[3].x || 0.001)
        };
        
        // Calculate the angle of the document
        const angle = Math.atan2(
          (corners[1].y - corners[0].y) + (corners[2].y - corners[3].y),
          (corners[1].x - corners[0].x) + (corners[2].x - corners[3].x)
        );
        
        // Adjust corners to form a more perfect rectangle while preserving orientation
        return [
          { 
            x: centerX - halfWidth * Math.cos(angle) + halfHeight * Math.sin(angle),
            y: centerY - halfWidth * Math.sin(angle) - halfHeight * Math.cos(angle)
          },
          { 
            x: centerX + halfWidth * Math.cos(angle) + halfHeight * Math.sin(angle),
            y: centerY + halfWidth * Math.sin(angle) - halfHeight * Math.cos(angle)
          },
          { 
            x: centerX + halfWidth * Math.cos(angle) - halfHeight * Math.sin(angle),
            y: centerY + halfWidth * Math.sin(angle) + halfHeight * Math.cos(angle)
          },
          { 
            x: centerX - halfWidth * Math.cos(angle) - halfHeight * Math.sin(angle),
            y: centerY - halfWidth * Math.sin(angle) + halfHeight * Math.cos(angle)
          }
        ];
      }
      
      return corners;
    };

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
          />
        )}
      </div>
    );
  }
);

DocumentScanner.displayName = 'DocumentScanner';

export default DocumentScanner; 