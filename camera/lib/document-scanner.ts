import { Point } from './types';

declare global {
  interface Window {
    cv: any;
  }
}

export class DocumentScanner {
  private cv: any;

  constructor() {
    if (typeof window !== 'undefined' && !("cv" in window)) {
      throw new Error("OpenCV not found");
    } else if (typeof window !== 'undefined') {
      this.cv = window.cv;
    }
  }

  private distance(p1: Point, p2: Point) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  private getCornerPoints(contour: any): Point[] {
    try {
      let cv = this.cv;
      let points: Point[] = [];
      
      if (!contour || contour.size() === 0) {
        throw new Error("Invalid contour: no points found");
      }
      
      let rect = cv.minAreaRect(contour);
      const center = rect.center;

      let topLeftPoint = {x: 0, y: 0};
      let topLeftDistance = 0;

      let topRightPoint = {x: contour.data32S[0], y: contour.data32S[1]};
      let topRightDistance = 0;

      let bottomLeftPoint = {x: contour.data32S[0], y: contour.data32S[1]};
      let bottomLeftDistance = 0;

      let bottomRightPoint = {x: contour.data32S[0], y: contour.data32S[1]};
      let bottomRightDistance = 0;

      for (let i = 0; i < contour.data32S.length; i += 2) {
        const point = { x: contour.data32S[i], y: contour.data32S[i + 1] };
        const distance = this.distance(point, center);
        if (point.x < center.x && point.y < center.y) {
          if (distance > topLeftDistance) {
            topLeftPoint = point;
            topLeftDistance = distance;
          }
        } else if (point.x > center.x && point.y < center.y) {
          if (distance > topRightDistance) {
            topRightPoint = point;
            topRightDistance = distance;
          }
        } else if (point.x < center.x && point.y > center.y) {
          if (distance > bottomLeftDistance) {
            bottomLeftPoint = point;
            bottomLeftDistance = distance;
          }
        } else if (point.x > center.x && point.y > center.y) {
          if (distance > bottomRightDistance) {
            bottomRightPoint = point;
            bottomRightDistance = distance;
          }
        }
      }
      
      if (topLeftDistance === 0 || topRightDistance === 0 || 
          bottomLeftDistance === 0 || bottomRightDistance === 0) {
        console.warn("Not all corners detected, using fallback");
        return [
          { x: 0, y: 0 },
          { x: contour.data32S[0], y: 0 },
          { x: contour.data32S[0], y: contour.data32S[1] },
          { x: 0, y: contour.data32S[1] }
        ];
      }
      
      points.push(topLeftPoint);
      points.push(topRightPoint);
      points.push(bottomRightPoint);
      points.push(bottomLeftPoint);
      return points;
    } catch (error) {
      console.error("Error in getCornerPoints:", error);
      throw error;
    }
  }

