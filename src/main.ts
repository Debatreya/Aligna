import './style.css'
import { DocumentScanner } from './document-scanner'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>Document Scanner</h1>
    <div class="card">
      <div class="input-controls">
        <input type="file" id="fileInput" accept="image/*" />
        <button id="cameraButton">Open Camera</button>
      </div>
      <div class="camera-container" style="display: none;">
        <video id="video" autoplay playsinline style="width: 100%; max-width: 600px;"></video>
        <button id="captureButton" style="margin-top: 1rem;">Capture Document</button>
        <button id="closeCamera" style="margin-top: 1rem;">Close Camera</button>
      </div>
      <div class="image-container">
        <div class="image-wrapper">
          <h3>Original Image</h3>
          <div class="image-container-with-corners">
            <img id="photo" src="" alt="Original photo" style="max-width: 100%; display: none;" />
            <div id="cornerControls" class="corner-controls" style="display: none;">
              <div class="corner top-left" data-corner="0"></div>
              <div class="corner top-right" data-corner="1"></div>
              <div class="corner bottom-right" data-corner="2"></div>
              <div class="corner bottom-left" data-corner="3"></div>
            </div>
          </div>
          <div class="corner-adjustment-controls" style="display: none;">
            <button id="autoDetect">Auto Detect</button>
            <button id="resetCorners">Reset Corners</button>
          </div>
          <button id="saveOriginal" style="margin-top: 1rem; display: none;">Save Original</button>
        </div>
        <div class="image-wrapper">
          <h3>Processed Image</h3>
          <img id="output" src="" alt="Processed photo" style="max-width: 100%; display: none;" />
          <div class="enhancement-controls" style="display: none;">
            <h4>Apply Enhancement</h4>
            <div class="enhancement-buttons">
              <button id="enhanceMagic" class="active">Magic</button>
              <button id="enhanceBW">B&W</button>
              <button id="enhanceColor">Color</button>
              <button id="enhanceNone">Original</button>
            </div>
          </div>
          <button id="saveProcessed" style="margin-top: 1rem; display: none;">Save Processed</button>
        </div>
      </div>
    </div>
  </div>
