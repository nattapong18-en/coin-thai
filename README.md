# Thai Coin Scanner

เว็บขนาดเล็กสำหรับจำแนกเหรียญไทย `1`, `2`, `5`, `10` บาท หรือ `unknown` จากกล้องมือถือ/iPad แบบ realtime โดยประมวลผล TensorFlow.js ภายใน browser ไม่มี backend, login หรือ database

> สถานะปัจจุบัน: มีโมเดล prototype 2 classes คือ `coin_1` และ `unknown` สำหรับทดลองเหรียญ 1 บาทก่อน ส่วนเหรียญ 2, 5 และ 10 บาทจะเพิ่มภายหลัง

## Architecture

```text
index.html             โครงหน้าและโหลด TensorFlow.js
css/style.css          mobile-first UI และ landscape layout
js/camera.js           permission, กล้องหลัง และ media-track lifecycle
js/classifier.js       โหลดโมเดล, crop/resize, inference และ stabilization
js/ui.js               แสดงสถานะและผลตรวจจับ
js/main.js             ประสาน camera/model และ cleanup
model/                 ตำแหน่งไฟล์โมเดลจริง
dataset/               ภาพฝึกในเครื่อง (ไม่อัปโหลดขึ้น Git)
```

Data flow:

```text
Start Camera → camera + model พร้อม → video frame → center crop/resize
→ tensor normalization → model scores → เก็บผล 5 เฟรม
→ majority vote + confidence threshold → UI
```

ระบบวิเคราะห์สูงสุดประมาณ 6–7 ครั้ง/วินาที มี inference loop เพียงชุดเดียว ใช้ canvas เดิมซ้ำ และ dispose tensor หลังแต่ละรอบ

## รันในเครื่อง

ห้ามเปิดผ่าน `file://` เพราะ browser จะโหลด ES modules/model และใช้งานกล้องไม่ถูกต้อง ให้รัน HTTP server จากโฟลเดอร์โปรเจกต์:

```bash
python3 -m http.server 8080
```

จากนั้นเปิด `http://localhost:8080` บนเครื่องเดียวกัน

## ทดสอบบนมือถือหรือ iPad

Camera API ใช้ได้เฉพาะ **secure context**: HTTPS หรือ `localhost` เท่านั้น การเปิด `http://192.168.x.x:8080` จากมือถือมักไม่สามารถใช้กล้องได้แม้อยู่ Wi-Fi เดียวกัน

วิธีที่เหมาะสำหรับอุปกรณ์จริง:

1. deploy โฟลเดอร์นี้บน static hosting ที่มี HTTPS เช่น GitHub Pages, Netlify หรือ Cloudflare Pages
2. หรือใช้ HTTPS development server/tunnel ที่เชื่อถือได้
3. เปิด URL ด้วย Safari/Chrome แล้วกด **เริ่มสแกน**
4. อนุญาตการใช้กล้อง วางเหรียญหนึ่งเหรียญกลางวง และถืออุปกรณ์ให้นิ่ง

ถ้าเคยปฏิเสธ permission ต้องเปิดสิทธิ์ Camera ในการตั้งค่าของ browser/site ก่อนลองใหม่

## เพิ่มโมเดล

รองรับ TensorFlow.js Layers Model (รวม export จาก Teachable Machine) และ Graph Model ใส่ไฟล์ต่อไปนี้ใน `model/`:

```text
model/model.json
model/metadata.json
model/weights.bin
```

ชื่อ weight อาจต่างจาก `weights.bin` หรือมีหลาย shard ได้ แต่ต้องตรงกับรายการใน `model.json` ส่วนโมเดล prototype ปัจจุบันใช้ labels:

```text
coin_1
unknown
```

เมื่อมี dataset ครบ ให้เปลี่ยน `activeClasses` ใน `CLASSIFIER_CONFIG` และ export โมเดลใหม่ด้วย labels ทั้งหมด:

```text
coin_1
coin_2
coin_5
coin_10
unknown
```

หากไม่มี `metadata.json` ระบบจะสมมติ output order ตามรายการข้างบน จึงแนะนำให้ใส่ metadata เสมอ หากโมเดลไม่ได้ export จาก Teachable Machine ให้ตรวจ normalization ใน `CLASSIFIER_CONFIG` ที่ `js/classifier.js`:

- `minusOneToOne`: pixel อยู่ช่วง `-1..1` (ค่าเริ่มต้นสำหรับ Teachable Machine)
- ค่าอื่น: pixel อยู่ช่วง `0..1`

ขนาด input อ่านจาก model input shape โดยอัตโนมัติ และ fallback เป็น `metadata.imageSize` หรือ 224 px

## Confidence และ stability

ค่าหลักแก้ได้จาก constant `CLASSIFIER_CONFIG` แห่งเดียว:

