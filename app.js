(() => {
  "use strict";

  // ----------------------------
  // Helpers
  // ----------------------------
  const qs = (sel, root = document) => root.querySelector(sel);

  const fmtUSD0 = (n) => {
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
    // ----------------------------
    // ROI Calculator Elements
    // ----------------------------
    const annualSpendEl = qs("#annualSpend");
    const savingsPctEl = qs("#savingsPct");
    const systemCostEl = qs("#systemCost");
    const roiResultEl = qs("#roiResult");       // existing line
    const roiPortfolioEl = qs("#roiPortfolio"); // new line you added
    const calcBtn = qs("#calcBtn");

    // If ROI section isn't on this page, safely stop (prevents errors on thank-you page, etc.)
    if (!annualSpendEl || !savingsPctEl || !systemCostEl || !roiResultEl || !calcBtn) {
      // Still allow the lead form to work even if ROI isn't present:
      wireLeadFormOnly();
      return;
    }

    function computeROI() {
      const annualSpend = Number(annualSpendEl.value || 0);
      const savingsPctRaw = Number(savingsPctEl.value || 0);
      const systemCost = Number(systemCostEl.value || 0);

      const savingsPct = clamp(savingsPctRaw, 0, 90);
      const pct = savingsPct / 100;

      const annualSavings = annualSpend * pct;
      const paybackYears = annualSavings > 0 ? systemCost / annualSavings : Infinity;

      return { annualSpend, savingsPct, systemCost, annualSavings, paybackYears };
    }

    // ----------------------------
    // Hidden ROI fields (Formspree email)
    // ----------------------------
    const roiSavingsField = qs("#roi_est_annual_savings");
    const roiYearsField = qs("#roi_est_payback_years");
    const roiMonthsField = qs("#roi_est_payback_months");

    function pushRoiIntoHiddenFields() {
      // If hidden fields don't exist, that's OK (do nothing).
      if (!roiSavingsField || !roiYearsField || !roiMonthsField) return;

      const { annualSavings, paybackYears } = computeROI();
      const paybackMonths = isFinite(paybackYears) ? Math.round(paybackYears * 12) : "";

      roiSavingsField.value = isFinite(annualSavings) ? String(Math.round(annualSavings)) : "";
      roiYearsField.value = isFinite(paybackYears) ? paybackYears.toFixed(2) : "";
      roiMonthsField.value = paybackMonths !== "" ? String(paybackMonths) : "";
    }

    // ----------------------------
    // Render ROI results on screen
    // ----------------------------
    function renderROI() {
      const { annualSpend, systemCost, annualSavings, paybackYears } = computeROI();

      if (!annualSpend || !systemCost) {
        roiResultEl.textContent = "Enter values to estimate payback.";
        if (roiPortfolioEl) roiPortfolioEl.textContent = "";
        pushRoiIntoHiddenFields();
        return;
      }

      if (!isFinite(paybackYears)) {
        roiResultEl.textContent = "Savings must be greater than $0 to estimate payback.";
        if (roiPortfolioEl) roiPortfolioEl.textContent = "";
        pushRoiIntoHiddenFields();
        return;
      }

      const months = Math.round(paybackYears * 12);

      // Line 1 (existing)
      roiResultEl.textContent =
        `Estimated annual savings: ${fmtUSD0(annualSavings)} • Estimated payback: ${paybackYears.toFixed(
          2
        )} years (~${months} months)`;

      // Line 2 (new): portfolio scaling reminder
      if (roiPortfolioEl) {
        roiPortfolioEl.textContent =
          `Portfolio view: multiply by your location count for an operator-level estimate.`;
      }

      // Ensure Formspree email receives the numbers
      pushRoiIntoHiddenFields();
    }

    // Hook Calculate button
    calcBtn.addEventListener("click", (e) => {
      e.preventDefault();
      renderROI();
    });

    // Keep ROI live-updating when they type (nice UX + keeps hidden fields current)
    ["input", "change"].forEach((evt) => {
      annualSpendEl.addEventListener(evt, renderROI);
      savingsPctEl.addEventListener(evt, renderROI);
      systemCostEl.addEventListener(evt, renderROI);
    });

    // Initial render
    renderROI();

    // ----------------------------
    // Lead Form: on submit, make sure hidden ROI fields are synced
    // ----------------------------
    const leadForm = qs("#leadForm");
    if (leadForm) {
      leadForm.addEventListener("submit", () => {
        // final sync right before Formspree posts
        pushRoiIntoHiddenFields();
      });
    }
  });

  // ----------------------------
  // If ROI isn't present on a page, still wire the lead form hidden fields gracefully
  // (safe no-op unless fields exist)
  // ----------------------------
  function wireLeadFormOnly() {
    const leadForm = document.querySelector("#leadForm");
    if (!leadForm) return;

    leadForm.addEventListener("submit", () => {
      // if hidden fields exist on this page, keep them as-is;
      // no ROI calculator present, so nothing to compute.
    });
  }
})();
