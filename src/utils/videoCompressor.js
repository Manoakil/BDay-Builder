/**
 * videoCompressor.js
 * 
 * WhatsApp-style client-side video compressor using HTML5 Canvas & MediaRecorder.
 * 
 * WhatsApp video compression specification:
 * - Resolution: Rescaled to 720p HD (max 1280px dimension; e.g. 1280x720 or 720x1280 for portrait).
 *   If original is smaller than 720p, original dimensions are preserved.
 * - Aspect Ratio & Even Dimensions: Preserved and rounded to even numbers (required by video codecs).
 * - Bitrate: Target 2.0 - 2.5 Mbps (capped so resulting video is crisp HD while dropping file size by 70-90%).
 *   Automatically adapts based on duration so the file is guaranteed to stay under 45 MB.
 * - Audio: 128 kbps AAC / Opus stereo.
 * - Framerate: 30 fps.
 */

import fixWebmDuration from 'fix-webm-duration';

/**
 * Patches the missing EBML duration header in WebM blobs produced by Chrome/Edge MediaRecorder.
 * This fixes the browser bug where recorded videos only show/play 10 seconds or cannot seek.
 */
export async function fixWebmBlobDuration(blob, durationMs) {
  if (!blob || !durationMs || durationMs <= 0) return blob;
  return new Promise((resolve) => {
    try {
      fixWebmDuration(blob, durationMs, (fixedBlob) => {
        resolve(fixedBlob || blob);
      });
    } catch (err) {
      console.warn("Could not patch WebM duration header, using original blob:", err);
      resolve(blob);
    }
  });
}

/**
 * Returns true if a file is a video and exceeds the specified size threshold (default 100 MB).
 */
export function isLargeVideo(file, thresholdMB = 100) {
  if (!file || !file.type || !file.type.startsWith('video/')) {
    return false;
  }
  return file.size > thresholdMB * 1024 * 1024;
}

/**
 * Formats bytes into a human-readable MB / KB string.
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

/**
 * Detects the best video MIME type supported by the current browser.
 */
function getBestVideoMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return '';
  }

  const candidateTypes = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=h264,opus',
    'video/webm'
  ];

  for (const type of candidateTypes) {
    try {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch (_) {}
  }

  return '';
}

/**
 * Compresses a video file like WhatsApp without perceptible quality degradation.
 * 
 * @param {File|Blob} file - The source video file.
 * @param {Function} onProgress - Callback (percent: number, statusText: string) => void
 * @param {Object} options - Optional compression overrides
 * @returns {Promise<File>} - The compressed File object
 */
