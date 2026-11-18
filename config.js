// ใส่ค่าจาก Supabase: Project Settings → API
// anon / publishable key เปิดเผยบนเว็บได้ เพราะข้อมูลถูกป้องกันด้วย Row Level Security (supabase/schema.sql)
// ห้ามใส่ service_role key ในไฟล์นี้เด็ดขาด
window.EXPORT_PULSE_CONFIG = {
  SUPABASE_URL: "https://cipywjjuvtntpllqwjfg.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_ICvUKm4pLL09bEK-cBA80Q_IVsy8V1d",
};
