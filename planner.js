const plannerFields = ["rent-amount", "rent-currency", "utility-amount", "utility-currency"];
const plannerStorageKey = "payments-due-calculator";
const money = (amount, currency) => `${currency === "CNY" ? "¥" : "$"}${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;
const currentMonth = new Date().toISOString().slice(0, 7);
const storedPlans = JSON.parse(localStorage.getItem(plannerStorageKey) || "{}");
const byId = (id) => document.getElementById(id);

function loadMonth() {
  const plan = storedPlans[byId("due-month").value] || {};
  byId("rent-amount").value = plan.rentAmount || "";
  byId("rent-currency").value = plan.rentCurrency || "USD";
  byId("utility-amount").value = plan.utilityAmount || "";
  byId("utility-currency").value = plan.utilityCurrency || "USD";
  renderTotals();
}
function renderTotals() {
  const month = byId("due-month").value;
  const [year, monthNumber] = month.split("-");
  byId("due-title").textContent = month ? `${year}年${Number(monthNumber)}月待支付` : "待支付";
  const totals = { USD: 0, CNY: 0 };
  totals[byId("rent-currency").value] += Number(byId("rent-amount").value) || 0;
  totals[byId("utility-currency").value] += Number(byId("utility-amount").value) || 0;
  byId("due-totals").innerHTML = Object.entries(totals)
    .filter(([, total]) => total > 0)
    .map(([currency, total]) => `<div class="due-total"><span>${currency}</span><strong>${money(total, currency)}</strong></div>`)
    .join("") || '<p class="empty-total">请输入租金或 Utility 金额。</p>';
}
function savePlan() {
  const month = byId("due-month").value;
  if (!month) return;
  storedPlans[month] = {
    rentAmount: byId("rent-amount").value,
    rentCurrency: byId("rent-currency").value,
    utilityAmount: byId("utility-amount").value,
    utilityCurrency: byId("utility-currency").value
  };
  localStorage.setItem(plannerStorageKey, JSON.stringify(storedPlans));
  renderTotals();
}

byId("due-month").value = currentMonth;
byId("due-month").addEventListener("change", loadMonth);
plannerFields.forEach((id) => byId(id).addEventListener("input", savePlan));
plannerFields.filter((id) => id.endsWith("currency")).forEach((id) => byId(id).addEventListener("change", savePlan));
loadMonth();
