(() => {
  "use strict";

  // -----------------------------
  // Helpers
  // -----------------------------
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
    // -----------------------------
    // ROI Calculator Elements
    // -----------------------------
    const annualSpendEl = qs("#annualSpend");
    const savingsPctEl = qs("#savingsPct");
    const systemCostEl = qs("#systemCost");
    const locationCountEl = qs("#roiLocations");

    const roiResultEl = qs("#roiResult");
    const roiProfit5yrEl = qs("#roiProfit5yr");
    const roiProfit10yrEl = qs("#roiProfit10yr");
    const roiPortfolioEl = qs("#roiPortfolio");
    const roiPortfolio5yrEl = qs("#roiPortfolio5yr");
    const roiPortfolio10yrEl = qs("#roiPortfolio10yr");

    const calcBtn = qs("#calcBtn");
    const emailEstimateBtn = qs("#emailEstimateBtn");

    // -----------------------------
    // Lead Form + Hidden Fields
    // -----------------------------
    const leadForm = qs("#leadForm");

    const roiSavingsField = qs("#roi_est_annual_savings");
    const roiYearsField = qs("#roi_est_payback_years");
    const roiMonthsField = qs("#roi_est_payback_months");
    const roiPortfolioLocationsField = qs("#roi_est_portfolio_locations");
    const roiPortfolioSavingsField = qs("#roi_est_portfolio_savings");

    // Optional hidden fields (only used if they exist in index.html)
    const roiProfit5yrField = qs("#roi_est_profit_5yr");
    const roiProfit10yrField = qs("#roi_est_profit_10yr");
    const roiPortfolioProfit5yrField = qs("#roi_est_portfolio_profit_5yr");
    const roiPortfolioProfit10yrField = qs("#roi_est_portfolio_profit_10yr");

    function computeROI() {
      const annualSpend = Number(annualSpendEl?.value || 0);
      const savingsPctRaw = Number(savingsPctEl?.value || 0);
      const systemCost = Number(systemCostEl?.value || 0);
      const locationCount = Number(locationCountEl?.value || 0);

      const savingsPct = clamp(savingsPctRaw, 0, 90);
      const annualSavings = annualSpend * (savingsPct / 100);
      const paybackYears = annualSavings > 0 ? systemCost / annualSavings : Infinity;
      const paybackMonths = isFinite(paybackYears) ? Math.round(paybackYears * 12) : "";

      const profit5yr = (annualSavings * 5) - systemCost;
      const profit10yr = (annualSavings * 10) - systemCost;

      const portfolioAnnualSavings = annualSavings * locationCount;
      const portfolioProfit5yr = (portfolioAnnualSavings * 5) - (systemCost * locationCount);
      const portfolioProfit10yr = (portfolioAnnualSavings * 10) - (systemCost * locationCount);

      return {
        annualSpend,
        savingsPct,
        systemCost,
        locationCount,
        annualSavings,
        paybackYears,
        paybackMonths,
        profit5yr,
        profit10yr,
        portfolioAnnualSavings,
        portfolioProfit5yr,
        portfolioProfit10yr
      };
    }

    function hideExtraDisplayLines() {
      // Keep mobile display clean.
      if (roiProfit5yrEl) roiProfit5yrEl.style.display = "none";
      if (roiProfit10yrEl) roiProfit10yrEl.style.display = "none";
      if (roiPortfolio5yrEl) roiPortfolio5yrEl.style.display = "none";
      if (roiPortfolio10yrEl) roiPortfolio10yrEl.style.display = "none";
    }

    function pushRoiIntoLeadForm() {
      const roi = computeROI();

      if (roiSavingsField) {
        roiSavingsField.value = isFinite(roi.annualSavings)
          ? Math.round(roi.annualSavings).toString()
          : "";
      }

      if (roiYearsField) {
        roiYearsField.value = isFinite(roi.paybackYears)
          ? roi.paybackYears.toFixed(2)
          : "";
      }

      if (roiMonthsField) {
        roiMonthsField.value = roi.paybackMonths !== ""
          ? roi.paybackMonths.toString()
          : "";
      }

      if (roiPortfolioLocationsField) {
        roiPortfolioLocationsField.value = roi.locationCount
          ? roi.locationCount.toString()
          : "";
      }

      if (roiPortfolioSavingsField) {
        roiPortfolioSavingsField.value = isFinite(roi.portfolioAnnualSavings)
          ? Math.round(roi.portfolioAnnualSavings).toString()
          : "";
      }

      // Optional multi-year hidden fields
      if (roiProfit5yrField) {
        roiProfit5yrField.value = isFinite(roi.profit5yr)
          ? Math.round(roi.profit5yr).toString()
          : "";
      }

      if (roiProfit10yrField) {
        roiProfit10yrField.value = isFinite(roi.profit10yr)
          ? Math.round(roi.profit10yr).toString()
          : "";
      }

      if (roiPortfolioProfit5yrField) {
        roiPortfolioProfit5yrField.value = isFinite(roi.portfolioProfit5yr)
          ? Math.round(roi.portfolioProfit5yr).toString()
          : "";
      }

      if (roiPortfolioProfit10yrField) {
        roiPortfolioProfit10yrField.value = isFinite(roi.portfolioProfit10yr)
          ? Math.round(roi.portfolioProfit10yr).toString()
          : "";
      }
    }

    function renderROI() {
      if (!roiResultEl) return;

      const roi = computeROI();

      hideExtraDisplayLines();

      if (!roi.annualSpend || !roi.systemCost) {
        roiResultEl.textContent = "Enter values to estimate payback.";
        if (roiPortfolioEl) roiPortfolioEl.textContent = "";
        pushRoiIntoLeadForm();
        return;
      }

      if (!isFinite(roi.paybackYears)) {
        roiResultEl.textContent = "Savings must be greater than $0 to estimate payback.";
        if (roiPortfolioEl) roiPortfolioEl.textContent = "";
        pushRoiIntoLeadForm();
        return;
      }

      // Keep on-screen presentation clean and mobile-friendly:
      roiResultEl.textContent =
        `Estimated annual savings per location: ${fmtUSD(roi.annualSavings)} • Estimated payback: ${roi.paybackYears.toFixed(2)} years (~${roi.paybackMonths} months)`;

      if (roiPortfolioEl) {
        if (roi.locationCount > 0) {
          roiPortfolioEl.textContent =
            `Estimated annual savings across ${roi.locationCount} locations: ${fmtUSD(roi.portfolioAnnualSavings)}`;
        } else {
          roiPortfolioEl.textContent =
            "Enter number of locations to estimate portfolio-wide annual savings.";
        }
      }

      pushRoiIntoLeadForm();
    }

    // -----------------------------
    // ROI Events
    // -----------------------------
    calcBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      renderROI();
    });

    ["input", "change"].forEach((evt) => {
      annualSpendEl?.addEventListener(evt, renderROI);
      savingsPctEl?.addEventListener(evt, renderROI);
      systemCostEl?.addEventListener(evt, renderROI);
      locationCountEl?.addEventListener(evt, renderROI);
    });

    // Optional: populate message box with full ROI snapshot
    emailEstimateBtn?.addEventListener("click", () => {
      const msgEl = qs("#msg");
      if (!msgEl) return;

      const roi = computeROI();

      const line =
`ROI estimate from site:
- Annual HVAC spend (per location): ${fmtUSD(roi.annualSpend)}
- Expected savings: ${roi.savingsPct}%
- Estimated RTU-X installed cost (per location): ${fmtUSD(roi.systemCost)}
- Estimated annual savings (per location): ${fmtUSD(roi.annualSavings)}
- Estimated payback: ${isFinite(roi.paybackYears) ? roi.paybackYears.toFixed(2) + " years (~" + roi.paybackMonths + " months)" : "N/A"}
- Estimated 5-year profit after investment (per location): ${fmtUSD(roi.profit5yr)}
- Estimated 10-year profit after investment (per location): ${fmtUSD(roi.profit10yr)}
- Number of locations: ${roi.locationCount || 0}
- Estimated annual savings across portfolio: ${fmtUSD(roi.portfolioAnnualSavings)}
- Estimated 5-year portfolio profit after investment: ${fmtUSD(roi.portfolioProfit5yr)}
- Estimated 10-year portfolio profit after investment: ${fmtUSD(roi.portfolioProfit10yr)}`;

      if (!msgEl.value) msgEl.value = line;
      else if (!msgEl.value.includes("ROI estimate from site:")) msgEl.value += "\n\n" + line;
    });

    // Initial render
    renderROI();

    // -----------------------------
    // Formspree Submit
    // -----------------------------
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
.diagram {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.node {
  width: 100%;
  max-width: 420px;
  text-align: center;
  padding: 14px 18px;
  border-radius: 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  font-weight: 650;
  color: #e8edf7;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
}

.node.highlight {
  background: linear-gradient(180deg, rgba(46,124,255,0.22), rgba(46,124,255,0.10));
  border: 1px solid rgba(46,124,255,0.45);
}

.arrow {
  font-size: 22px;
  line-height: 1;
  color: rgba(255,255,255,0.6);
}

@media (max-width: 640px) {
  .node {
    max-width: 100%;
    font-size: 14px;
    padding: 12px 14px;
  }
}
