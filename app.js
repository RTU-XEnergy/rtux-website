/* RTU-X Website JS
   - Section reveal animations
   - ROI calculator
   - Lead form submission to HubSpot (no mailto popups)
*/

// -------------------------
// Helpers
// -------------------------
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

// -------------------------
// Footer year
// -------------------------
(function setYear() {
  const y = qs("#year");
  if (y) y.textContent = new Date().getFullYear();
})();

// -------------------------
// Reveal on scroll (simple)
// -------------------------
(function revealOnScroll() {
  const els = qsa(".reveal");
  if (!els.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  els.forEach((el) => io.observe(el));
})();

// -------------------------
// ROI Calculator
// -------------------------
(function roiCalc() {
  const form = qs("#roiForm");
  if (!form) return;

  const annualSpendEl = qs("#annualSpend", form);
  const savingsPctEl = qs("#savingsPct", form);
  const systemCostEl = qs("#systemCost", form);
  const resultEl = qs("#roiResult");
  const calcBtn = qs("#calcBtn");
  const emailBtn = qs("#emailEstimateBtn");

  function fmtUSD(n) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
    } catch {
      return "$" + Math.round(n).toString();
    }
  }

  function compute() {
    const annualSpend = Number(annualSpendEl?.value || 0);
    const savingsPct = Number(savingsPctEl?.value || 0) / 100;
    const systemCost = Number(systemCostEl?.value || 0);

    const annualSavings = annualSpend * savingsPct;
    const paybackYears = annualSavings > 0 ? (systemCost / annualSavings) : Infinity;

    return { annualSpend, savingsPct: savingsPct * 100, systemCost, annualSavings, paybackYears };
  }

  function render() {
    const { annualSavings, paybackYears } = compute();

    if (!isFinite(paybackYears) || paybackYears <= 0) {
      resultEl.textContent = "Enter values to estimate payback.";
      return;
    }

    const months = paybackYears * 12;
    resultEl.textContent =
      `Estimated annual savings: ${fmtUSD(annualSavings)} • Estimated payback: ${paybackYears.toFixed(1)} years (${Math.round(months)} months)`;
  }

  calcBtn?.addEventListener("click", render);
  ["input", "change"].forEach((evt) => {
    annualSpendEl?.addEventListener(evt, render);
    savingsPctEl?.addEventListener(evt, render);
    systemCostEl?.addEventListener(evt, render);
  });

  // Optional: pre-fill lead form message when user clicks "Email me this estimate"
  emailBtn?.addEventListener("click", () => {
    const leadMsg = qs("#message");
    const { annualSpend, savingsPct, systemCost, annualSavings, paybackYears } = compute();
    if (leadMsg) {
      const line =
        `ROI estimate from site:\n- Annual HVAC spend: ${fmtUSD(annualSpend)}\n- Expected savings: ${savingsPct}%\n- Installed investment: ${fmtUSD(systemCost)}\n- Estimated annual savings: ${fmtUSD(annualSavings)}\n- Estimated payback: ${paybackYears.toFixed(1)} years\n`;
      if (!leadMsg.value) leadMsg.value = line;
      else if (!leadMsg.value.includes("ROI estimate from site")) leadMsg.value += "\n\n" + line;
    }
  });

  render();
})();

// -------------------------
// HubSpot Lead Capture (site-styled form)
// -------------------------
(function hubspotLeadCapture() {
  const form = qs("#leadForm");
  if (!form) return;

  let isSubmitting = false;

  // Inline status
  let statusEl = qs(".form-status", form);
  if (!statusEl) {
    statusEl = document.createElement("div");
    statusEl.className = "form-status";
    statusEl.style.marginTop = "12px";
    statusEl.style.fontSize = "14px";
    statusEl.style.opacity = "0.95";
    form.appendChild(statusEl);
  }

  function setStatus(message, type) {
    statusEl.textContent = message;
    if (type === "ok") statusEl.style.color = "#7CFCB0";
    else if (type === "err") statusEl.style.color = "#FFB4B4";
    else statusEl.style.color = "#E7EDF7";
  }

  function getVal(name) {
    const el = qs(`[name="${name}"]`, form);
    return el ? String(el.value || "").trim() : "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const firstName = getVal("firstName");
    const lastName = getVal("lastName");
    const email = getVal("email");

    if (!firstName || !lastName || !email) {
      setStatus("Please complete First name, Last name, and Email.", "err");
      return;
    }

    isSubmitting = true;
    setStatus("Submitting…", "info");

    const portalId = "245308395";
    const formId = "e71670fc-ea6b-4840-a91e-759ff3a2ea30";
    const endpoint = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;

    const payload = {
    fields: [
  { name: "firstname", value: firstName },
  { name: "lastname", value: lastName },
  { name: "email", value: email },
  { name: "phone", value: getVal("phone") },
  { name: "company", value: getVal("company") },

  { name: "number_of_locations", value: getVal("locations") },
  { name: "avg_rtus_per_location", value: getVal("rtus") },
  { name: "annual_hvac_spend", value: getVal("spend") },

  { name: "message", value: getVal("msg") }
],

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
       console.log("HubSpot response status:", res.status);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("HubSpot submission failed:", res.status, text);
        setStatus("Submitted, but CRM sync failed. Please email us at dan@rtu-x.com.", "err");
        isSubmitting = false;
        return;
      }

      setStatus("✅ Thanks — we received your request. We’ll reach out shortly.", "ok");
      form.reset();
    } catch (err) {
      console.error("HubSpot submission error:", err);
      setStatus("Connection issue. Please email us at dan@rtu-x.com.", "err");
    } finally {
      isSubmitting = false;
    }
  });
})();
