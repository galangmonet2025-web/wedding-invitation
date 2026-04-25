import { BrowserQRCodeReader } from '@zxing/browser';
import { createImage } from './cropImage';

export interface QRBounds {
    x: number;
    y: number;
    width: number;
    height: number;
    imageWidth: number;
    imageHeight: number;
}

export async function detectQRCodeBounds(imageSrc: string): Promise<QRBounds | null> {
    try {
        const image = await createImage(imageSrc);
        const codeReader = new BrowserQRCodeReader();
        
        try {
            const result = await codeReader.decodeFromImageElement(image);
            
            if (result) {
                const points = result.getResultPoints();
                if (points && points.length >= 3) {
                    const xs = points.map(p => p.getX());
                    const ys = points.map(p => p.getY());
                    
                    const minX = Math.min(...xs);
                    const maxX = Math.max(...xs);
                    const minY = Math.min(...ys);
                    const maxY = Math.max(...ys);

                    const qrWidth = maxX - minX;
                    const qrHeight = maxY - minY;

                    // Zxing returns the *center* of the QR locators, not the outer edge!
                    // A QR locator is 7 modules wide, its center is 3.5 modules from the edge.
                    // For typical QRIS payloads (Version 10 to 20), the distance between centers is ~50 to 90 modules.
                    // So 3.5 modules + ~2 modules of Quiet Zone = ~5.5 modules needed for padding.
                    // 5.5 / 50 = ~11%. 5.5 / 90 = ~6%.
                    // An 11% to 12% padding parameter securely captures the outer border and quiet zone 
                    // without exploding into nearby brand graphics like red arrows!
                    
                    const size = Math.max(qrWidth, qrHeight);
                    const padding = size * 0.11; 
                    const finalSize = size + (padding * 2);

                    const centerX = minX + (qrWidth / 2);
                    const centerY = minY + (qrHeight / 2);

                    return {
                        x: Math.max(0, centerX - finalSize / 2),
                        y: Math.max(0, centerY - finalSize / 2),
                        width: finalSize,
                        height: finalSize,
                        imageWidth: image.width,
                        imageHeight: image.height
                    };
                }
            }
        } catch (scanError) {
            console.log("No QR Code detected by ZXing:", scanError);
        }

        return null;
    } catch (e) {
        console.error("Error setting up QR detection:", e);
        return null;
    }
}
