(() => {
  "use strict";

  // ---------- Helpers ----------
  const qs = (sel, root = document) => root.querySelector(sel);

  const fmtUSD = (n) => {
    const x = Number(n);
    if (!isFinite(x)) return "$0";
    return x.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    });
  };

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const ready = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  };

  ready(() => {
    // ============================================================
    // ROI CALCULATOR
    // ============================================================
    const annualSpendEl = qs("#annualSpend");
    const savingsPctEl = qs("#savingsPct");
    const systemCostEl = qs("#systemCost");
    const roiResultEl = qs("#roiResult");
    const calcBtn = qs("#calcBtn");
    const emailEstimateBtn = qs("#emailEstimateBtn");

    function computeROI() {
      const annualSpend = Number(annualSpendEl?.value || 0);
      const savingsPctRaw = Number(savingsPctEl?.value || 0);
      const systemCost = Number(systemCostEl?.value || 0);

      const savingsPct = clamp(savingsPctRaw, 0, 90);
      const pct = savingsPct / 100;
      const annualSavings = annualSpend * pct;
      const paybackYears = annualSavings > 0 ? systemCost / annualSavings : Infinity;

      return { annualSpend, savingsPct, systemCost, annualSavings, paybackYears };
    }

    function renderROI() {
      if (!roiResultEl) return;

      const { annualSpend, savingsPct, systemCost, annualSavings, paybackYears } = computeROI();

      if (!annualSpend || !systemCost) {
        roiResultEl.textContent = "Enter values to estimate payback.";
        return;
      }

      if (!isFinite(paybackYears)) {
        roiResultEl.textContent = "Savings must be greater than $0 to estimate payback.";
        return;
      }

      const months = Math.round(paybackYears * 12);
      roiResultEl.textContent =
        `Estimated annual savings: ${fmtUSD(annualSavings)} • Estimated payback: ${paybackYears.toFixed(
          2
        )} years (~${months} months)`;
    }

    // Always keep ROI updated
    calcBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      renderROI();
      pushRoiIntoLeadForm(); // also sync hidden fields when user clicks Calculate
    });

    ["input", "change"].forEach((evt) => {
      annualSpendEl?.addEventListener(evt, () => {
        renderROI();
        pushRoiIntoLeadForm();
      });
      savingsPctEl?.addEventListener(evt, () => {
        renderROI();
        pushRoiIntoLeadForm();
      });
      systemCostEl?.addEventListener(evt, () => {
        renderROI();
        pushRoiIntoLeadForm();
      });
    });

    // Initial render
    renderROI();

    // ============================================================
    // LEAD FORM (Formspree) + Hidden ROI Fields
    // ============================================================
    const leadForm = qs("#leadForm");

    // Hidden ROI fields in index.html (must exist)
    const roiSavingsField = qs("#roi_est_annual_savings");
    const roiYearsField = qs("#roi_est_payback_years");
    const roiMonthsField = qs("#roi_est_payback_months");

    function pushRoiIntoLeadForm() {
      // If the hidden inputs aren't on the page, do nothing
      if (!roiSavingsField || !roiYearsField || !roiMonthsField) return;

      const { annualSavings, paybackYears } = computeROI();
      const paybackMonths = isFinite(paybackYears) ? Math.round(paybackYears * 12) : "";

      roiSavingsField.value = isFinite(annualSavings) ? String(Math.round(annualSavings)) : "";
      roiYearsField.value = isFinite(paybackYears) ? paybackYears.toFixed(2) : "";
      roiMonthsField.value = paybackMonths !== "" ? String(paybackMonths) : "";
    }

    // Pre-fill the message textarea with ROI snapshot when they click "Email me this estimate"
    emailEstimateBtn?.addEventListener("click", () => {
      const msgEl = qs("#msg"); // your textarea id="msg"
      if (!msgEl) return;

      const { annualSpend, savingsPct, systemCost, annualSavings, paybackYears } = computeROI();
      const months = isFinite(paybackYears) ? Math.round(paybackYears * 12) : null;

      const line =
`ROI estimate from site:
- Annual HVAC spend: ${fmtUSD(annualSpend)}
- Expected savings: ${savingsPct}%
- Installed investment: ${fmtUSD(systemCost)}
- Estimated annual savings: ${fmtUSD(annualSavings)}
- Estimated payback: ${isFinite(paybackYears) ? paybackYears.toFixed(2) + " years" : "N/A"}${months ? " (~" + months + " months)" : ""}`;

      if (!msgEl.value) msgEl.value = line;
      else if (!msgEl.value.includes("ROI estimate from site:")) msgEl.value += "\n\n" + line;
    });

    // On form submit, sync ROI → hidden fields, then let Formspree submit normally
    if (leadForm) {
      leadForm.addEventListener("submit", () => {
        pushRoiIntoLeadForm();
      });
    }
  });
})();
