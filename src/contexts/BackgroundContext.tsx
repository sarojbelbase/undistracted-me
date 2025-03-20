// src/contexts/BackgroundContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import Color from 'color';
import unsplashService from '../services/unsplash';
import { BACKGROUND_OPTIONS, THEME_COLORS } from '../constants';

interface BackgroundState {
  type: 'unsplash' | 'solid';
  imageId?: string;
  imageUrl?: string;
  color?: string;
  query?: string;
  contrastRatio: number;
  textColor: string;
}

interface BackgroundContextType {
  background: BackgroundState;
  setBackgroundType: (type: 'unsplash' | 'solid') => void;
  setBackgroundColor: (color: string) => void;
  setBackgroundImage: (imageId: string, imageUrl: string) => void;
  setBackgroundQuery: (query: string) => void;
  fetchRandomImage: (query?: string) => Promise<void>;
  downloadImage: (imageId: string, imageUrl: string) => Promise<void>;
  calculateTextColor: (backgroundColor: string) => string;
}

const defaultBackground: BackgroundState = {
  type: 'unsplash',
  contrastRatio: 4.5, // WCAG AA standard
  textColor: '#ffffff',
};

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export const BackgroundProvider: React.FC<{ children: React.ReactNode; apiKey: string }> = ({
  children,
  apiKey
}) => {
  const [background, setBackground] = useState<BackgroundState>(() => {
    // Load from localStorage if available
    const savedBackground = localStorage.getItem('background_settings');
    return savedBackground ? JSON.parse(savedBackground) : defaultBackground;
  });

  // Initialize Unsplash service
  useEffect(() => {
    if (apiKey) {
      unsplashService.initialize(apiKey);
    }
  }, [apiKey]);

  // Save background settings to localStorage
  useEffect(() => {
    localStorage.setItem('background_settings', JSON.stringify(background));
  }, [background]);

  /**
   * Calculate the appropriate text color for a given background color
   * @param backgroundColor Background color in hex format
   * @returns Text color in hex format (black or white)
   */
  const calculateTextColor = (backgroundColor: string): string => {
    try {
      const bgColor = Color(backgroundColor);
      // Calculate relative luminance
      const luminance = bgColor.luminosity();

      // Use white text on dark backgrounds, black text on light backgrounds
      return luminance < 0.5 ? '#ffffff' : '#000000';
    } catch (error) {
      console.error('Failed to calculate text color:', error);
      return '#ffffff'; // Default to white
    }
  };

  const setBackgroundType = (type: 'unsplash' | 'solid') => {
    setBackground(prev => ({
      ...prev,
      type,
    }));
  };

  const setBackgroundColor = (color: string) => {
    const textColor = calculateTextColor(color);
    setBackground(prev => ({
      ...prev,
      type: 'solid',
      color,
      textColor,
    }));
  };

  const setBackgroundImage = (imageId: string, imageUrl: string) => {
    setBackground(prev => ({
      ...prev,
      type: 'unsplash',
      imageId,
      imageUrl,
      textColor: '#ffffff', // Default for images
    }));
  };

  const setBackgroundQuery = (query: string) => {
    setBackground(prev => ({
      ...prev,
      query,
    }));
  };

  const fetchRandomImage = async (query?: string) => {
    const searchQuery = query || background.query;
    const image = await unsplashService.getRandomImage(searchQuery);

    if (image) {
      setBackgroundImage(
        image.id,
        image.urls.regular
      );
    }
  };

  const downloadImage = async (imageId: string, imageUrl: string) => {
    const cachedUrl = await unsplashService.downloadAndCacheImage(imageId, imageUrl);

    if (cachedUrl) {
      setBackground(prev => ({
        ...prev,
        type: 'unsplash',
        imageId,
        imageUrl: cachedUrl,
      }));
    }
  };

  const value = {
    background,
    setBackgroundType,
    setBackgroundColor,
    setBackgroundImage,
    setBackgroundQuery,
    fetchRandomImage,
    downloadImage,
    calculateTextColor,
  };

  return (
    <BackgroundContext.Provider value={value}>
      {children}
    </BackgroundContext.Provider>
  );
};

export const useBackground = () => {
  const context = useContext(BackgroundContext);
  if (context === undefined) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
};