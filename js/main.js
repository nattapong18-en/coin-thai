import { CameraController } from "./camera.js";
import { CoinClassifier } from "./classifier.js";
import { ScannerUI } from "./ui.js";

const video = document.querySelector("#cameraPreview");
const ui = new ScannerUI();
const camera = new CameraController(video);
const classifier = new CoinClassifier(video, handlePrediction);
let starting = false;
let startAttempt = 0;

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
  ui.render("loading");

  try {
    // เริ่มพร้อมกันเพื่อลดเวลารอ แต่ inference จะเริ่มเมื่อทั้งคู่พร้อมเท่านั้น
    await Promise.all([camera.start(), classifier.load()]);
    if (!starting || activeAttempt !== startAttempt) return;
    ui.render("detecting");
    classifier.start();
  } catch (error) {
    if (activeAttempt !== startAttempt) return;
    camera.stop();
    classifier.stop();
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
  ui.render("idle");
}

function cleanup() {
  startAttempt += 1;
  starting = false;
  camera.stop();
  classifier.dispose();
}

function handlePrediction(result) {
  if (result.state === "error") {
    camera.stop();
    ui.render("error", { message: "ประมวลผลภาพไม่สำเร็จ กรุณาตรวจสอบว่าโมเดลเข้ากันได้" });
    console.error(result.error);
    return;
  }
  if (result.state === "detecting") {
    ui.render("detecting");
    return;
  }
  ui.render(result.state, { label: result.displayLabel, confidence: result.confidence });
}
