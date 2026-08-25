const MODEL_URL = "model/model.json";
const METADATA_URL = "model/metadata.json";

// จุดเดียวสำหรับปรับพฤติกรรมการตรวจจับทั้งหมด
export const CLASSIFIER_CONFIG = Object.freeze({
  activeClasses: Object.freeze(["coin_1", "unknown"]), // prototype ปัจจุบัน: เหรียญ 1 บาทเท่านั้น
  confidenceThreshold: 0.8,
  historySize: 5,
  minimumVotes: 3,
  inferenceIntervalMs: 150, // สูงสุดประมาณ 6–7 ครั้ง/วินาที
  defaultInputSize: 224,
  normalization: "minusOneToOne", // Teachable Machine ใช้ช่วง -1 ถึง 1
});

export const CLASS_LABELS = Object.freeze({
  coin_1: "เหรียญ 1 บาท",
  coin_2: "เหรียญ 2 บาท",
  coin_5: "เหรียญ 5 บาท",
  coin_10: "เหรียญ 10 บาท",
  unknown: "ไม่พบเหรียญ",
});

const REQUIRED_CLASSES = CLASSIFIER_CONFIG.activeClasses;

export class ModelError extends Error {
  constructor(code, message, cause) {
    super(message, { cause });
    this.name = "ModelError";
    this.code = code;
  }
}

export class CoinClassifier {
  constructor(videoElement, onPrediction) {
    this.video = videoElement;
    this.onPrediction = onPrediction;
    this.model = null;
    this.labels = [...REQUIRED_CLASSES];
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d", { alpha: false, willReadFrequently: true });
    this.history = [];
    this.running = false;
    this.loopId = 0;
    this.loadPromise = null;
  }

  load() {
    if (!this.loadPromise) this.loadPromise = this.#loadModel();
    return this.loadPromise;
  }

  async #loadModel() {
    if (!globalThis.tf) {
      throw new ModelError("library", "โหลด TensorFlow.js ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ต");
    }

