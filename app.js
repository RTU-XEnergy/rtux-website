(() => {
"use strict";

// ---------- helpers ----------
const qs = (sel) => document.querySelector(sel);

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

document.addEventListener("DOMContentLoaded", () => {

  // ROI elements
  const annualSpendEl = qs("#annualSpend");
  const savingsPctEl = qs("#savingsPct");
  const systemCostEl = qs("#systemCost");
  const roiResultEl = qs("#roiResult");
  const calcBtn = qs("#calcBtn");

  // hidden ROI fields
  const roiSavings = qs("#roi_est_annual_savings");
  const roiYears = qs("#roi_est_payback_years");
  const roiMonths = qs("#roi_est_payback_months");

  // lead form
  const leadForm = qs("#leadForm");

  function computeROI(){

    const annualSpend = Number(annualSpendEl?.value || 0);
    const savingsPct = clamp(Number(savingsPctEl?.value || 0),0,90);
    const systemCost = Number(systemCostEl?.value || 0);

    const annualSavings = annualSpend * (savingsPct/100);
    const paybackYears = annualSavings > 0 ? systemCost / annualSavings : 0;
    const paybackMonths = Math.round(paybackYears*12);

    return {annualSavings,paybackYears,paybackMonths};

  }

  function renderROI(){

    if(!roiResultEl) return;

    const {annualSavings,paybackYears,paybackMonths} = computeROI();

    if(!annualSavings){
      roiResultEl.textContent = "Enter values to estimate payback.";
      return;
    }

    roiResultEl.textContent =
      `Estimated annual savings: ${fmtUSD(annualSavings)} • Estimated payback: ${paybackYears.toFixed(2)} years (~${paybackMonths} months)`;

  }

  function pushRoiIntoForm(){

    const {annualSavings,paybackYears,paybackMonths} = computeROI();

    if(roiSavings) roiSavings.value = Math.round(annualSavings);
    if(roiYears) roiYears.value = paybackYears.toFixed(2);
    if(roiMonths) roiMonths.value = paybackMonths;

  }

  // calculate button
  if(calcBtn){

    calcBtn.addEventListener("click",(e)=>{
      e.preventDefault();
      renderROI();
      pushRoiIntoForm();
    });

  }

  // update while typing
  ["input","change"].forEach(evt=>{
    annualSpendEl?.addEventListener(evt,renderROI);
    savingsPctEl?.addEventListener(evt,renderROI);
    systemCostEl?.addEventListener(evt,renderROI);
  });

  // push ROI before form submits
  if(leadForm){

    leadForm.addEventListener("submit",()=>{
      pushRoiIntoForm();
    });

  }

});
})();
