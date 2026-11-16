-- Export Pulse – Supabase schema
-- วิธีใช้: Supabase Dashboard → SQL Editor → New query → วางทั้งไฟล์ → Run

-- 1) Tables -------------------------------------------------------------
create table if not exists public.bookings (
  id          text primary key,              -- Booking Ref / Booking No. (lowercase)
  owner       text,                          -- Job Owner
  data        jsonb not null,                -- ข้อมูล Booking ทั้งหมด
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid()
);

create table if not exists public.tracker (
  id          text primary key,
  owner       text,
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid()
);

create table if not exists public.team_members (
  id          text primary key,              -- ชื่อสมาชิก
  data        jsonb not null,                -- { name, sort }
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid()
);

create table if not exists public.shipment_files (
  id          text primary key,              -- "<ref>::<type>"
  ref         text not null,
  type        text not null,                 -- bookingSeabra / bookingCarrier / HBL / MBL
  name        text,                          -- ชื่อไฟล์เดิม
  path        text not null,                 -- path ใน Storage bucket
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid()
);
create index if not exists shipment_files_ref_idx on public.shipment_files(ref);

-- ค่าเริ่มต้นรายชื่อทีม (แก้ได้ภายหลังจากหน้าเว็บ)
insert into public.team_members (id, data) values
  ('อ๋อม', '{"name":"อ๋อม","sort":0}'),
  ('ดิว',  '{"name":"ดิว","sort":1}'),
  ('นุ๊ก',  '{"name":"นุ๊ก","sort":2}')
on conflict (id) do nothing;

-- 2) Row Level Security: เฉพาะผู้ที่ Login แล้วเท่านั้น -----------------
alter table public.bookings       enable row level security;
alter table public.tracker        enable row level security;
alter table public.team_members   enable row level security;
alter table public.shipment_files enable row level security;

do $$
declare t text;
begin
  foreach t in array array['bookings','tracker','team_members','shipment_files'] loop
    execute format('drop policy if exists "team full access" on public.%I', t);
    execute format('create policy "team full access" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- 3) Storage bucket สำหรับ PDF (private) -------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shipment-files', 'shipment-files', false, 20971520, array['application/pdf'])  -- 20 MB/ไฟล์
on conflict (id) do nothing;

drop policy if exists "team read files"   on storage.objects;
drop policy if exists "team upload files" on storage.objects;
drop policy if exists "team update files" on storage.objects;
drop policy if exists "team delete files" on storage.objects;
create policy "team read files"   on storage.objects for select to authenticated using (bucket_id = 'shipment-files');
create policy "team upload files" on storage.objects for insert to authenticated with check (bucket_id = 'shipment-files');
create policy "team update files" on storage.objects for update to authenticated using (bucket_id = 'shipment-files');
create policy "team delete files" on storage.objects for delete to authenticated using (bucket_id = 'shipment-files');
