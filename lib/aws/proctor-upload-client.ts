'use client';

/**
 * Compress canvas/video frame to JPEG WebP for lightweight proctor uploads.
 */
export async function compressImageBlob(
  blob: Blob,
  maxWidth = 640,
  quality = 0.65,
): Promise<{ blob: Blob; contentType: 'image/webp' | 'image/jpeg' }> {
  if (typeof createImageBitmap === 'undefined') {
    return { blob, contentType: blob.type.includes('png') ? 'image/jpeg' : 'image/jpeg' };
  }

  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { blob, contentType: 'image/jpeg' };
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const webp = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality),
  );

  if (webp && webp.size < blob.size) {
    return { blob: webp, contentType: 'image/webp' };
  }

  const jpeg = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  );

  return { blob: jpeg ?? blob, contentType: 'image/jpeg' };
}

export async function uploadProctorScreenshot(params: {
  attemptId: string;
  blob: Blob;
  fileName?: string;
}): Promise<{ key: string } | null> {
  const compressed = await compressImageBlob(params.blob);

  const presignRes = await fetch('/api/storage/proctor-upload', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attemptId: params.attemptId,
      contentType: compressed.contentType,
      fileName: params.fileName ?? `capture.${compressed.contentType === 'image/webp' ? 'webp' : 'jpg'}`,
    }),
  });

  if (!presignRes.ok) return null;

  const { uploadUrl, key } = (await presignRes.json()) as {
    uploadUrl: string;
    key: string;
  };

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': compressed.contentType },
    body: compressed.blob,
  });

  if (!putRes.ok) return null;
  return { key };
}
