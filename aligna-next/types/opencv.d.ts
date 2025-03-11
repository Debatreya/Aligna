declare module '@techstark/opencv-js' {
  export interface Contour {
    data32S: Int32Array;
    size(): number;
  }

  export interface Mat {
    delete(): void;
    empty(): boolean;
    cols: number;
    rows: number;
    data32S: Int32Array;
  }

  export interface MatVector {
    size(): number;
    get(index: number): Mat;
    delete(): void;
  }

  export interface Size {
    width: number;
    height: number;
  }

  export interface Point {
    x: number;
    y: number;
  }

  export interface Scalar {
    [index: number]: number;
  }
}

// Extend the Window interface
declare global {
  interface Window {
    cv: {
      imread(source: HTMLImageElement | HTMLCanvasElement): Mat;
      imshow(canvas: HTMLCanvasElement, mat: Mat): void;
      cvtColor(src: Mat, dst: Mat, code: number): void;
      GaussianBlur(src: Mat, dst: Mat, size: Size, sigmaX: number, sigmaY?: number, borderType?: number): void;
      threshold(src: Mat, dst: Mat, thresh: number, maxval: number, type: number): number;
      findContours(image: Mat, contours: MatVector, hierarchy: Mat, mode: number, method: number): void;
      contourArea(contour: Mat): number;
      minAreaRect(points: Mat): { center: Point; size: Size; angle: number };
      getPerspectiveTransform(src: Mat, dst: Mat): Mat;
      warpPerspective(src: Mat, dst: Mat, M: Mat, dsize: Size, flags?: number, borderMode?: number, borderValue?: Scalar): void;
      matFromArray(rows: number, cols: number, type: number, array: number[]): Mat;
      Size: new (width: number, height: number) => Size;
      Scalar: new (r: number, g?: number, b?: number, a?: number) => Scalar;
      Mat: new () => Mat;
      MatVector: new () => MatVector;
      RETR_CCOMP: number;
      CHAIN_APPROX_SIMPLE: number;
      COLOR_RGBA2GRAY: number;
      THRESH_BINARY: number;
      THRESH_OTSU: number;
      BORDER_DEFAULT: number;
      INTER_LINEAR: number;
      BORDER_CONSTANT: number;
      CV_32FC2: number;
      onRuntimeInitialized?: () => void;
    };
  }
} 