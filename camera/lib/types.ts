export interface Point {
  x: number;
  y: number;
}

export type EnhancementMode = 'magic' | 'bw' | 'color' | 'original';

export type AspectRatio = 'auto' | 'square' | '4:3' | '16:9' | '3:2' | 'custom';

export interface DocumentScannerProps {
  onImageProcessed?: (canvas: HTMLCanvasElement) => void;
  onError?: (error: Error) => void;
}

export interface CameraCaptureProps {
  onCapture: (canvas: HTMLCanvasElement) => void;
  onError?: (error: Error) => void;
}

export interface ImagePreviewProps {
  original: HTMLCanvasElement | string;
  processed?: HTMLCanvasElement | string;
  corners?: Point[];
  onCornersChange?: (corners: Point[]) => void;
  enhancementMode?: EnhancementMode;
  onEnhancementModeChange?: (mode: EnhancementMode) => void;
  aspectRatio?: AspectRatio;
  onAspectRatioChange?: (ratio: AspectRatio, customRatio?: { width: number, height: number }) => void;
  customRatio?: { width: number, height: number };
} 