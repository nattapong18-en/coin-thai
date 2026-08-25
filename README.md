# Thai 1-Baht Coin Scanner

A course project for **Special Topics**. This web application uses a mobile camera and TensorFlow.js to identify a Thai 1-baht coin in real time. All image processing runs directly in the browser; camera images are not uploaded or stored.

## Current Scope

This prototype supports only two results:

- `coin_1` — Thai 1-baht coin
- `unknown` — anything else

It cannot identify 2-baht, 5-baht, 10-baht, or other coins. The scanner is designed for one coin at a time.

## Device Support

- **Android:** Works reliably in current testing.
- **iOS:** The scanner works, but predictions may be unstable and switch between `coin_1` and `unknown`.

The iOS issue is a known limitation of this prototype. More training images captured with iOS devices are needed to improve stability.

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
