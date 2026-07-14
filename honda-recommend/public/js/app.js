const API = "/api";

const TYPE_LABEL = {
  family: "รถครอบครัว",
  automatic: "รถออโตเมติก",
  sport: "รถสปอร์ต",
  offroad: "รถวิบาก",
  bigbike: "บิ๊กไบค์"
};

const fmtBaht = n => Number(n).toLocaleString("th-TH", { maximumFractionDigits: 0 });

// simple reusable motorcycle silhouette icon (no real photos needed)
function bikeIconSVG(color = "#E4002B") {
  return `
  <svg viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
    <g fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="42" cy="92" r="22" />
      <circle cx="155" cy="92" r="22" />
      <path d="M42 92 L80 55 L120 55 L155 92" />
      <path d="M80 55 L70 30 L95 30" />
      <path d="M120 55 L128 40 L150 40" />
      <path d="M95 30 L108 30" />
      <circle cx="108" cy="30" r="5" fill="${color}" />
    </g>
  </svg>`;
}

let allBikes = [];

async function loadBikes() {
  const res = await fetch(`${API}/motorcycles`);
  allBikes = await res.json();
  renderAllGrid();
}

function bikeCard(bike, monthlyInfo = null) {
  const monthlyHtml = monthlyInfo
    ? `<div class="bike-monthly">ดาวน์ ${fmtBaht(monthlyInfo.downPayment)} บาท • ผ่อน ${fmtBaht(monthlyInfo.monthlyPayment)} บาท/เดือน</div>`
    : "";
  return `
  <div class="bike-card" data-id="${bike.id}">
    <div class="bike-thumb">
      <span class="bike-type-badge">${TYPE_LABEL[bike.type] || bike.type}</span>
      ${bikeIconSVG("#E4002B")}
    </div>
    <div class="bike-body">
      <h3>${bike.name}</h3>
      <div class="bike-spec">${bike.engineCC} cc • ${bike.transmission}</div>
      <div class="bike-price">${fmtBaht(bike.price)} บาท</div>
      ${monthlyHtml}
      <div class="bike-actions">
        <button class="btn-outline" onclick="openModal(${bike.id})">ดูรายละเอียด</button>
      </div>
    </div>
  </div>`;
}

function renderAllGrid() {
  const type = document.getElementById("f-type").value;
  const priceRange = document.getElementById("f-price").value;
  const search = document.getElementById("f-search").value.trim().toLowerCase();

  let list = [...allBikes];
  if (type) list = list.filter(b => b.type === type);
  if (priceRange) {
    const [min, max] = priceRange.split("-").map(Number);
    list = list.filter(b => b.price >= min && b.price <= max);
  }
  if (search) list = list.filter(b => b.name.toLowerCase().includes(search));

  const grid = document.getElementById("all-grid");
  grid.innerHTML = list.length
    ? list.map(b => bikeCard(b)).join("")
    : `<p style="color:#6B7280;">ไม่พบรถที่ตรงกับเงื่อนไขที่เลือก</p>`;
}

["f-type", "f-price"].forEach(id =>
  document.getElementById(id).addEventListener("change", renderAllGrid)
);
document.getElementById("f-search").addEventListener("input", renderAllGrid);

// ---------- Recommendation ----------
function setGauge(count, maxExpected = 6) {
  const circumference = 2 * Math.PI * 50; // r=50
  const ratio = Math.min(count / maxExpected, 1);
  const offset = circumference - ratio * circumference;
  const arc = document.getElementById("gauge-arc");
  arc.style.strokeDasharray = circumference;
  arc.style.strokeDashoffset = offset;
  document.getElementById("gauge-count").textContent = count;
}

document.getElementById("btn-recommend").addEventListener("click", async () => {
  const downPayment = Number(document.getElementById("qc-down").value) || 0;
  const maxMonthly = Number(document.getElementById("qc-monthly").value) || 0;
  const months = Number(document.getElementById("qc-months").value);
  const type = document.getElementById("qc-type").value;

  const btn = document.getElementById("btn-recommend");
  btn.textContent = "กำลังค้นหา...";
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ downPayment, maxMonthly, months, type: type || undefined })
    });
    const results = await res.json();

    const grid = document.getElementById("recommend-grid");
    const empty = document.getElementById("recommend-empty");

    if (!res.ok) {
      empty.textContent = results.error || "เกิดข้อผิดพลาด กรุณาลองใหม่";
      empty.style.display = "block";
      grid.innerHTML = "";
      setGauge(0);
      return;
    }

    if (results.length === 0) {
      empty.textContent = "ไม่พบรถที่ตรงกับงบประมาณของคุณ ลองปรับเงินดาวน์หรือค่างวดต่อเดือนดูนะครับ";
      empty.style.display = "block";
      grid.innerHTML = "";
    } else {
      empty.style.display = "none";
      grid.innerHTML = results.map(b => bikeCard(b, b.loan)).join("");
    }

    setGauge(results.length);
    document.getElementById("recommend").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error(err);
  } finally {
    btn.textContent = "ค้นหารถที่เหมาะกับฉัน";
    btn.disabled = false;
  }
});

// ---------- Modal ----------
let currentBike = null;

window.openModal = async (id) => {
  const res = await fetch(`${API}/motorcycles/${id}`);
  currentBike = await res.json();

  document.getElementById("modal-hero").innerHTML = bikeIconSVG("#E4002B");
  document.getElementById("m-name").textContent = currentBike.name;
  document.getElementById("m-price").textContent = `${fmtBaht(currentBike.price)} บาท`;
  document.getElementById("m-type").textContent = TYPE_LABEL[currentBike.type] || currentBike.type;
  document.getElementById("m-cc").textContent = `${currentBike.engineCC} cc`;
  document.getElementById("m-trans").textContent = currentBike.transmission;
  document.getElementById("m-fuel").textContent = currentBike.fuelConsumption;
  document.getElementById("m-highlights").innerHTML =
    (currentBike.highlights || []).map(h => `<li>${h}</li>`).join("");

  const minDown = Math.round(currentBike.price * (currentBike.minDownPercent / 100));
  document.getElementById("m-down").value = minDown;
  document.getElementById("m-down").min = minDown;
  document.getElementById("m-months").value = "36";

  await updateModalCalc();
  document.getElementById("modal-overlay").classList.add("open");
};

async function updateModalCalc() {
  if (!currentBike) return;
  const downPayment = Number(document.getElementById("m-down").value) || 0;
  const months = Number(document.getElementById("m-months").value);

  const res = await fetch(`${API}/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ price: currentBike.price, downPayment, months })
  });
  const data = await res.json();
  document.getElementById("m-result").textContent =
    res.ok
      ? `${fmtBaht(data.financedAmount)} บาท / ${fmtBaht(data.monthlyPayment)} บาท`
      : "กรอกข้อมูลไม่ถูกต้อง";
}

document.getElementById("m-down").addEventListener("input", updateModalCalc);
document.getElementById("m-months").addEventListener("change", updateModalCalc);

document.getElementById("modal-close").addEventListener("click", () => {
  document.getElementById("modal-overlay").classList.remove("open");
});
document.getElementById("modal-overlay").addEventListener("click", (e) => {
  if (e.target.id === "modal-overlay") {
    document.getElementById("modal-overlay").classList.remove("open");
  }
});

loadBikes();
