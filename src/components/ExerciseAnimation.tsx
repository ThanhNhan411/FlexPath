import React, { useState, useEffect } from 'react';
import { Exercise } from '../types';
import { Dumbbell } from 'lucide-react';
import { cn } from '../lib/utils';

interface ExerciseAnimationProps {
  exercise: Exercise;
  className?: string;
}

export function ExerciseAnimation({ exercise, className }: ExerciseAnimationProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = exercise.images || [];
  const hasMultipleImages = images.length > 1;

  // Reset index when exercise changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [exercise.id]);

  // Preload images for smooth playback
  useEffect(() => {
    if (images.length > 0) {
      images.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    }
  }, [images]);

  useEffect(() => {
    if (!hasMultipleImages) return;

    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 700); // 0.7s per frame for a natural workout rhythm

    return () => clearInterval(interval);
  }, [hasMultipleImages, images.length]);

  // If there's a native gifUrl that is actually a gif/video, use it
  if (exercise.gifUrl && !exercise.gifUrl.endsWith('.jpg') && !exercise.gifUrl.endsWith('.png')) {
    return (
      <img 
        src={exercise.gifUrl} 
        alt={exercise.name}
        referrerPolicy="no-referrer"
        className={className}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = `https://placehold.co/600x400/18181b/6366f1?text=${encodeURIComponent(exercise.name)}`;
        }}
      />
    );
  }

  // Animation using multiple images
  if (images.length > 0) {
    return (
      <img
        src={images[currentImageIndex]}
        alt={`${exercise.name} - Step ${currentImageIndex + 1}`}
        referrerPolicy="no-referrer"
        className={cn(className, "w-full h-full object-contain")}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = `https://placehold.co/600x400/18181b/6366f1?text=${encodeURIComponent(exercise.name)}`;
        }}
      />
    );
  }

  // Fallback
  return (
    <div className={cn(className, "flex items-center justify-center bg-white/5")}>
      <Dumbbell className="w-12 h-12 opacity-10" />
    </div>
  );
}