`

// Get DOM elements
const fileInput = document.querySelector<HTMLInputElement>('#fileInput')!
const photoImg = document.querySelector<HTMLImageElement>('#photo')!
const outputImg = document.querySelector<HTMLImageElement>('#output')!
const cameraButton = document.querySelector<HTMLButtonElement>('#cameraButton')!
const captureButton = document.querySelector<HTMLButtonElement>('#captureButton')!
const closeCamera = document.querySelector<HTMLButtonElement>('#closeCamera')!
const cameraContainer = document.querySelector<HTMLDivElement>('.camera-container')!
const video = document.querySelector<HTMLVideoElement>('#video')!
const saveOriginalBtn = document.querySelector<HTMLButtonElement>('#saveOriginal')!
const saveProcessedBtn = document.querySelector<HTMLButtonElement>('#saveProcessed')!
const cornerControls = document.querySelector<HTMLDivElement>('#cornerControls')!
const autoDetectBtn = document.querySelector<HTMLButtonElement>('#autoDetect')!
const resetCornersBtn = document.querySelector<HTMLButtonElement>('#resetCorners')!
const cornerAdjustmentControls = document.querySelector<HTMLDivElement>('.corner-adjustment-controls')!
const enhancementControls = document.querySelector<HTMLDivElement>('.enhancement-controls')!
const enhanceMagicBtn = document.querySelector<HTMLButtonElement>('#enhanceMagic')!
const enhanceBWBtn = document.querySelector<HTMLButtonElement>('#enhanceBW')!
const enhanceColorBtn = document.querySelector<HTMLButtonElement>('#enhanceColor')!
const enhanceNoneBtn = document.querySelector<HTMLButtonElement>('#enhanceNone')!

let stream: MediaStream | null = null;
let documentScanner: DocumentScanner | null = null;
let lastOriginalImage: HTMLCanvasElement | null = null;
let lastProcessedImage: HTMLCanvasElement | null = null;
let currentPoints: Point[] | null = null;
let isDragging = false;
let activeCorner: HTMLElement | null = null;
let currentEnhancementMode: 'magic' | 'bw' | 'color' | 'none' = 'magic';
let unenhancedProcessedImage: HTMLCanvasElement | null = null;

// Point interface (if not already defined)
interface Point {
  x: number;
  y: number;
}

// Function to update corner positions
const updateCornerPositions = (points: Point[]) => {
  const imgRect = photoImg.getBoundingClientRect();
  const corners = cornerControls.querySelectorAll('.corner');
  
  corners.forEach((corner, index) => {
    const point = points[index];
    (corner as HTMLElement).style.left = `${(point.x / photoImg.naturalWidth) * 100}%`;
    (corner as HTMLElement).style.top = `${(point.y / photoImg.naturalHeight) * 100}%`;
  });
};

// Function to get current corner positions
const getCurrentCornerPositions = (): Point[] => {
  const imgRect = photoImg.getBoundingClientRect();
  const corners = cornerControls.querySelectorAll('.corner');
  return Array.from(corners).map(corner => {
    const rect = corner.getBoundingClientRect();
    return {
      x: ((rect.left - imgRect.left) / imgRect.width) * photoImg.naturalWidth,
      y: ((rect.top - imgRect.top) / imgRect.height) * photoImg.naturalHeight
    };
  });
};

// Set active enhancement mode
const setActiveEnhancement = (mode: 'magic' | 'bw' | 'color' | 'none') => {
  // Remove active class from all buttons
  enhanceMagicBtn.classList.remove('active');
  enhanceBWBtn.classList.remove('active');
  enhanceColorBtn.classList.remove('active');
  enhanceNoneBtn.classList.remove('active');
  
  // Add active class to selected button
  switch (mode) {
    case 'magic':
      enhanceMagicBtn.classList.add('active');
      break;
    case 'bw':
      enhanceBWBtn.classList.add('active');
      break;
    case 'color':
      enhanceColorBtn.classList.add('active');
      break;
    case 'none':
      enhanceNoneBtn.classList.add('active');
      break;
  }
  
  currentEnhancementMode = mode;
  
  // Apply enhancement to the current image
  applyEnhancement();
};

// Apply the current enhancement to the image
const applyEnhancement = () => {
  if (!unenhancedProcessedImage || !documentScanner) return;
  
  try {
    if (currentEnhancementMode === 'none') {
      outputImg.src = unenhancedProcessedImage.toDataURL('image/jpeg', 1.0);
      lastProcessedImage = unenhancedProcessedImage;
    } else {
      const enhancedCanvas = documentScanner.enhance(unenhancedProcessedImage, currentEnhancementMode);
      outputImg.src = enhancedCanvas.toDataURL('image/jpeg', 1.0);
      lastProcessedImage = enhancedCanvas;
    }
    // Make sure the image is visible
    outputImg.style.display = 'block';
  } catch (error) {
    console.error("Error applying enhancement:", error);
  }
};

// Corner drag handlers
cornerControls.addEventListener('mousedown', (e) => {
  const corner = (e.target as HTMLElement).closest('.corner');
  if (corner) {
    isDragging = true;
    activeCorner = corner as HTMLElement;
    activeCorner.classList.add('dragging');
  }
});

document.addEventListener('mousemove', (e) => {
  if (isDragging && activeCorner) {
    const imgRect = photoImg.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - imgRect.left) / imgRect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - imgRect.top) / imgRect.height) * 100));
    
    activeCorner.style.left = `${x}%`;
    activeCorner.style.top = `${y}%`;
  }
});

document.addEventListener('mouseup', () => {
  if (isDragging && activeCorner) {
    isDragging = false;
    activeCorner.classList.remove('dragging');
    activeCorner = null;
    
    // Update processed image with new corner positions
    if (lastOriginalImage && documentScanner) {
      const newPoints = getCurrentCornerPositions();
      const processedCanvas = documentScanner.crop(lastOriginalImage, newPoints);
      
      // Store unenhanced version
      unenhancedProcessedImage = processedCanvas;
      
      // Apply current enhancement
      applyEnhancement();
    }
  }
});

// Mobile touch support for corners
cornerControls.addEventListener('touchstart', (e) => {
  const corner = (e.target as HTMLElement).closest('.corner');
  if (corner) {
    isDragging = true;
    activeCorner = corner as HTMLElement;
    activeCorner.classList.add('dragging');
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('touchmove', (e) => {
  if (isDragging && activeCorner && e.touches.length > 0) {
    const touch = e.touches[0];
    const imgRect = photoImg.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((touch.clientX - imgRect.left) / imgRect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - imgRect.top) / imgRect.height) * 100));
    
    activeCorner.style.left = `${x}%`;
    activeCorner.style.top = `${y}%`;
    e.preventDefault();
  }
}, { passive: false });

document.addEventListener('touchend', () => {
  if (isDragging && activeCorner) {
    isDragging = false;
    activeCorner.classList.remove('dragging');
    activeCorner = null;
    
    // Update processed image with new corner positions
    if (lastOriginalImage && documentScanner) {
      const newPoints = getCurrentCornerPositions();
      const processedCanvas = documentScanner.crop(lastOriginalImage, newPoints);
      
      // Store unenhanced version
      unenhancedProcessedImage = processedCanvas;
      
      // Apply current enhancement
      applyEnhancement();
    }
  }
});

// Auto detect corners
autoDetectBtn.addEventListener('click', () => {
  if (lastOriginalImage && documentScanner) {
    try {
      const points = documentScanner.detect(lastOriginalImage);
      currentPoints = points;
      updateCornerPositions(points);
      
      // Update processed image
      const processedCanvas = documentScanner.crop(lastOriginalImage, points);
      
      // Store unenhanced version
      unenhancedProcessedImage = processedCanvas;
      
      // Apply current enhancement
      applyEnhancement();
    } catch (error) {
      console.error('Error detecting corners:', error);
      alert('Failed to detect corners automatically. Try adjusting them manually.');
    }
  }
});

// Reset corners
resetCornersBtn.addEventListener('click', () => {
  if (currentPoints) {
    updateCornerPositions(currentPoints);
  }
});

// Enhancement mode buttons
enhanceMagicBtn.addEventListener('click', () => setActiveEnhancement('magic'));
enhanceBWBtn.addEventListener('click', () => setActiveEnhancement('bw'));
enhanceColorBtn.addEventListener('click', () => setActiveEnhancement('color'));
enhanceNoneBtn.addEventListener('click', () => setActiveEnhancement('none'));

// Process the image (either from file or camera)
const processImage = (imageElement: HTMLImageElement | HTMLCanvasElement) => {
  if (!documentScanner) {
    alert('Document scanner is not ready yet. Please wait.');
    return;
  }

  try {
    // Store original canvas
    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = imageElement instanceof HTMLImageElement ? imageElement.naturalWidth : imageElement.width;
    originalCanvas.height = imageElement instanceof HTMLImageElement ? imageElement.naturalHeight : imageElement.height;
    const originalCtx = originalCanvas.getContext('2d', { willReadFrequently: true })!;
    originalCtx.drawImage(imageElement, 0, 0);
    lastOriginalImage = originalCanvas;

    // Display original image
    photoImg.src = originalCanvas.toDataURL('image/jpeg', 1.0);
    photoImg.style.display = 'block';

    try {
      // Detect document corners
      const points = documentScanner.detect(imageElement);
      currentPoints = points;
      
      // Show corner controls and update their positions
      cornerControls.style.display = 'block';
      cornerAdjustmentControls.style.display = 'block';
      enhancementControls.style.display = 'block';
      updateCornerPositions(points);
      
      // Crop and transform the image
      const processedCanvas = documentScanner.crop(imageElement, points);
      
      // Store unenhanced version
      unenhancedProcessedImage = processedCanvas;
      
      // Apply enhancement (magic effect by default)
      setActiveEnhancement('magic');
      
      // Ensure output image is displayed
      outputImg.style.display = 'block';
      
      // Show save buttons
      saveOriginalBtn.style.display = 'inline-block';
      saveProcessedBtn.style.display = 'inline-block';
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing document. Using original image instead.');
      
      // Just show the original image without processing
      outputImg.src = originalCanvas.toDataURL('image/jpeg', 1.0);
      outputImg.style.display = 'block';
      
      unenhancedProcessedImage = originalCanvas;
      lastProcessedImage = originalCanvas;
      
      // Still show enhancement controls
      enhancementControls.style.display = 'block';
      saveOriginalBtn.style.display = 'inline-block';
      saveProcessedBtn.style.display = 'inline-block';
    }
  } catch (error) {
    console.error('Error processing image:', error);
    alert('Error processing image. Please try another image.');
  }
};

// Wait for OpenCV to be ready
const waitForOpenCV = () => {
  return new Promise<void>((resolve) => {
    if (window.cv) {
      resolve();
    } else {
      const checkOpenCV = setInterval(() => {
        if (window.cv) {
          clearInterval(checkOpenCV);
          resolve();
        }
      }, 100);
    }
  });
};

// Initialize the application
async function initApp() {
  try {
    await waitForOpenCV();
    documentScanner = new DocumentScanner();
    console.log('DocumentScanner initialized successfully');
  } catch (error) {
    console.error('Error initializing DocumentScanner:', error);
    alert('Error initializing document scanner. Please refresh the page.');
  }
}

// Function to save image
const saveImage = async (canvas: HTMLCanvasElement, prefix: string) => {
  try {
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/jpeg', 1.0);
    });

    // Create timestamp for unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${prefix}_${timestamp}.jpg`;

    // Create a download link and trigger it
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error('Error saving image:', error);
    alert('Failed to save image. Please try again.');
  }
};

