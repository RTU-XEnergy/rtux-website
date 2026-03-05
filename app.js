(() => {
  "use strict";

  // ---------- helpers ----------
  const qs = (sel, root = document) => root.querySelector(sel);

  const fmtUSD = (n) => {
    const x = Number(n);
    if (!isFinite(x)) return "$0";
    return x.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  };

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  document.addEventListener("DOMContentLoaded", () => {
    // =========================
    // ROI CALCULATOR
    // =========================
    const annualSpendEl = qs("#annualSpend");
    const savingsPctEl  = qs("#savingsPct");
    const systemCostEl  = qs("#systemCost");
    const roiResultEl   = qs("#roiResult");
    const calcBtn       = qs("#calcBtn");

    // hidden ROI fields inside the lead form
    const roiSavingsEl = qs("#roi_est_annual_savings");
    const roiYearsEl   = qs("#roi_est_payback_years");
    const roiMonthsEl  = qs("#roi_est_payback_months");

    function computeROI() {
      const annualSpend = Number(annualSpendEl?.value || 0);
      const savingsPct  = clamp(Number(savingsPctEl?.value || 0), 0, 90);
      const systemCost  = Number(systemCostEl?.value || 0);

      const annualSavings = annualSpend * (savingsPct / 100);
      const paybackYears  = annualSavings > 0 ? (systemCost / annualSavings) : 0;
      const paybackMonths = Math.round(paybackYears * 12);

      return { annualSpend, savingsPct, systemCost, annualSavings, paybackYears, paybackMonths };
    }

    function renderROI() {
      if (!roiResultEl) return;

      const { annualSpend, systemCost, annualSavings, paybackYears, paybackMonths } = computeROI();

      if (!annualSpend || !systemCost) {
        roiResultEl.textContent = "Enter values to estimate payback.";
        return;
      }

      if (!annualSavings) {
        roiResultEl.textContent = "Savings must be greater than $0 to estimate payback.";
        return;
      }

      roiResultEl.textContent =
        `Estimated annual savings: ${fmtUSD(annualSavings)} • Estimated payback: ${paybackYears.toFixed(2)} years (~${paybackMonths} months)`;
    }

    function pushRoiIntoHiddenFields() {
      // only if those hidden inputs exist
      if (!roiSavingsEl || !roiYearsEl || !roiMonthsEl) return;

      const { annualSavings, paybackYears, paybackMonths } = computeROI();

      roiSavingsEl.value = isFinite(annualSavings) ? String(Math.round(annualSavings)) : "";
      roiYearsEl.value   = isFinite(paybackYears) ? paybackYears.toFixed(2) : "";
      roiMonthsEl.value  = isFinite(paybackMonths) ? String(paybackMonths) : "";
    }

    // Calculate button updates display + hidden fields
    calcBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      renderROI();
      pushRoiIntoHiddenFields();
    });

    // Update display while typing (optional)
    ["input", "change"].forEach((evt) => {
      annualSpendEl?.addEventListener(evt, renderROI);
      savingsPctEl?.addEventListener(evt, renderROI);
      systemCostEl?.addEventListener(evt, renderROI);
    });

    renderROI();

    // =========================
    // LEAD FORM (FORMSPREE)
    // =========================
    const leadForm = qs("#leadForm");
    if (!leadForm) return;

    // status line (so you SEE success/failure immediately)
    let statusEl = qs("#leadStatus");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.id = "leadStatus";
      statusEl.style.marginTop = "10px";
      statusEl.style.fontSize = "14px";
      statusEl.style.fontWeight = "600";
      statusEl.style.color = "#cbd5e1";
      leadForm.appendChild(statusEl);
    }

    const setStatus = (msg, type = "info") => {
      statusEl.textContent = msg || "";
      statusEl.style.color =
        type === "ok" ? "#2ecc71" :
        type === "err" ? "#ff6b6b" :
        "#cbd5e1";
    };

    const submitBtn = leadForm.querySelector('button[type="submit"]');

    leadForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // push ROI values right before submit
      pushRoiIntoHiddenFields();

      // Formspree endpoint comes from the form action=""
      const action = leadForm.getAttribute("action");
      if (!action) {
        setStatus("Form is missing an action URL.", "err");
        return;
      }

      // Where to send them after success:
      // use the hidden _next if present, otherwise default
      const nextInput = leadForm.querySelector('input[name="_next"]');
      const nextUrl = nextInput?.value || "https://rtu-x.com/thank-you.html";

      try {
        submitBtn && (submitBtn.disabled = true);
        setStatus("Submitting…", "info");

        const fd = new FormData(leadForm);

        const res = await fetch(action, {
          method: "POST",
          body: fd,
          headers: { "Accept": "application/json" }
        });

        console.log("Formspree status:", res.status);

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Formspree error:", res.status, text);
          setStatus("Submitted, but delivery failed. Please email us at dan@rtu-x.com.", "err");
          submitBtn && (submitBtn.disabled = false);
          return;
        }

        setStatus("✅ Thanks — we received your request. Redirecting…", "ok");

        // Force a clean branded thank-you page
        window.location.href = nextUrl;
      } catch (err) {
        console.error("Form submit error:", err);
        setStatus("Connection issue. Please email us at dan@rtu-x.com.", "err");
        submitBtn && (submitBtn.disabled = false);
      }
    });
  });
})();
