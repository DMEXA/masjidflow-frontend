import imageCompression from 'browser-image-compression';

const IMAGE_MIME_PREFIX = 'image/';
const PDF_MIME_TYPE = 'application/pdf';

export const PROOF_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const PROOF_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type UploadStage = 'compressing' | 'uploading';

type PrepareProofUploadOptions = {
  maxBytes?: number;
  allowedImageTypes?: ReadonlyArray<string>;
  onStageChange?: (stage: UploadStage) => void;
};

export async function compressImage(file: File): Promise<File> {
  if (!file.type?.startsWith(IMAGE_MIME_PREFIX)) {
    return file;
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1.25,
      maxWidthOrHeight: 1800,
      useWebWorker: true,
      initialQuality: 0.9,
      preserveExif: true,
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

export async function prepareProofUploadFile(
  file: File,
  options?: PrepareProofUploadOptions,
): Promise<File> {
  const maxBytes = options?.maxBytes ?? PROOF_UPLOAD_MAX_BYTES;
  const allowedImageTypes = options?.allowedImageTypes ?? PROOF_IMAGE_MIME_TYPES;

  if (file.type === PDF_MIME_TYPE) {
    if (file.size > maxBytes) {
      throw new Error('File must be 10MB or smaller.');
    }
    return file;
  }

  if (!allowedImageTypes.includes(file.type)) {
    throw new Error('Only JPG, PNG, or WEBP images are allowed.');
  }

  if (file.size > maxBytes) {
    throw new Error('Image must be 10MB or smaller.');
  }

  options?.onStageChange?.('compressing');
  const compressedFile = await compressImage(file);

  if (!allowedImageTypes.includes(compressedFile.type)) {
    throw new Error('Unsupported image type after compression.');
  }

  if (compressedFile.size > maxBytes) {
    throw new Error('Compressed image exceeds 10MB limit.');
  }

  return compressedFile;
}
