import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';

interface CanvasEditorProps {
  imageSrc: string;
  brushSize: number;
  brushColor: string;
}

export interface CanvasEditorRef {
  toDataURL: (type?: string, quality?: any) => string;
  reset: () => void;
}

export const CanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(
  ({ imageSrc, brushSize, brushColor }, ref) => {
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    const lastPoint = useRef<{ x: number, y: number } | null>(null);

    useEffect(() => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imageSrc;
      img.onload = () => {
        setImage(img);
        const mainCanvas = mainCanvasRef.current;
        const previewCanvas = previewCanvasRef.current;
        if (mainCanvas && previewCanvas) {
          mainCanvas.width = img.naturalWidth;
          mainCanvas.height = img.naturalHeight;
          previewCanvas.width = img.naturalWidth;
          previewCanvas.height = img.naturalHeight;
          
          const ctx = mainCanvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
            ctx.drawImage(img, 0, 0);
          }
        }
      };
    }, [imageSrc]);
    
    const resetCanvas = useCallback(() => {
        const canvas = mainCanvasRef.current;
        if (canvas && image) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(image, 0, 0);
            }
        }
    }, [image]);

    useImperativeHandle(ref, () => ({
      toDataURL: (type?: string, quality?: any) => {
        const canvas = mainCanvasRef.current;
        return canvas ? canvas.toDataURL(type, quality) : '';
      },
      reset: resetCanvas
    }));
    
    const getCoordinates = useCallback((event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, clamp: boolean = true) => {
        const canvas = mainCanvasRef.current;
        if (!canvas || !image) return null;

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in event) {
            if (event.touches.length === 0) return null;
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else {
            clientX = event.clientX;
            clientY = event.clientY;
        }
        
        const { naturalWidth, naturalHeight } = image;
        const { width: containerWidth, height: containerHeight } = rect;

        const imageAspectRatio = naturalWidth / naturalHeight;
        const containerAspectRatio = containerWidth / containerHeight;

        let renderedWidth, renderedHeight, offsetX, offsetY;

        if (imageAspectRatio > containerAspectRatio) {
            // Image is wider than container, letterboxed top/bottom
            renderedWidth = containerWidth;
            renderedHeight = containerWidth / imageAspectRatio;
            offsetX = 0;
            offsetY = (containerHeight - renderedHeight) / 2;
        } else {
            // Image is taller than or same aspect as container, letterboxed left/right
            renderedHeight = containerHeight;
            renderedWidth = containerHeight * imageAspectRatio;
            offsetY = 0;
            offsetX = (containerWidth - renderedWidth) / 2;
        }
        
        const relativeX = clientX - rect.left;
        const relativeY = clientY - rect.top;

        // Check if cursor is outside the rendered image area
        if (
          clamp &&
          (relativeX < offsetX ||
          relativeX > offsetX + renderedWidth ||
          relativeY < offsetY ||
          relativeY > offsetY + renderedHeight)
        ) {
          return null;
        }
        
        const imageRelativeX = relativeX - offsetX;
        const imageRelativeY = relativeY - offsetY;

        // The scale is the same for both X and Y because we maintain aspect ratio
        const scale = naturalWidth / renderedWidth;

        return {
            x: imageRelativeX * scale,
            y: imageRelativeY * scale
        };
    }, [image]);

    const startDrawing = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      const coords = getCoordinates(event);
      if (!coords) return;
      setIsDrawing(true);
      lastPoint.current = coords;
    };

    const draw = (event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      if (!isDrawing) return;
      const coords = getCoordinates(event);
      if (!coords || !lastPoint.current) return;
      
      const { x, y } = coords;
      const ctx = mainCanvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.closePath();
      }
      lastPoint.current = coords;
    };

    const stopDrawing = () => {
      setIsDrawing(false);
      lastPoint.current = null;
    };
    
    const drawPreview = (event: React.MouseEvent<HTMLDivElement>) => {
      const previewCanvas = previewCanvasRef.current;
      if (!previewCanvas) return;
      const ctx = previewCanvas.getContext('2d');
      if (!ctx) return;

      // Always clear the preview canvas
      ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
      
      // Get coordinates without clamping to the image bounds for preview
      const coords = getCoordinates(event, false);
      if (!coords) return;
      
      const { x, y } = coords;
      
      // Draw the new preview circle
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI, false);
      const colorWithAlpha = brushColor + '80'; // Add 50% alpha
      ctx.fillStyle = colorWithAlpha;
      ctx.fill();
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    };
    
    const clearPreview = () => {
        const previewCanvas = previewCanvasRef.current;
        if (!previewCanvas) return;
        const ctx = previewCanvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        drawPreview(e);
        draw(e);
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        // No preview on touch for simplicity, just draw
        draw(e);
    };

    const handleMouseLeave = () => {
        stopDrawing();
        clearPreview();
    };

    return (
        <div
            className="absolute top-0 left-0 w-full h-full cursor-none"
            onMouseDown={startDrawing}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDrawing}
            onMouseLeave={handleMouseLeave}
            onTouchStart={startDrawing}
            onTouchMove={handleTouchMove}
            onTouchEnd={stopDrawing}
        >
            <canvas
                ref={mainCanvasRef}
                className="absolute top-0 left-0 w-full h-full object-contain"
            />
            <canvas
                ref={previewCanvasRef}
                className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none"
            />
        </div>
    );
  }
);