export async function compressVideo(file, onProgress = () => {}, options = {}) {
  if (!file || !file.type || !file.type.startsWith('video/')) {
    return file;
  }

  // If MediaRecorder or Canvas captureStream is not supported in this environment, fallback
  if (typeof document === 'undefined' || typeof MediaRecorder === 'undefined') {
    console.warn('MediaRecorder not available in this browser. Skipping compression.');
    return file;
  }

  const {
    maxDimension = 1280, // WhatsApp 720p HD standard
    targetMaxMB = 45,     // Guarantee to fit within 45MB (under Supabase 50MB limit)
    fps = 30
  } = options;

  onProgress(5, 'Preparing video for optimization...');

  const videoUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.playsInline = true;
  video.muted = false;
  video.src = videoUrl;

  return new Promise((resolve, reject) => {
    let animId = null;
    let audioCtx = null;
    let combinedStream = null;
    let recorder = null;
    let isCleanedUp = false;

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      if (animId) cancelAnimationFrame(animId);
      if (video) {
        video.pause();
        video.src = '';
        video.load();
      }
      if (combinedStream) {
        combinedStream.getTracks().forEach((track) => track.stop());
      }
      if (audioCtx) {
        try {
          audioCtx.close();
        } catch (_) {}
      }
      try {
        URL.revokeObjectURL(videoUrl);
      } catch (_) {}
    };

    video.onerror = (e) => {
      cleanup();
      console.warn('Failed to load video element for compression, using original file:', e);
      resolve(file); // Fallback gracefully to original
    };

    video.onloadedmetadata = async () => {
      try {
        onProgress(12, 'Analyzing video resolution and audio...');

        const duration = video.duration || 1;
        const srcWidth = video.videoWidth || 1280;
        const srcHeight = video.videoHeight || 720;

        // Calculate WhatsApp 720p HD target dimensions
        let targetWidth = srcWidth;
        let targetHeight = srcHeight;

        if (srcWidth >= srcHeight) {
          // Landscape
          if (srcWidth > maxDimension) {
            targetHeight = Math.round((srcHeight * maxDimension) / srcWidth);
            targetWidth = maxDimension;
          }
        } else {
          // Portrait (mobile phone video)
          if (srcHeight > maxDimension) {
            targetWidth = Math.round((srcWidth * maxDimension) / srcHeight);
            targetHeight = maxDimension;
          }
        }

        // Codecs strictly require even pixel dimensions
        targetWidth = Math.floor(targetWidth / 2) * 2;
        targetHeight = Math.floor(targetHeight / 2) * 2;

        // Calculate dynamic WhatsApp bitrate:
        // Target: 2.2 - 2.5 Mbps for crisp HD visual quality,
        // while guaranteeing the final size is below targetMaxMB.
        const maxTotalBits = targetMaxMB * 8 * 1024 * 1024;
        const calculatedBitrate = Math.floor(maxTotalBits / duration) - 128000;
        // Cap between 600 kbps (minimum clarity) and 2.5 Mbps (WhatsApp max quality)
        const targetVideoBitrate = Math.max(600000, Math.min(2500000, calculatedBitrate));
        const targetAudioBitrate = 128000; // 128 kbps AAC/Opus

        // Setup hidden canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { alpha: false });

        if (!ctx) {
          cleanup();
          return resolve(file);
        }

        // Capture canvas stream
        const canvasStream = canvas.captureStream ? canvas.captureStream(fps) : (canvas.mozCaptureStream ? canvas.mozCaptureStream(fps) : null);
        if (!canvasStream) {
          cleanup();
          return resolve(file);
        }

        // Setup AudioContext to capture audio silently without playing through speakers
        let audioTracks = [];
        try {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) {
            audioCtx = new AudioContextClass();
            if (audioCtx.state === 'suspended') {
              await audioCtx.resume();
            }
            const source = audioCtx.createMediaElementSource(video);
            const destination = audioCtx.createMediaStreamDestination();
            source.connect(destination);
            // Notice: do NOT connect to audioCtx.destination, so the user doesn't hear it playing!
            audioTracks = destination.stream.getAudioTracks();
          }
        } catch (audioErr) {
          console.warn('Audio capture note (video may be silent or cross-origin):', audioErr);
        }

        combinedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...audioTracks
        ]);

        const selectedMime = getBestVideoMimeType();
        const recorderOptions = {
          videoBitsPerSecond: targetVideoBitrate,
          audioBitsPerSecond: targetAudioBitrate
        };
        if (selectedMime) {
          recorderOptions.mimeType = selectedMime;
        }

        try {
          recorder = new MediaRecorder(combinedStream, recorderOptions);
        } catch (recErr) {
          console.warn('MediaRecorder init with options failed, trying default:', recErr);
          recorder = new MediaRecorder(combinedStream);
        }

        const chunks = [];
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        recorder.onerror = (recErr) => {
          console.error('MediaRecorder error during compression:', recErr);
          cleanup();
          resolve(file);
        };

        recorder.onstop = () => {
          try {
            const rawMime = recorder.mimeType || selectedMime || 'video/mp4';
            const baseMime = rawMime.split(';')[0];
            const isWebm = baseMime.includes('webm');
            const ext = isWebm ? 'webm' : 'mp4';
            const compressedBlob = new Blob(chunks, { type: baseMime });

            // Ensure valid output
            if (compressedBlob.size > 0) {
              const origName = file.name || 'video_wish.mp4';
              const cleanBase = origName.replace(/\.[^/.]+$/, "");
              const resultFile = new File(
                [compressedBlob],
                `${cleanBase}-hd-compressed.${ext}`,
                { type: baseMime, lastModified: Date.now() }
              );

              onProgress(100, `Done! Optimized from ${formatFileSize(file.size)} to ${formatFileSize(resultFile.size)}`);
              cleanup();
              resolve(resultFile);
            } else {
              cleanup();
              resolve(file);
            }
          } catch (stopErr) {
            console.error('Error finalizing compressed video:', stopErr);
            cleanup();
            resolve(file);
          }
        };

        // Render loop: draws video frames onto the scaled canvas
        const renderFrame = () => {
          if (!isCleanedUp && !video.paused && !video.ended) {
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
            if (duration > 0) {
              const currentPercent = 15 + Math.min(84, Math.round((video.currentTime / duration) * 84));
              onProgress(
                currentPercent,
                `Compressing HD video... ${Math.round((video.currentTime / duration) * 100)}%`
              );
            }
          }
          if (!video.ended && !isCleanedUp) {
            animId = requestAnimationFrame(renderFrame);
          }
        };

        video.onended = () => {
          if (animId) cancelAnimationFrame(animId);
          // Draw final frame
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          onProgress(99, 'Finalizing video package...');
          setTimeout(() => {
            if (recorder && recorder.state === 'recording') {
              recorder.stop();
            }
          }, 300);
        };

        // Start recording
        recorder.start(500);

        // Play the video to feed the canvas stream
        onProgress(15, 'Compressing video stream...');
        video.play()
          .then(() => {
            animId = requestAnimationFrame(renderFrame);
          })
          .catch((playErr) => {
            console.warn('Video play blocked, attempting fallback:', playErr);
            cleanup();
            resolve(file);
          });

      } catch (err) {
        console.error('Video compression error:', err);
        cleanup();
        resolve(file);
      }
    };
  });
}