- `confidenceThreshold: 0.8` ต้องมั่นใจอย่างน้อย 80%
- `historySize: 5` เก็บ 5 prediction ล่าสุด
- `minimumVotes: 3` class เดียวต้องชนะอย่างน้อย 3 ใน 5 เฟรม
- `inferenceIntervalMs: 150` จำกัดภาระของมือถือ

Confidence ที่แสดงคือค่าเฉลี่ยของเฟรมที่โหวตให้ class ผู้ชนะ ถ้ายังไม่ผ่านเกณฑ์ UI แสดง `กำลังตรวจจับ...`

## แนวทางสร้าง dataset

โฟลเดอร์ `dataset/` ถูก ignore จาก Git เพราะมีไฟล์จำนวนมากและไม่จำเป็นต่อการทำงานของหน้าเว็บ ให้สำรอง dataset แยกต่างหาก ส่วนที่อัปโหลดขึ้นเว็บคือโมเดลที่ export แล้วใน `model/`

สร้างอย่างน้อย 5 classes: `coin_1`, `coin_2`, `coin_5`, `coin_10`, `unknown` ควรเก็บภาพจำนวนใกล้เคียงกันและแบ่ง train/validation/test อย่างเป็นระบบ

แต่ละ class เหรียญควรมี:

- ด้านหน้าและด้านหลัง หมุนหลายองศา
- ระยะใกล้/ไกลและตำแหน่งคลาดจากกึ่งกลางเล็กน้อย
- แสงหลายระดับ เงาและแสงสะท้อนหลายแบบ
- พื้นหลังหลายสี/พื้นผิว
- เหรียญเก่า/ใหม่ และกล้องหลายรุ่นเท่าที่ทำได้

class `unknown` ควรมีโต๊ะเปล่า มือ กระดาษ ฉากทั่วไป วัตถุวงกลม และเหรียญอื่นที่ไม่ใช่ 4 classes เป้าหมาย

### ระวัง data leakage

อย่าถ่ายเหรียญแต่ละชนิดบนพื้นหลังเฉพาะ เช่น 1 บาทบนกระดาษขาวเท่านั้นและ 10 บาทบนโต๊ะไม้เท่านั้น เพราะโมเดลอาจจำพื้นหลังแทนเหรียญ ภาพที่ถ่ายต่อเนื่องจาก video เดียวกันก็ไม่ควรถูกสุ่มกระจายข้าม train/test; แบ่งตาม session, สถานที่ หรืออุปกรณ์ก่อน เพื่อให้ test สะท้อนภาพใหม่จริง

## วิธีทดสอบ

1. เปิดหน้าโดยยังไม่มี model และยืนยันว่าเห็น `Model not found`
2. เพิ่มโมเดลแล้วตรวจว่า Network ไม่มี 404 และ labels/output ตรงกับ `activeClasses`
3. ทดสอบ permission ทั้ง allow และ deny
4. สแกนทุก class ทั้งสองด้าน และทดสอบ empty scene/unknown
5. สลับแอปหรือซ่อน tab แล้วตรวจว่าไฟกล้องดับ (media tracks ถูกหยุด)
6. กดเริ่ม/หยุดซ้ำและตรวจว่าไม่มี inference loop ซ้อน
7. ใช้ browser devtools ตรวจ `tf.memory().numTensors` ระหว่างรันนาน ๆ; ค่าควรคงที่หลัง warm-up
8. ทดสอบ portrait/landscape บน iOS Safari และ Android Chrome

## Known limitations

- เวอร์ชันนี้รองรับเหรียญเดียวต่อภาพ และเป็น image classification ไม่ได้หาตำแหน่งหลายวัตถุ
- คุณภาพขึ้นกับ dataset/model จริง แสงสะท้อนและเหรียญสึกอาจลดความแม่นยำ
- center crop ที่เข้าโมเดลเป็นสี่เหลี่ยม จึงควรวางเหรียญกลางวง
- การโหลด TensorFlow.js จาก CDN ต้องมีอินเทอร์เน็ต หากต้องการ offline ให้ host ไฟล์ library เอง
- ยังไม่ได้ calibrate threshold กับ validation set จริง
- prototype ปัจจุบันนิ่งบน Android มากกว่า iOS; บน iOS อาจสลับระหว่าง `coin_1` และ `unknown` จึงควรเพิ่มภาพฝึกจากกล้อง iOS ในรอบถัดไป

## Future improvements

หลังมีข้อมูลจริงจึงค่อยพิจารณา calibration ต่ออุปกรณ์, local/offline TensorFlow.js, model quantization และ object detection สำหรับหลายเหรียญ โดยทั้งหมดอยู่นอก scope ของ Version 1
