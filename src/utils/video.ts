/**
 * Extracts frames from a video file at specified intervals.
 * Frames are resized to max 512px wide and compressed to reduce payload size.
 */
export async function extractFrames(videoFile: File, frameCount: number = 8): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frames: string[] = [];

    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Resize to max 512px wide to keep payload small
      const MAX_WIDTH = 512;
      const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);

      const duration = video.duration;
      const interval = duration / (frameCount + 1);
      let currentFrame = 0;

      const captureFrame = async () => {
        if (currentFrame >= frameCount) {
          URL.revokeObjectURL(video.src);
          resolve(frames);
          return;
        }
        const time = (currentFrame + 1) * interval;
        video.currentTime = time;
      };

      video.onseeked = () => {
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          // Quality 0.5 = ~10KB per frame instead of ~80KB
          frames.push(canvas.toDataURL('image/jpeg', 0.5));
          currentFrame++;
          captureFrame();
        }
      };

      captureFrame();
    };

    video.onerror = () => {
      reject(new Error("Failed to load video"));
    };
  });
}
