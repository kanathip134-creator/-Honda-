# ระบบแนะนำรถจักรยานยนต์ Honda พร้อมคำนวณค่างวดออนไลน์

โปรเจกต์ตัวอย่างที่ใช้งานได้จริง (working prototype) ตามสเปกในเอกสารโครงงาน:
- **Front-end**: HTML, CSS, JavaScript (vanilla)
- **Back-end**: Node.js + Express (REST API)
- **ฐานข้อมูล**: ไฟล์ JSON (`data/motorcycles.json`) ทำหน้าที่เป็น "ฐานข้อมูล" อย่างง่าย
  แทนการติดตั้ง XAMPP/MySQL เต็มรูปแบบ — ทำให้รันทดสอบได้ทันทีโดยไม่ต้องตั้งค่าฐานข้อมูลเพิ่ม
  (ดูหัวข้อ "ต่อยอดเป็น MySQL" ด้านล่างถ้าต้องการใช้กับ XAMPP จริง)

## โครงสร้างโปรเจกต์
```
honda-recommend/
├── server.js              # Express server + REST API
├── package.json
├── data/
│   └── motorcycles.json   # ข้อมูลรถ (ฐานข้อมูลจำลอง)
└── public/
    ├── index.html          # หน้าลูกค้า: แนะนำรถ + คำนวณค่างวด + เรียกดูรถทั้งหมด
    ├── admin.html           # หน้าผู้ดูแลระบบ: เพิ่ม/แก้ไข/ลบ/อัปโหลดรูป
    ├── css/style.css
    └── js/
        ├── app.js           # ลอจิกหน้าลูกค้า
        └── admin.js         # ลอจิกหน้าแอดมิน
```

## วิธีติดตั้งและรัน

ต้องมี [Node.js](https://nodejs.org/) เวอร์ชัน 18 ขึ้นไป

```bash
cd honda-recommend
npm install
npm start
```

จากนั้นเปิดเบราว์เซอร์ไปที่:
- หน้าลูกค้า: http://localhost:3000
- หน้าแอดมิน: http://localhost:3000/admin.html

## ฟีเจอร์หลัก

### ฝั่งลูกค้า (Front-end)
- กรอกเงินดาวน์ + ค่างวดสูงสุดต่อเดือน + ระยะเวลาผ่อน → ระบบแนะนำรุ่นที่เหมาะสมอัตโนมัติ
- หน้ากราฟวัด (gauge) แสดงจำนวนรุ่นที่แนะนำแบบเรียลไทม์
- เรียกดูรถทั้งหมด พร้อมตัวกรองตามประเภท/ช่วงราคา/ค้นหาชื่อรุ่น
- ดูรายละเอียดรถแต่ละรุ่น (สเปก ราคา จุดเด่น) พร้อมคำนวณค่างวดเฉพาะรุ่นนั้นแบบ interactive

### ฝั่งผู้ดูแลระบบ (Back-end/Admin)
- เพิ่ม / แก้ไข / ลบข้อมูลรถ
- อัปโหลดรูปภาพรถ (เก็บไว้ที่ `public/img/uploads/`)
- จัดการราคาและจุดเด่นของรถ

## REST API

| Method | Endpoint                | คำอธิบาย                              |
|--------|--------------------------|----------------------------------------|
| GET    | `/api/motorcycles`       | รายการรถทั้งหมด (query: type, minPrice, maxPrice, q) |
| GET    | `/api/motorcycles/:id`   | ข้อมูลรถรุ่นเดียว                      |
| POST   | `/api/motorcycles`       | เพิ่มรถรุ่นใหม่                         |
| PUT    | `/api/motorcycles/:id`   | แก้ไขข้อมูลรถ                          |
| DELETE | `/api/motorcycles/:id`   | ลบรถ                                    |
| POST   | `/api/upload`            | อัปโหลดรูปภาพ (multipart/form-data, field: `image`) |
| POST   | `/api/calculate`         | คำนวณค่างวด `{ price, downPayment, months }` |
| POST   | `/api/recommend`         | แนะนำรถตามงบ `{ downPayment, maxMonthly, months, type? }` |

การคำนวณค่างวดใช้สูตรดอกเบี้ยคงที่ (flat rate) ปีละ 15% ซึ่งกำหนดไว้เป็นค่าตัวอย่างในตัวแปร
`ANNUAL_FLAT_RATE` ที่ต้นไฟล์ `server.js` — สามารถปรับเปลี่ยนอัตราดอกเบี้ยจริงของไฟแนนซ์แต่ละเจ้าได้ที่นี่

## ต่อยอดเป็น MySQL (XAMPP)

ปัจจุบันระบบใช้ไฟล์ JSON แทนฐานข้อมูลเพื่อให้รันทดสอบได้ทันที ถ้าต้องการเชื่อมต่อกับ MySQL ผ่าน XAMPP จริง:

1. สร้างตาราง `motorcycles` ใน phpMyAdmin ด้วยคอลัมน์ให้ตรงกับ field ใน `motorcycles.json`
   (id, name, brand, type, price, minDownPercent, engineCC, transmission, fuelConsumption, highlights, image)
2. ติดตั้งไลบรารี `mysql2`: `npm install mysql2`
3. แก้ไขฟังก์ชัน `readDB()` และ `writeDB()` ใน `server.js` ให้ query ฐานข้อมูลแทนการอ่าน/เขียนไฟล์ JSON
   (โครงสร้าง endpoint ทั้งหมดยังคงเดิม เปลี่ยนแค่ชั้น data access)

## หมายเหตุ
- ข้อมูลรถและราคาที่ใส่มาให้เป็นตัวอย่างสำหรับสาธิตระบบเท่านั้น ควรอัปเดตราคาจริงผ่านหน้าแอดมินก่อนใช้งานจริง
- รูปภาพรถในตัวอย่างใช้ไอคอนเวกเตอร์ (SVG) แทนรูปถ่ายจริง สามารถอัปโหลดรูปจริงผ่านหน้าแอดมินได้ทันที
