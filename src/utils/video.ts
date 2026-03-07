/**
 * Extracts frames from a video file at specified intervals.
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
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
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
          frames.push(canvas.toDataURL('image/jpeg', 0.7));
          currentFrame++;
          captureFrame();
        }
      };

      captureFrame();
    };

    video.onerror = (e) => {
      reject(new Error("Failed to load video"));
    };
  });
}
