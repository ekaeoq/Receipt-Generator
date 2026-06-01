const state = {
  fixedBusiness: {
    businessName: "Viktor Watch",
    businessTagline: "small workshop serious watches",
    sellerAddress: "Jug 1 56, 40323 Prelog, Hrvatska"
  },
  idSuffix: randomSuffix(),
  items: [
    {
      description: "Viktor Watch",
      reference: "",
      condition: "",
      accessories: "",
      notes: "",
      qty: 1,
      price: 0
    }
  ]
};

const bindings = {};
const itemsEditor = document.querySelector("#itemsEditor");
const itemsPreview = document.querySelector("#itemsPreview");
const exportStatus = document.querySelector("#exportStatus");
const logoImage = document.querySelector("#logoImage");

if (window.VIKTOR_WATCH_LOGO_DATA) {
  logoImage.src = window.VIKTOR_WATCH_LOGO_DATA;
}

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
    description: "Viktor Watch",
    reference: "",
    condition: "",
    accessories: "",
    notes: "",
    qty: 1,
    price: 0
  });
  render();
});

document.querySelector("#generateId").addEventListener("click", () => {
  state.idSuffix = randomSuffix();
  render();
});

document.querySelector("#resetDemo").addEventListener("click", () => {
  bindings.clientName.value = "Client Name";
  bindings.subject.value = "Watch purchase receipt";
  bindings.purchaseRecordTitle.value = "Viktor Watch";
  bindings.prefix.value = "001";
  bindings.taxRate.value = "0";
  bindings.shipping.value = "0";
  bindings.discount.value = "0";
  bindings.sellerEmail.value = "viktorwatches@gmail.com";
  bindings.sellerPhone.value = "";
  bindings.paymentMethod.value = "Revolut Pay";
  state.idSuffix = randomSuffix();
  state.items = [
    {
      description: "Viktor Watch",
      reference: "",
      condition: "",
      accessories: "",
      notes: "",
      qty: 1,
      price: 0
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
    await waitForImages(invoice);
    const canvas = await window.html2canvas(invoice, {
      backgroundColor: "#f7f5ef",
      allowTaint: true,
      imageTimeout: 0,
      scale: 2,
      useCORS: false
    });
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.96);
    await saveBlob(blob, `${invoiceId()}.jpg`, "image/jpeg", "JPEG image");
    exportStatus.textContent = "JPEG saved";
  } catch (error) {
    exportStatus.textContent = error.name === "AbortError" ? "JPEG save cancelled" : "JPEG export failed";
    console.error(error);
  }
});

document.querySelector("#downloadPdf").addEventListener("click", async () => {
  const invoice = document.querySelector("#invoice");
  exportStatus.textContent = "Rendering one-page PDF...";

  if (!window.html2canvas || !window.jspdf?.jsPDF) {
    exportStatus.textContent = "PDF library unavailable. Use localhost and refresh.";
    return;
  }

  try {
    await waitForImages(invoice);
    const canvas = await window.html2canvas(invoice, {
      backgroundColor: "#f7f5ef",
      allowTaint: true,
      imageTimeout: 0,
      scale: 2,
      useCORS: false
    });

    const pdf = new window.jspdf.jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });
    const margin = 6;
    const pageWidth = 210;
    const pageHeight = 297;
    const availableWidth = pageWidth - margin * 2;
    const availableHeight = pageHeight - margin * 2;
    const imageRatio = canvas.width / canvas.height;
    let imageWidth = availableWidth;
    let imageHeight = imageWidth / imageRatio;

    if (imageHeight > availableHeight) {
      imageHeight = availableHeight;
      imageWidth = imageHeight * imageRatio;
    }

    const imageX = (pageWidth - imageWidth) / 2;
    const imageY = (pageHeight - imageHeight) / 2;
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", imageX, imageY, imageWidth, imageHeight);

    const blob = pdf.output("blob");
    await saveBlob(blob, `${invoiceId()}.pdf`, "application/pdf", "PDF document");
    exportStatus.textContent = "PDF saved";
  } catch (error) {
    exportStatus.textContent = error.name === "AbortError" ? "PDF save cancelled" : "PDF export failed";
    console.error(error);
  }
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
      <div class="grid two">
        <label>Reference<input data-item="${index}" data-field="reference" value="${escapeAttribute(item.reference || "")}"></label>
        <label>Condition<input data-item="${index}" data-field="condition" value="${escapeAttribute(item.condition || "")}"></label>
      </div>
      <div class="grid two">
        <label>Accessories<input data-item="${index}" data-field="accessories" value="${escapeAttribute(item.accessories || "")}"></label>
        <label>Notes<input data-item="${index}" data-field="notes" value="${escapeAttribute(item.notes || "")}"></label>
      </div>
      <div class="grid two">
        <label>Qty<input data-item="${index}" data-field="qty" type="number" step="1" value="${item.qty}"></label>
        <label>Price<input data-item="${index}" data-field="price" type="number" step="0.01" value="${item.price}"></label>
      </div>
    `;
    card.querySelector(".remove-item").addEventListener("click", () => {
      state.items.splice(index, 1);
      if (state.items.length === 0) {
        state.items.push({ description: "Viktor Watch", reference: "", condition: "", accessories: "", notes: "", qty: 1, price: 0 });
      }
      render();
    });
    card.querySelectorAll("[data-item]").forEach((input) => {
      input.addEventListener("input", () => {
        const itemIndex = Number(input.dataset.item);
        const field = input.dataset.field;
        state.items[itemIndex][field] = field === "qty" || field === "price" ? Number(input.value || 0) : input.value;
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
    const specs = formatSpecs(item);
    const row = document.createElement("div");
    row.className = "preview-item";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.description || "Untitled item")}</strong>
        <small>${escapeHtml(specs)}</small>
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
  document.querySelector("#featureTitle").textContent = valueOf("purchaseRecordTitle") || "Viktor Watch";
  document.querySelector("#featureDetails").textContent = "";
}

function invoiceId() {
  const prefix = valueOf("prefix") || "001";
  return `${prefix}-${state.idSuffix}`;
}

function randomSuffix() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}

function formatSpecs(item) {
  return [
    ["Reference", item.reference],
    ["Condition", item.condition],
    ["Accessories", item.accessories],
    ["Notes", item.notes]
  ]
    .filter(([, value]) => String(value || "").trim())
    .map(([label, value]) => `${label}: ${value}`)
    .join(" · ");
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

function waitForImages(root) {
  const images = [...root.querySelectorAll("img")];
  return Promise.all(images.map((image) => {
    if (image.complete && image.naturalWidth > 0) {
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", reject, { once: true });
    });
  }));
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Could not create image file."));
      }
    }, type, quality);
  });
}

async function saveBlob(blob, suggestedName, mimeType, description) {
  if (window.showSaveFilePicker) {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description,
          accept: { [mimeType]: [`.${suggestedName.split(".").pop()}`] }
        }
      ]
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  const link = document.createElement("a");
  link.download = suggestedName;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
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

render();
