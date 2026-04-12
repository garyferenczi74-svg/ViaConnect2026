'use client';

import { useState, useRef } from 'react';
import { Camera, ImagePlus, Plus, X } from 'lucide-react';
import { fileToBase64 } from '@/lib/nutrition/analyzeMeal';

export interface PhotoInput {
  file: File;
  previewUrl: string;
  base64: string;
  mediaType: string;
}

interface PhotoCaptureProps {
  onPhotosReady: (photos: PhotoInput[]) => void;
  maxPhotos?: number;
}

export function PhotoCapture({ onPhotosReady, maxPhotos = 4 }: PhotoCaptureProps) {
  const [photos, setPhotos] = useState<PhotoInput[]>([]);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const base64 = await fileToBase64(file);
    const previewUrl = URL.createObjectURL(file);
    const mediaType = file.type || 'image/jpeg';
    const photo: PhotoInput = { file, previewUrl, base64, mediaType };

    setPhotos((prev) => {
      const updated = [...prev, photo];
      onPhotosReady(updated);
      return updated;
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      onPhotosReady(updated);
      return updated;
    });
  };

  return (
    <div>
      {photos.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
              <img src={photo.previewUrl} alt={`Meal photo ${i + 1}`} className="h-full w-full object-cover" />
              <button
                onClick={() => removePhoto(i)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50"
              >
                <X className="h-3 w-3 text-white" strokeWidth={1.5} />
              </button>
            </div>
          ))}
          {photos.length < maxPhotos && (
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-white/10 hover:border-[#2DA5A0]/30"
            >
              <Plus className="h-5 w-5 text-white/30" strokeWidth={1.5} />
              <span className="text-[10px] text-white/30">Add photo</span>
            </button>
          )}
        </div>
      )}

      {photos.length === 0 && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-8 transition-all hover:border-[#2DA5A0]/30 hover:bg-white/[0.08]"
          >
            <Camera className="h-6 w-6 text-white/40" strokeWidth={1.5} />
            <span className="text-xs text-white/60">Camera</span>
          </button>
          <button
            onClick={() => galleryRef.current?.click()}
            className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-8 transition-all hover:border-[#2DA5A0]/30 hover:bg-white/[0.08]"
          >
            <ImagePlus className="h-6 w-6 text-white/40" strokeWidth={1.5} />
            <span className="text-xs text-white/60">Gallery</span>
          </button>
        </div>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  );
}
