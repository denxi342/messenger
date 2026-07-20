/**
 * UploadManager.js
 * Queue-based media uploader with support for:
 * - Concurrent uploads limit (max 2)
 * - Progress tracking per file
 * - Cancelation via AbortController/XHR
 * - Automatic retry with exponential backoff
 */

import { uploadMedia } from '../api';

class UploadManagerClass {
  constructor() {
    this.queue = []; // Array of upload items
    this.activeCount = 0;
    this.maxConcurrent = 2;
    this.listeners = new Set();
  }

  /**
   * Add a file to the upload queue.
   * @param {File} file 
   * @param {string} token Auth token
   * @param {object} metadata Extra metadata (thumbnail base64, dims, etc.)
   * @returns {object} The created queue item
   */
  add(file, token, metadata = {}) {
    const id = `up-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const item = {
      id,
      file,
      token,
      name: file.name,
      size: file.size,
      mime: file.type,
      progress: 0,
      status: 'queued', // queued | uploading | processing | done | failed
      error: null,
      abortController: new AbortController(),
      metadata,
      retryCount: 0,
      result: null
    };

    this.queue.push(item);
    this.notify();
    this.processQueue();
    return item;
  }

  /**
   * Cancel a running or queued upload.
   * @param {string} id 
   */
  cancel(id) {
    const idx = this.queue.findIndex(item => item.id === id);
    if (idx === -1) return;

    const item = this.queue[idx];
    if (item.status === 'uploading') {
      item.abortController.abort();
      this.activeCount--;
    }

    // Remove from queue
    this.queue.splice(idx, 1);
    this.notify();
    this.processQueue();
  }

  /**
   * Retry a failed upload.
   * @param {string} id 
   */
  retry(id) {
    const item = this.queue.find(item => item.id === id);
    if (!item || item.status !== 'failed') return;

    item.status = 'queued';
    item.progress = 0;
    item.error = null;
    item.abortController = new AbortController();
    
    this.notify();
    this.processQueue();
  }

  /**
   * Process the next item in queue.
   */
  async processQueue() {
    if (this.activeCount >= this.maxConcurrent) return;

    const nextItem = this.queue.find(item => item.status === 'queued');
    if (!nextItem) return;

    this.activeCount++;
    nextItem.status = 'uploading';
    this.notify();

    this.performUpload(nextItem);
  }

  /**
   * Perform the HTTP upload with progress tracking and retry logic.
   */
  async performUpload(item) {
    try {
      const result = await uploadMedia(
        item.token,
        item.file,
        (percent) => {
          if (item.status === 'uploading') {
            item.progress = percent;
            if (percent >= 100) {
              item.status = 'processing';
            }
            this.notify();
          }
        },
        item.abortController.signal
      );

      item.status = 'done';
      item.progress = 100;
      item.result = {
        ...result,
        width: item.metadata.width || null,
        height: item.metadata.height || null,
        duration: item.metadata.duration || null,
        thumbnail: item.metadata.thumbnail || null
      };
      item.error = null;
      this.activeCount--;
      this.notify();
      this.processQueue();
    } catch (err) {
      if (item.abortController.signal.aborted) {
        console.log(`Upload ${item.id} aborted by user.`);
        return;
      }

      console.error(`Upload ${item.id} error:`, err);

      // Retry mechanism (up to 3 times)
      if (item.retryCount < 3) {
        item.retryCount++;
        item.status = 'queued';
        item.progress = 0;
        this.activeCount--;
        console.warn(`Retrying upload ${item.id} (attempt ${item.retryCount}/3)...`);
        
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, item.retryCount) * 1000;
        setTimeout(() => {
          this.notify();
          this.processQueue();
        }, delay);
      } else {
        item.status = 'failed';
        item.error = err.message || 'Ошибка загрузки';
        this.activeCount--;
        this.notify();
        this.processQueue();
      }
    }
  }

  /**
   * Subscribe to queue state updates.
   * @param {function} listener 
   * @returns {function} unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    // Initial call
    listener([...this.queue]);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all subscribers about queue updates.
   */
  notify() {
    const queueCopy = this.queue.map(item => ({
      id: item.id,
      name: item.name,
      size: item.size,
      mime: item.mime,
      progress: item.progress,
      status: item.status,
      error: item.error,
      metadata: item.metadata,
      result: item.result
    }));
    
    for (const listener of this.listeners) {
      listener(queueCopy);
    }
  }

  /**
   * Clear the completed uploads from the queue.
   */
  clearCompleted() {
    this.queue = this.queue.filter(item => item.status !== 'done');
    this.notify();
  }
}

export const UploadManager = new UploadManagerClass();
