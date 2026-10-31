import { createUploadQueue, type UploadJob, type UploadStore } from '../../../../shared/gallery.ts';

function browserStore(): UploadStore {
  const open = () => new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('plcc-gallery-uploads', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('jobs')) request.result.createObjectStore('jobs');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return {
    async load() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const request = db.transaction('jobs').objectStore('jobs').get('list');
        request.onsuccess = () => resolve((request.result as UploadJob[] | undefined) || []);
        request.onerror = () => reject(request.error);
      });
    },
    async save(jobs) {
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const request = db.transaction('jobs', 'readwrite').objectStore('jobs').put(jobs, 'list');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },
  };
}

export function browserUploadQueue(upload: (job: UploadJob) => Promise<void>) {
  return createUploadQueue(browserStore(), upload);
}

export async function resizeForUpload(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot prepare the photo.');
  context.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((next) => (next ? resolve(next) : reject(new Error('Could not prepare the photo.'))), 'image/webp', 0.85);
  });
  const blur = document.createElement('canvas');
  blur.width = 16;
  blur.height = 12;
  blur.getContext('2d')?.drawImage(canvas, 0, 0, 16, 12);
  return { blob, width, height, blurDataUrl: blur.toDataURL('image/webp', 0.5) };
}
