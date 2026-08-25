# Thai 1-Baht Coin Scanner

A course project for **Special Topics**. This web application uses a mobile camera, TensorFlow.js, and device motion sensors to identify a Thai 1-baht coin in real time. All processing runs directly in the browser; camera images and sensor data are not uploaded or stored.

## Current Scope

This prototype supports only two results:

- `coin_1` — Thai 1-baht coin
- `unknown` — anything else

It cannot identify 2-baht, 5-baht, 10-baht, or other coins. The scanner is designed for one coin at a time.

## Device Support

- **Android:** Works reliably in current testing.
- **iOS:** The scanner works, but predictions may be unstable and switch between `coin_1` and `unknown`.

The iOS issue is a known limitation of this prototype. More training images captured with iOS devices are needed to improve stability.

## Hardware Integrations

1. **Camera:** Captures live frames from the rear camera for TensorFlow.js classification.
2. **Accelerometer/Gyroscope:** Uses `DeviceMotionEvent` to detect whether the phone is stable or moving.

A coin result is confirmed only after the phone has remained stable for at least 500 ms. If the phone moves again, the confirmed result is temporarily hidden until the phone is stable. On iOS, the motion sensor permission is requested when the user starts the scanner.

If motion sensors are unavailable or permission is denied, the app displays a warning and continues in camera-only fallback mode. Motion sensitivity and the stable duration can be adjusted in `MOTION_CONFIG` inside `js/motion.js`.

## Run Locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

Camera access requires HTTPS or `localhost`. A regular LAN address such as `http://192.168.x.x:8080` may not allow camera access on mobile devices.

## Technology

- HTML, CSS, and JavaScript
- TensorFlow.js
- Mobile Camera API (`getUserMedia`)
- Teachable Machine exported model

## Project Structure

```text
index.html       Web page
css/             User interface styles
js/              Camera, classification, and UI logic
model/           Exported TensorFlow.js model
dataset/         Local training images (not uploaded to GitHub)
```

Raw training videos and the `dataset/` directory are excluded from GitHub. Only the web application and exported model are included.
