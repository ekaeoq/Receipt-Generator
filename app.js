const state = {
  fixedBusiness: {
    businessName: "Victor Watch",
    businessTagline: "Curated pre-owned watches",
    sellerAddress: "Jug 1 56, 40323 Prelog, Hrvatska"
  },
  items: [
    {
      description: "Rolex Datejust 36",
      details: "Ref. 16234 · Silver dial · Oyster bracelet · Excellent condition",
      qty: 1,
      price: 4850
    }
  ]
};

const bindings = {};
const itemsEditor = document.querySelector("#itemsEditor");
const itemsPreview = document.querySelector("#itemsPreview");
const exportStatus = document.querySelector("#exportStatus");

const moneyFormatter = () => {
  const currency = valueOf("currency") || "EUR";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.trim().toUpperCase(),
      currencyDisplay: "narrowSymbol"
    });
  } catch {
    return {
      format(amount) {
        return `${Number(amount || 0).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })} ${currency}`;
      }
    };
  }
};

const today = new Date();
const due = new Date();
due.setDate(today.getDate() + 7);

document.querySelector('[data-bind="invoiceDate"]').value = toDateInput(today);
document.querySelector('[data-bind="dueDate"]').value = toDateInput(due);

document.querySelectorAll("[data-bind]").forEach((field) => {
  bindings[field.dataset.bind] = field;
  field.addEventListener("input", render);
});

document.querySelector("#addItem").addEventListener("click", () => {
  state.items.push({
    description: "Watch service or accessory",
    details: "Add reference, serial, accessories, condition, or warranty notes",
    qty: 1,
    price: 0
  });
  render();
});

document.querySelector("#generateId").addEventListener("click", () => {
  const nextSequence = String(Number(valueOf("sequence") || 0) + 1).padStart(6, "0");
  bindings.sequence.value = nextSequence;
  localStorage.setItem("lastInvoiceSequence", nextSequence);
  render();
});

document.querySelector("#resetDemo").addEventListener("click", () => {
  bindings.clientName.value = "Client Name";
  bindings.subject.value = "Watch purchase receipt";
  bindings.sequence.value = "000001";
  bindings.prefix.value = "001";
  bindings.taxRate.value = "0";
  bindings.shipping.value = "0";
  bindings.discount.value = "0";
  state.items = [
    {
      description: "Rolex Datejust 36",
      details: "Ref. 16234 · Silver dial · Oyster bracelet · Excellent condition",
      qty: 1,
      price: 4850
    }
  ];
  render();
});

document.querySelector("#watchUpload").addEventListener("change", (event) => {
  loadImage(event.target.files[0], (src) => {
    document.querySelector("#watchPreview").innerHTML = `<img alt="Watch" src="${src}">`;
  });
});

