export interface Point {
  x: number;
  y: number;
}

export type EnhancementMode = 'magic' | 'bw' | 'color' | 'original';

export interface DocumentScannerProps {
  onImageProcessed?: (canvas: HTMLCanvasElement) => void;
  onError?: (error: Error) => void;
}

export interface CameraCaptureProps {
  onCapture: (imageData: HTMLCanvasElement) => void;
  onError?: (error: Error) => void;
}

export interface ImagePreviewProps {
  original: string | HTMLCanvasElement;
  processed?: string | HTMLCanvasElement;
  corners?: Point[];
  onCornersChange?: (corners: Point[]) => void;
  enhancementMode?: EnhancementMode;
  onEnhancementModeChange?: (mode: EnhancementMode) => void;
} 