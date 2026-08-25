import { CameraController } from "./camera.js";
import { CoinClassifier } from "./classifier.js";
import { MotionController } from "./motion.js";
import { ScannerUI } from "./ui.js";

const video = document.querySelector("#cameraPreview");
const ui = new ScannerUI();
const camera = new CameraController(video);
const classifier = new CoinClassifier(video, handlePrediction);
const motion = new MotionController(handleMotionStatus);
let starting = false;
let startAttempt = 0;
let latestPrediction = { state: "detecting" };

ui.button.addEventListener("click", () => {
  if (camera.isRunning || starting) stopScanner();
  else startScanner();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") stopScanner();
});
window.addEventListener("pagehide", cleanup, { once: true });

async function startScanner() {
  if (!window.isSecureContext) {
    ui.render("error", { message: "การใช้กล้องต้องเปิดผ่าน HTTPS หรือ localhost" });
    return;
  }

  starting = true;
  const activeAttempt = ++startAttempt;
  latestPrediction = { state: "detecting" };
  ui.render("loading");

  try {
    // เรียก motion.start() จาก user gesture โดยตรง เพราะ iOS ต้องขอ permission ตรงนี้
    await Promise.all([motion.start(), camera.start(), classifier.load()]);
    if (!starting || activeAttempt !== startAttempt) return;
    classifier.start();
    renderLatestPrediction();
  } catch (error) {
    if (activeAttempt !== startAttempt) return;
    camera.stop();
    classifier.stop();
    motion.stop();
    ui.render("error", { message: error?.message ?? "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ" });
    console.error(error);
  } finally {
    if (activeAttempt === startAttempt) starting = false;
  }
}

function stopScanner() {
  startAttempt += 1;
  starting = false;
  classifier.stop();
  camera.stop();
  motion.stop();
  latestPrediction = { state: "detecting" };
  ui.render("idle");
}

function cleanup() {
  startAttempt += 1;
  starting = false;
  camera.stop();
  classifier.dispose();
  motion.dispose();
}

function handlePrediction(result) {
  latestPrediction = result;
  if (result.state === "error") {
    camera.stop();
    motion.stop();
    ui.render("error", { message: "ประมวลผลภาพไม่สำเร็จ กรุณาตรวจสอบว่าโมเดลเข้ากันได้" });
    console.error(result.error);
    return;
  }

  renderLatestPrediction();
}

function handleMotionStatus(status) {
  ui.renderMotion(status);
  if (!camera.isRunning) return;

  if (motionAllowsPrediction()) renderLatestPrediction();
  else ui.render("moving", { message: status.message });
}

function motionAllowsPrediction() {
  return motion.status === "stable" || ["unavailable", "denied"].includes(motion.status);
}

function renderLatestPrediction() {
  if (!motionAllowsPrediction()) {
    ui.render("moving", { message: motion.status === "moving" ? "ถือโทรศัพท์ให้นิ่ง" : "ถือนิ่งไว้สักครู่" });
    return;
  }

  const result = latestPrediction;
  if (result.state === "detecting") {
    ui.render("detecting");
    return;
  }
  ui.render(result.state, { label: result.displayLabel, confidence: result.confidence });
}
