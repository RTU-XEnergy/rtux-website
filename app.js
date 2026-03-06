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
    const roiLocationsEl = qs("#roiLocations");
    const roiResultEl = qs("#roiResult");
    const roiPortfolioEl = qs("#roiPortfolio");
    const calcBtn = qs("#calcBtn");
    const emailEstimateBtn = qs("#emailEstimateBtn");

    function computeROI() {
      const annualSpend = Number(annualSpendEl?.value || 0);
      const savingsPctRaw = Number(savingsPctEl?.value || 0);
      const systemCost = Number(systemCostEl?.value || 0);
      const locationCount = Number(roiLocationsEl?.value || 0);

      const savingsPct = clamp(savingsPctRaw, 0, 90);
      const pct = savingsPct / 100;
      const annualSavings = annualSpend * pct;
      const paybackYears = annualSavings > 0 ? systemCost / annualSavings : Infinity;
      const portfolioAnnualSavings = annualSavings * locationCount;

      return {
        annualSpend,
        savingsPct,
        systemCost,
        annualSavings,
        paybackYears,
        locationCount,
        portfolioAnnualSavings
      };
    }

    function pushRoiIntoLeadForm() {
      const savingsField = qs("#roi_est_annual_savings");
      const yearsField = qs("#roi_est_payback_years");
      const monthsField = qs("#roi_est_payback_months");

      if (!savingsField || !yearsField || !monthsField) return;

      const { annualSavings, paybackYears } = computeROI();
      const paybackMonths = isFinite(paybackYears) ? Math.round(paybackYears * 12) : "";

      savingsField.value = isFinite(annualSavings) ? Math.round(annualSavings).toString() : "";
      yearsField.value = isFinite(paybackYears) ? paybackYears.toFixed(2) : "";
      monthsField.value = paybackMonths !== "" ? paybackMonths.toString() : "";
    }

    function renderROI() {
      if (!roiResultEl) return;

      const {
        annualSpend,
        systemCost,
        annualSavings,
        paybackYears,
        locationCount,
        portfolioAnnualSavings
      } = computeROI();

      if (!annualSpend || !systemCost) {
        roiResultEl.textContent = "Enter values to estimate payback.";
        if (roiPortfolioEl) roiPortfolioEl.textContent = "";
        pushRoiIntoLeadForm();
        return;
      }

      if (!isFinite(paybackYears)) {
        roiResultEl.textContent = "Savings must be greater than $0 to estimate payback.";
        if (roiPortfolioEl) roiPortfolioEl.textContent = "";
        pushRoiIntoLeadForm();
        return;
      }

      const months = Math.round(paybackYears * 12);

      roiResultEl.textContent =
        `Estimated annual savings per location: ${fmtUSD(annualSavings)} • Estimated payback: ${paybackYears.toFixed(2)} years (~${months} months)`;

      if (roiPortfolioEl) {
        if (locationCount > 0) {
          roiPortfolioEl.textContent =
            `Estimated annual savings across ${locationCount} locations: ${fmtUSD(portfolioAnnualSavings)}`;
        } else {
          roiPortfolioEl.textContent = "Enter number of locations to estimate portfolio-wide annual savings.";
        }
      }

      pushRoiIntoLeadForm();
    }

    calcBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      renderROI();
    });

    ["input", "change"].forEach((evt) => {
      annualSpendEl?.addEventListener(evt, renderROI);
      savingsPctEl?.addEventListener(evt, renderROI);
      systemCostEl?.addEventListener(evt, renderROI);
      roiLocationsEl?.addEventListener(evt, renderROI);
    });

    renderROI();

    // Prefill lead form message with ROI snapshot when clicking “Email me this estimate”
    emailEstimateBtn?.addEventListener("click", () => {
      const msgEl = qs("#msg");
      if (!msgEl) return;

      const {
        annualSpend,
        savingsPct,
        systemCost,
        annualSavings,
        paybackYears,
        locationCount,
        portfolioAnnualSavings
      } = computeROI();

      const months = isFinite(paybackYears) ? Math.round(paybackYears * 12) : null;

      const line =
`ROI estimate from site:
- Annual HVAC spend (per location): ${fmtUSD(annualSpend)}
- Expected savings: ${savingsPct}%
- Estimated RTU-X installed cost (per location): ${fmtUSD(systemCost)}
- Estimated annual savings (per location): ${fmtUSD(annualSavings)}
- Estimated payback: ${isFinite(paybackYears) ? paybackYears.toFixed(2) + " years" : "N/A"}${months ? " (~" + months + " months)" : ""}
- Number of locations: ${locationCount || 0}
- Estimated annual savings across portfolio: ${fmtUSD(portfolioAnnualSavings)}`;

      if (!msgEl.value) msgEl.value = line;
      else if (!msgEl.value.includes("ROI estimate from site:")) msgEl.value += "\n\n" + line;
    });

    // ============================================================
    // LEAD FORM → FORMSPREE
    // ============================================================
    const leadForm = qs("#leadForm");
    if (!leadForm) return;

    let statusEl = qs("#leadStatus");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.id = "leadStatus";
      statusEl.style.marginTop = "10px";
      statusEl.style.fontSize = "14px";
      statusEl.style.fontWeight = "650";
      leadForm.appendChild(statusEl);
    }

    const setStatus = (msg, type = "info") => {
      statusEl.textContent = msg || "";
      statusEl.style.color =
        type === "ok" ? "#2ecc71" :
        type === "err" ? "#ff6b6b" :
        "#cbd5e1";
    };

    leadForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      pushRoiIntoLeadForm();

      const action = leadForm.getAttribute("action");
      const nextUrl = "https://rtu-x.com/thank-you.html";

      if (!action) {
        setStatus("Form action is missing.", "err");
        return;
      }

      const submitBtn = leadForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      setStatus("Submitting…", "info");

      try {
        const fd = new FormData(leadForm);

        const res = await fetch(action, {
          method: "POST",
          body: fd,
          headers: { "Accept": "application/json" }
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Formspree failed:", res.status, text);
          setStatus("Submitted, but delivery failed. Please email us at dan@rtu-x.com.", "err");
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

        setStatus("✅ Thanks — we received your request. Redirecting…", "ok");
        window.location.href = nextUrl;
      } catch (err) {
        console.error("Form submit error:", err);
        setStatus("Connection issue. Please email us at dan@rtu-x.com.", "err");
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
})();
