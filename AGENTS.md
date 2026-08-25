# Work log

## 2026-08-25 — Thai Coin Scanner V1

- ผู้ดำเนินการ: Codex
- สร้างโปรเจกต์ framework-free ไว้ที่ workspace root ตาม `docs/goal.md`
- แยก camera lifecycle, model/inference, UI state และ orchestration ออกจากกัน
- เริ่มต้นไม่มีโมเดลและระบบไม่ fake prediction; ปัจจุบันเพิ่มโมเดล prototype จริงและตั้ง `activeClasses` เป็น `coin_1`, `unknown` ชั่วคราว ก่อนขยายเป็นเหรียญครบ 5 classes
- ปรับ UI เป็นธีม Thai Mint Modern แบบ camera-first รองรับทั้ง portrait/landscape โดยยังคง state และ behavior ของระบบเดิม
- เก็บ `dataset/` และวิดีโอต้นฉบับเป็น local-only ผ่าน `.gitignore`; GitHub เก็บเฉพาะเว็บและโมเดลที่ export แล้ว
- Update 0.1 เพิ่ม `MotionController` แยกจาก camera/classifier ใช้ accelerometer/gyroscope เป็น gate โดยยืนยันผลเมื่ออุปกรณ์นิ่งอย่างน้อย 500 ms และ fallback เป็น camera-only เมื่อ sensor ใช้ไม่ได้

### ข้อควรระวัง / bugs ที่พบระหว่างพัฒนา

- `getUserMedia()` อาจ resolve หลังผู้ใช้ซ่อนหน้า/ยกเลิกระหว่าง permission prompt ได้ จึงใช้ request id เพื่อตรวจคำขอเก่าและหยุด tracks ที่มาถึงล่าช้า ป้องกันไฟกล้องค้าง
- ห้ามเริ่ม inference loop ใหม่ถ้า loop เดิมยังทำงาน; `CoinClassifier` ใช้ `running` และ `loopId` ป้องกัน loop ซ้อน
- Tensor ที่คืนจาก `predict()`/`executeAsync()` ต้อง dispose รวมถึงกรณี multi-output; input tensor ก็ dispose ใน `finally`
- HTTP ผ่าน IP ใน LAN ไม่ถือเป็น secure context บนมือถือทั่วไป ต้องใช้ HTTPS (ยกเว้น localhost บนอุปกรณ์เดียวกัน)
- ทดสอบ prototype บนมือถือจริงแล้ว: Android จำแนกนิ่ง แต่ iOS มี prediction สลับระหว่าง `coin_1`/`unknown`; ยอมรับไว้ใน prototype ปัจจุบันและควรเพิ่มภาพฝึกจากกล้อง iOS ก่อนขยายรุ่นถัดไป
