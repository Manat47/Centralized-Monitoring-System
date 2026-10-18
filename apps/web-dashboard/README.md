# Web Dashboard

เว็บสำหรับดูสถานะระบบ จัดการ Asset, Monitoring Target, Health Check, Rules, Alerts, Projects, Log Explorer, Notification Settings, Users, Audit Logs และ Reports เขียนด้วย Next.js App Router ดูภาพรวมระบบและวิธีเริ่มทั้ง stack ใน [README หลัก](../../README.md)

## โครงสร้างที่ใช้บ่อย

- `app/(dashboard)/`: เส้นทางหน้าจอหลังเข้าสู่ระบบ
- `app/features/`: UI, API client และ hooks แยกตามฟีเจอร์
- `components/`: ส่วนติดต่อผู้ใช้ที่ใช้ร่วมกัน
- `app/page.tsx`: ส่งผู้ใช้จาก `/` ไป `/dashboard`

## การตั้งค่า API

เว็บเรียก API Gateway ภายใต้ `/api` ใน Docker Compose ค่า `NEXT_PUBLIC_API_GATEWAY_URL` เป็น `/api` และ Next.js ส่งต่อคำขอไปยัง `API_GATEWAY_INTERNAL_URL` ภายใน Docker network หากรันเว็บจากเครื่องโดยตรง ค่าเริ่มต้นของ API client คือ `http://localhost:3005/api` และค่า rewrite ภายในคือ `http://localhost:3005`

`LOG_INGEST_PUBLIC_URL` เป็นตัวเลือกสำหรับกำหนด public origin ที่ใช้ในตัวอย่างคำสั่งส่ง log ของหน้า Project Detail หากไม่กำหนด หน้าเว็บใช้ origin ปัจจุบันของผู้ใช้ ค่านี้ไม่เปลี่ยน endpoint ที่ API Gateway รับจริง

## รันจากเครื่อง

เริ่ม API Gateway และบริการที่เกี่ยวข้องก่อน แล้วรันจากโฟลเดอร์นี้:

```powershell
npm.cmd ci
npm.cmd run dev
```

เปิด [http://localhost:3010](http://localhost:3010) สคริปต์ `dev` และ `start` ใช้พอร์ต `3010` หาก Docker Compose เปิด `web-dashboard` บนพอร์ตนี้อยู่ ให้หยุด container เว็บก่อนเริ่ม dev server

## ตรวจงาน

```powershell
npm.cmd run lint
npm.cmd run build
```

คำสั่ง build ตรวจการสร้างเว็บสำหรับ production ในเครื่องที่รันคำสั่ง ไม่ได้ deploy ระบบ ดูวิธีเริ่ม Docker Compose และค่าตัวแปรของทั้งระบบใน [README หลัก](../../README.md)
