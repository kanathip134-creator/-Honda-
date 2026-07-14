const API = "/api";
const TYPE_LABEL = {
  family: "รถครอบครัว",
  automatic: "รถออโตเมติก",
  sport: "รถสปอร์ต",
  offroad: "รถวิบาก",
  bigbike: "บิ๊กไบค์"
};
const fmtBaht = n => Number(n).toLocaleString("th-TH");

const form = document.getElementById("bike-form");
const formMsg = document.getElementById("form-msg");

function showMsg(text, ok = true) {
  formMsg.textContent = text;
  formMsg.className = `msg show ${ok ? "ok" : "err"}`;
  setTimeout(() => formMsg.classList.remove("show"), 3000);
}

function resetForm() {
  form.reset();
  document.getElementById("f-id").value = "";
  document.getElementById("f-image-path").value = "";
  document.getElementById("form-title").textContent = "เพิ่มรถรุ่นใหม่";
}

document.getElementById("btn-new").addEventListener("click", resetForm);
document.getElementById("btn-cancel").addEventListener("click", resetForm);

// ---------- load & render table ----------
async function loadTable() {
  const res = await fetch(`${API}/motorcycles`);
  const list = await res.json();
  document.getElementById("count").textContent = list.length;

  document.getElementById("bike-table-body").innerHTML = list.map(b => `
    <tr>
      <td>${b.name}</td>
      <td>${TYPE_LABEL[b.type] || b.type}</td>
      <td>${fmtBaht(b.price)} บาท</td>
      <td class="row-actions">
        <button class="edit" onclick="editBike(${b.id})">แก้ไข</button>
        <button class="delete" onclick="deleteBike(${b.id})">ลบ</button>
      </td>
    </tr>
  `).join("");
}

// ---------- image upload ----------
document.getElementById("f-image").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append("image", file);
  try {
    const res = await fetch(`${API}/upload`, { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      document.getElementById("f-image-path").value = data.filename;
      showMsg("อัปโหลดรูปภาพสำเร็จ", true);
    } else {
      showMsg(data.error || "อัปโหลดรูปภาพไม่สำเร็จ", false);
    }
  } catch (err) {
    showMsg("อัปโหลดรูปภาพไม่สำเร็จ", false);
  }
});

// ---------- create / update ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = document.getElementById("f-id").value;
  const payload = {
    name: document.getElementById("f-name").value.trim(),
    type: document.getElementById("f-type").value,
    price: Number(document.getElementById("f-price").value),
    minDownPercent: Number(document.getElementById("f-minDown").value),
    engineCC: Number(document.getElementById("f-cc").value),
    transmission: document.getElementById("f-trans").value.trim(),
    fuelConsumption: document.getElementById("f-fuel").value.trim(),
    highlights: document.getElementById("f-highlights").value.trim(),
    image: document.getElementById("f-image-path").value || undefined
  };

  try {
    const res = await fetch(`${API}/motorcycles${id ? "/" + id : ""}`, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
      showMsg(id ? "แก้ไขข้อมูลสำเร็จ" : "เพิ่มรุ่นใหม่สำเร็จ", true);
      resetForm();
      loadTable();
    } else {
      showMsg(data.error || "เกิดข้อผิดพลาด", false);
    }
  } catch (err) {
    showMsg("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ", false);
  }
});

// ---------- edit ----------
window.editBike = async (id) => {
  const res = await fetch(`${API}/motorcycles/${id}`);
  const b = await res.json();

  document.getElementById("f-id").value = b.id;
  document.getElementById("f-name").value = b.name;
  document.getElementById("f-type").value = b.type;
  document.getElementById("f-price").value = b.price;
  document.getElementById("f-minDown").value = b.minDownPercent;
  document.getElementById("f-cc").value = b.engineCC;
  document.getElementById("f-trans").value = b.transmission;
  document.getElementById("f-fuel").value = b.fuelConsumption;
  document.getElementById("f-highlights").value = (b.highlights || []).join(", ");
  document.getElementById("f-image-path").value = b.image || "";
  document.getElementById("form-title").textContent = `แก้ไข: ${b.name}`;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// ---------- delete ----------
window.deleteBike = async (id) => {
  if (!confirm("ยืนยันการลบรถรุ่นนี้หรือไม่?")) return;
  const res = await fetch(`${API}/motorcycles/${id}`, { method: "DELETE" });
  if (res.ok) {
    showMsg("ลบข้อมูลสำเร็จ", true);
    loadTable();
  } else {
    showMsg("ลบข้อมูลไม่สำเร็จ", false);
  }
};

loadTable();
