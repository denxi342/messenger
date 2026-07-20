/**
 * ThumbnailGenerator.js
 * Generates lightweight base64 JPEG thumbnails for images and videos.
 */

const THUMB_MAX_WIDTH = 320;
const THUMB_MAX_HEIGHT = 240;

/**
 * Generates thumbnail for an Image file or URL.
 * @param {File|string} source File object or image URL
 * @returns {Promise<{ thumbnail: string, width: number, height: number }>}
 */
export function generateImageThumbnail(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions keeping aspect ratio
      if (width > THUMB_MAX_WIDTH || height > THUMB_MAX_HEIGHT) {
        const ratio = Math.min(THUMB_MAX_WIDTH / width, THUMB_MAX_HEIGHT / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get 2D context'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve({ thumbnail: dataUrl, width: img.width, height: img.height });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for thumbnail'));
    };

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result;
        } else {
          reject(new Error('Empty file read'));
        }
      };
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsDataURL(source);
    } else {
      img.src = source;
    }
  });
}

/**
 * Generates thumbnail for a Video file or URL.
 * @param {File|string} source File object or video URL
 * @returns {Promise<{ thumbnail: string, width: number, height: number, duration: number }>}
 */
export function generateVideoThumbnail(source) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    
    let objectUrl = '';
    if (source instanceof File) {
      objectUrl = URL.createObjectURL(source);
      video.src = objectUrl;
    } else {
      video.crossOrigin = 'anonymous';
      video.src = source;
    }

    video.onloadedmetadata = () => {
      // Seek to 0.5s or 10% of duration to get a good frame
      const duration = video.duration || 0;
      video.currentTime = Math.min(0.5, duration / 10);
    };

    video.onseeked = () => {
      let width = video.videoWidth;
      let height = video.videoHeight;
      const duration = video.duration || 0;

      if (!width || !height) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject(new Error('Invalid video dimensions'));
        return;
      }

      // Calculate thumb dimensions
      let thumbW = width;
      let thumbH = height;
      if (thumbW > THUMB_MAX_WIDTH || thumbH > THUMB_MAX_HEIGHT) {
        const ratio = Math.min(THUMB_MAX_WIDTH / thumbW, THUMB_MAX_HEIGHT / thumbH);
        thumbW = Math.round(thumbW * ratio);
        thumbH = Math.round(thumbH * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = thumbW;
      canvas.height = thumbH;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not get 2D context'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(video, 0, 0, thumbW, thumbH);

      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        resolve({ thumbnail: dataUrl, width, height, duration });
      } catch (err) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    video.onerror = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load video for thumbnail'));
    };
  });
}
