# Aligna - Document Scanner

Aligna is a powerful document scanning application with intelligent corner detection and image enhancement capabilities. This repository contains two implementations of Aligna:

1. **Vanilla TypeScript Version** (in the root directory)
   - Lightweight implementation using TypeScript, HTML, and CSS
   - Perfect for embedding into existing applications
   - Optimized for performance with minimal dependencies
   - Simple and straightforward UI

2. **Next.js Version** (in the `/aligna-next` directory)
   - Advanced implementation with React and Next.js
   - Enhanced UI with responsive design
   - More features including aspect ratio controls and enhancement modes
   - Better mobile support

## Vanilla TypeScript Version

The vanilla TypeScript version provides a minimalist yet powerful document scanning experience. It's built with:

- TypeScript for type safety and better development experience
- Canvas API for image processing
- Modern ES6+ JavaScript features
- CSS for styling

### Features

- Document edge detection
- Image cropping and perspective correction
- Basic image enhancement
- Save processed documents
- Camera integration
- File upload support

### Getting Started

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```
4. Open your browser at `http://localhost:3000`

## Next.js Version

For details about the enhanced Next.js version, see the [README in the camera directory](/camera/README.md).

## License

MIT