    try {
      const modelResponse = await fetch(MODEL_URL, { cache: "no-cache" });
      if (!modelResponse.ok) {
        if (modelResponse.status === 404) {
          throw new ModelError("not-found", "Model not found — กรุณาเพิ่มไฟล์โมเดลในโฟลเดอร์ model/");
        }
        throw new Error(`model.json returned HTTP ${modelResponse.status}`);
      }

      const metadata = await loadOptionalMetadata();
      if (metadata?.labels) this.labels = validateLabels(metadata.labels);

      try {
        this.model = await tf.loadLayersModel(MODEL_URL);
      } catch (layersError) {
        try {
          this.model = await tf.loadGraphModel(MODEL_URL);
        } catch (graphError) {
          throw new AggregateError([layersError, graphError], "Unsupported model format");
        }
      }

      this.#configureCanvas(metadata);
      return this.model;
    } catch (error) {
      if (error instanceof ModelError) throw error;
      throw new ModelError("load-failed", "โหลดโมเดลไม่สำเร็จ กรุณาตรวจสอบไฟล์ model.json และ weights.bin", error);
    }
  }

  start() {
    if (!this.model) throw new ModelError("not-loaded", "ยังไม่ได้โหลดโมเดล");
    if (this.running) return;

    this.running = true;
    this.history = [];
    const activeLoop = ++this.loopId;
    this.#runLoop(activeLoop);
  }

  stop() {
    this.running = false;
    this.loopId += 1;
    this.history = [];
  }

  dispose() {
    this.stop();
    this.model?.dispose?.();
    this.model = null;
    this.loadPromise = null;
  }

  async #runLoop(activeLoop) {
    while (this.running && this.loopId === activeLoop) {
      const startedAt = performance.now();
      try {
        const prediction = await this.#predictFrame();
        if (!this.running || this.loopId !== activeLoop) return;
        this.onPrediction(this.#stabilize(prediction));
      } catch (error) {
        this.stop();
        this.onPrediction({ state: "error", error });
        return;
      }

      const elapsed = performance.now() - startedAt;
      const delay = Math.max(0, CLASSIFIER_CONFIG.inferenceIntervalMs - elapsed);
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }
  }

  async #predictFrame() {
    if (this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return { label: "unknown", confidence: 0 };
    }

    drawCenteredSquare(this.context, this.canvas, this.video);

    const input = tf.tidy(() => {
      let tensor = tf.browser.fromPixels(this.canvas).toFloat();
      if (CLASSIFIER_CONFIG.normalization === "minusOneToOne") {
        tensor = tensor.div(127.5).sub(1);
      } else {
        tensor = tensor.div(255);
      }
      return tensor.expandDims(0);
    });

    let output;
    try {
      output = this.model.executeAsync
        ? await this.model.executeAsync(input)
        : this.model.predict(input);
      if (output instanceof Promise) output = await output;

      const outputTensor = Array.isArray(output) ? output[0] : output;
      const scores = Array.from(await outputTensor.data());
      if (scores.length !== this.labels.length) {
        throw new ModelError("classes", `โมเดลมี ${scores.length} classes แต่ metadata ระบุ ${this.labels.length} classes`);
      }

      const bestIndex = scores.indexOf(Math.max(...scores));
      return { label: this.labels[bestIndex], confidence: scores[bestIndex] };
    } finally {
      input.dispose();
      if (Array.isArray(output)) output.forEach((tensor) => tensor.dispose());
      else output?.dispose?.();
    }
  }

  #stabilize(prediction) {
    this.history.push(prediction);
    if (this.history.length > CLASSIFIER_CONFIG.historySize) this.history.shift();

    if (this.history.length < CLASSIFIER_CONFIG.historySize) {
      return { state: "detecting" };
    }

    const groups = new Map();
    for (const item of this.history) {
      const group = groups.get(item.label) ?? { count: 0, confidenceTotal: 0 };
      group.count += 1;
      group.confidenceTotal += item.confidence;
      groups.set(item.label, group);
    }

    const [label, winner] = [...groups.entries()].sort((a, b) => {
      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
      return b[1].confidenceTotal - a[1].confidenceTotal;
    })[0];
    const confidence = winner.confidenceTotal / winner.count;

    if (winner.count < CLASSIFIER_CONFIG.minimumVotes || confidence < CLASSIFIER_CONFIG.confidenceThreshold) {
      return { state: "detecting" };
    }

    return {
      state: label === "unknown" ? "unknown" : "detected",
      label,
      displayLabel: CLASS_LABELS[label],
      confidence,
    };
  }

  #configureCanvas(metadata) {
    const shape = this.model.inputs?.[0]?.shape;
    const modelHeight = Number(shape?.[1]);
    const modelWidth = Number(shape?.[2]);
    const metadataSize = Number(metadata?.imageSize);
    const fallback = Number.isFinite(metadataSize) ? metadataSize : CLASSIFIER_CONFIG.defaultInputSize;
    this.canvas.width = Number.isFinite(modelWidth) && modelWidth > 0 ? modelWidth : fallback;
    this.canvas.height = Number.isFinite(modelHeight) && modelHeight > 0 ? modelHeight : fallback;
  }
}

async function loadOptionalMetadata() {
  const response = await fetch(METADATA_URL, { cache: "no-cache" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`metadata.json returned HTTP ${response.status}`);
  return response.json();
}

function validateLabels(labels) {
  if (!Array.isArray(labels) || labels.length !== REQUIRED_CLASSES.length) {
    throw new ModelError("classes", `metadata.json ต้องมี labels ครบ ${REQUIRED_CLASSES.length} classes`);
  }

  const normalized = labels.map((label) => String(label).trim());
  const isValid = REQUIRED_CLASSES.every((label) => normalized.includes(label));
  if (!isValid) {
    throw new ModelError("classes", `classes ต้องเป็น: ${REQUIRED_CLASSES.join(", ")}`);
  }
  return normalized;
}

function drawCenteredSquare(context, canvas, video) {
  const side = Math.min(video.videoWidth, video.videoHeight);
  const sourceX = (video.videoWidth - side) / 2;
  const sourceY = (video.videoHeight - side) / 2;
  context.drawImage(video, sourceX, sourceY, side, side, 0, 0, canvas.width, canvas.height);
}
