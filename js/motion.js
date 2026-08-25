// จุดเดียวสำหรับปรับความไวและระยะเวลาที่ถือว่านิ่ง
export const MOTION_CONFIG = Object.freeze({
  stableDurationMs: 500,
  accelerationThreshold: 0.8, // m/s² (ไม่รวมแรงโน้มถ่วง)
  gravityDeltaThreshold: 0.55, // m/s² ระหว่าง event สำหรับอุปกรณ์ที่ไม่มี acceleration
  rotationRateThreshold: 12, // degrees/second
  sensorTimeoutMs: 1_500,
});

export class MotionController {
  constructor(onStatus, eventTarget = window) {
    this.onStatus = onStatus;
    this.eventTarget = eventTarget;
    this.active = false;
    this.isStable = false;
    this.gatingAvailable = false;
    this.hasReading = false;
    this.status = "idle";
    this.requestId = 0;
    this.previousGravity = null;
    this.hasReading = false;
    this.stableTimer = null;
    this.sensorTimer = null;
    this.handleMotion = this.#handleMotion.bind(this);
  }

  async start() {
    this.stop();
    this.active = true;
    const activeRequest = ++this.requestId;
    const DeviceMotion = this.eventTarget.DeviceMotionEvent;

    if (!DeviceMotion) {
      this.#markUnavailable("อุปกรณ์นี้ไม่รองรับ motion sensor");
      return;
    }

    this.#emit("requesting", false, false, "กำลังขอสิทธิ์ motion sensor");

    if (typeof DeviceMotion.requestPermission === "function") {
      try {
        const permission = await DeviceMotion.requestPermission();
        if (!this.active || activeRequest !== this.requestId) return;
        if (permission !== "granted") {
          this.#markUnavailable("ไม่ได้รับสิทธิ์ motion sensor", "denied");
          return;
        }
      } catch {
        if (!this.active || activeRequest !== this.requestId) return;
        this.#markUnavailable("เปิด motion sensor ไม่สำเร็จ", "denied");
        return;
      }
    }

    if (!this.active || activeRequest !== this.requestId) return;
    this.eventTarget.addEventListener("devicemotion", this.handleMotion);
    this.#emit("calibrating", false, false, "กำลังตรวจสอบการเคลื่อนไหว");
    this.sensorTimer = this.eventTarget.setTimeout(() => {
      if (this.active && !this.hasReading) {
        this.#markUnavailable("ไม่พบข้อมูลจาก motion sensor");
      }
    }, MOTION_CONFIG.sensorTimeoutMs);
  }

  stop() {
    this.active = false;
    this.requestId += 1;
    this.eventTarget.removeEventListener("devicemotion", this.handleMotion);
    this.#clearTimers();
    this.previousGravity = null;
    this.hasReading = false;
    this.isStable = false;
    this.gatingAvailable = false;
    this.#emit("idle", false, false, "Motion sensor พร้อมเริ่มงาน");
  }

  dispose() {
    this.stop();
  }

  #handleMotion(event) {
    if (!this.active) return;

    const movement = measureMovement(event, this.previousGravity);
    if (!movement.hasData) return;

    if (this.sensorTimer) {
      this.eventTarget.clearTimeout(this.sensorTimer);
      this.sensorTimer = null;
    }
    this.hasReading = true;
    this.gatingAvailable = true;
    this.previousGravity = movement.gravity;

    const isMoving = movement.acceleration > MOTION_CONFIG.accelerationThreshold
      || movement.gravityDelta > MOTION_CONFIG.gravityDeltaThreshold
      || movement.rotationRate > MOTION_CONFIG.rotationRateThreshold;

    if (isMoving) {
      if (this.stableTimer) this.eventTarget.clearTimeout(this.stableTimer);
      this.stableTimer = null;
      this.isStable = false;
      this.#emit("moving", false, true, "กำลังเคลื่อนไหว · ถือโทรศัพท์ให้นิ่ง");
      return;
    }

    if (this.isStable || this.stableTimer) return;
    this.#emit("calibrating", false, true, "ถือนิ่งไว้สักครู่");
    this.stableTimer = this.eventTarget.setTimeout(() => {
      this.stableTimer = null;
      if (!this.active || !this.gatingAvailable) return;
      this.isStable = true;
      this.#emit("stable", true, true, "นิ่ง · Stable");
    }, MOTION_CONFIG.stableDurationMs);
  }

  #markUnavailable(message, state = "unavailable") {
    this.eventTarget.removeEventListener("devicemotion", this.handleMotion);
    this.#clearTimers();
    this.isStable = false;
    this.gatingAvailable = false;
    this.#emit(state, false, false, message);
  }

  #clearTimers() {
    if (this.stableTimer) this.eventTarget.clearTimeout(this.stableTimer);
    if (this.sensorTimer) this.eventTarget.clearTimeout(this.sensorTimer);
    this.stableTimer = null;
    this.sensorTimer = null;
  }

  #emit(state, isStable, gatingAvailable, message) {
    if (this.status === state && this.isStable === isStable && this.gatingAvailable === gatingAvailable) return;
    this.status = state;
    this.isStable = isStable;
    this.gatingAvailable = gatingAvailable;
    this.onStatus?.({ state, isStable, gatingAvailable, message });
  }
}

export function measureMovement(event, previousGravity = null) {
  const accelerationVector = readVector(event.acceleration);
  const gravity = readVector(event.accelerationIncludingGravity);
  const rotationVector = readVector(event.rotationRate, ["alpha", "beta", "gamma"]);
  const acceleration = vectorMagnitude(accelerationVector);
  const gravityDelta = previousGravity && gravity
    ? vectorMagnitude({
      x: gravity.x - previousGravity.x,
      y: gravity.y - previousGravity.y,
      z: gravity.z - previousGravity.z,
    })
    : 0;
  const rotationRate = vectorMagnitude(rotationVector, ["alpha", "beta", "gamma"]);

  return {
    hasData: Boolean(accelerationVector || gravity || rotationVector),
    acceleration,
    gravity,
    gravityDelta,
    rotationRate,
  };
}

function readVector(vector, axes = ["x", "y", "z"]) {
  if (!vector) return null;
  if (axes.some((axis) => vector[axis] == null)) return null;
  const values = axes.map((axis) => Number(vector[axis]));
  return values.every(Number.isFinite)
    ? Object.fromEntries(axes.map((axis, index) => [axis, values[index]]))
    : null;
}

function vectorMagnitude(vector, axes = ["x", "y", "z"]) {
  const normalized = readVector(vector, axes);
  if (!normalized) return 0;
  return Math.hypot(...axes.map((axis) => normalized[axis]));
}
