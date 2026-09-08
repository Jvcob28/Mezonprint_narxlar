(() => {
  "use strict";

  const fmt = new Intl.NumberFormat("ru-RU");
  const money = value => `${fmt.format(Math.round(Number(value || 0)))} so‘m`;
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

  const PAYMENT_LABELS = {
    cash: "Naqd",
    card: "Karta / terminal",
    transfer: "O‘tkazma",
    click: "Click",
    payme: "Payme",
    bank: "Bank orqali to‘lov",
    mixed: "Aralash"
  };

  const DEFAULT_SETTINGS = {
    payrollPct: 20,
    utilitiesPct: 10,
    otherPct: 5,
    duplexPct: 80,
    densePct: 40,
    rushPct: 25,
    cuttingPerSheet: 450,
    creasingPerLine: 450,
    colorMatch: 18000,
    laminationA4: 5200,
    laminationA3: 8100
  };

  /*
    Narxlar suratdagi praysdan ko‘chirildi.
    standard = faqat demo uchun min/max oralig‘ining o‘rtachasi.
    Oq-qora chop etishda asl praysda 101–200 oralig‘i bo‘yicha uzilish bor.
    Demo versiyada 11–100 oralig‘i vaqtincha 200 gacha kengaytirildi.
  */
  const PRICE_DATA = {
    color: {
      A6: { size: "105×148 mm", tiers: [[1,10,1620,2430],[11,50,1215,2025],[51,200,980,1620],[201,500,855,1350],[501,1000,720,1125]] },
      A5: { size: "148×210 mm", tiers: [[1,10,2430,4050],[11,50,2025,3240],[51,200,1620,2835],[201,500,1395,2250],[501,1000,1170,1845]] },
      A4: { size: "210×297 mm", tiers: [[1,10,4050,6480],[11,50,3240,4860],[51,200,2835,4050],[201,500,2430,3420],[501,1000,2070,2790]] },
      A3: { size: "297×420 mm", tiers: [[1,10,8100,12150],[11,50,6480,9720],[51,200,5670,8100],[201,500,4860,6930],[501,1000,4140,5760]] },
      SRA3: { size: "320×450 mm", tiers: [[1,10,9720,14580],[11,50,8100,12150],[51,200,7290,10530],[201,500,6210,8910],[501,1000,5310,7290]] }
    },
    bw: {
      A5: { size: "148×210 mm", tiers: [[1,10,567,810],[11,200,405,567],[201,500,342,486],[501,1000,288,405]] },
      A4: { size: "210×297 mm", tiers: [[1,10,810,1215],[11,200,567,810],[201,500,486,648],[501,1000,405,567]] },
      A3: { size: "297×420 mm", tiers: [[1,10,1620,2430],[11,200,1215,1890],[201,500,990,1620],[501,1000,810,1215]] }
    }
  };

  const els = {};
  let settings = loadSettings();
  let state = {
    printType: "color",
    format: "A4",
    items: [],
    savedOrderNo: null,
    savedOrderId: null,
    savedOrderCreatedAt: null
  };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    bindNavigation();
    bindCalculator();
    bindReceipt();
    bindSettings();
    bindModal();
    startClock();
    renderFormats();
    hydrateSettingsUI();
    updateAddonLabels();
    calculatePreview();
    renderReceipt();
    renderOrders();
    renderClients();
    loadDraft();
  }

  function cacheElements() {
    [
      "pageTitle","pageSubtitle","clock","newOrderTop","printTypeGroup","formatGroup","quantity","paperWeight",
      "priceMode","customUnitPrice","qtyMinus","qtyPlus","duplex","denseFill","rush","cutting","creasing",
      "lamination","colorMatch","duplexLabel","denseLabel","rushLabel","cuttingLabel","creasingLabel",
      "laminationLabel","colorMatchLabel","tierBadge","previewBase","previewAddons","previewTotal","addItem",
      "customerName","customerPhone","paymentMethod","paymentComment","orderNote","draftOrderNo","receiptDate",
      "receiptCustomer","receiptItems","discountType","discountValue","paidAmount","subtotal","discountAmount",
      "grandTotal","paidTotal","balance","payrollText","utilitiesText","otherText","internalRevenue",
      "internalPayroll","internalUtilities","internalOther","internalProfit","internalMargin","barcodeWrap",
      "barcode","barcodeText","clearOrder","printOrder","saveOrder","orderSearch","ordersTableBody",
      "clientsTableBody","settingPayroll","settingUtilities","settingOther","settingDuplex","settingDense",
      "settingRush","settingCutting","settingCreasing","settingColorMatch","settingLamA4","settingLamA3",
      "resetSettings","saveSettings","toast","orderModal","modalTitle","modalBody","modalActions","closeModal"
    ].forEach(id => els[id] = document.getElementById(id));
  }

  function bindNavigation() {
    document.querySelectorAll(".nav-btn").forEach(btn => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });
    els.newOrderTop.addEventListener("click", () => {
      switchView("calculator");
      resetOrder(false);
    });
  }

  function switchView(view) {
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.getElementById(`view-${view}`).classList.add("active");

    const titles = {
      calculator: ["Yangi buyurtma", "Poligrafiya narxini tez hisoblash"],
      orders: ["Buyurtmalar", "Buyurtmalar va saqlangan cheklar tarixi"],
      clients: ["Mijozlar", "Mijozlar bazasi bo‘yicha ma’lumot"],
      settings: ["Sozlamalar", "Hisoblashning sinov parametrlari"]
    };
    els.pageTitle.textContent = titles[view][0];
    els.pageSubtitle.textContent = titles[view][1];

    if (view === "orders") renderOrders();
    if (view === "clients") renderClients();
  }

  function bindCalculator() {
    els.printTypeGroup.querySelectorAll(".seg-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        state.printType = btn.dataset.value;
        els.printTypeGroup.querySelectorAll(".seg-btn").forEach(b => b.classList.toggle("active", b === btn));
        if (!PRICE_DATA[state.printType][state.format]) {
          state.format = Object.keys(PRICE_DATA[state.printType])[0];
        }
        renderFormats();
        calculatePreview();
      });
    });

    els.qtyMinus.addEventListener("click", () => {
      els.quantity.value = Math.max(1, Number(els.quantity.value || 1) - 1);
      calculatePreview();
    });

    els.qtyPlus.addEventListener("click", () => {
      els.quantity.value = Math.max(1, Number(els.quantity.value || 0) + 1);
      calculatePreview();
    });

    [
      els.quantity, els.paperWeight, els.priceMode, els.customUnitPrice,
      els.duplex, els.denseFill, els.rush, els.cutting, els.creasing,
      els.lamination, els.colorMatch
    ].forEach(el => el.addEventListener("input", calculatePreview));

    els.addItem.addEventListener("click", addCurrentItem);

    [els.customerName, els.customerPhone, els.paymentMethod, els.paymentComment, els.orderNote].forEach(el => {
      el.addEventListener("input", () => {
        renderReceipt();
        saveDraft();
      });
    });
  }

  function renderFormats() {
    const formats = PRICE_DATA[state.printType];
    els.formatGroup.innerHTML = "";
    Object.entries(formats).forEach(([code, data]) => {
      const btn = document.createElement("button");
      btn.className = `format-btn ${state.format === code ? "active" : ""}`;
      btn.innerHTML = `<strong>${code}</strong><span>${data.size}</span>`;
      btn.addEventListener("click", () => {
        state.format = code;
        renderFormats();
        calculatePreview();
      });
      els.formatGroup.appendChild(btn);
    });
  }

  function findTier() {
    const qty = Math.max(1, Number(els.quantity.value || 1));
    const tiers = PRICE_DATA[state.printType][state.format].tiers;
    const tier = tiers.find(t => qty >= t[0] && qty <= t[1]);
    return { qty, tier };
  }

  function unitPriceForTier(tier) {
    const custom = Number(els.customUnitPrice.value);
    if (els.customUnitPrice.value !== "" && custom >= 0) return custom;
    if (!tier) return null;
    const [, , min, max] = tier;
    if (els.priceMode.value === "min") return min;
    if (els.priceMode.value === "max") return max;
    return Math.round((min + max) / 2);
  }

  function calculateCurrentItem() {
    const { qty, tier } = findTier();
    const unit = unitPriceForTier(tier);

    if (unit === null) {
      return {
        valid: false, qty, tier: null, unit: 0, base: 0, addons: [], addonsTotal: 0, total: 0,
        message: qty > 1000 ? "1000 donadan boshlab — kelishilgan narx" : "Bu miqdor uchun tarif yo‘q"
      };
    }

    const base = unit * qty;
    const addons = [];
    let running = base;

    const addPercent = (enabled, name, pct) => {
      if (!enabled) return;
      const amount = Math.round(running * pct / 100);
      running += amount;
      addons.push({ name, calc: `+${pct}%`, amount });
    };

    addPercent(els.duplex.checked, "Ikki tomonlama chop etish", settings.duplexPct);
    addPercent(els.denseFill.checked, "To‘liq rangli qoplama", settings.densePct);
    addPercent(els.rush.checked, "Shoshilinch buyurtma", settings.rushPct);

    if (els.cutting.checked) {
      const amount = settings.cuttingPerSheet * qty;
      running += amount;
      addons.push({ name: "Kesish", calc: `${money(settings.cuttingPerSheet)}/varaq`, amount });
    }

    if (els.creasing.checked) {
      const amount = settings.creasingPerLine * qty;
      running += amount;
      addons.push({ name: "Bigovka", calc: `${money(settings.creasingPerLine)}/chiziq`, amount });
    }

    if (els.lamination.checked) {
      let perUnit = 0;
      if (state.format === "A4") perUnit = settings.laminationA4;
      else if (state.format === "A3") perUnit = settings.laminationA3;
      else if (state.format === "A5") perUnit = Math.round(settings.laminationA4 / 2);
      else if (state.format === "A6") perUnit = Math.round(settings.laminationA4 / 4);
      else if (state.format === "SRA3") perUnit = settings.laminationA3;
      const amount = perUnit * qty;
      running += amount;
      addons.push({ name: "Laminatsiya", calc: `${money(perUnit)}/dona`, amount });
    }

    if (els.colorMatch.checked) {
      const amount = settings.colorMatch;
      running += amount;
      addons.push({ name: "Rang tanlash", calc: "qat’iy", amount });
    }

    return {
      valid: true,
      qty,
      tier,
      unit,
      base,
      addons,
      addonsTotal: running - base,
      total: running
    };
  }

  function calculatePreview() {
    const calc = calculateCurrentItem();
    if (!calc.valid) {
      els.tierBadge.textContent = calc.message;
      els.tierBadge.style.background = "#fff0f0";
      els.tierBadge.style.color = "#a72e2e";
      els.previewBase.textContent = "—";
      els.previewAddons.textContent = "—";
      els.previewTotal.textContent = "Qo‘lda narx kiritish kerak";
      return;
    }

    els.tierBadge.style.background = "";
    els.tierBadge.style.color = "";
    els.tierBadge.textContent = `${calc.tier[0]}–${calc.tier[1]} dona • ${money(calc.unit)}/dona`;
    els.previewBase.textContent = money(calc.base);
    els.previewAddons.textContent = money(calc.addonsTotal);
    els.previewTotal.textContent = money(calc.total);
  }

  function addCurrentItem() {
    const calc = calculateCurrentItem();
    if (!calc.valid) {
      showToast("Kelishilgan tiraj uchun bir dona narxini qo‘lda kiriting.");
      els.customUnitPrice.focus();
      return;
    }

    const item = {
      id: cryptoRandomId(),
      printType: state.printType,
      format: state.format,
      size: PRICE_DATA[state.printType][state.format].size,
      paperWeight: els.paperWeight.value,
      qty: calc.qty,
      unit: calc.unit,
      base: calc.base,
      addons: calc.addons,
      total: calc.total,
      createdAt: new Date().toISOString()
    };

    state.items.push(item);
    state.savedOrderNo = null;
    state.savedOrderId = null;
    state.savedOrderCreatedAt = null;
    renderReceipt();
    saveDraft();
    showToast("Pozitsiya buyurtmaga qo‘shildi.");
  }

  function bindReceipt() {
    [els.discountType, els.discountValue, els.paidAmount].forEach(el => {
      el.addEventListener("input", () => {
        renderReceipt();
        saveDraft();
      });
    });

    els.clearOrder.addEventListener("click", () => resetOrder(true));

    // MUHIM: endi faqat chekni o‘z ichiga olgan alohida HTML hujjat chop etiladi.
    els.printOrder.addEventListener("click", () => {
      if (!state.items.length) return showToast("Kamida bitta pozitsiya qo‘shing.");

      if (state.savedOrderId) {
        const order = loadOrders().find(o => o.id === state.savedOrderId);
        if (order) return printSavedReceipt(order);
      }

      // Qoralamani ham alohida chop etish mumkin, lekin raqami "Qoralama" bo‘ladi.
      const receipt = buildCurrentReceiptSnapshot({
        orderNo: state.savedOrderNo || "Qoralama",
        createdAt: state.savedOrderCreatedAt || new Date().toISOString()
      });
      printReceiptDocument(receipt);
    });

    els.saveOrder.addEventListener("click", saveOrder);
  }

  function orderTotals() {
    const subtotal = state.items.reduce((sum, item) => sum + item.total, 0);
    const type = els.discountType.value;
    const value = Math.max(0, Number(els.discountValue.value || 0));
    let discount = 0;

    if (type === "percent") discount = Math.round(subtotal * clamp(value, 0, 100) / 100);
    if (type === "fixed") discount = Math.min(value, subtotal);

    const total = Math.max(0, subtotal - discount);
    const paid = Math.max(0, Number(els.paidAmount.value || 0));
    const balance = Math.max(0, total - paid);

    const payroll = Math.round(total * settings.payrollPct / 100);
    const utilities = Math.round(total * settings.utilitiesPct / 100);
    const other = Math.round(total * settings.otherPct / 100);
    const profit = total - payroll - utilities - other;
    const margin = total > 0 ? profit / total * 100 : 0;

    return { subtotal, discount, total, paid, balance, payroll, utilities, other, profit, margin };
  }

  function renderReceipt() {
    const now = state.savedOrderCreatedAt ? new Date(state.savedOrderCreatedAt) : new Date();
    els.receiptDate.textContent = now.toLocaleString("ru-RU", {
      day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"
    });
    els.receiptCustomer.textContent = els.customerName.value.trim() || "Mijozsiz";
    els.draftOrderNo.textContent = state.savedOrderNo || "Qoralama";

    if (!state.items.length) {
      els.receiptItems.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">▤</div>
          <strong>Buyurtma hozircha bo‘sh</strong>
          <span>Chap tomondan birinchi pozitsiyani qo‘shing.</span>
        </div>`;
    } else {
      els.receiptItems.innerHTML = state.items.map(item => `
        <div class="receipt-item">
          <div class="receipt-item-top">
            <strong>${item.printType === "color" ? "Rangli" : "Oq-qora"} chop etish ${escapeHtml(item.format)} × ${item.qty}</strong>
            <strong class="receipt-item-price">${money(item.total)}</strong>
          </div>
          <div class="receipt-item-meta">
            ${money(item.unit)}/dona • ${escapeHtml(item.paperWeight)}<br>
            ${item.addons.length ? item.addons.map(a => `${escapeHtml(a.name)} ${escapeHtml(a.calc)}`).join(" • ") : "Qo‘shimcha xizmatlarsiz"}
          </div>
          <div class="receipt-item-actions">
            <button class="link-btn" data-remove="${item.id}">O‘chirish</button>
          </div>
        </div>
      `).join("");

      els.receiptItems.querySelectorAll("[data-remove]").forEach(btn => {
        btn.addEventListener("click", () => {
          state.items = state.items.filter(i => i.id !== btn.dataset.remove);
          state.savedOrderNo = null;
          state.savedOrderId = null;
          state.savedOrderCreatedAt = null;
          renderReceipt();
          saveDraft();
        });
      });
    }

    const t = orderTotals();
    els.subtotal.textContent = money(t.subtotal);
    els.discountAmount.textContent = `− ${money(t.discount)}`;
    els.grandTotal.textContent = money(t.total);
    els.paidTotal.textContent = money(t.paid);
    els.balance.textContent = money(t.balance);

    els.payrollText.textContent = `Xodimlar (${settings.payrollPct}%)`;
    els.utilitiesText.textContent = `Kommunal xarajatlar (${settings.utilitiesPct}%)`;
    els.otherText.textContent = `Boshqa xarajatlar (${settings.otherPct}%)`;
    els.internalRevenue.textContent = money(t.total);
    els.internalPayroll.textContent = `− ${money(t.payroll)}`;
    els.internalUtilities.textContent = `− ${money(t.utilities)}`;
    els.internalOther.textContent = `− ${money(t.other)}`;
    els.internalProfit.textContent = money(t.profit);
    els.internalMargin.textContent = `${t.margin.toFixed(1)}%`;

    if (state.savedOrderNo) {
      els.barcodeWrap.classList.remove("hidden");
      els.barcodeText.textContent = state.savedOrderNo;
      drawCode39(els.barcode, state.savedOrderNo);
    } else {
      els.barcodeWrap.classList.add("hidden");
    }
  }

  function buildCurrentReceiptSnapshot({ orderNo, createdAt }) {
    const totals = orderTotals();

    return {
      version: 2,
      orderNo,
      createdAt,
      company: {
        name: "MEZON PRINT"
      },
      customer: {
        name: els.customerName.value.trim(),
        phone: els.customerPhone.value.trim()
      },
      payment: {
        method: els.paymentMethod.value,
        methodLabel: PAYMENT_LABELS[els.paymentMethod.value] || els.paymentMethod.value,
        comment: els.paymentComment.value.trim(),
        paid: totals.paid,
        balance: totals.balance
      },
      discount: {
        type: els.discountType.value,
        value: Number(els.discountValue.value || 0),
        amount: totals.discount
      },
      note: els.orderNote.value.trim(),
      items: JSON.parse(JSON.stringify(state.items)),
      totals: JSON.parse(JSON.stringify(totals))
    };
  }

  function saveOrder() {
    if (!state.items.length) return showToast("Buyurtma bo‘sh.");

    const orders = loadOrders();
    const sequence = Number(localStorage.getItem("mezon_sequence") || 0) + 1;
    localStorage.setItem("mezon_sequence", String(sequence));

    const year = new Date().getFullYear();
    const orderNo = `${year}-${String(sequence).padStart(6, "0")}`;
    const createdAt = new Date().toISOString();
    const receiptSnapshot = buildCurrentReceiptSnapshot({ orderNo, createdAt });

    const order = {
      id: cryptoRandomId(),
      orderNo,
      createdAt,

      customer: JSON.parse(JSON.stringify(receiptSnapshot.customer)),
      note: receiptSnapshot.note,
      items: JSON.parse(JSON.stringify(receiptSnapshot.items)),

      discountType: receiptSnapshot.discount.type,
      discountValue: receiptSnapshot.discount.value,

      paidAmount: receiptSnapshot.payment.paid,
      paymentMethod: receiptSnapshot.payment.method,
      paymentMethodLabel: receiptSnapshot.payment.methodLabel,
      paymentComment: receiptSnapshot.payment.comment,

      totals: JSON.parse(JSON.stringify(receiptSnapshot.totals)),
      settingsSnapshot: { ...settings },

      // ASOSIY YAXSHILANISH:
      // to‘liq chek buyurtma bilan birga snapshot sifatida saqlanadi.
      // Keyinchalik prays yoki sozlamalar o‘zgarsa ham eski chek o‘zgarmaydi.
      receiptSnapshot
    };

    orders.unshift(order);
    localStorage.setItem("mezon_orders", JSON.stringify(orders));

    state.savedOrderNo = orderNo;
    state.savedOrderId = order.id;
    state.savedOrderCreatedAt = createdAt;

    localStorage.removeItem("mezon_draft");
    renderReceipt();
    renderOrders();
    renderClients();
    showToast(`Buyurtma ${orderNo} va uning cheki saqlandi.`);
  }

  function resetOrder(confirmClear) {
    if (confirmClear && state.items.length && !confirm("Joriy buyurtmani tozalaysizmi?")) return;

    state.items = [];
    state.savedOrderNo = null;
    state.savedOrderId = null;
    state.savedOrderCreatedAt = null;

    els.customerName.value = "";
    els.customerPhone.value = "";
    els.paymentMethod.value = "cash";
    els.paymentComment.value = "";
    els.orderNote.value = "";
    els.discountType.value = "none";
    els.discountValue.value = "0";
    els.paidAmount.value = "0";

    localStorage.removeItem("mezon_draft");
    renderReceipt();
  }

  function saveDraft() {
    if (state.savedOrderNo) return;

    const draft = {
      items: state.items,
      customerName: els.customerName.value,
      customerPhone: els.customerPhone.value,
      paymentMethod: els.paymentMethod.value,
      paymentComment: els.paymentComment.value,
      note: els.orderNote.value,
      discountType: els.discountType.value,
      discountValue: els.discountValue.value,
      paidAmount: els.paidAmount.value
    };

    localStorage.setItem("mezon_draft", JSON.stringify(draft));
  }

  function loadDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem("mezon_draft") || "null");
      if (!draft) return;

      state.items = Array.isArray(draft.items) ? draft.items : [];
      els.customerName.value = draft.customerName || "";
      els.customerPhone.value = draft.customerPhone || "";
      els.paymentMethod.value = draft.paymentMethod || "cash";
      els.paymentComment.value = draft.paymentComment || "";
      els.orderNote.value = draft.note || "";
      els.discountType.value = draft.discountType || "none";
      els.discountValue.value = draft.discountValue || "0";
      els.paidAmount.value = draft.paidAmount || "0";

      renderReceipt();
      if (state.items.length) showToast("Tugallanmagan qoralama tiklandi.");
    } catch (_) {}
  }

  function loadOrders() {
    try {
      return JSON.parse(localStorage.getItem("mezon_orders") || "[]");
    } catch (_) {
      return [];
    }
  }

  function normalizeOrderReceipt(order) {
    if (order.receiptSnapshot) return order.receiptSnapshot;

    // Demo birinchi versiyasidagi buyurtmalar bilan moslik.
    return {
      version: 1,
      orderNo: order.orderNo,
      createdAt: order.createdAt,
      company: { name: "MEZON PRINT" },
      customer: {
        name: order.customer?.name || "",
        phone: order.customer?.phone || ""
      },
      payment: {
        method: order.paymentMethod || "cash",
        methodLabel: order.paymentMethodLabel || PAYMENT_LABELS[order.paymentMethod] || "Ko‘rsatilmagan",
        comment: order.paymentComment || "",
        paid: order.totals?.paid ?? order.paidAmount ?? 0,
        balance: order.totals?.balance ?? 0
      },
      discount: {
        type: order.discountType || "none",
        value: Number(order.discountValue || 0),
        amount: order.totals?.discount || 0
      },
      note: order.note || "",
      items: order.items || [],
      totals: order.totals || {
        subtotal: 0, discount: 0, total: 0, paid: 0, balance: 0
      }
    };
  }

  function renderOrders() {
    const q = (els.orderSearch?.value || "").trim().toLowerCase();
    const orders = loadOrders().filter(o => {
      const hay = `${o.orderNo} ${o.customer?.name || ""} ${o.customer?.phone || ""} ${o.paymentMethodLabel || ""}`.toLowerCase();
      return hay.includes(q);
    });

    if (!orders.length) {
      els.ordersTableBody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#888;padding:28px">Saqlangan buyurtmalar yo‘q.</td></tr>`;
      return;
    }

    els.ordersTableBody.innerHTML = orders.map(o => {
      const receipt = normalizeOrderReceipt(o);
      return `
        <tr>
          <td><strong>${escapeHtml(o.orderNo)}</strong></td>
          <td>${new Date(o.createdAt).toLocaleString("ru-RU")}</td>
          <td>${escapeHtml(o.customer?.name || "Mijozsiz")}<br><small>${escapeHtml(o.customer?.phone || "")}</small></td>
          <td>${o.items.length}</td>
          <td><strong>${money(o.totals.total)}</strong></td>
          <td>${money(o.totals.paid)}</td>
          <td>${money(o.totals.balance)}</td>
          <td>${escapeHtml(receipt.payment.methodLabel || "—")}</td>
          <td>
            <button class="table-action" data-view-order="${o.id}">Ochish</button>
            <button class="table-action primary" data-print-order="${o.id}">Chekni chop etish</button>
          </td>
        </tr>
      `;
    }).join("");

    els.ordersTableBody.querySelectorAll("[data-view-order]").forEach(btn => {
      btn.addEventListener("click", () => openSavedOrder(btn.dataset.viewOrder));
    });

    els.ordersTableBody.querySelectorAll("[data-print-order]").forEach(btn => {
      btn.addEventListener("click", () => {
        const order = loadOrders().find(o => o.id === btn.dataset.printOrder);
        if (order) printSavedReceipt(order);
      });
    });
  }

  function renderClients() {
    const map = new Map();

    loadOrders().forEach(o => {
      const name = (o.customer?.name || "").trim();
      const phone = (o.customer?.phone || "").trim();
      if (!name && !phone) return;

      const key = phone || name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: name || "Ismsiz",
          phone,
          orders: 0,
          revenue: 0,
          debt: 0
        });
      }

      const c = map.get(key);
      c.orders += 1;
      c.revenue += o.totals.total;
      c.debt += o.totals.balance;
    });

    const clients = [...map.values()].sort((a,b) => b.revenue - a.revenue);

    els.clientsTableBody.innerHTML = clients.length
      ? clients.map(c => `
          <tr>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td>${escapeHtml(c.phone || "—")}</td>
            <td>${c.orders}</td>
            <td>${money(c.revenue)}</td>
            <td>${money(c.debt)}</td>
          </tr>
        `).join("")
      : `<tr><td colspan="5" style="text-align:center;color:#888;padding:28px">Hozircha mijozlar yo‘q.</td></tr>`;
  }

  function openSavedOrder(id) {
    const order = loadOrders().find(o => o.id === id);
    if (!order) return;

    const receipt = normalizeOrderReceipt(order);

    els.modalTitle.textContent = `Buyurtma ${order.orderNo}`;
    els.modalBody.innerHTML = `
      <div class="modal-order-grid">
        <div class="box"><span>Mijoz</span><strong>${escapeHtml(receipt.customer.name || "Mijozsiz")}</strong></div>
        <div class="box"><span>Telefon</span><strong>${escapeHtml(receipt.customer.phone || "—")}</strong></div>
        <div class="box"><span>Jami</span><strong>${money(receipt.totals.total)}</strong></div>
        <div class="box"><span>Qoldiq</span><strong>${money(receipt.totals.balance)}</strong></div>
        <div class="box"><span>To‘langan</span><strong>${money(receipt.totals.paid)}</strong></div>
        <div class="box"><span>To‘lov usuli</span><strong>${escapeHtml(receipt.payment.methodLabel || "—")}</strong></div>
      </div>

      <div class="receipt-preview">
        <h3>Saqlangan chek</h3>
        <div class="receipt-preview-row"><span>Sana</span><strong>${new Date(receipt.createdAt).toLocaleString("ru-RU")}</strong></div>
        ${receipt.items.map(i => `
          <div class="receipt-preview-row">
            <span>${i.printType === "color" ? "Rangli" : "Oq-qora"} ${escapeHtml(i.format)} × ${i.qty}</span>
            <strong>${money(i.total)}</strong>
          </div>
        `).join("")}
        <div class="receipt-preview-row"><span>Oraliq jami</span><strong>${money(receipt.totals.subtotal)}</strong></div>
        <div class="receipt-preview-row"><span>Chegirma</span><strong>− ${money(receipt.totals.discount)}</strong></div>
        <div class="receipt-preview-row total"><span>JAMI</span><strong>${money(receipt.totals.total)}</strong></div>
        <div class="receipt-preview-row"><span>To‘langan</span><strong>${money(receipt.totals.paid)}</strong></div>
        <div class="receipt-preview-row"><span>Qoldiq</span><strong>${money(receipt.totals.balance)}</strong></div>
        ${receipt.payment.comment ? `<div class="receipt-preview-note"><strong>To‘lov:</strong> ${escapeHtml(receipt.payment.comment)}</div>` : ""}
        ${receipt.note ? `<div class="receipt-preview-note"><strong>Izoh:</strong> ${escapeHtml(receipt.note)}</div>` : ""}
      </div>
    `;

    els.modalActions.innerHTML = `
      <button class="secondary-btn" data-close-modal>Yopish</button>
      <button class="primary-btn" data-modal-print="${order.id}">Chekni chop etish</button>
    `;

    els.modalActions.querySelector("[data-close-modal]").addEventListener("click", () => {
      els.orderModal.classList.add("hidden");
    });

    els.modalActions.querySelector("[data-modal-print]").addEventListener("click", () => {
      printSavedReceipt(order);
    });

    els.orderModal.classList.remove("hidden");
  }

  function printSavedReceipt(order) {
    const receipt = normalizeOrderReceipt(order);
    printReceiptDocument(receipt);
  }

  /*
    Faqat chekni chop etish:
    dastur interfeysi YO‘Q bo‘lgan alohida vaqtinchalik oyna yaratiladi —
    faqat 80 mm chek. Shuning uchun printer butun sahifani emas, aynan chekni oladi.
  */
  function printReceiptDocument(receipt) {
    const printWindow = window.open("", "_blank", "width=460,height=760");

    if (!printWindow) {
      showToast("Brauzer chop etish oynasini blokladi. Ushbu sahifa uchun qalqib chiquvchi oynalarga ruxsat bering.");
      return;
    }

    const barcodeSvg = code39SvgMarkup(receipt.orderNo);
    const itemsHtml = receipt.items.map(item => `
      <div class="item">
        <div class="row main">
          <span>${item.printType === "color" ? "Rangli" : "Oq-qora"} chop etish ${escapeHtml(item.format)} × ${item.qty}</span>
          <strong>${money(item.total)}</strong>
        </div>
        <div class="meta">${money(item.unit)}/dona • ${escapeHtml(item.paperWeight || "")}</div>
        ${item.addons?.length ? `<div class="meta">${item.addons.map(a => `${escapeHtml(a.name)} ${escapeHtml(a.calc || "")}`).join(" • ")}</div>` : ""}
      </div>
    `).join("");

    const paymentLabel = receipt.payment?.methodLabel || PAYMENT_LABELS[receipt.payment?.method] || "—";

    const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<title>Chek ${escapeHtml(receipt.orderNo)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #111; }
  body { font-family: Arial, Helvetica, sans-serif; }
  .receipt { width: 80mm; padding: 4mm 4mm 6mm; margin: 0 auto; }
  .brand { text-align: center; font-size: 18px; font-weight: 900; letter-spacing: .08em; margin-bottom: 2mm; }
  .sub { text-align: center; font-size: 10px; margin-bottom: 3mm; }
  .line { border-top: 1px dashed #111; margin: 2mm 0; }
  .row { display: flex; justify-content: space-between; gap: 3mm; font-size: 10px; padding: .8mm 0; }
  .row span:first-child { flex: 1; }
  .row strong { white-space: nowrap; }
  .item { padding: 1.5mm 0; border-bottom: 1px dashed #bbb; }
  .item .main { font-size: 10px; }
  .meta { color: #444; font-size: 8.5px; line-height: 1.35; }
  .total { font-size: 14px; font-weight: 900; padding: 2mm 0; }
  .muted { color: #555; }
  .note { margin-top: 2mm; font-size: 9px; line-height: 1.4; }
  .barcode { text-align: center; margin-top: 3mm; }
  .barcode svg { width: 68mm; height: 16mm; display: block; margin: 0 auto; }
  .barcode-text { font: 9px monospace; letter-spacing: .12em; margin-top: 1mm; }
  .footer { text-align: center; margin-top: 4mm; font-size: 9px; }
  @media print {
    html, body { width: 80mm; }
    .receipt { width: 80mm; }
  }
</style>
</head>
<body>
  <div class="receipt">
    <div class="brand">${escapeHtml(receipt.company?.name || "MEZON PRINT")}</div>
    <div class="sub">BUYURTMA / CHEK № ${escapeHtml(receipt.orderNo)}</div>

    <div class="line"></div>
    <div class="row"><span>Sana</span><strong>${new Date(receipt.createdAt).toLocaleString("ru-RU")}</strong></div>
    <div class="row"><span>Mijoz</span><strong>${escapeHtml(receipt.customer?.name || "Mijozsiz")}</strong></div>
    ${receipt.customer?.phone ? `<div class="row"><span>Telefon</span><strong>${escapeHtml(receipt.customer.phone)}</strong></div>` : ""}
    <div class="line"></div>

    ${itemsHtml}

    <div class="line"></div>
    <div class="row"><span>Oraliq jami</span><strong>${money(receipt.totals.subtotal)}</strong></div>
    <div class="row"><span>Chegirma</span><strong>− ${money(receipt.totals.discount)}</strong></div>
    <div class="row total"><span>JAMI</span><strong>${money(receipt.totals.total)}</strong></div>
    <div class="row"><span>To‘langan</span><strong>${money(receipt.totals.paid)}</strong></div>
    <div class="row"><span>Qoldiq</span><strong>${money(receipt.totals.balance)}</strong></div>

    <div class="line"></div>
    <div class="row"><span>To‘lov usuli</span><strong>${escapeHtml(paymentLabel)}</strong></div>
    ${receipt.payment?.comment ? `<div class="note"><strong>To‘lov:</strong> ${escapeHtml(receipt.payment.comment)}</div>` : ""}
    ${receipt.note ? `<div class="note"><strong>Izoh:</strong> ${escapeHtml(receipt.note)}</div>` : ""}

    <div class="barcode">
      ${barcodeSvg}
      <div class="barcode-text">${escapeHtml(receipt.orderNo)}</div>
    </div>

    <div class="footer">MEZON PRINT</div>
  </div>

  <script>
    window.addEventListener("load", function () {
      setTimeout(function () {
        window.focus();
        window.print();
      }, 150);
    });

    window.addEventListener("afterprint", function () {
      window.close();
    });
  <\/script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  function bindModal() {
    els.closeModal.addEventListener("click", () => els.orderModal.classList.add("hidden"));
    els.orderModal.addEventListener("click", e => {
      if (e.target === els.orderModal) els.orderModal.classList.add("hidden");
    });
  }

  function bindSettings() {
    els.saveSettings.addEventListener("click", () => {
      settings = {
        payrollPct: num(els.settingPayroll, 0),
        utilitiesPct: num(els.settingUtilities, 0),
        otherPct: num(els.settingOther, 0),
        duplexPct: num(els.settingDuplex, 0),
        densePct: num(els.settingDense, 0),
        rushPct: num(els.settingRush, 0),
        cuttingPerSheet: num(els.settingCutting, 0),
        creasingPerLine: num(els.settingCreasing, 0),
        colorMatch: num(els.settingColorMatch, 0),
        laminationA4: num(els.settingLamA4, 0),
        laminationA3: num(els.settingLamA3, 0)
      };

      localStorage.setItem("mezon_settings", JSON.stringify(settings));
      updateAddonLabels();
      calculatePreview();
      renderReceipt();
      showToast("Sozlamalar saqlandi.");
    });

    els.resetSettings.addEventListener("click", () => {
      settings = { ...DEFAULT_SETTINGS };
      localStorage.setItem("mezon_settings", JSON.stringify(settings));
      hydrateSettingsUI();
      updateAddonLabels();
      calculatePreview();
      renderReceipt();
      showToast("Sozlamalar qayta o‘rnatildi.");
    });

    els.orderSearch.addEventListener("input", renderOrders);
  }

  function hydrateSettingsUI() {
    els.settingPayroll.value = settings.payrollPct;
    els.settingUtilities.value = settings.utilitiesPct;
    els.settingOther.value = settings.otherPct;
    els.settingDuplex.value = settings.duplexPct;
    els.settingDense.value = settings.densePct;
    els.settingRush.value = settings.rushPct;
    els.settingCutting.value = settings.cuttingPerSheet;
    els.settingCreasing.value = settings.creasingPerLine;
    els.settingColorMatch.value = settings.colorMatch;
    els.settingLamA4.value = settings.laminationA4;
    els.settingLamA3.value = settings.laminationA3;
  }

  function updateAddonLabels() {
    els.duplexLabel.textContent = `+${settings.duplexPct}%`;
    els.denseLabel.textContent = `+${settings.densePct}%`;
    els.rushLabel.textContent = `+${settings.rushPct}%`;
    els.cuttingLabel.textContent = `${money(settings.cuttingPerSheet)}/varaq`;
    els.creasingLabel.textContent = `${money(settings.creasingPerLine)}/chiziq`;
    els.colorMatchLabel.textContent = money(settings.colorMatch);
    els.laminationLabel.textContent = `A4 ${money(settings.laminationA4)} • A3 ${money(settings.laminationA3)}`;
  }

  function loadSettings() {
    try {
      return {
        ...DEFAULT_SETTINGS,
        ...JSON.parse(localStorage.getItem("mezon_settings") || "{}")
      };
    } catch (_) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function num(el, fallback = 0) {
    const n = Number(el.value);
    return Number.isFinite(n) ? Math.max(0, n) : fallback;
  }

  function startClock() {
    const tick = () => {
      els.clock.textContent = new Date().toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    };

    tick();
    setInterval(tick, 30000);
  }

  function showToast(text) {
    els.toast.textContent = text;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), 2400);
  }

  function cryptoRandomId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(str) {
    return String(str ?? "").replace(/[&<>"']/g, s => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[s]));
  }

  /*
    Code 39:
    buyurtma raqami uchun raqamlar va defis yetarli.
  */
  const CODE39 = {
    "0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn","4":"nnnwwnnnw",
    "5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw","8":"wnnwnnwnn","9":"nnwwnnwnn",
    "A":"wnnnnwnnw","B":"nnwnnwnnw","C":"wnwnnwnnn","D":"nnnnwwnnw","E":"wnnnwwnnn",
    "F":"nnwnwwnnn","G":"nnnnnwwnw","H":"wnnnnwwnn","I":"nnwnnwwnn","J":"nnnnwwwnn",
    "-":"nnnwnwnnw","*":"nwnnwnwnn"
  };

  function code39Bars(text) {
    const safe = `*${String(text).toUpperCase().replace(/[^0-9A-Z-]/g, "")}*`;
    const narrow = 2;
    const wide = 5;
    const gap = 2;
    let x = 0;
    const bars = [];

    for (const ch of safe) {
      const pattern = CODE39[ch] || CODE39["-"];

      pattern.split("").forEach((w, i) => {
        const width = w === "w" ? wide : narrow;
        if (i % 2 === 0) bars.push({ x, width });
        x += width;
      });

      x += gap;
    }

    return { width: x, bars };
  }

  function drawCode39(svg, text) {
    const data = code39Bars(text);
    svg.setAttribute("viewBox", `0 0 ${data.width} 54`);
    svg.innerHTML = data.bars
      .map(b => `<rect x="${b.x}" y="0" width="${b.width}" height="50" fill="#111"></rect>`)
      .join("");
  }

  function code39SvgMarkup(text) {
    const data = code39Bars(text);
    const rects = data.bars
      .map(b => `<rect x="${b.x}" y="0" width="${b.width}" height="50" fill="#111"></rect>`)
      .join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${data.width} 54" role="img" aria-label="Shtrix-kod">${rects}</svg>`;
  }
})();
