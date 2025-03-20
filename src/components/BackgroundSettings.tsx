// src/components/BackgroundSettings.tsx

import React, { useState } from 'react';
import { Search, Download, RefreshCw } from 'lucide-react';
import { useBackground } from '../contexts/BackgroundContext';
import { BACKGROUND_OPTIONS, THEME_COLORS } from '../constants';

/**
 * BackgroundSettings Component
 * 
 * Allows users to configure background settings including:
 * - Switching between Unsplash images and solid colors
 * - Searching for specific images
 * - Downloading and caching images
 * - Selecting from predefined accent colors
 */
const BackgroundSettings: React.FC = () => {
  const {
    background,
    setBackgroundType,
    setBackgroundColor,
    setBackgroundQuery,
    fetchRandomImage,
    downloadImage
  } = useBackground();

  const [searchQuery, setSearchQuery] = useState(background.query ?? '');
  const [isLoading, setIsLoading] = useState(false);

  const handleBackgroundTypeChange = (type: 'unsplash' | 'solid') => {
    setBackgroundType(type);
  };

  const handleColorSelect = (color: string) => {
    setBackgroundColor(color);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setBackgroundQuery(searchQuery);
    await fetchRandomImage(searchQuery);
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await fetchRandomImage();
    setIsLoading(false);
  };

  const handleDownload = async () => {
    if (background.type === 'unsplash' && background.imageId && background.imageUrl) {
      setIsLoading(true);
      await downloadImage(background.imageId, background.imageUrl);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Background Settings</h3>

      {/* Background Type Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Background Type</label>
        <div className="flex space-x-4">
          {Object.values(BACKGROUND_OPTIONS).map((option) => (
            <button
              key={option.value}
              onClick={() => handleBackgroundTypeChange(option.value as 'unsplash' | 'solid')}
              className={`px-4 py-2 rounded-lg transition-colors ${background.type === option.value
                  ? 'bg-accent-4 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
                }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Unsplash Settings */}
      {background.type === 'unsplash' && (
        <div className="space-y-4">
          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex space-x-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for images..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-4"
            />
            <button
              type="submit"
              className="p-2 bg-accent-4 text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
              disabled={isLoading || !searchQuery.trim()}
            >
              <Search className="w-5 h-5" />
            </button>
          </form>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              disabled={isLoading}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              disabled={isLoading || !background.imageId}
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
          </div>

          {/* Current Image Info */}
          {background.imageId && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium">Current Image ID:</p>
              <p className="text-gray-600 truncate">{background.imageId}</p>
            </div>
          )}
        </div>
      )}

      {/* Solid Color Settings */}
      {background.type === 'solid' && (
        <div className="space-y-4">
          <label className="text-sm font-medium text-gray-700">Select Color</label>
          <div className="flex flex-wrap gap-4">
            {THEME_COLORS.map((colorOption) => (
              <button
                key={colorOption.color}
                onClick={() => handleColorSelect(`var(--color-${colorOption.color})`)}
                className={`
                  w-10 h-10 rounded-full border-2 transition-all
                  ${background.color === `var(--color-${colorOption.color})`
                    ? 'border-accent-4 scale-110'
                    : 'border-transparent hover:scale-105'}
                `}
                style={{ backgroundColor: `var(--color-${colorOption.color})` }}
                title={colorOption.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-t-transparent border-accent-4 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default BackgroundSettings;