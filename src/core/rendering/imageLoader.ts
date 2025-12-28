/**
 * Core Image Loader - Shared image caching and loading utilities
 * 
 * Provides efficient image loading with caching and callbacks for when images are ready.
 */

// ============================================================================
// Image Cache
// ============================================================================

/** Cached images by source path */
const imageCache = new Map<string, HTMLImageElement>();

/** Loading promises for deduplication */
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();

/** Callbacks to run when an image finishes loading */
const loadCallbacks = new Map<string, Array<() => void>>();

// ============================================================================
// Image Loading Functions
// ============================================================================

/**
 * Load an image with caching. Returns cached image immediately if available.
 */
export function loadImage(src: string): HTMLImageElement | null {
  // Return cached image if available
  if (imageCache.has(src)) {
    return imageCache.get(src)!;
  }
  
  // Start loading if not already in progress
  if (!loadingPromises.has(src)) {
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        imageCache.set(src, img);
        loadingPromises.delete(src);
        
        // Fire all registered callbacks
        const callbacks = loadCallbacks.get(src);
        if (callbacks) {
          callbacks.forEach(cb => cb());
          loadCallbacks.delete(src);
        }
        
        resolve(img);
      };
      img.onerror = () => {
        loadingPromises.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });
    
    loadingPromises.set(src, promise);
  }
  
  return null;
}

/**
 * Load an image and return a promise
 */
export function loadImageAsync(src: string): Promise<HTMLImageElement> {
  // Return cached image immediately
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!);
  }
  
  // Return existing loading promise if in progress
  if (loadingPromises.has(src)) {
    return loadingPromises.get(src)!;
  }
  
  // Start new load
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      loadingPromises.delete(src);
      
      // Fire all registered callbacks
      const callbacks = loadCallbacks.get(src);
      if (callbacks) {
        callbacks.forEach(cb => cb());
        loadCallbacks.delete(src);
      }
      
      resolve(img);
    };
    img.onerror = () => {
      loadingPromises.delete(src);
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
  
  loadingPromises.set(src, promise);
  return promise;
}

/**
 * Get a cached image (returns null if not loaded)
 */
export function getCachedImage(src: string): HTMLImageElement | null {
  return imageCache.get(src) ?? null;
}

/**
 * Check if an image is loaded and cached
 */
export function isImageLoaded(src: string): boolean {
  return imageCache.has(src);
}

/**
 * Register a callback to run when an image finishes loading
 */
export function onImageLoaded(src: string, callback: () => void): void {
  // If already loaded, call immediately
  if (imageCache.has(src)) {
    callback();
    return;
  }
  
  // Register callback
  if (!loadCallbacks.has(src)) {
    loadCallbacks.set(src, []);
  }
  loadCallbacks.get(src)!.push(callback);
  
  // Start loading if not already in progress
  loadImage(src);
}

/**
 * Preload multiple images
 */
export async function preloadImages(srcs: string[]): Promise<Map<string, HTMLImageElement>> {
  const results = new Map<string, HTMLImageElement>();
  
  await Promise.all(
    srcs.map(async (src) => {
      try {
        const img = await loadImageAsync(src);
        results.set(src, img);
      } catch (error) {
        console.warn(`Failed to preload image: ${src}`, error);
      }
    })
  );
  
  return results;
}

/**
 * Clear the image cache (useful for memory management)
 */
export function clearImageCache(): void {
  imageCache.clear();
}

/**
 * Clear a specific image from cache
 */
export function clearCachedImage(src: string): void {
  imageCache.delete(src);
}

// ============================================================================
// Sprite Sheet Helpers
// ============================================================================

/**
 * Load a sprite sheet and its variants
 */
export async function loadSpriteSheetWithVariants(
  mainSrc: string,
  variantSrcs: string[]
): Promise<{ main: HTMLImageElement; variants: Map<string, HTMLImageElement> }> {
  const [main, ...variantImages] = await Promise.all([
    loadImageAsync(mainSrc),
    ...variantSrcs.map(src => loadImageAsync(src).catch(() => null)),
  ]);
  
  const variants = new Map<string, HTMLImageElement>();
  variantSrcs.forEach((src, index) => {
    const img = variantImages[index];
    if (img) {
      variants.set(src, img);
    }
  });
  
  return { main, variants };
}
