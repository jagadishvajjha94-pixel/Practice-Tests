export type FaceScanStatus = 'present' | 'absent' | 'multiple' | 'suspicious';

export type FaceScanResult = {
  status: FaceScanStatus;
  confidence: number;
};

type DetectedFace = {
  boundingBox?: DOMRectReadOnly;
};

type FaceDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedFace[]>;
};

declare global {
  interface Window {
    FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetectorLike;
  }
}

let sharedDetector: FaceDetectorLike | null = null;
let heuristicCanvas: HTMLCanvasElement | null = null;
let heuristicCtx: CanvasRenderingContext2D | null = null;
let prevCenterLuma = 0;

function getHeuristicCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  if (!heuristicCanvas) {
    heuristicCanvas = document.createElement('canvas');
    heuristicCanvas.width = 160;
    heuristicCanvas.height = 120;
    heuristicCtx = heuristicCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!heuristicCanvas || !heuristicCtx) return null;
  return { canvas: heuristicCanvas, ctx: heuristicCtx };
}

/** Lightweight fallback when FaceDetector API is unavailable (Firefox/Safari). */
function scanVideoHeuristic(video: HTMLVideoElement): FaceScanResult {
  const kit = getHeuristicCanvas();
  if (!kit) return { status: 'absent', confidence: 0 };

  const { canvas, ctx } = kit;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  let skinPixels = 0;
  let lumaSum = 0;
  let samples = 0;
  const cx = width / 2;
  const cy = height / 2;
  const rx = width * 0.28;
  const ry = height * 0.32;

  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy > 1) continue;

      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lumaSum += luma;
      samples += 1;

      const isSkin =
        r > 60 &&
        g > 40 &&
        b > 20 &&
        r > g &&
        r > b &&
        Math.abs(r - g) > 12 &&
        luma > 35 &&
        luma < 220;
      if (isSkin) skinPixels += 1;
    }
  }

  if (samples === 0) return { status: 'absent', confidence: 0 };

  const skinRatio = skinPixels / samples;
  const avgLuma = lumaSum / samples;
  const motion = Math.abs(avgLuma - prevCenterLuma);
  prevCenterLuma = avgLuma;

  if (avgLuma < 28) return { status: 'absent', confidence: 0.8 };
  if (skinRatio >= 0.08 && motion >= 0.4) {
    return { status: 'present', confidence: 0.55 };
  }
  if (skinRatio >= 0.04) {
    return { status: 'suspicious', confidence: 0.45 };
  }
  return { status: 'absent', confidence: 0.6 };
}

async function scanWithFaceDetector(video: HTMLVideoElement): Promise<FaceScanResult | null> {
  if (typeof window === 'undefined' || !window.FaceDetector) return null;

  if (!sharedDetector) {
    sharedDetector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
  }

  const faces = await sharedDetector.detect(video);
  if (faces.length === 0) return { status: 'absent', confidence: 0.9 };
  if (faces.length > 1) return { status: 'multiple', confidence: 0.95 };

  const bb = faces[0].boundingBox;
  if (!bb) return { status: 'suspicious', confidence: 0.5 };

  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return { status: 'absent', confidence: 0 };

  const faceRatio = bb.width / w;
  const cx = bb.x + bb.width / 2;
  const cy = bb.y + bb.height / 2;
  const offCenter =
    Math.abs(cx - w / 2) > w * 0.28 || cy < h * 0.12 || cy > h * 0.72;

  if (faceRatio < 0.09 || offCenter) {
    return { status: 'suspicious', confidence: 0.85 };
  }

  return { status: 'present', confidence: 1 };
}

export async function scanVideoFrame(video: HTMLVideoElement): Promise<FaceScanResult> {
  if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
    return { status: 'absent', confidence: 0 };
  }

  try {
    const native = await scanWithFaceDetector(video);
    if (native) return native;
  } catch {
    /* fallback below */
  }

  return scanVideoHeuristic(video);
}
