export interface Point {
  x: number;
  y: number;
}

export class DocumentScanner {
  private cv: any;
  constructor() {
    if (!("cv" in window)) {
      throw new Error("OpenCV not found");
    } else {
      this.cv = window["cv"];
    }
  }

  private distance(p1: Point, p2: Point) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
  }

  private getCornerPoints(contour: any): Point[] {
    try {
      let cv = this.cv;
      let points: Point[] = [];
      
      // Check if contour is valid
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
      
      // Ensure we have all corners
      if (topLeftDistance === 0 || topRightDistance === 0 || 
          bottomLeftDistance === 0 || bottomRightDistance === 0) {
        // Fallback to image bounds if corners weren't found
        console.warn("Not all corners detected, using fallback");
        return [
          { x: 0, y: 0 },  // Top-left
          { x: contour.data32S[0], y: 0 },  // Top-right
          { x: contour.data32S[0], y: contour.data32S[1] },  // Bottom-right
          { x: 0, y: contour.data32S[1] }   // Bottom-left
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
      // Read the image as mat from an image element or a canvas element
      const img = cv.imread(source);
      console.log("Image read successfully, dimensions:", img.cols, "x", img.rows);

      // Handle empty images
      if (img.empty()) {
        console.error("Input image is empty");
        throw new Error("Cannot process empty image");
      }

      // Convert the image to grayscale
      const gray = new cv.Mat();
      cv.cvtColor(img, gray, cv.COLOR_RGBA2GRAY);

      // Perform Gaussian blur to remove noise
      const blur = new cv.Mat();
      cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);

      // Perform threshold to get a binary image
      const thresh = new cv.Mat();
      cv.threshold(blur, thresh, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);

      // Find the contours and get the biggest one as the document candidate
      let contours = new cv.MatVector();
      let hierarchy = new cv.Mat();
      cv.findContours(thresh, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
      
      console.log("Found", contours.size(), "contours");

      // If no contours found, create default points from image dimensions
      if (contours.size() === 0) {
        console.warn("No contours found, using image bounds");
        // Clean up
        img.delete();
        gray.delete();
        blur.delete();
        thresh.delete();
        contours.delete();
        hierarchy.delete();
        
        // Use image bounds as fallback
        return [
          { x: 0, y: 0 },  // Top-left
          { x: source instanceof HTMLImageElement ? source.naturalWidth : source.width, y: 0 },  // Top-right
          { x: source instanceof HTMLImageElement ? source.naturalWidth : source.width, 
            y: source instanceof HTMLImageElement ? source.naturalHeight : source.height },  // Bottom-right
          { x: 0, y: source instanceof HTMLImageElement ? source.naturalHeight : source.height }   // Bottom-left
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
        // Clean up
        img.delete();
        gray.delete();
        blur.delete();
        thresh.delete();
        contours.delete();
        hierarchy.delete();
        
        // Use image bounds as fallback
        return [
          { x: 0, y: 0 },  // Top-left
          { x: source instanceof HTMLImageElement ? source.naturalWidth : source.width, y: 0 },  // Top-right
          { x: source instanceof HTMLImageElement ? source.naturalWidth : source.width, 
            y: source instanceof HTMLImageElement ? source.naturalHeight : source.height },  // Bottom-right
          { x: 0, y: source instanceof HTMLImageElement ? source.naturalHeight : source.height }   // Bottom-left
        ];
      }

      console.log("Max contour index:", maxContourIndex, "with area:", maxArea);
      const maxContour = contours.get(maxContourIndex);
      
      // Get the corner points
      const points = this.getCornerPoints(maxContour);
      console.log("Detected corner points:", points);

      // Release the memory
      img.delete();
      gray.delete();
      blur.delete();
      thresh.delete();
      contours.delete();
      hierarchy.delete();

      return points;
    } catch (error) {
      console.error("Error in detect method:", error);
      // Return fallback points based on image dimensions
      return [
        { x: 0, y: 0 },  // Top-left
        { x: source instanceof HTMLImageElement ? source.naturalWidth : source.width, y: 0 },  // Top-right
        { x: source instanceof HTMLImageElement ? source.naturalWidth : source.width, 
          y: source instanceof HTMLImageElement ? source.naturalHeight : source.height },  // Bottom-right
        { x: 0, y: source instanceof HTMLImageElement ? source.naturalHeight : source.height }   // Bottom-left
      ];
    }
  }

  crop(source: HTMLImageElement | HTMLCanvasElement, points?: Point[], width?: number, height?: number): HTMLCanvasElement {
    try {
      console.log("Starting crop with points:", points);
      let cv = this.cv;
      const img = cv.imread(source);
      console.log("Image read successfully for crop, dimensions:", img.cols, "x", img.rows);

      // Run detect to get the points if it is not provided in the argument
      if (!points) {
        points = this.detect(source);
      }

      // Validate points
      if (!points || points.length !== 4) {
        console.error("Invalid points for perspective transform");
        throw new Error("Invalid corner points");
      }

      // Determine the width and height of the output image
      if (!width) {
        width = Math.max(this.distance(points[0], points[1]), this.distance(points[2], points[3]));
      }
      if (!height) {
        height = Math.max(this.distance(points[0], points[3]), this.distance(points[1], points[2]));
      }
      
      // Ensure minimum dimensions
      width = Math.max(width, 100);
      height = Math.max(height, 100);
      
      console.log("Output dimensions:", width, "x", height);

      // Create a transformation matrix
      let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        points[0].x,
        points[0].y,
        points[1].x,
        points[1].y,
        points[3].x,
        points[3].y,
        points[2].x,
        points[2].y,
      ]);

      let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0,
        0,
        width,
        0,
        0,
        height,
        width,
        height,
      ]);

      let M = cv.getPerspectiveTransform(srcTri, dstTri);

      // Perform perspective transformation
      let warpedDst = new cv.Mat();
      let dsize = new cv.Size(width, height);
      cv.warpPerspective(img, warpedDst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

      // Draw the result into a canvas element
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      
      // Set willReadFrequently for better performance with getImageData calls
      cv.imshow(canvas, warpedDst);

      // Release the memory
      img.delete();
      srcTri.delete();
      dstTri.delete();
      M.delete();
      warpedDst.delete();

      return canvas;
    } catch (error) {
      console.error("Error in crop method:", error);
      
      // Create a fallback canvas with the original image
      const canvas = document.createElement("canvas");
      const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
      const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(source, 0, 0, width, height);
      
      return canvas;
    }
  }

  enhance(canvas: HTMLCanvasElement, mode: 'magic' | 'bw' | 'color' = 'magic'): HTMLCanvasElement {
    try {
      console.log("Starting enhancement with mode:", mode);
      const cv = this.cv;
      const src = cv.imread(canvas);
      let dst = new cv.Mat();

      // First make a copy to work with
      src.copyTo(dst);

      // Perform different enhancements based on mode
      if (mode === 'bw' || mode === 'magic') {
        // Convert to grayscale
        const gray = new cv.Mat();
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

        if (mode === 'bw') {
          // High contrast black and white
          cv.threshold(gray, dst, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
        } else {
          // Magic mode - combines several enhancements

          // 1. Use Gaussian blur for denoising (instead of fastNlMeansDenoising)
          const denoised = new cv.Mat();
          cv.GaussianBlur(gray, denoised, new cv.Size(3, 3), 0);

          // 2. Contrast enhancement
          const contrast = new cv.Mat();
          cv.convertScaleAbs(denoised, contrast, 1.5, -30); // Increase contrast

          // 3. Adaptive thresholding for text clarity
          const adaptive = new cv.Mat();
          cv.adaptiveThreshold(
            contrast,
            adaptive,
            255,
            cv.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv.THRESH_BINARY,
            11, // block size
            2 // constant subtracted from mean
          );

          // 4. Morphological operations to clean up the result
          const kernel = cv.Mat.ones(2, 2, cv.CV_8U);
          const morphed = new cv.Mat();
          cv.morphologyEx(adaptive, morphed, cv.MORPH_CLOSE, kernel);

          // 5. Final sharpening using Laplacian
          const laplacian = new cv.Mat();
          const sharp = new cv.Mat();
          cv.Laplacian(morphed, laplacian, cv.CV_8U, 1);
          cv.convertScaleAbs(laplacian, sharp);
          
          // Combine original and sharpened
          const sharpened = new cv.Mat();
          cv.addWeighted(morphed, 1.5, sharp, -0.5, 0, sharpened);

          // Convert back to RGBA for display
          cv.cvtColor(sharpened, dst, cv.COLOR_GRAY2RGBA);

          // Clean up
          denoised.delete();
          contrast.delete();
          adaptive.delete();
          kernel.delete();
          morphed.delete();
          laplacian.delete();
          sharp.delete();
          sharpened.delete();
        }

        gray.delete();
      } else {
        // Color enhancement mode
        // Increase saturation and contrast
        
        // 1. Apply bilateral filter for edge-preserving smoothing
        const bilateral = new cv.Mat();
        cv.bilateralFilter(src, bilateral, 9, 75, 75);
        
        // 2. Increase contrast
        const contrast = new cv.Mat();
        cv.convertScaleAbs(bilateral, contrast, 1.2, 10);
        
        // 3. Apply unsharp mask for sharpening
        const blurred = new cv.Mat();
        const sharpened = new cv.Mat();
        cv.GaussianBlur(contrast, blurred, new cv.Size(5, 5), 0);
        cv.addWeighted(contrast, 1.5, blurred, -0.5, 0, sharpened);
        
        sharpened.copyTo(dst);
        
        // Clean up
        bilateral.delete();
        contrast.delete();
        blurred.delete();
        sharpened.delete();
      }

      // Create result canvas
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = canvas.width;
      resultCanvas.height = canvas.height;
      
      cv.imshow(resultCanvas, dst);

      // Clean up
      src.delete();
      dst.delete();

      return resultCanvas;
    } catch (error) {
      console.error("Error in enhance method:", error);
      
      // Return original canvas on error
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = canvas.width;
      resultCanvas.height = canvas.height;
      const ctx = resultCanvas.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(canvas, 0, 0);
      
      return resultCanvas;
    }
  }
} 