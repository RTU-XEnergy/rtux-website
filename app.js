(() => {
  "use strict";

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
    // ROI calculator inputs
    const annualSpendEl = qs("#annualSpend");
    const savingsPctEl = qs("#savingsPct");
    const systemCostEl = qs("#systemCost");
    const locationCountEl = qs("#roiLocations");

    // ROI visible output lines
    const roiResultEl = qs("#roiResult");
    const roiProfit5yrEl = qs("#roiProfit5yr");
    const roiProfit10yrEl = qs("#roiProfit10yr");
    const roiPortfolioEl = qs("#roiPortfolio");
    const roiPortfolio5yrEl = qs("#roiPortfolio5yr");
    const roiPortfolio10yrEl = qs("#roiPortfolio10yr");

    // Live counter elements in left ROI panel
    const livePortfolioAnnualEl = qs("#livePortfolioAnnual");
    const livePortfolio5yrEl = qs("#livePortfolio5yr");
    const livePortfolio10yrEl = qs("#livePortfolio10yr");

    // Buttons / forms
    const calcBtn = qs("#calcBtn");
    const leadForm = qs("#leadForm");

    // Hidden lead form fields
    const roiSavingsField = qs("#roi_est_annual_savings");
    const roiYearsField = qs("#roi_est_payback_years");
    const roiMonthsField = qs("#roi_est_payback_months");
    const roiPortfolioLocationsField = qs("#roi_est_portfolio_locations");
    const roiPortfolioSavingsField = qs("#roi_est_portfolio_savings");
    const roiProfit5yrField = qs("#roi_est_profit_5yr");
    const roiProfit10yrField = qs("#roi_est_profit_10yr");
    const roiPortfolioProfit5yrField = qs("#roi_est_portfolio_profit_5yr");
    const roiPortfolioProfit10yrField = qs("#roi_est_portfolio_profit_10yr");

    const leadPageField = qs("#lead_page");
    if (leadPageField) leadPageField.value = window.location.href;

    function computeROI() {
      const annualSpend = Number(annualSpendEl?.value || 0);
      const savingsPctRaw = Number(savingsPctEl?.value || 0);
      const systemCost = Number(systemCostEl?.value || 0);
      const locationCountRaw = Number(locationCountEl?.value || 0);

      const savingsPct = clamp(savingsPctRaw, 0, 90);
      const locationCount = clamp(Math.round(locationCountRaw || 0), 0, 100000);

      const annualSavings = annualSpend * (savingsPct / 100);
      const paybackYears = annualSavings > 0 ? systemCost / annualSavings : Infinity;
      const paybackMonths = isFinite(paybackYears) ? Math.round(paybackYears * 12) : "";

      const profit5yr = (annualSavings * 5) - systemCost;
      const profit10yr = (annualSavings * 10) - systemCost;

      const portfolioAnnualSavings = annualSavings * locationCount;
      const portfolioProfit5yr = profit5yr * locationCount;
      const portfolioProfit10yr = profit10yr * locationCount;

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

    function setText(el, value) {
      if (el) el.textContent = value;
    }

    function updateLiveCounter(roi) {
      setText(livePortfolioAnnualEl, fmtUSD(roi.portfolioAnnualSavings));
      setText(livePortfolio5yrEl, fmtUSD(roi.portfolioProfit5yr));
      setText(livePortfolio10yrEl, fmtUSD(roi.portfolioProfit10yr));
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

      // Always keep live counter updated
      updateLiveCounter(roi);

      if (!roi.annualSpend || !roi.systemCost) {
        setText(roiResultEl, "Enter values to estimate payback.");
        setText(roiProfit5yrEl, "");
        setText(roiProfit10yrEl, "");
        setText(roiPortfolioEl, "");
        setText(roiPortfolio5yrEl, "");
        setText(roiPortfolio10yrEl, "");
        pushRoiIntoLeadForm();
        return;
      }

      if (!isFinite(roi.paybackYears)) {
        setText(roiResultEl, "Savings must be greater than $0 to estimate payback.");
        setText(roiProfit5yrEl, "");
        setText(roiProfit10yrEl, "");
        setText(roiPortfolioEl, "");
        setText(roiPortfolio5yrEl, "");
        setText(roiPortfolio10yrEl, "");
        pushRoiIntoLeadForm();
        return;
      }

      setText(
        roiResultEl,
        `Estimated annual savings per location: ${fmtUSD(roi.annualSavings)} • Estimated payback: ${roi.paybackYears.toFixed(2)} years (~${roi.paybackMonths} months)`
      );

      setText(
        roiProfit5yrEl,
        `Estimated 5-year profit after investment (per location): ${fmtUSD(roi.profit5yr)}`
      );

      setText(
        roiProfit10yrEl,
        `Estimated 10-year profit after investment (per location): ${fmtUSD(roi.profit10yr)}`
      );

      if (roi.locationCount > 0) {
        setText(
          roiPortfolioEl,
          `Estimated annual savings across ${roi.locationCount} locations: ${fmtUSD(roi.portfolioAnnualSavings)}`
        );

        setText(
          roiPortfolio5yrEl,
          `Estimated 5-year portfolio profit after investment: ${fmtUSD(roi.portfolioProfit5yr)}`
        );

        setText(
          roiPortfolio10yrEl,
          `Estimated 10-year portfolio profit after investment: ${fmtUSD(roi.portfolioProfit10yr)}`
        );
      } else {
        setText(roiPortfolioEl, "Enter number of locations to estimate portfolio-wide annual savings.");
        setText(roiPortfolio5yrEl, "");
        setText(roiPortfolio10yrEl, "");
      }

      pushRoiIntoLeadForm();
    }

    // Calculator button
    calcBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      renderROI();
    });

    // Live updates while typing
    ["input", "change"].forEach((evt) => {
      annualSpendEl?.addEventListener(evt, renderROI);
      savingsPctEl?.addEventListener(evt, renderROI);
      systemCostEl?.addEventListener(evt, renderROI);
      locationCountEl?.addEventListener(evt, renderROI);
    });

    // Initial paint
    renderROI();

    // Lead form submission
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
