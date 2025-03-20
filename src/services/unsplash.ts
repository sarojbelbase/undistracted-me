// src/services/unsplash.ts

import { createApi } from 'unsplash-js';
import { Random } from 'unsplash-js/dist/methods/photos/types';

/**
 * UnsplashService
 * 
 * Handles all interactions with the Unsplash API including:
 * - Fetching random images
 * - Searching for images
 * - Downloading images
 * - Caching images locally
 */
class UnsplashService {
  private api: ReturnType<typeof createApi> | null = null;
  private cachedImages: Map<string, string> = new Map();

  /**
   * Initialize the Unsplash API client
   * @param accessKey Unsplash API access key
   */
  initialize(accessKey: string): void {
    if (!accessKey) {
      console.error('Unsplash API key is required');
      return;
    }

    this.api = createApi({
      accessKey,
      fetch: window.fetch,
    });

    // Load cached images from local storage
    this.loadCachedImages();
  }

  /**
   * Load cached images from local storage
   */
  private loadCachedImages(): void {
    const cachedImagesJson = localStorage.getItem('unsplash_cached_images');
    if (cachedImagesJson) {
      try {
        const cachedImages = JSON.parse(cachedImagesJson);
        this.cachedImages = new Map(Object.entries(cachedImages));
      } catch (error) {
        console.error('Failed to load cached images:', error);
      }
    }
  }

  /**
   * Save cached images to local storage
   */
  private saveCachedImages(): void {
    const cachedImagesObj = Object.fromEntries(this.cachedImages);
    localStorage.setItem('unsplash_cached_images', JSON.stringify(cachedImagesObj));
  }

  /**
   * Get a random image from Unsplash
   * @param query Optional search query
   * @param orientation Optional orientation (landscape, portrait, squarish)
   * @returns Promise with the random image data
   */
  async getRandomImage(query?: string, orientation: string = 'landscape'): Promise<Random | null> {
    if (!this.api) {
      console.error('Unsplash API not initialized');
      return null;
    }

    try {
      const result = await this.api.photos.getRandom({
        query,
        orientation,
        count: 1,
      });

      if (result.errors) {
        console.error('Unsplash API error:', result.errors);
        return null;
      }

      return Array.isArray(result.response) ? result.response[0] : result.response;
    } catch (error) {
      console.error('Failed to fetch random image:', error);
      return null;
    }
  }

  /**
   * Search for images on Unsplash
   * @param query Search query
   * @param page Page number
   * @param perPage Number of results per page
   * @returns Promise with search results
   */
  async searchImages(query: string, page: number = 1, perPage: number = 10) {
    if (!this.api) {
      console.error('Unsplash API not initialized');
      return null;
    }

    try {
      const result = await this.api.search.getPhotos({
        query,
        page,
        perPage,
        orientation: 'landscape',
      });

      if (result.errors) {
        console.error('Unsplash API error:', result.errors);
        return null;
      }

      return result.response;
    } catch (error) {
      console.error('Failed to search images:', error);
      return null;
    }
  }

  /**
   * Get an image by ID
   * @param id Unsplash image ID
   * @returns Promise with the image data
   */
  async getImageById(id: string) {
    if (!this.api) {
      console.error('Unsplash API not initialized');
      return null;
    }

    try {
      const result = await this.api.photos.get({ photoId: id });

      if (result.errors) {
        console.error('Unsplash API error:', result.errors);
        return null;
      }

      return result.response;
    } catch (error) {
      console.error('Failed to get image by ID:', error);
      return null;
    }
  }

  /**
   * Download and cache an image
   * @param id Unsplash image ID
   * @param url Image URL
   * @returns Promise with the cached image URL
   */
  async downloadAndCacheImage(id: string, url: string): Promise<string | null> {
    // Check if image is already cached
    if (this.cachedImages.has(id)) {
      return this.cachedImages.get(id) || null;
    }

    try {
      // Fetch the image
      const response = await fetch(url);
      const blob = await response.blob();

      // Convert to data URL
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;

          // Cache the image
          this.cachedImages.set(id, dataUrl);
          this.saveCachedImages();

          resolve(dataUrl);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Failed to download and cache image:', error);
      return null;
    }
  }

  /**
   * Get a cached image by ID
   * @param id Unsplash image ID
   * @returns Cached image URL or null if not cached
   */
  getCachedImage(id: string): string | null {
    return this.cachedImages.get(id) || null;
  }

  /**
   * Track a download (required by Unsplash API terms)
   * @param downloadLocation Download location URL from Unsplash
   */
  trackDownload(downloadLocation: string): void {
    if (!this.api) {
      console.error('Unsplash API not initialized');
      return;
    }

    try {
      fetch(downloadLocation, {
        method: 'GET',
        headers: {
          Authorization: `Client-ID ${this.api.accessKey}`,
        },
      });
    } catch (error) {
      console.error('Failed to track download:', error);
    }
  }
}

// Create a singleton instance
const unsplashService = new UnsplashService();

export default unsplashService;