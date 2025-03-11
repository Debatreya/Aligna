# Aligna - Next.js Document Scanner

This is the advanced Next.js implementation of Aligna, a powerful document scanning application with intelligent corner detection and image enhancement capabilities.

## Features

- **Intelligent Document Detection**: Automatically detects document edges with precision
- **Manual Corner Adjustment**: Fine-tune document boundaries with intuitive corner dragging
- **Multiple Enhancement Modes**: Choose from original, black & white, color, and magic enhancement modes
- **Aspect Ratio Control**: Automatically detects document aspect ratio or choose from standard options (4:3, 16:9, etc.)
- **Custom Aspect Ratios**: Set your own width-to-height ratio for specialized documents
- **Mobile Optimization**: Responsive design works well on all devices with touch support
- **Document Locking**: Lock document boundaries to access enhancement options
- **Modern Dark Theme**: Professional, eye-friendly dark interface
- **Real-time Processing**: See changes as you make them
- **Image Export**: Save both original and processed documents

## Technical Implementation

- Built with Next.js App Router architecture
- TypeScript for type safety and better development experience
- React hooks for state management
- Canvas API for advanced image processing
- OpenCV.js for document detection algorithms
- CSS Modules for component-scoped styling
- Responsive design for all screen sizes

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

2. Run the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Start the camera or upload an image
2. The application will automatically detect document edges
3. Adjust corners if needed by dragging them
4. Click "Lock Doc" to freeze the document boundaries
5. Experiment with different enhancement modes and aspect ratios
6. Save the processed image when satisfied

## Browser Compatibility

Aligna is compatible with modern browsers including:
- Chrome (recommended)
- Firefox
- Safari
- Edge

## Mobile Support

The application is fully optimized for mobile devices with:
- Touch-friendly controls
- Responsive layout
- Mobile camera integration
- Proper viewport handling
