// src/components/Background.tsx

import React, { useEffect, useState } from 'react';
import { useBackground } from '../contexts/BackgroundContext';
import unsplashService from '../services/unsplash';

interface BackgroundProps {
  fallbackImage?: string;
}

/**
 * Background Component
 * 
 * Renders the application background based on current settings.
 * Supports both Unsplash images and solid colors.
 * Handles background image loading and fallback.
 */
const Background: React.FC<BackgroundProps> = ({
  fallbackImage = '/src/assets/bg.webp'
}) => {
  const { background } = useBackground();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preload the image if it's an Unsplash image
  useEffect(() => {
    if (background.type === 'unsplash' && background.imageId && background.imageUrl) {
      setIsLoading(true);
      setError(null);

      const img = new Image();
      img.onload = () => setIsLoading(false);
      img.onerror = () => {
        setError('Failed to load image');
        setIsLoading(false);
      };

      // Check if the image is cached
      const cachedImage = unsplashService.getCachedImage(background.imageId);
      img.src = cachedImage || background.imageUrl;
    }
  }, [background.type, background.imageId, background.imageUrl]);

  // Determine the background style
  const getBackgroundStyle = () => {
    if (background.type === 'unsplash' && background.imageUrl) {
      return {
        backgroundImage: `url(${background.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    } else if (background.type === 'solid' && background.color) {
      return {
        backgroundColor: background.color,
      };
    } else {
      // Fallback
      return {
        backgroundImage: `url(${fallbackImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      };
    }
  };

  return (
    <div
      className="fixed inset-0 z-0 transition-all duration-500 ease-in-out"
      style={{
        ...getBackgroundStyle(),
        overflow: 'hidden',
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-16 h-16 border-4 border-t-transparent border-white rounded-full animate-spin"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <p className="text-red-500">{error}</p>
            <p>Using fallback background</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Background;