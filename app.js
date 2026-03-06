(() => {
"use strict";

/* -----------------------------
   Helpers
----------------------------- */

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

/* -----------------------------
   Main App
----------------------------- */

ready(() => {

/* -----------------------------
   ROI Calculator Elements
----------------------------- */

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

/* -----------------------------
   ROI Calculation
----------------------------- */

function computeROI() {

const annualSpend = Number(annualSpendEl?.value || 0);
const savingsPctRaw = Number(savingsPctEl?.value || 0);
const systemCost = Number(systemCostEl?.value || 0);
const locationCount = Number(locationCountEl?.value || 0);

const savingsPct = clamp(savingsPctRaw, 0, 90);

const annualSavings = annualSpend * (savingsPct / 100);

const paybackYears = annualSavings > 0
? systemCost / annualSavings
: Infinity;

const portfolioAnnualSavings = annualSavings * locationCount;

return {
annualSpend,
systemCost,
annualSavings,
paybackYears,
locationCount,
portfolioAnnualSavings
};

}

/* -----------------------------
   Render ROI
----------------------------- */

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

roiResultEl.textContent =
"Enter values to estimate payback.";

roiProfit5yrEl.textContent = "";
roiProfit10yrEl.textContent = "";
roiPortfolioEl.textContent = "";
roiPortfolio5yrEl.textContent = "";
roiPortfolio10yrEl.textContent = "";

pushRoiIntoLeadForm();

return;

}

if (!isFinite(paybackYears)) {

roiResultEl.textContent =
"Savings must be greater than $0 to estimate payback.";

pushRoiIntoLeadForm();

return;

}

const months = Math.round(paybackYears * 12);

const profit5yr = (annualSavings * 5) - systemCost;
const profit10yr = (annualSavings * 10) - systemCost;

const portfolioProfit5yr =
(portfolioAnnualSavings * 5) - (systemCost * locationCount);

const portfolioProfit10yr =
(portfolioAnnualSavings * 10) - (systemCost * locationCount);

/* Display results */

roiResultEl.textContent =
`Estimated annual savings per location: ${fmtUSD(annualSavings)} • Estimated payback: ${paybackYears.toFixed(2)} years (~${months} months)`;

roiProfit5yrEl.textContent =
`Estimated 5-year profit after investment (per location): ${fmtUSD(profit5yr)}`;

roiProfit10yrEl.textContent =
`Estimated 10-year profit after investment (per location): ${fmtUSD(profit10yr)}`;

if (locationCount > 0) {

roiPortfolioEl.textContent =
`Estimated annual savings across ${locationCount} locations: ${fmtUSD(portfolioAnnualSavings)}`;

roiPortfolio5yrEl.textContent =
`Estimated 5-year portfolio profit after investment: ${fmtUSD(portfolioProfit5yr)}`;

roiPortfolio10yrEl.textContent =
`Estimated 10-year portfolio profit after investment: ${fmtUSD(portfolioProfit10yr)}`;

} else {

roiPortfolioEl.textContent =
"Enter number of locations to estimate portfolio savings.";

}

/* sync ROI into hidden fields */

pushRoiIntoLeadForm();

}

/* -----------------------------
   Hidden Form Fields
----------------------------- */

function pushRoiIntoLeadForm() {

const savingsField = qs("#roi_est_annual_savings");
const yearsField = qs("#roi_est_payback_years");
const monthsField = qs("#roi_est_payback_months");
const portfolioLocationsField = qs("#roi_est_portfolio_locations");
const portfolioSavingsField = qs("#roi_est_portfolio_savings");

if (!savingsField || !yearsField || !monthsField) return;

const {
annualSavings,
paybackYears,
locationCount,
portfolioAnnualSavings
} = computeROI();

const paybackMonths = isFinite(paybackYears)
? Math.round(paybackYears * 12)
: "";

savingsField.value =
isFinite(annualSavings)
? Math.round(annualSavings).toString()
: "";

yearsField.value =
isFinite(paybackYears)
? paybackYears.toFixed(2)
: "";

monthsField.value =
paybackMonths !== ""
? paybackMonths.toString()
: "";

if (portfolioLocationsField) {
portfolioLocationsField.value =
locationCount
? locationCount.toString()
: "";
}

if (portfolioSavingsField) {
portfolioSavingsField.value =
isFinite(portfolioAnnualSavings)
? Math.round(portfolioAnnualSavings).toString()
: "";
}

}

/* -----------------------------
   Events
----------------------------- */

calcBtn?.addEventListener("click", renderROI);

["input", "change"].forEach((evt) => {

annualSpendEl?.addEventListener(evt, renderROI);
savingsPctEl?.addEventListener(evt, renderROI);
systemCostEl?.addEventListener(evt, renderROI);
locationCountEl?.addEventListener(evt, renderROI);

});

/* initial render */

renderROI();

});

})();