// Event listeners for save buttons
saveOriginalBtn.addEventListener('click', () => {
  if (lastOriginalImage) {
    saveImage(lastOriginalImage, 'original');
  }
});

saveProcessedBtn.addEventListener('click', () => {
  if (lastProcessedImage) {
    saveImage(lastProcessedImage, 'processed');
  }
});

// Handle file input change
fileInput.addEventListener('change', async (e) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (event) => {
      // Create an image to get the original dimensions
      const img = new Image();
      img.onload = () => {
        // Create a canvas with the original dimensions
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        const ctx = canvas.getContext('2d', {
          alpha: false,
          willReadFrequently: true
        })!;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw the image at full resolution
        ctx.drawImage(img, 0, 0);
        
        // Display original image
        photoImg.src = canvas.toDataURL('image/jpeg', 1.0);
        photoImg.style.display = 'block';
        
        // Process image
        processImage(canvas);
      };
      img.src = event.target?.result as string;
    }
    reader.readAsDataURL(file)
  }
})

// Handle camera operations
const startCamera = async () => {
  try {
    // Request highest possible resolution
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    // Try to use the back camera if available
    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 3840 }, // 4K resolution
        height: { ideal: 2160 },
        aspectRatio: { ideal: 16/9 }
      }
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    cameraContainer.style.display = 'block';

    // Log the actual resolution we got
    video.onloadedmetadata = () => {
      console.log(`Actual video resolution: ${video.videoWidth}x${video.videoHeight}`);
    };
  } catch (error) {
    console.error('Error accessing camera:', error);
    alert('Unable to access camera. Please make sure you have granted camera permissions.');
  }
};

const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
    video.srcObject = null;
    cameraContainer.style.display = 'none';
  }
};

const captureImage = () => {
  // Create a high-resolution canvas
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  
  // Use better quality settings for the 2D context
  const ctx = canvas.getContext('2d', {
    alpha: false,
    willReadFrequently: true
  })!;
  
  // Ensure smooth image rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw the video frame to canvas
  ctx.drawImage(video, 0, 0);
  
  // Display original image with maximum quality
  photoImg.src = canvas.toDataURL('image/jpeg', 1.0);
  photoImg.style.display = 'block';
  
  // Process captured image
  processImage(canvas);
  
  // Stop the camera after capture
  stopCamera();
};

// Event listeners for camera controls
cameraButton.addEventListener('click', startCamera);
closeCamera.addEventListener('click', stopCamera);
captureButton.addEventListener('click', captureImage);

// Start the application
initApp();
