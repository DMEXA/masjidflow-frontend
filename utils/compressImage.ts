import imageCompression from 'browser-image-compression';

const IMAGE_MIME_PREFIX = 'image/';

export async function compressImage(file: File): Promise<File> {
  if (!file.type?.startsWith(IMAGE_MIME_PREFIX)) {
    return file;
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1.2,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    });

    if (compressed instanceof File) {
      return compressed;
    }

    return new File([compressed], file.name, {
      type: compressed.type || file.type,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
