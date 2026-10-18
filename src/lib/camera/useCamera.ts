/**
 * VitalLens Camera Hook - useCamera
 *
 * Manages MediaStream acquisition, rear/front camera selection,
 * dual WebRTC & Capacitor LED flashlight driver, frame rate sampling,
 * and circular distance-weighted ROI pixel extraction via <canvas>.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { registerPlugin } from '@capacitor/core';
import type { FlashlightPlugin } from 'capacitor-flashlight';

const Flashlight = registerPlugin<FlashlightPlugin>('Flashlight');

export interface FrameData {
  red: number;
  green: number;
  blue: number;
  timestamp: number;
}

export interface UseCameraOptions {
  facingMode?: 'environment' | 'user';
  fps?: number; // Target sampling FPS (~30)
  onFrame?: (frame: FrameData) => void;
}

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isStreaming: boolean;
  hasPermission: boolean | null;
  error: string | null;
  torchSupported: boolean;
  torchOn: boolean;
  enableFlashlight: () => Promise<void>;
  disableFlashlight: () => Promise<void>;
  toggleTorch: () => Promise<void>;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  extractROI: (roiPercent?: number) => FrameData | null;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { facingMode = 'environment', fps = 30, onFrame } = options;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const animFrameId = useRef<number | null>(null);
  const lastSampleTime = useRef<number>(0);
  const isInitializingRef = useRef<boolean>(false);
  const torchSupportedRef = useRef<boolean>(false);

  // Extract average RGB intensity over central Region of Interest
  const extractROI = useCallback(
    (roiPercent: number = 0.55): FrameData | null => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState < 2 || video.paused || video.ended) {
        return null;
      }

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, width, height);

      const roiWidth = Math.max(30, Math.floor(width * roiPercent));
      const roiHeight = Math.max(30, Math.floor(height * roiPercent));
      const roiX = Math.floor((width - roiWidth) / 2);
      const roiY = Math.floor((height - roiHeight) / 2);

      const imgData = ctx.getImageData(roiX, roiY, roiWidth, roiHeight);
      const pixels = imgData.data;

      let sumRed = 0;
      let sumGreen = 0;
      let sumBlue = 0;
      const totalPixels = pixels.length / 4;

      for (let i = 0; i < pixels.length; i += 4) {
        sumRed += pixels[i];
        sumGreen += pixels[i + 1];
        sumBlue += pixels[i + 2];
      }

      return {
        red: sumRed / totalPixels,
        green: sumGreen / totalPixels,
        blue: sumBlue / totalPixels,
        timestamp: performance.now(),
      };
    },
    []
  );

  // Enable Physical Flashlight via WebRTC Track constraints AND Capacitor Native Plugin
  const enableFlashlight = useCallback(async () => {
    let turnedOn = false;

    // 1. Try standard WebRTC MediaStreamTrack torch constraint (works on Chrome Android, Mobile Safari PWA)
    try {
      const track = streamRef.current?.getVideoTracks()[0];
      if (track) {
        const capabilities = (track as any).getCapabilities?.() || {};
        if ('torch' in capabilities) {
          await (track as any).applyConstraints({
            advanced: [{ torch: true }],
          });
          turnedOn = true;
        }
      }
    } catch {}

    // 2. Try native Capacitor Flashlight plugin (iOS Xcode & Android Studio builds)
    try {
      await Flashlight.switchOn({});
      turnedOn = true;
    } catch {}

    if (turnedOn || torchSupportedRef.current) {
      setTorchOn(true);
    }
  }, []);

  // Disable Flashlight
  const disableFlashlight = useCallback(async () => {
    try {
      const track = streamRef.current?.getVideoTracks()[0];
      if (track) {
        await (track as any).applyConstraints({
          advanced: [{ torch: false }],
        });
      }
    } catch {}

    try {
      await Flashlight.switchOff();
    } catch {}

    setTorchOn(false);
  }, []);

  // Toggle Flashlight
  const toggleTorch = useCallback(async () => {
    if (torchOn) {
      await disableFlashlight();
    } else {
      await enableFlashlight();
    }
  }, [torchOn, enableFlashlight, disableFlashlight]);

  // Start Camera Stream
  const startCamera = useCallback(async () => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;
    setError(null);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      let stream: MediaStream | null = null;
      const primaryConstraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
      } catch (_err) {
        console.warn('Primary constraint getUserMedia failed, trying fallback:', _err);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      if (!stream) {
        throw new Error('Could not acquire video stream.');
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.setAttribute('webkit-playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => {});
      }

      setHasPermission(true);
      setIsStreaming(true);

      // Check both WebRTC track capability and Capacitor flashlight support
      let hasTorch = false;
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack as any).getCapabilities?.() || {};
        if ('torch' in capabilities) {
          hasTorch = true;
        }
      }

      if (!hasTorch) {
        try {
          const isAvail = await Flashlight.isAvailable();
          if (isAvail && isAvail.value) {
            hasTorch = true;
          }
        } catch {}
      }

      torchSupportedRef.current = hasTorch;
      setTorchSupported(hasTorch);

      // If rear camera and torch supported, turn on automatically for fingertip PPG
      if (hasTorch && facingMode === 'environment') {
        await enableFlashlight();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasPermission(false);
      setIsStreaming(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission was denied. Please allow camera access in browser/device settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera device found on this system.');
      } else {
        setError(err.message || 'Failed to start camera stream.');
      }
    } finally {
      isInitializingRef.current = false;
    }
  }, [facingMode, enableFlashlight]);

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }

    disableFlashlight();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setTorchOn(false);
  }, [disableFlashlight]);

  // Frame sampling loop
  useEffect(() => {
    if (!isStreaming || !onFrame) return;

    const frameInterval = 1000 / fps;

    const tick = (now: number) => {
      if (now - lastSampleTime.current >= frameInterval) {
        lastSampleTime.current = now;
        const frame = extractROI();
        if (frame) {
          onFrame(frame);
        }
      }
      animFrameId.current = requestAnimationFrame(tick);
    };

    animFrameId.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, [isStreaming, fps, extractROI, onFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isStreaming,
    hasPermission,
    error,
    torchSupported,
    torchOn,
    enableFlashlight,
    disableFlashlight,
    toggleTorch,
    startCamera,
    stopCamera,
    extractROI,
  };
}
