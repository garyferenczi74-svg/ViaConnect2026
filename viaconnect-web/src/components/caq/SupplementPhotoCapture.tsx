"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Camera, Upload, Loader2, Check, AlertTriangle, X } from "lucide-react";

interface DetectedProduct {
  brand: string;
  productName: string;
  formulation: string;
  dosage: string;
  dosageForm: string;
  category: string;
  keyIngredients: string[];
}

interface SupplementPhotoCaptureProps {
  onProductDetected: (product: DetectedProduct, photoUrl: string) => void;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function SupplementPhotoCapture({ onProductDetected }: SupplementPhotoCaptureProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [detected, setDetected] = useState<DetectedProduct | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  function resetCapture() {
    setPreviewUrl(null);
    setDetected(null);
    setError(null);
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPG, PNG, HEIC)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setError(null);
    setDetected(null);
    setIsProcessing(true);

    try {
      const base64 = await fileToBase64(file);
      const response = await fetch("/api/ai/supplement-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, mediaType: file.type }),
      });

      const result = await response.json();

      if (result.success && result.product) {
        setDetected(result.product);
        onProductDetected(result.product, url);
      } else {
        setError(result.error || "Could not identify the supplement. Try a clearer photo of the front label.");
      }
    } catch {
      setError("Failed to process image. Please try again or add manually.");
    } finally {
      setIsProcessing(false);
      // Reset file inputs so same file can be re-selected
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      {/* Hidden file inputs */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {/* Trigger buttons */}
      {!isProcessing && !detected && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-400/10 border border-teal-400/20 text-teal-400 text-xs font-medium hover:bg-teal-400/15 transition-all"
          >
            <Camera className="w-3.5 h-3.5" strokeWidth={1.5} />
            Take Photo
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/30 text-xs font-medium hover:bg-white/8 hover:text-white/50 transition-all"
          >
            <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
            Upload File
          </button>
        </div>
      )}

      {/* Processing state */}
      {isProcessing && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-400/5 border border-teal-400/15">
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Processing" className="w-12 h-12 rounded-lg object-cover border border-white/10" />
          )}
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-teal-400 animate-spin" strokeWidth={2} />
            <div>
              <p className="text-xs text-teal-400 font-medium">Analyzing supplement label...</p>
              <p className="text-[10px] text-white/25 mt-0.5">Extracting brand, formulation, dosage, and ingredients</p>
            </div>
          </div>
        </div>
      )}

      {/* Success state */}
      {detected && !isProcessing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-400/5 border border-teal-400/20"
        >
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Detected" className="w-12 h-12 rounded-lg object-cover border border-teal-400/20" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-teal-400" strokeWidth={2} />
              <p className="text-xs text-teal-400 font-medium">Added to your list</p>
            </div>
            <p className="text-sm text-white/60 font-medium mt-0.5">
              {detected.brand} {detected.productName}
            </p>
            <p className="text-[10px] text-white/25 mt-0.5">{detected.formulation}</p>
          </div>
          <button
            type="button"
            onClick={resetCapture}
            className="min-h-[36px] px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-white/25 text-[10px] hover:text-white/40 transition-colors"
          >
            Scan Another
          </button>
        </motion.div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-red-400/5 border border-red-400/15">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400/60 flex-shrink-0" strokeWidth={1.5} />
          <p className="text-[11px] text-red-400/60 flex-1">{error}</p>
          <button type="button" onClick={resetCapture} className="text-[10px] text-white/25 hover:text-white/40 min-h-[36px] px-2">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