  detect(source: HTMLImageElement | HTMLCanvasElement): Point[] {
    console.log("Starting document detection");
    let cv = this.cv;
    
    try {
      const img = cv.imread(source);
      console.log("Image read successfully, dimensions:", img.cols, "x", img.rows);

      if (img.empty()) {
        console.error("Input image is empty");
        throw new Error("Cannot process empty image");
      }

      const gray = new cv.Mat();
      cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY);

      const blur = new cv.Mat();
      cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

      const thresh = new cv.Mat();
      cv.threshold(blur, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

      let contours = new cv.MatVector();
      let hierarchy = new cv.Mat();
      cv.findContours(thresh, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
      
      console.log("Found", contours.size(), "contours");

      if (contours.size() === 0) {
        console.warn("No contours found, using image bounds");
        img.delete(); gray.delete(); blur.delete();
        thresh.delete(); contours.delete(); hierarchy.delete();
        
        return [
          { x: 0, y: 0 },
          { x: source instanceof HTMLImageElement ? source.naturalWidth : source.width, y: 0 },
          { x: source instanceof HTMLImageElement ? source.naturalWidth : source.width, 
            y: source instanceof HTMLImageElement ? source.naturalHeight : source.height },
          { x: 0, y: source instanceof HTMLImageElement ? source.naturalHeight : source.height }
        ];
      }

      let maxArea = 0;
      let maxContourIndex = -1;
      for (let i = 0; i < contours.size(); ++i) {
        let contourArea = cv.contourArea(contours.get(i));
        if (contourArea > maxArea) {
          maxArea = contourArea;
          maxContourIndex = i;
        }
      }
      
      if (maxContourIndex === -1) {
        console.warn("No valid contour found, using image bounds");
        img.delete(); gray.delete(); blur.delete();
        thresh.delete(); contours.delete(); hierarchy.delete();
        
        return [
          { x: 0, y: 0 },
          { x: source instanceof HTMLImageElement ? source.naturalWidth : source.width, y: 0 },
          { x: source instanceof HTMLImageElement ? source.naturalWidth : source.width, 
            y: source instanceof HTMLImageElement ? source.naturalHeight : source.height },
          { x: 0, y: source instanceof HTMLImageElement ? source.naturalHeight : source.height }
        ];
      }

      console.log("Max contour index:", maxContourIndex, "with area:", maxArea);
      const maxContour = contours.get(maxContourIndex);
      const points = this.getCornerPoints(maxContour);
      console.log("Detected corner points:", points);

      img.delete(); gray.delete(); blur.delete();
      thresh.delete(); contours.delete(); hierarchy.delete();

      return points;
    } catch (error) {
      console.error("Error in detect method:", error);
      return [
        { x: 0, y: 0 },
        { x: source instanceof HTMLImageElement ? source.naturalWidth : source.width, y: 0 },
        { x: source instanceof HTMLImageElement ? source.naturalWidth : source.width, 
          y: source instanceof HTMLImageElement ? source.naturalHeight : source.height },
        { x: 0, y: source instanceof HTMLImageElement ? source.naturalHeight : source.height }
      ];
    }
  }

  crop(source: HTMLImageElement | HTMLCanvasElement, points?: Point[], width?: number, height?: number): HTMLCanvasElement {
    try {
      console.log("Starting crop with points:", points);
      let cv = this.cv;
      const img = cv.imread(source);
      console.log("Image read successfully for crop, dimensions:", img.cols, "x", img.rows);

      if (!points) {
        points = this.detect(source);
      }

      if (!points || points.length !== 4) {
        console.error("Invalid points for perspective transform");
        throw new Error("Invalid corner points");
      }

      if (!width) {
        width = Math.max(this.distance(points[0], points[1]), this.distance(points[2], points[3]));
      }
      if (!height) {
        height = Math.max(this.distance(points[0], points[3]), this.distance(points[1], points[2]));
      }
      
      width = Math.max(width, 100);
      height = Math.max(height, 100);
      
      console.log("Output dimensions:", width, "x", height);

      let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        points[0].x, points[0].y,
        points[1].x, points[1].y,
        points[3].x, points[3].y,
        points[2].x, points[2].y
      ]);

      let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        width, 0,
        0, height,
        width, height
      ]);

      let M = cv.getPerspectiveTransform(srcTri, dstTri);
      let dsize = new cv.Size(width, height);
      let warpedDst = new cv.Mat();
      cv.warpPerspective(img, warpedDst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      cv.imshow(canvas, warpedDst);

      img.delete();
      srcTri.delete();
      dstTri.delete();
      M.delete();
      warpedDst.delete();

      return canvas;
    } catch (error) {
      console.error("Error in crop method:", error);
      throw error;
    }
  }

  enhance(canvas: HTMLCanvasElement, mode: 'magic' | 'bw' | 'color' = 'magic'): HTMLCanvasElement {
    try {
      let cv = this.cv;
      const img = cv.imread(canvas);
      let result = new cv.Mat();

      switch (mode) {
        case 'magic':
          // Apply Gaussian blur to reduce noise
          let blurred = new cv.Mat();
          cv.GaussianBlur(img, blurred, new cv.Size(3, 3), 0);

          // Convert to grayscale
          let gray = new cv.Mat();
          cv.cvtColor(blurred, gray, cv.COLOR_RGBA2GRAY);

          // Apply adaptive threshold
          let binary = new cv.Mat();
          cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

          // Apply morphological operations
          let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
          let morphed = new cv.Mat();
          cv.morphologyEx(binary, morphed, cv.MORPH_CLOSE, kernel);

          // Sharpen using Laplacian
          let laplacian = new cv.Mat();
          cv.Laplacian(morphed, laplacian, cv.CV_8U, 3);
          cv.addWeighted(morphed, 1.5, laplacian, -0.5, 0, result);

          blurred.delete();
          gray.delete();
          binary.delete();
          kernel.delete();
          morphed.delete();
          laplacian.delete();
          break;

        case 'bw':
          // Convert to grayscale and apply OTSU threshold
          let grayBW = new cv.Mat();
          cv.cvtColor(img, grayBW, cv.COLOR_RGBA2GRAY);
          cv.threshold(grayBW, result, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
          grayBW.delete();
          break;

        case 'color':
          // Apply bilateral filter for edge-preserving smoothing
          let bilateral = new cv.Mat();
          cv.bilateralFilter(img, bilateral, 9, 75, 75);

          // Enhance contrast
          let contrast = new cv.Mat();
          cv.convertScaleAbs(bilateral, contrast, 1.1, 0);

          // Apply unsharp mask
          let blurredColor = new cv.Mat();
          cv.GaussianBlur(contrast, blurredColor, new cv.Size(0, 0), 3);
          cv.addWeighted(contrast, 1.5, blurredColor, -0.5, 0, result);

          bilateral.delete();
          contrast.delete();
          blurredColor.delete();
          break;

        default:
          img.copyTo(result);
          break;
      }

      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = canvas.width;
      resultCanvas.height = canvas.height;
      const ctx = resultCanvas.getContext('2d', { willReadFrequently: true });
      cv.imshow(resultCanvas, result);

      img.delete();
      result.delete();

      return resultCanvas;
    } catch (error) {
      console.error("Error in enhance method:", error);
      throw error;
    }
  }
} 