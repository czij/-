/* global supabase, SUPABASE_URL, SUPABASE_ANON_KEY */
const configured = !SUPABASE_URL.startsWith("YOUR_") && !SUPABASE_ANON_KEY.startsWith("YOUR_");
const db = configured ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let payments = [];
let recentChange = null;

const $ = (id) => document.getElementById(id);
const authPanel = $("auth-panel"); const app = $("payments-app");
const authMessage = $("auth-message"); const formMessage = $("form-message");

function dateParts(date) { return date.split("-").map(Number); }
function monthLabel(date) { const [year, month] = dateParts(date); return `${year}年${month}月`; }
function displayDate(date) { const [year, month, day] = dateParts(date); return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`; }
function formatAmount(amount, currency) {
  const number = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount));
  return `${currency === "CNY" ? "¥" : "$"}${number}`;
}
function directionLabel(direction) { return direction === "paid" ? "付款" : "收款"; }
function message(element, text = "", success = false) { element.textContent = text; element.classList.toggle("success", success); }
function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value || ""; return div.innerHTML; }
function toggleUsdEquivalent() { $("usd-equivalent-field").classList.toggle("hidden", $("currency").value !== "CNY"); }
function usdValue(payment) { return payment.currency === "USD" ? Number(payment.amount) : (Number(payment.usd_equivalent) || 0); }
function renderOutstanding(rows, visible) {
  const panel = $("outstanding-panel");
  panel.classList.toggle("hidden", !visible);
  if (!visible) return;
  const renderType = (type, dueId, outputId) => {
    const due = Number($(dueId).value) || 0;
    const paid = rows.filter((payment) => payment.payment_type === type).reduce((total, payment) => total + usdValue(payment), 0);
    const remaining = due - paid;
    $(outputId).innerHTML = `<span>已付 <strong>${formatAmount(paid, "USD")}</strong></span><span class="remaining ${remaining < 0 ? "overpaid" : ""}">${remaining < 0 ? "多付" : "未付"} <strong>${formatAmount(Math.abs(remaining), "USD")}</strong></span>`;
  };
  renderType("租金", "rent-due", "rent-outstanding");
  renderType("Utility", "utility-due", "utility-outstanding");
}

function resetForm() { $("payment-form").reset(); $("payment-form").classList.remove("is-editing"); $("payment-id").value = ""; $("form-title").textContent = "Add payment"; $("save-button").textContent = "Add"; $("cancel-edit-button").classList.add("hidden"); toggleUsdEquivalent(); message(formMessage); }
function refreshMonthFilter() {
  const filter = $("month-filter"); const selected = filter.value;
  const months = [...new Map(payments.map((p) => [p.payment_date.slice(0, 7), monthLabel(p.payment_date)])).entries()];
  filter.innerHTML = '<option value="all">All</option>' + months.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  filter.value = months.some(([value]) => value === selected) ? selected : "all";
}
function refreshNoteFilter() {
  const filter = $("note-filter"); const selected = filter.value;
  const selectedNote = selected === "all" ? "all" : decodeURIComponent(selected);
  const notes = [...new Set(payments.map((payment) => (payment.note || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  filter.innerHTML = '<option value="all">All notes</option>' + notes.map((note) => `<option value="${encodeURIComponent(note)}">${escapeHtml(note)}</option>`).join("");
  filter.value = notes.includes(selectedNote) ? encodeURIComponent(selectedNote) : "all";
}
function renderPayments() {
  const month = $("month-filter").value;
  const payer = $("payer-filter").value;
  const paymentType = $("payment-type-filter").value;
  const direction = $("direction-filter").value;
  const noteValue = $("note-filter").value;
  const note = noteValue === "all" ? "all" : decodeURIComponent(noteValue);
  const rows = payments.filter((p) =>
    (month === "all" || p.payment_date.startsWith(month)) &&
    (payer === "all" || p.payer === payer) &&
    (paymentType === "all" || p.payment_type === paymentType) &&
    (direction === "all" || p.transaction_direction === direction) &&
    (note === "all" || p.note === note)
  );
  const filtersActive = [month, payer, paymentType, direction, note].some((value) => value !== "all");
  const totals = rows.reduce((result, payment) => {
    result[payment.currency] = (result[payment.currency] || 0) + Number(payment.amount);
    result.usdEquivalent += Number(payment.usd_equivalent) || 0;
    return result;
  }, { USD: 0, CNY: 0, usdEquivalent: 0 });
  const body = $("payments-body");
  body.innerHTML = rows.length ? rows.map((p) => `<tr class="${recentChange && String(recentChange.id) === String(p.id) ? `row-${recentChange.type}` : ""}"><td>${monthLabel(p.payment_date)}</td><td>${escapeHtml(p.payer)}</td><td>${escapeHtml(p.payment_type)}</td><td>${directionLabel(p.transaction_direction)}</td><td>${formatAmount(p.amount, p.currency)}</td><td>${p.usd_equivalent === null || p.usd_equivalent === undefined ? "—" : formatAmount(p.usd_equivalent, "USD")}</td><td>${escapeHtml(p.note)}</td><td>${displayDate(p.payment_date)}</td><td><div class="row-actions"><button class="button secondary" type="button" data-edit="${p.id}">Edit</button><button class="button secondary danger" type="button" data-delete="${p.id}">Delete</button></div></td></tr>`).join("") : '<tr><td colspan="9">No payments found.</td></tr>';
  body.classList.remove("table-changing"); void body.offsetWidth; body.classList.add("table-changing");
  const totalRow = $("payments-total");
  totalRow.classList.toggle("hidden", !filtersActive);
  totalRow.innerHTML = filtersActive ? `<tr><td colspan="4">Total (filtered results)</td><td colspan="5"><span class="currency-total">USD ${formatAmount(totals.USD, "USD")}</span><span class="currency-total">CNY ${formatAmount(totals.CNY, "CNY")}</span><span class="currency-total">CNY as USD ${formatAmount(totals.usdEquivalent, "USD")}</span></td></tr>` : "";
  renderOutstanding(rows, filtersActive);
  if (recentChange) setTimeout(() => { recentChange = null; }, 900);
}
async function loadPayments() {
  const { data, error } = await db.from("payments").select("*").order("payment_date", { ascending: false }).order("id", { ascending: false });
  if (error) return message(formMessage, error.message);
  payments = data; refreshMonthFilter(); refreshNoteFilter(); renderPayments();
}
async function showSignedIn() { authPanel.classList.add("hidden"); app.classList.remove("hidden"); $("sign-out-button").classList.remove("hidden"); await loadPayments(); }

$("sign-in-form").addEventListener("submit", async (event) => { event.preventDefault(); message(authMessage, "Signing in…", true); const { error } = await db.auth.signInWithPassword({ email: $("login-email").value, password: $("login-password").value }); if (error) return message(authMessage, error.message); message(authMessage); await showSignedIn(); });
$("sign-out-button").addEventListener("click", async () => { await db.auth.signOut(); app.classList.add("hidden"); authPanel.classList.remove("hidden"); $("sign-out-button").classList.add("hidden"); resetForm(); });
$("payment-form").addEventListener("submit", async (event) => { event.preventDefault(); const id = $("payment-id").value; const record = { payer: $("payer").value.trim(), payment_type: $("payment-type").value.trim(), transaction_direction: $("transaction-direction").value, amount: $("amount").value, currency: $("currency").value, usd_equivalent: $("currency").value === "CNY" && $("usd-equivalent").value ? $("usd-equivalent").value : null, note: $("note").value.trim(), payment_date: $("payment-date").value }; const query = id ? db.from("payments").update(record).eq("id", id) : db.from("payments").insert(record).select("id").single(); const { data, error } = await query; if (error) return message(formMessage, error.message); recentChange = { id: id || data.id, type: id ? "edited" : "added" }; resetForm(); await loadPayments(); });
$("currency").addEventListener("change", toggleUsdEquivalent);
$("cancel-edit-button").addEventListener("click", resetForm);
["month-filter", "payer-filter", "payment-type-filter", "direction-filter", "note-filter"].forEach((id) => $(id).addEventListener("change", renderPayments));
$("rent-due").addEventListener("input", renderPayments);
$("utility-due").addEventListener("input", renderPayments);
$("payments-body").addEventListener("click", async (event) => { const id = event.target.dataset.edit || event.target.dataset.delete; if (!id) return; const payment = payments.find((item) => String(item.id) === id); if (event.target.dataset.edit) { $("payment-id").value = payment.id; $("payer").value = payment.payer; $("payment-type").value = payment.payment_type; $("transaction-direction").value = payment.transaction_direction || "received"; $("amount").value = payment.amount; $("currency").value = payment.currency; $("usd-equivalent").value = payment.usd_equivalent || ""; toggleUsdEquivalent(); $("note").value = payment.note || ""; $("payment-date").value = payment.payment_date; $("payment-form").classList.add("is-editing"); $("form-title").textContent = "Edit payment"; $("save-button").textContent = "Save changes"; $("cancel-edit-button").classList.remove("hidden"); $("payer").focus(); window.scrollTo({ top: 0, behavior: "smooth" }); } else if (window.confirm(`Delete payment from ${payment.payer}?`)) { event.target.closest("tr").classList.add("row-removing"); await new Promise((resolve) => setTimeout(resolve, 180)); const { error } = await db.from("payments").delete().eq("id", id); if (error) return message(formMessage, error.message); await loadPayments(); } });

if (!configured) { message(authMessage, "Configure SUPABASE_URL and SUPABASE_ANON_KEY in config.js first."); } else { db.auth.getSession().then(({ data: { session } }) => { if (session) showSignedIn(); }); }
