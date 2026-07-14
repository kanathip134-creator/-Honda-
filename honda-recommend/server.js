const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, "data", "motorcycles.json");
const UPLOAD_DIR = path.join(__dirname, "public", "img", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// image upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `bike_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// ---------- Simple JSON "database" helpers ----------
function readDB() {
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(raw);
}
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}
function nextId(list) {
  return list.length ? Math.max(...list.map(m => m.id)) + 1 : 1;
}

// ---------- Loan calculation helper ----------
// Flat-rate interest calculation, common for Thai motorcycle hire-purchase
const ANNUAL_FLAT_RATE = 0.15; // 15% ต่อปี (สมมติฐานสำหรับสาธิตระบบ)

function calculateLoan(price, downPayment, months) {
  const financedAmount = Math.max(price - downPayment, 0);
  const years = months / 12;
  const totalInterest = financedAmount * ANNUAL_FLAT_RATE * years;
  const totalPayable = financedAmount + totalInterest;
  const monthlyPayment = months > 0 ? totalPayable / months : 0;
  return {
    price,
    downPayment,
    financedAmount: Math.round(financedAmount),
    months,
    totalInterest: Math.round(totalInterest),
    totalPayable: Math.round(totalPayable),
    monthlyPayment: Math.round(monthlyPayment)
  };
}

// ================= ROUTES =================

// --- GET all motorcycles (supports filters: type, minPrice, maxPrice, q) ---
app.get("/api/motorcycles", (req, res) => {
  let list = readDB();
  const { type, minPrice, maxPrice, q } = req.query;

  if (type) list = list.filter(m => m.type === type);
  if (minPrice) list = list.filter(m => m.price >= Number(minPrice));
  if (maxPrice) list = list.filter(m => m.price <= Number(maxPrice));
  if (q) {
    const query = q.toLowerCase();
    list = list.filter(m => m.name.toLowerCase().includes(query));
  }

  res.json(list);
});

// --- GET single motorcycle ---
app.get("/api/motorcycles/:id", (req, res) => {
  const list = readDB();
  const bike = list.find(m => m.id === Number(req.params.id));
  if (!bike) return res.status(404).json({ error: "ไม่พบข้อมูลรถรุ่นนี้" });
  res.json(bike);
});

// --- POST create new motorcycle (admin) ---
app.post("/api/motorcycles", (req, res) => {
  const list = readDB();
  const body = req.body;

  if (!body.name || !body.price || !body.type) {
    return res.status(400).json({ error: "กรุณาระบุ ชื่อรุ่น, ประเภท และราคา" });
  }

  const newBike = {
    id: nextId(list),
    name: body.name,
    brand: body.brand || "Honda",
    type: body.type,
    price: Number(body.price),
    minDownPercent: Number(body.minDownPercent) || 10,
    engineCC: Number(body.engineCC) || 0,
    transmission: body.transmission || "",
    fuelConsumption: body.fuelConsumption || "",
    highlights: Array.isArray(body.highlights)
      ? body.highlights
      : (body.highlights || "").split(",").map(s => s.trim()).filter(Boolean),
    image: body.image || "default.jpg"
  };

  list.push(newBike);
  writeDB(list);
  res.status(201).json(newBike);
});

// --- PUT update motorcycle (admin) ---
app.put("/api/motorcycles/:id", (req, res) => {
  const list = readDB();
  const idx = list.findIndex(m => m.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "ไม่พบข้อมูลรถรุ่นนี้" });

  const body = req.body;
  const updated = {
    ...list[idx],
    ...body,
    price: body.price !== undefined ? Number(body.price) : list[idx].price,
    minDownPercent: body.minDownPercent !== undefined ? Number(body.minDownPercent) : list[idx].minDownPercent,
    engineCC: body.engineCC !== undefined ? Number(body.engineCC) : list[idx].engineCC,
    highlights: Array.isArray(body.highlights)
      ? body.highlights
      : (typeof body.highlights === "string"
          ? body.highlights.split(",").map(s => s.trim()).filter(Boolean)
          : list[idx].highlights)
  };

  list[idx] = updated;
  writeDB(list);
  res.json(updated);
});

// --- DELETE motorcycle (admin) ---
app.delete("/api/motorcycles/:id", (req, res) => {
  const list = readDB();
  const idx = list.findIndex(m => m.id === Number(req.params.id));
  if (idx === -1) return res.status(404).json({ error: "ไม่พบข้อมูลรถรุ่นนี้" });

  const removed = list.splice(idx, 1);
  writeDB(list);
  res.json({ success: true, removed: removed[0] });
});

// --- POST upload bike image (admin) ---
app.post("/api/upload", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "กรุณาแนบไฟล์รูปภาพ" });
  res.json({ filename: `uploads/${req.file.filename}` });
});

// --- POST calculate loan for a single bike ---
app.post("/api/calculate", (req, res) => {
  const { price, downPayment, months } = req.body;
  if (!price || downPayment === undefined || !months) {
    return res.status(400).json({ error: "กรุณาระบุ ราคารถ, เงินดาวน์ และ ระยะเวลาผ่อน" });
  }
  const result = calculateLoan(Number(price), Number(downPayment), Number(months));
  res.json(result);
});

// --- POST recommend bikes based on budget ---
// body: { downPayment, maxMonthly, months, type (optional) }
app.post("/api/recommend", (req, res) => {
  const { downPayment, maxMonthly, months, type } = req.body;

  if (downPayment === undefined || !maxMonthly || !months) {
    return res.status(400).json({ error: "กรุณาระบุ เงินดาวน์, ค่างวดสูงสุดต่อเดือน และ ระยะเวลาผ่อน" });
  }

  let list = readDB();
  if (type) list = list.filter(m => m.type === type);

  const results = list
    .map(bike => {
      const minDownRequired = Math.round(bike.price * (bike.minDownPercent / 100));
      const effectiveDown = Math.max(Number(downPayment), minDownRequired);
      const loan = calculateLoan(bike.price, effectiveDown, Number(months));
      return { ...bike, loan, minDownRequired };
    })
    .filter(item => item.loan.monthlyPayment <= Number(maxMonthly) && Number(downPayment) >= item.minDownRequired)
    .sort((a, b) => a.loan.monthlyPayment - b.loan.monthlyPayment);

  res.json(results);
});

app.listen(PORT, () => {
  console.log(`🏍  Honda Recommend System กำลังทำงานที่ http://localhost:${PORT}`);
});
