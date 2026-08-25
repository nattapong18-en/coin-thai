export class CameraController {
  constructor(videoElement) {
    this.video = videoElement;
    this.stream = null;
    this.requestId = 0;
  }

  get isRunning() {
    return Boolean(this.stream?.getVideoTracks().some((track) => track.readyState === "live"));
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new CameraError("unsupported", "เบราว์เซอร์นี้ไม่รองรับการใช้งานกล้อง");
    }

    this.stop();
    const activeRequest = ++this.requestId;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
      });

      if (activeRequest !== this.requestId) {
        stream.getTracks().forEach((track) => track.stop());
        throw new CameraError("cancelled", "ยกเลิกการเปิดกล้องแล้ว");
      }

      this.stream = stream;
      this.video.srcObject = this.stream;
      await this.video.play();
      await waitForVideo(this.video);
      return this.stream;
    } catch (error) {
      this.stop();
      throw normalizeCameraError(error);
    }
  }

  stop() {
    this.requestId += 1;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.video.pause();
    this.video.srcObject = null;
  }
}

export class CameraError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "CameraError";
    this.code = code;
  }
}

function waitForVideo(video) {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new CameraError("timeout", "กล้องใช้เวลาเริ่มทำงานนานเกินไป กรุณาลองอีกครั้ง"));
    }, 10_000);

    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
    };
    const onReady = () => { cleanup(); resolve(); };
    const onError = () => { cleanup(); reject(new CameraError("video", "ไม่สามารถแสดงภาพจากกล้องได้")); };

    video.addEventListener("loadedmetadata", onReady, { once: true });
    video.addEventListener("error", onError, { once: true });
  });
}

function normalizeCameraError(error) {
  if (error instanceof CameraError) return error;

  if (["NotAllowedError", "PermissionDeniedError"].includes(error?.name)) {
    return new CameraError("permission-denied", "ไม่ได้รับสิทธิ์ใช้กล้อง กรุณาอนุญาตกล้องในการตั้งค่าเบราว์เซอร์");
  }
  if (["NotFoundError", "DevicesNotFoundError"].includes(error?.name)) {
    return new CameraError("not-found", "ไม่พบกล้องบนอุปกรณ์นี้");
  }
  if (["NotReadableError", "TrackStartError"].includes(error?.name)) {
    return new CameraError("in-use", "เปิดกล้องไม่ได้ กล้องอาจถูกใช้งานโดยแอปอื่น");
  }
  return new CameraError("unknown", "เปิดกล้องไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
}
