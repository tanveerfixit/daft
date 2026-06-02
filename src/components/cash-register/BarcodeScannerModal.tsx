import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, AlertCircle } from 'lucide-react';

interface BarcodeScannerModalProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  onScanSuccess,
  onClose
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraState, setCameraState] = useState<'requesting' | 'active' | 'failed'>('requesting');
  const qrCodeInstanceRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const elementId = "scanner-viewfinder";
    const qrCode = new Html5Qrcode(elementId);
    qrCodeInstanceRef.current = qrCode;

    // Start scanner using back/environment camera
    qrCode.start(
      { facingMode: "environment" },
      {
        fps: 12,
        qrbox: (width, height) => {
          // Responsive box dimensions based on container width
          const size = Math.min(width * 0.7, 280);
          return {
            width: size,
            height: Math.min(size * 0.6, 160) // Wide box suitable for EAN/UPC barcodes
          };
        }
      },
      (decodedText) => {
        // Success callback: stop camera and report back
        if (qrCodeInstanceRef.current && qrCodeInstanceRef.current.isScanning) {
          qrCodeInstanceRef.current.stop()
            .then(() => {
              onScanSuccess(decodedText);
            })
            .catch(err => {
              console.error("Error stopping scanner on success:", err);
              onScanSuccess(decodedText); // Proceed anyway
            });
        }
      },
      (errorMessage) => {
        // Frame processing errors (silenced as frames process continuously)
      }
    )
    .then(() => {
      setCameraState('active');
    })
    .catch((err) => {
      console.error("Camera startup failed:", err);
      setCameraState('failed');
      setErrorMessage(err?.message || "Failed to access environment camera. Please check permissions.");
    });

    // Cleanup: Ensure camera stream is stopped and cleared when modal closes
    return () => {
      if (qrCodeInstanceRef.current) {
        const qr = qrCodeInstanceRef.current;
        const stopPromise = qr.isScanning ? qr.stop() : Promise.resolve();
        stopPromise
          .then(() => {
            try { qr.clear(); } catch (e) {}
          })
          .catch(err => {
            console.error("Failed to stop scanner on unmount:", err);
            try { qr.clear(); } catch (e) {}
          });
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col justify-between z-[9999] p-4 font-mono select-none">
      {/* Header bar inside fullscreen modal */}
      <div className="flex justify-between items-center py-2 border-b border-neutral-850 shrink-0 text-white">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-blue-500 animate-pulse" />
          <h3 className="text-xs font-bold uppercase tracking-wider">CAMERA BARCODE SCANNER</h3>
        </div>
        <button 
          onClick={onClose}
          className="text-neutral-400 hover:text-white hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 px-3 py-1 text-xs font-bold uppercase tracking-wider transition-all rounded-none cursor-pointer"
        >
          [Close]
        </button>
      </div>

      {/* Frame / Viewfinder */}
      <div className="flex-1 flex flex-col items-center justify-center p-2 relative">
        <div className="relative w-full max-w-sm aspect-video">
          {cameraState === 'requesting' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-neutral-400 p-4 text-center space-y-2 bg-neutral-950 border border-neutral-800">
              <div className="w-8 h-8 border-2 border-neutral-800 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-xs uppercase tracking-widest animate-pulse">Requesting Camera Access...</p>
            </div>
          )}

          {cameraState === 'failed' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-red-500 p-6 text-center space-y-2 bg-red-950/20 border border-neutral-800">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-xs font-bold uppercase tracking-widest">CAMERA INACCESSIBLE</p>
              <p className="text-[10px] text-neutral-400 leading-tight font-normal text-center">{errorMessage}</p>
            </div>
          )}

          {/* Viewfinder scanner boundary guide line (laser anim) */}
          {cameraState === 'active' && (
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-blue-500/80 shadow-[0_0_8px_#3b82f6] z-10 pointer-events-none animate-bounce" />
          )}

          {/* Exclusive DOM container for html5-qrcode */}
          <div 
            id="scanner-viewfinder" 
            className="w-full h-full bg-neutral-950 border border-neutral-800 rounded-none overflow-hidden"
          />
        </div>

        {cameraState === 'active' && (
          <p className="text-[11px] text-neutral-450 uppercase tracking-widest text-center mt-3 leading-relaxed">
            Align barcode inside viewfinder box.<br/>Scanning happens automatically in real-time.
          </p>
        )}
      </div>

      {/* Status Footer */}
      <div className="py-2 border-t border-neutral-850 shrink-0 text-center text-[10px] text-neutral-500 uppercase tracking-widest">
        Powered by HTML5 Camera Stream API
      </div>
    </div>
  );
};
