/* Export Pulse – Supabase cloud layer
 * - Login (email + password) via Supabase Auth
 * - Loads bookings / tracker / team_members into the page's existing arrays
 * - Saves only rows that changed (diff sync) so two users don't overwrite each other's rows
 */
const CFG = window.EXPORT_PULSE_CONFIG || {};
let sb = null;
const cloudState = {
  bookings: { table: "bookings", known: new Map() },     // id -> last synced JSON
  tracker:  { table: "tracker", known: new Map() },
  team:     { table: "team_members", known: new Map() },
};
const cloudTimers = {};
let cloudBooted = false;

function setSync(msg, isErr) {
  const el = document.getElementById("syncState");
  if (el) { el.textContent = msg; el.classList.toggle("err", !!isErr); }
}
function authMsg(msg) { const el = document.getElementById("authMsg"); if (el) el.textContent = msg || ""; }

/* ---------- row <-> cloud mapping ---------- */
function bookingId(b) {
  const ref = String(b["Booking Ref"] || b["Booking No."] || "").trim().toLowerCase();
  if (ref) return ref;
  if (!b._id) b._id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
  return "id:" + b._id;
}
function cloudRows(kind) {
  if (kind === "bookings")
    return bookings.map(b => ({ id: bookingId(b), owner: String(b["Job Owner"] || b["Owner"] || ""), data: b }));
  if (kind === "tracker")
    return trackerRecords.map(r => ({ id: String(r.id), owner: String(r.owner || ""), data: r }));
  return teamMembers.map((n, i) => ({ id: n, data: { name: n, sort: i } }));
}
function normTrackerStatus(r) {
  const s = r.status === "BOOKING CONFIRMATION RELEASED" ? "CONFIRM"
          : r.status === "SHIPMENT CANCELLED" ? "CANCEL"
          : (["CONFIRM", "PENDING", "CANCEL"].includes(r.status) ? r.status : "PENDING");
  return { ...r, status: s };
}

/* ---------- load ---------- */
async function cloudFetchAll(table) {
  const out = []; const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await sb.from(table).select("id,data").range(from, from + page - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < page) break;
  }
  return out;
}
async function cloudLoad() {
  setSync("กำลังโหลดข้อมูล...");
  const [b, t, m] = await Promise.all([cloudFetchAll("bookings"), cloudFetchAll("tracker"), cloudFetchAll("team_members")]);
  bookings = b.map(r => r.data);
  bookings.forEach(x => { if (x && x._dataType === "ข้อมูลจริงจากเอกสาร") x["Shipment Status"] = "Booking Confirmed"; });
  trackerRecords = t.map(r => normTrackerStatus(r.data));
  teamMembers = m.map(r => r.data).sort((a, c) => (a.sort ?? 0) - (c.sort ?? 0)).map(x => x.name);
  for (const kind of Object.keys(cloudState)) {
    const st = cloudState[kind]; st.known.clear();
    cloudRows(kind).forEach(r => st.known.set(r.id, JSON.stringify(r.data)));
  }
  setSync("ซิงก์แล้ว · " + new Date().toLocaleTimeString("th-TH"));
}

/* ---------- save (debounced diff sync) ---------- */
function cloudSchedule(kind) {
  if (!cloudBooted) return;
  setSync("กำลังบันทึก...");
  clearTimeout(cloudTimers[kind]);
  cloudTimers[kind] = setTimeout(() => cloudPush(kind), 400);
}
async function cloudPush(kind) {
  const st = cloudState[kind];
  const rows = cloudRows(kind);
  const now = new Map(rows.map(r => [r.id, r]));
  const upserts = rows.filter(r => st.known.get(r.id) !== JSON.stringify(r.data))
                      .map(r => ({ ...r, updated_at: new Date().toISOString() }));
  const deletes = [...st.known.keys()].filter(id => !now.has(id));
  try {
    if (upserts.length) { const { error } = await sb.from(st.table).upsert(upserts); if (error) throw error; }
    if (deletes.length) { const { error } = await sb.from(st.table).delete().in("id", deletes); if (error) throw error; }
    upserts.forEach(r => st.known.set(r.id, JSON.stringify(r.data)));
    deletes.forEach(id => st.known.delete(id));
    setSync("บันทึกแล้ว · " + new Date().toLocaleTimeString("th-TH"));
  } catch (err) {
    console.error("Cloud save failed", err);
    setSync("บันทึกไม่สำเร็จ – กดโหลดข้อมูลล่าสุด", true);
    alert("บันทึกข้อมูลขึ้น Cloud ไม่สำเร็จ: " + (err.message || err) + "\nกรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง");
  }
}

/* ---------- auth + boot ---------- */
async function cloudLogin(e) {
  e.preventDefault();
  const btn = document.getElementById("authBtn"); btn.disabled = true; authMsg("");
  const { error } = await sb.auth.signInWithPassword({
    email: document.getElementById("authEmail").value.trim(),
    password: document.getElementById("authPassword").value,
  });
  btn.disabled = false;
  if (error) { authMsg("เข้าสู่ระบบไม่สำเร็จ: อีเมลหรือรหัสผ่านไม่ถูกต้อง"); return; }
  await cloudStart();
}
async function cloudLogout() { await sb.auth.signOut(); location.reload(); }
async function cloudReload() {
  try { await cloudLoad(); renderOwnerMenu(); setOwner(teamMembers.includes(activeOwner) ? activeOwner : "All"); renderTracker(); }
  catch (err) { setSync("โหลดไม่สำเร็จ", true); alert("โหลดข้อมูลไม่สำเร็จ: " + (err.message || err)); }
}
async function cloudStart() {
  const { data } = await sb.auth.getUser();
  if (!data.user) { document.getElementById("authOverlay").hidden = false; return; }
  document.getElementById("cloudUser").textContent = data.user.email;
  try { await cloudLoad(); }
  catch (err) {
    console.error(err);
    authMsg("เชื่อมต่อฐานข้อมูลไม่สำเร็จ: " + (err.message || err));
    document.getElementById("authOverlay").hidden = false; return;
  }
  document.getElementById("authOverlay").hidden = true;
  cloudBooted = true;
  renderOwnerMenu(); setOwner("All"); renderTracker(); refreshAll();
}
(function init() {
  if (!window.supabase || !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY || CFG.SUPABASE_URL.includes("YOUR-PROJECT")) {
    authMsg("ยังไม่ได้ตั้งค่า Supabase – กรุณาแก้ไฟล์ config.js (ดู README)");
    document.getElementById("authBtn").disabled = true; return;
  }
  sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
  cloudStart();
})();
