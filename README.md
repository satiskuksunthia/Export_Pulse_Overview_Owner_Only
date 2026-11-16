# Export Pulse – Shipment Intelligence

เว็บแอปติดตาม Booking / Shipment ของทีม CS Export
Frontend อยู่บน **GitHub Pages**, ข้อมูลกับไฟล์ PDF เก็บบน **Supabase** (ทั้งสองบริการใช้แบบฟรีได้)

```
Browser ──► GitHub Pages (index.html, cloud.js, config.js)
   │
   └──► Supabase ─┬─ Auth      : Login อีเมล/รหัสผ่าน
                  ├─ Database  : bookings, tracker, team_members, shipment_files
                  └─ Storage   : bucket "shipment-files" (PDF)
```

การอ่าน PDF และ OCR (pdf.js + Tesseract.js) ยังทำงานใน browser เหมือนเดิม

## โครงสร้างไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `index.html` | หน้าเว็บหลัก (UI, กราฟ, ปฏิทิน, อ่าน PDF/OCR, นำเข้า Excel) |
| `cloud.js` | Login, โหลด/บันทึกข้อมูลกับ Supabase |
| `config.js` | URL และ anon key ของ Supabase |
| `supabase/schema.sql` | สร้างตาราง, RLS และ Storage bucket |
| `.nojekyll` | ให้ GitHub Pages เสิร์ฟไฟล์ตามที่เป็น |

---

## ขั้นที่ 1: ตั้งค่า Supabase (ประมาณ 10 นาที)

1. สมัครที่ https://supabase.com แล้วกด **New project** (ตั้งรหัสผ่าน DB เก็บไว้, Region เลือก Singapore)
2. ไปที่ **SQL Editor → New query** วางเนื้อหาไฟล์ `supabase/schema.sql` ทั้งหมด แล้วกด **Run**
3. ไปที่ **Authentication → Sign In / Providers**
   - Email: เปิดไว้
   - **ปิด "Allow new users to sign up"** เพื่อไม่ให้คนนอกสมัครเองได้
4. ไปที่ **Authentication → Users → Add user → Create new user**
   สร้างบัญชีให้สมาชิกในทีมและบัญชีทดลองสำหรับอาจารย์ (ติ๊ก *Auto Confirm User*)
5. ไปที่ **Project Settings → API** คัดลอก
   - `Project URL`
   - `anon public` key (หรือ publishable key)

> ⚠️ ห้ามนำ `service_role` / secret key มาใส่ในหน้าเว็บเด็ดขาด

## ขั้นที่ 2: ใส่ค่าใน `config.js`

```js
window.EXPORT_PULSE_CONFIG = {
  SUPABASE_URL: "https://abcdefgh.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...",
};
```

anon key เปิดเผยบนเว็บได้ เพราะทุกตารางเปิด Row Level Security: ต้อง Login ก่อนถึงจะอ่านหรือเขียนข้อมูลได้

## ขั้นที่ 3: Deploy ขึ้น GitHub Pages

1. สร้าง repository ใหม่บน GitHub เช่น `export-pulse`
   (บัญชีฟรีต้องตั้ง repo เป็น **Public** ถึงจะใช้ Pages ได้ ส่วน GitHub Student Pack ใช้ Private ได้)
2. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ (`index.html`, `cloud.js`, `config.js`, `.nojekyll`, `supabase/`, `README.md`)
   - ผ่านหน้าเว็บ: **Add file → Upload files** แล้วลากไฟล์ทั้งหมดใส่
   - หรือผ่าน git:
     ```bash
     git init && git add . && git commit -m "Export Pulse"
     git branch -M main
     git remote add origin https://github.com/<username>/export-pulse.git
     git push -u origin main
     ```
3. ไปที่ **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: `main` / `/ (root)` → **Save**
4. รอ 1–2 นาที เว็บจะอยู่ที่ `https://<username>.github.io/export-pulse/`

## ขั้นที่ 4: ทดสอบ

- [ ] เปิดเว็บแล้วเจอหน้า Login
- [ ] Login ด้วยบัญชีที่สร้างไว้
- [ ] เพิ่มชื่อสมาชิก / เพิ่ม Shipment / อัปโหลด Booking PDF
- [ ] เปิดเว็บจากอีกเครื่องหรือ browser อื่น → ต้องเห็นข้อมูลชุดเดียวกัน
- [ ] ใน Supabase **Table Editor** ต้องมีข้อมูลในตาราง และมีไฟล์ใน **Storage → shipment-files**

---

## หมายเหตุ / ข้อจำกัด

- **Supabase free tier จะหยุดโปรเจกต์ชั่วคราวถ้าไม่มีการใช้งานราว 1 สัปดาห์** ควรเข้าไปกด Restore และเปิดใช้งานก่อนวันนำเสนอ
- ข้อมูลบันทึกอัตโนมัติหลังแก้ไขประมาณ 0.4 วินาที (ดูสถานะที่แถบซ้าย) ถ้าทำงานหลายคนพร้อมกัน กด **⟳ โหลดข้อมูลล่าสุด** เพื่อดูงานที่คนอื่นเพิ่ม
- ถ้า 2 คนแก้ **Booking เดียวกัน** พร้อมกัน ระบบจะเก็บค่าของคนที่บันทึกทีหลัง
- OCR ตั้งค่าไว้ที่ภาษาอังกฤษ (`createWorker("eng")`) ถ้าต้องอ่านภาษาไทยให้เปลี่ยนเป็น `"eng+tha"` ใน `index.html`
- ขนาดไฟล์ PDF สูงสุด 20 MB ต่อไฟล์ (แก้ได้ใน `schema.sql`)
- ข้อมูลเดิมที่เคยเก็บใน browser (เวอร์ชันก่อน) จะไม่ย้ายขึ้น Cloud ให้อัตโนมัติ ให้ Export CSV จากเวอร์ชันเดิม แล้วใช้ปุ่มนำเข้า Excel/CSV ในเวอร์ชันนี้
- ห้ามอัปโหลดข้อมูลลูกค้าจริงลง repo สาธารณะ ข้อมูลจริงควรอยู่ใน Supabase เท่านั้น

## Database schema (สำหรับเล่มรายงาน)

| ตาราง | คอลัมน์หลัก | คำอธิบาย |
|---|---|---|
| `bookings` | `id` (Booking Ref), `owner`, `data` (jsonb), `updated_at`, `updated_by` | ข้อมูล Booking / Shipment |
| `tracker` | `id`, `owner`, `data` (jsonb), `updated_at`, `updated_by` | Shipment Status Tracker |
| `team_members` | `id` (ชื่อ), `data` ({name, sort}) | รายชื่อทีม |
| `shipment_files` | `id` (ref::type), `ref`, `type`, `name`, `path` | ข้อมูลไฟล์ PDF ที่เก็บใน Storage |

`updated_by` จะเก็บ user id ของผู้ที่สร้างรายการให้อัตโนมัติ (`auth.uid()`)
