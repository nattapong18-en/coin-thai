Update the existing Thai Coin Scanner project.

Add a second hardware/sensor integration using the device motion sensors.

Requirements:

- Keep the existing realtime camera coin classification system.
- Use DeviceMotionEvent and/or DeviceOrientationEvent.
- Detect whether the phone is stable or moving.
- Show a clear UI status:
  - Stable
  - Moving / Hold phone steady
- Only confirm and display a coin prediction when the phone has been stable for at least 500 ms.
- If the phone starts moving again, temporarily hide or pause the confirmed prediction.
- Keep the motion threshold configurable in one place.
- Handle iOS permission requirements for motion sensors.
- Handle devices/browsers where motion sensors are unavailable.
- Do not remove or rewrite the existing camera/classification architecture unless necessary.
- Keep the implementation mobile-first and simple.
- Update README to explain both hardware integrations:
  1. Camera
  2. Accelerometer/Gyroscope

Before editing, read the existing codebase and explain briefly where the motion sensor logic should be integrated.
