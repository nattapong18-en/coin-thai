สร้างโปรเจกต์เว็บชื่อ `thai-coin-scanner` สำหรับตรวจจับเหรียญไทยแบบเรียลไทม์ผ่านกล้องของมือถือหรือ iPad

เป้าหมายของโปรเจกต์:

- ผู้ใช้เปิดเว็บบนมือถือหรือ iPad
- เว็บขอสิทธิ์เข้าถึงกล้อง
- ใช้กล้องหลังเป็นหลัก
- ผู้ใช้ยกกล้องไปส่องเหรียญไทย 1 เหรียญ
- ระบบวิเคราะห์ภาพจากกล้องแบบ realtime
- แสดงผลทันทีว่าเป็นเหรียญ `1 บาท`, `2 บาท`, `5 บาท`, `10 บาท` หรือ `Unknown`
- เวอร์ชันแรกตรวจเพียง 1 เหรียญต่อภาพ
- ยังไม่ต้องทำระบบหลายเหรียญ, รวมยอดเงิน, login, database หรือ backend

## Technology

ใช้:

- HTML
- CSS
- JavaScript หรือ TypeScript ถ้าโครงสร้างไม่ซับซ้อนเกินไป
- `navigator.mediaDevices.getUserMedia()` สำหรับเข้าถึงกล้อง
- TensorFlow.js สำหรับโหลดและรันโมเดล image classification ใน browser
- รองรับโมเดลที่ export จาก Teachable Machine หรือ TensorFlow.js format

หลีกเลี่ยง framework ที่ไม่จำเป็น เช่น React/Next.js ในเวอร์ชันแรก เพราะต้องการให้โปรเจกต์เล็ก เข้าใจง่าย และ debug ง่าย

## Architecture

จัดโครงสร้างประมาณนี้:

```text
thai-coin-scanner/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── camera.js
│   ├── classifier.js
│   ├── ui.js
│   └── main.js
├── model/
│   ├── model.json
│   ├── metadata.json
│   └── weights.bin
├── assets/
└── README.md
```

สามารถปรับโครงสร้างได้ถ้ามีเหตุผลที่ดีกว่า แต่ห้าม over-engineer

## Camera

สร้างระบบกล้องที่:

- ขอ permission จากผู้ใช้หลังจากกดปุ่ม `Start Camera`
- พยายามเลือกกล้องหลังด้วย `facingMode: "environment"`
- แสดง video preview แบบเต็มพื้นที่หลักของหน้า
- รักษา aspect ratio ของกล้อง
- ใช้งานได้ทั้งแนวตั้งและแนวนอน
- จัดการกรณีผู้ใช้ปฏิเสธ permission
- แสดง error message ที่เข้าใจง่าย
- ต้องออกแบบโดยคำนึงว่า camera API บน production ต้องใช้ HTTPS หรือ secure context

## Realtime Classification

หลังกล้องเริ่มทำงาน:

- โหลด TensorFlow.js model เพียงครั้งเดียว
- นำ frame จาก video มาวิเคราะห์ต่อเนื่อง
- ไม่จำเป็นต้อง inference 60 ครั้งต่อวินาที
- ตั้งเป้าประมาณ 5–10 inference ต่อวินาทีเพื่อไม่ให้มือถือทำงานหนักเกินไป
- ห้ามสร้าง inference loop ซ้อนกันหลายชุด
- ป้องกัน memory leak ของ tensor

Classes ที่ระบบต้องรองรับ:

```text
coin_1
coin_2
coin_5
coin_10
unknown
```

mapping สำหรับ UI:

```text
coin_1  -> เหรียญ 1 บาท
coin_2  -> เหรียญ 2 บาท
coin_5  -> เหรียญ 5 บาท
coin_10 -> เหรียญ 10 บาท
unknown -> ไม่พบเหรียญ
```

## Confidence / Stability

อย่าแสดงผลจาก frame เดียวทันทีเพราะ prediction อาจกระพริบ

ให้สร้างระบบ stabilization เช่น:

- เก็บ prediction ล่าสุด 5 เฟรม
- ใช้ majority vote หรือ average confidence
- แสดงผลเมื่อ class เดิมปรากฏอย่างสม่ำเสมอ
- ถ้า confidence ต่ำกว่า threshold เช่น `0.80` ให้แสดง `กำลังตรวจจับ...`
- ค่า threshold ต้องแก้ได้จาก constant เดียว

ตัวอย่าง:

```text
Frame 1: coin_5 91%
Frame 2: coin_5 94%
Frame 3: coin_5 92%
Frame 4: coin_2 51%
Frame 5: coin_5 95%

Result:
เหรียญ 5 บาท
Confidence: 93%
```

## UI

ออกแบบ mobile-first

หน้าเว็บควรมี:

```text
Thai Coin Scanner

[ Camera Preview ]

วางเหรียญ 1 เหรียญให้อยู่ในกรอบ

┌─────────────┐
│ Scan Area   │
└─────────────┘

ผลการตรวจจับ

เหรียญ 5 บาท
Confidence 94%
```

เพิ่มกรอบหรือวงกลมตรงกลางกล้องเพื่อบอกผู้ใช้ว่าควรวางเหรียญบริเวณไหน

