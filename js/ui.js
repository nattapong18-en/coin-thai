export class ScannerUI {
  constructor() {
    this.button = document.querySelector("#cameraButton");
    this.buttonLabel = this.button.querySelector(".button-label");
    this.scanner = document.querySelector("#scanner");
    this.cameraStage = document.querySelector("#cameraStage");
    this.placeholder = document.querySelector("#cameraPlaceholder");
    this.liveBadge = document.querySelector("#liveBadge");
    this.resultCard = document.querySelector("#resultCard");
    this.result = document.querySelector("#resultValue");
    this.confidence = document.querySelector("#confidence");
    this.confidenceText = document.querySelector("#confidenceText");
    this.confidenceBar = document.querySelector("#confidenceBar");
    this.status = document.querySelector("#statusMessage");
  }

  render(state, details = {}) {
    const states = {
      idle: ["ยังไม่ได้เปิดกล้อง", "พร้อมเริ่มใช้งาน", "เริ่มสแกน"],
      loading: ["กำลังเตรียมระบบ...", "กำลังโหลด model และเปิดกล้อง", "กำลังเริ่ม..."],
      detecting: ["กำลังตรวจจับ...", "จัดเหรียญให้อยู่กลางกรอบและถือกล้องให้นิ่ง", "หยุดกล้อง"],
      detected: [details.label, "ตรวจพบเหรียญ", "หยุดกล้อง"],
      unknown: ["ไม่พบเหรียญ", "ลองปรับระยะ แสง หรือพื้นหลัง", "หยุดกล้อง"],
      error: ["ไม่สามารถเริ่มสแกน", details.message, "ลองอีกครั้ง"],
    };

    const [result, status, button] = states[state] ?? states.idle;
    this.result.textContent = result;
    this.status.textContent = status;
    this.buttonLabel.textContent = button;
    this.button.disabled = state === "loading";
    this.status.dataset.tone = state === "error" ? "error" : state === "unknown" ? "warning" : "";
    this.scanner.dataset.state = state;
    this.cameraStage.dataset.state = state;
    this.resultCard.dataset.state = state;

    const cameraIsLive = ["detecting", "detected", "unknown"].includes(state);
    this.placeholder.hidden = cameraIsLive;
    this.liveBadge.hidden = !cameraIsLive;

    const showConfidence = ["detected", "unknown"].includes(state) && Number.isFinite(details.confidence);
    this.confidence.hidden = !showConfidence;
    if (showConfidence) {
      const percent = Math.round(details.confidence * 100);
      this.confidenceText.textContent = `${percent}%`;
      this.confidenceBar.style.width = `${percent}%`;
    } else {
      this.confidenceBar.style.width = "0%";
    }
  }
}
