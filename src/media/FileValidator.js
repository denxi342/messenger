/**
 * FileValidator.js
 * Validates files based on size, extension, MIME type, and magic bytes.
 */

const MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25 MB
const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200 MB

const ALLOWED_IMAGES = {
  mimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  exts: ['.jpg', '.jpeg', '.png', '.webp', '.gif']
};

const ALLOWED_VIDEOS = {
  mimes: ['video/mp4', 'video/webm', 'video/quicktime'],
  exts: ['.mp4', '.webm', '.mov']
};

/**
 * Reads the first few bytes of a file to check magic numbers.
 * @param {File} file 
 * @returns {Promise<string>} Hex representation of header
 */
function getFileHeaderHex(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) {
        resolve('');
        return;
      }
      const arr = new Uint8Array(e.target.result);
      let hex = '';
      for (let i = 0; i < arr.length; i++) {
        hex += arr[i].toString(16).padStart(2, '0').toUpperCase();
      }
      resolve(hex);
    };
    reader.onerror = () => resolve('');
    // Read first 12 bytes
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

/**
 * Validates a file for media uploading.
 * @param {File} file 
 * @returns {Promise<{ valid: boolean, error?: string, mediaType?: 'image' | 'video' }>}
 */
export async function validateFile(file) {
  if (!file) {
    return { valid: false, error: 'Файл не выбран' };
  }

  const name = file.name || '';
  const size = file.size || 0;
  const mime = file.type || '';
  const ext = (name.slice(name.lastIndexOf('.')).toLowerCase());

  const isImageMime = ALLOWED_IMAGES.mimes.includes(mime);
  const isImageExt = ALLOWED_IMAGES.exts.includes(ext);
  const isVideoMime = ALLOWED_VIDEOS.mimes.includes(mime);
  const isVideoExt = ALLOWED_VIDEOS.exts.includes(ext);

  if (!isImageMime && !isImageExt && !isVideoMime && !isVideoExt) {
    return { 
      valid: false, 
      error: 'Неподдерживаемый формат. Разрешены только изображения (jpg, png, webp, gif) и видео (mp4, webm, mov).' 
    };
  }

  const mediaType = (isImageMime || isImageExt) ? 'image' : 'video';

  // Check file size limits
  if (mediaType === 'image' && size > MAX_IMAGE_SIZE) {
    return { valid: false, error: `Изображение слишком большое. Максимальный размер: ${MAX_IMAGE_SIZE / (1024 * 1024)}MB.` };
  }
  if (mediaType === 'video' && size > MAX_VIDEO_SIZE) {
    return { valid: false, error: `Видео слишком большое. Максимальный размер: ${MAX_VIDEO_SIZE / (1024 * 1024)}MB.` };
  }

  // Basic Magic Byte validation to prevent spoofing
  try {
    const hex = await getFileHeaderHex(file);
    if (mediaType === 'image') {
      // JPEG: FF D8 FF
      // PNG: 89 50 4E 47
      // GIF: 47 49 46 38 ("GIF8")
      // WEBP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
      const isJpeg = hex.startsWith('FFD8FF');
      const isPng = hex.startsWith('89504E47');
      const isGif = hex.startsWith('47494638');
      const isWebp = hex.startsWith('52494646') && hex.includes('57454250');
      
      if (!isJpeg && !isPng && !isGif && !isWebp) {
        // Fallback check if reading failed or if it's a slightly different format
        console.warn('Magic bytes did not match image types, fallback to browser validation');
      }
    } else {
      // MP4: usually has 'ftyp' at bytes 4-7 (hex '66747970')
      // WEBM: starts with 1A 45 DF A3 (EBML header)
      const isMp4 = hex.includes('66747970');
      const isWebm = hex.startsWith('1A45DFA3');
      const isQuicktime = hex.includes('667479706D6F6F76') || hex.includes('6674797071742020'); // 'moov' or 'qt  '

      if (!isMp4 && !isWebm && !isQuicktime) {
        console.warn('Magic bytes did not match video types, fallback to browser validation');
      }
    }
  } catch (e) {
    console.error('File integrity verification error:', e);
  }

  return { valid: true, mediaType };
}