document.querySelector("#downloadJpeg").addEventListener("click", async () => {
  const invoice = document.querySelector("#invoice");
  exportStatus.textContent = "Rendering JPEG...";

  if (!window.html2canvas) {
    exportStatus.textContent = "JPEG library unavailable. Check your internet connection.";
    return;
  }

  try {
    const canvas = await window.html2canvas(invoice, {
      backgroundColor: "#f7f5ef",
      scale: 2,
      useCORS: true
    });
    const link = document.createElement("a");
    link.download = `${invoiceId()}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.96);
    link.click();
    exportStatus.textContent = "JPEG downloaded";
  } catch (error) {
    exportStatus.textContent = "JPEG export failed";
    console.error(error);
  }
});

document.querySelector("#downloadPdf").addEventListener("click", () => {
  exportStatus.textContent = "Choose Save as PDF in the print dialog";
  window.print();
});

function render() {
  renderText();
  renderItemsEditor();
  renderItemsPreview();
  renderTotals();
  renderFeature();
}

function renderText() {
  document.querySelectorAll("[data-preview]").forEach((node) => {
    const key = node.dataset.preview;
    const rawValue = valueOf(key);
    node.textContent = node.dataset.format === "date" ? formatDate(rawValue) : rawValue;
  });
  document.querySelector("#invoiceIdPreview").textContent = invoiceId();
}

function renderItemsEditor() {
  itemsEditor.innerHTML = "";
  state.items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div class="item-card-head">
        <strong>Item ${index + 1}</strong>
        <button class="remove-item" type="button">Remove</button>
      </div>
      <label>Description<input data-item="${index}" data-field="description" value="${escapeAttribute(item.description)}"></label>
      <label>Details<textarea data-item="${index}" data-field="details">${escapeHtml(item.details)}</textarea></label>
      <div class="grid two">
        <label>Qty<input data-item="${index}" data-field="qty" type="number" step="1" value="${item.qty}"></label>
        <label>Price<input data-item="${index}" data-field="price" type="number" step="0.01" value="${item.price}"></label>
      </div>
    `;
    card.querySelector(".remove-item").addEventListener("click", () => {
      state.items.splice(index, 1);
      if (state.items.length === 0) {
        state.items.push({ description: "New item", details: "", qty: 1, price: 0 });
      }
      render();
    });
    card.querySelectorAll("[data-item]").forEach((input) => {
      input.addEventListener("input", () => {
        const itemIndex = Number(input.dataset.item);
        const field = input.dataset.field;
        state.items[itemIndex][field] = field === "description" || field === "details"
          ? input.value
          : Number(input.value || 0);
        renderItemsPreview();
        renderTotals();
        renderFeature();
      });
    });
    itemsEditor.appendChild(card);
  });
}

function renderItemsPreview() {
  const format = moneyFormatter();
  itemsPreview.innerHTML = "";
  state.items.forEach((item) => {
    const total = Number(item.qty || 0) * Number(item.price || 0);
    const row = document.createElement("div");
    row.className = "preview-item";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.description || "Untitled item")}</strong>
        <small>${escapeHtml(item.details || "")}</small>
      </div>
      <span>${Number(item.qty || 0)}</span>
      <span>${format.format(Number(item.price || 0))}</span>
      <span>${format.format(total)}</span>
    `;
    itemsPreview.appendChild(row);
  });
}

function renderTotals() {
  const format = moneyFormatter();
  const subtotal = state.items.reduce((sum, item) => sum + Number(item.qty || 0) * Number(item.price || 0), 0);
  const tax = subtotal * (Number(valueOf("taxRate") || 0) / 100);
  const shipping = Number(valueOf("shipping") || 0);
  const discount = Number(valueOf("discount") || 0);
  const total = subtotal + tax + shipping - discount;

  document.querySelector("#subtotalPreview").textContent = format.format(subtotal);
  document.querySelector("#taxPreview").textContent = format.format(tax);
  document.querySelector("#shippingPreview").textContent = format.format(shipping);
  document.querySelector("#discountPreview").textContent = `-${format.format(discount)}`;
  document.querySelector("#totalPreview").textContent = format.format(total);
}

function renderFeature() {
  const firstItem = state.items[0] || {};
  document.querySelector("#featureTitle").textContent = firstItem.description || "Featured timepiece";
  document.querySelector("#featureDetails").textContent = firstItem.details || "Add reference, condition, accessories, serial, warranty, and any provenance notes here.";
}

function invoiceId() {
  const sequence = String(valueOf("sequence") || "000001").padStart(6, "0");
  const prefix = valueOf("prefix") || "001";
  const seed = `${sequence}-${prefix}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 10000;
  }
  return `${sequence}-${prefix}-${String(hash).padStart(4, "0")}`;
}

function valueOf(key) {
  if (Object.prototype.hasOwnProperty.call(state.fixedBusiness, key)) {
    return state.fixedBusiness[key];
  }
  return bindings[key]?.value ?? "";
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function toDateInput(date) {
  return date.toISOString().slice(0, 10);
}

function loadImage(file, callback) {
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => callback(reader.result));
  reader.readAsDataURL(file);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

const storedSequence = localStorage.getItem("lastInvoiceSequence");
if (storedSequence) {
  bindings.sequence.value = storedSequence;
}

render();
