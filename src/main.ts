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
          <img id="photo" src="" alt="Original photo" style="max-width: 100%; display: none;" />
          <button id="saveOriginal" style="margin-top: 1rem; display: none;">Save Original</button>
        </div>
        <div class="image-wrapper">
          <h3>Processed Image</h3>
          <img id="output" src="" alt="Processed photo" style="max-width: 100%; display: none;" />
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

let stream: MediaStream | null = null;
let documentScanner: DocumentScanner | null = null;
let lastOriginalImage: HTMLCanvasElement | null = null;
let lastProcessedImage: HTMLCanvasElement | null = null;

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

// Process the image (either from file or camera)
const processImage = (imageElement: HTMLImageElement | HTMLCanvasElement) => {
  if (!documentScanner) {
    alert('Document scanner is not ready yet. Please wait.');
    return;
  }

  try {
    // Store original canvas
    const originalCanvas = document.createElement('canvas');
    originalCanvas.width = imageElement instanceof HTMLCanvasElement ? imageElement.width : imageElement.naturalWidth;
    originalCanvas.height = imageElement instanceof HTMLCanvasElement ? imageElement.height : imageElement.naturalHeight;
    const originalCtx = originalCanvas.getContext('2d')!;
    originalCtx.drawImage(imageElement, 0, 0);
    lastOriginalImage = originalCanvas;

    // Detect document corners
    const points = documentScanner.detect(imageElement)
    
    // Crop and transform the image
    const processedCanvas = documentScanner.crop(imageElement, points)
    lastProcessedImage = processedCanvas;
    
    // Display processed image
    outputImg.src = processedCanvas.toDataURL('image/jpeg', 1.0)
    outputImg.style.display = 'block'

    // Show save buttons
    saveOriginalBtn.style.display = 'inline-block';
    saveProcessedBtn.style.display = 'inline-block';
  } catch (error) {
    console.error('Error processing image:', error)
    alert('Error processing image. Please try another image.')
  }
}

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
