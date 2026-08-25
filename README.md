# Thai Coin Scanner

เว็บนี้เป็นงานส่งวิชา **Special Topics** มีเป้าหมายเพื่อสาธิตการสร้างเว็บที่ติดต่อกับ hardware ของโทรศัพท์ผ่าน browser ได้แก่ **Camera** และ **Motion Sensor**

ระบบใช้ `TensorFlow.js` วิเคราะห์ภาพจากกล้องแบบ realtime และใช้ `DeviceMotionEvent` ตรวจว่าโทรศัพท์นิ่งหรือกำลังเคลื่อนไหว

## ขอบเขตของ Model

Model รุ่นปัจจุบันรองรับเฉพาะ:

- `coin_1` — เหรียญ 1 บาท
- `coin_50_satang` — เหรียญ 50 สตางค์
- `unknown` — สิ่งที่ไม่ใช่เหรียญ

Model นี้ยังไม่รองรับเหรียญ 2 บาท, 5 บาท, 10 บาท หรือเหรียญชนิดอื่นโดยตรง ผลลัพธ์อาจผิดพลาดได้ เนื่องจากเป็น prototype ที่ยังมีเวลาเก็บ dataset และ train model จำกัด ควรถือโทรศัพท์ให้นิ่ง จัดเหรียญไว้กลางกรอบ และใช้แสงที่เหมาะสม

## Hardware Integration

1. **Camera API**
   - ใช้ `navigator.mediaDevices.getUserMedia()` เพื่อเปิดกล้องหลัง
   - อ่านภาพจาก `video` แล้วส่งเข้า `TensorFlow.js model`
   - ประมวลผลภายใน browser โดยไม่มีการ upload ภาพขึ้น server

2. **Accelerometer / Gyroscope**
   - ใช้ `DeviceMotionEvent` ตรวจการเคลื่อนไหวของโทรศัพท์
   - แสดงสถานะ `Stable` หรือ `Moving / Hold phone steady`
   - แสดงผล prediction เมื่อโทรศัพท์นิ่งอย่างน้อย 500 ms
   - หาก sensor ไม่รองรับหรือไม่ได้รับ permission ระบบจะแจ้งเตือนและทำงานใน camera-only fallback mode

## การรองรับอุปกรณ์

- **Android:** ทำงานค่อนข้างเสถียรจากการทดสอบปัจจุบัน
- **iOS:** เปิดกล้องและ scan ได้ แต่อาจมี prediction สลับหรือไม่เสถียร เนื่องจาก browser และ motion permission ของ iOS

## Run Locally

รันจากโฟลเดอร์โปรเจกต์:

```bash
python3 -m http.server 8080
```

แล้วเปิด `http://localhost:8080`

การใช้กล้องต้องเปิดผ่าน `HTTPS` หรือ `localhost` เท่านั้น การเปิดผ่าน IP ในวง LAN เช่น `http://192.168.x.x:8080` อาจไม่สามารถขอสิทธิ์ใช้กล้องบนมือถือได้

## Technology

- HTML, CSS, JavaScript
- TensorFlow.js
- Camera API: `navigator.mediaDevices.getUserMedia()`
- Motion Sensor API: `DeviceMotionEvent`
- TensorFlow.js Layers Model ที่ export จาก Teachable Machine

## Project Structure

```text
index.html       หน้าเว็บหลัก
css/             UI styles
js/camera.js     Camera lifecycle และ permission
js/motion.js     Accelerometer/Gyroscope และ stable gate
js/classifier.js Model loading และ realtime inference
js/ui.js         UI state และ prediction result
js/main.js       การประสานงานของระบบ
model/           Exported TensorFlow.js model
dataset/         Training images ภายในเครื่อง ไม่ upload ขึ้น GitHub
```

ไฟล์ `dataset/`, วิดีโอต้นฉบับ และ `screen_shot/` ถูก ignore จาก GitHub ส่วนที่เผยแพร่คือ source code และ exported model เท่านั้น