สถานะที่ UI ต้องรองรับ:

- ยังไม่ได้เปิดกล้อง
- กำลังโหลด model
- กำลังเปิดกล้อง
- กำลังตรวจจับ
- ตรวจพบเหรียญ
- ไม่แน่ใจ / unknown
- camera permission denied
- model load failed

ไม่ต้องทำ UI หรูเกินไป แต่ให้ดูสะอาดและใช้งานบนมือถือได้ดี

## Model Integration

ในตอนแรกอาจยังไม่มีโมเดลจริงในโฟลเดอร์ `model/`

ดังนั้น:

- แยก model loading logic ออกจาก camera logic
- ทำให้สามารถนำ model ที่ export จาก Teachable Machine/TensorFlow.js มาใส่ใน `model/` ได้ภายหลังโดยไม่ต้องแก้ระบบส่วนอื่นมาก
- ถ้า model ยังไม่มี ให้ระบบแสดงข้อความชัดเจนว่า `Model not found`
- ห้าม fake prediction

ใน README อธิบายว่าต้องนำไฟล์อะไรมาใส่ใน `model/`

## Dataset Guidance

เพิ่มเอกสารใน README สำหรับการสร้าง dataset

แนะนำให้มีอย่างน้อย:

```text
coin_1
coin_2
coin_5
coin_10
unknown
```

ภาพแต่ละ class ควรมีความหลากหลาย:

- ด้านหน้า/ด้านหลังของเหรียญ
- หมุนหลายองศา
- ใกล้/ไกล
- แสงสว่างหลายระดับ
- พื้นหลังหลายแบบ
- เหรียญเก่าและใหม่ถ้ามี
- มือถือหลายเครื่องถ้าทำได้

สำหรับ `unknown` ให้ใช้:

- โต๊ะเปล่า
- มือ
- กระดาษ
- วัตถุวงกลมอื่น
- เหรียญที่ไม่อยู่ใน 4 class
- ฉากทั่วไป

อธิบายเรื่อง data leakage ด้วย เช่นไม่ควรถ่ายเหรียญแต่ละชนิดบนพื้นหลังเฉพาะของมัน เพราะ model อาจจำพื้นหลังแทนเหรียญ

## Performance

คำนึงถึงมือถือเป็นหลัก:

- ห้าม inference ทุก animation frame ถ้าไม่จำเป็น
- resize/crop input ก่อนเข้า model ตามขนาดที่ model ต้องการ
- ใช้ `tf.tidy()` หรือ dispose tensors อย่างเหมาะสม
- ห้ามสร้าง canvas ใหม่ทุก frame
- โหลด model ครั้งเดียว
- หยุด camera tracks เมื่อออกจากหน้า
- หยุด inference เมื่อ camera หยุด

## Development

สร้าง README ที่มี:

- Project overview
- Architecture
- วิธีรัน local server
- วิธีใช้งานกล้องบนมือถือ
- HTTPS requirement
- วิธีเพิ่ม TensorFlow.js / Teachable Machine model
- วิธีสร้าง dataset
- วิธีทดสอบ
- Known limitations
- Future improvements

สำหรับ local development ห้ามแนะนำให้เปิด `index.html` ตรงด้วย `file://`
ให้ใช้ local HTTP server

ตัวอย่างเช่น:

```bash
python -m http.server 8080
```

หรือเครื่องมืออื่นที่เหมาะสม

## Version 1 Definition of Done

ถือว่า Version 1 สำเร็จเมื่อ:

1. เปิดเว็บบนมือถือ/iPad ได้
2. กด Start Camera แล้ว browser ขอ permission
3. กล้องหลังเปิดได้
4. โหลด TensorFlow.js model ได้
5. วิเคราะห์ video frames แบบ realtime
6. จำแนก `1 / 2 / 5 / 10 บาท / unknown`
7. แสดง confidence
8. prediction ไม่กระพริบเปลี่ยน class ทุก frame
9. UI ใช้งานบนมือถือได้
10. ไม่มี backend หรือ database ที่ไม่จำเป็น

## Important

ก่อนเขียน code:

1. วาง architecture สั้น ๆ
2. อธิบาย data flow
3. จากนั้นค่อยสร้างไฟล์

เน้น code ที่อ่านง่ายและเหมาะกับนักศึกษาที่ต้องศึกษา codebase ต่อเอง

ห้าม over-engineer
ห้ามเพิ่ม dependency โดยไม่มีเหตุผล
ห้ามสร้าง feature นอก scope
ห้าม fake AI output

หลังสร้างเสร็จ:

- ตรวจ code ทั้งหมด
- ตรวจ camera lifecycle
- ตรวจ TensorFlow.js tensor disposal
- ตรวจ inference loop
- ตรวจ mobile responsive
- สรุปว่าส่วนไหนพร้อมแล้ว และส่วนไหนต้องรอ model/dataset จริง

หากทำงานเสร็จให้อัพเดท Agents.md ด้วยว่า codex เป็นคนทำเพื่อว่าเจอปัญหา บัคใดๆที่ไม่เคยเจอก็ให้อัพเดทไว้ด้วย
