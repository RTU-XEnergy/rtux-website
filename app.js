(() => {
  "use strict";

  // ---------- Helpers ----------
  const qs = (sel, root = document) => root.querySelector(sel);

  const fmtUSD = (n) => {
    const x = Number(n);
    if (!isFinite(x)) return "$0";
    return x.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  };

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  // Run after DOM ready
  const ready = (fn) => {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  };

  ready(() => {
    // ---------- ROI CALCULATOR ----------
    const annualSpendEl = qs("#annualSpend");
    const savingsPctEl = qs("#savingsPct");
    const systemCostEl = qs("#systemCost");
    const roiResultEl = qs("#roiResult");
    const calcBtn = qs("#calcBtn");
    const emailEstimateBtn = qs("#emailEstimateBtn");

    function computeROI() {
      const annualSpend = Number(annualSpendEl?.value || 0);
      const savingsPct = Number(savingsPctEl?.value || 0);
      const systemCost = Number(systemCostEl?.value || 0);

      const pct = clamp(savingsPct, 0, 90) / 100;
      const annualSavings = annualSpend * pct;
      const paybackYears = annualSavings > 0 ? systemCost / annualSavings : Infinity;

      return { annualSpend, savingsPct: clamp(savingsPct, 0, 90), systemCost, annualSavings, paybackYears };
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
        `Estimated annual savings: ${fmtUSD(annualSavings)} • Estimated payback: ${paybackYears.toFixed(2)} years (~${months} months)`;
    }

    calcBtn?.addEventListener("click", renderROI);
    ["input", "change"].forEach((evt) => {
      annualSpendEl?.addEventListener(evt, renderROI);
      savingsPctEl?.addEventListener(evt, renderROI);
      systemCostEl?.addEventListener(evt, renderROI);
    });
    renderROI();

    // Prefill the lead form message when user clicks “Email me this estimate”
    emailEstimateBtn?.addEventListener("click", () => {
      const msgEl = qs("#msg"); // textarea in your form
      const { annualSpend, savingsPct, systemCost, annualSavings, paybackYears } = computeROI();
      if (!msgEl) return;

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

    // ---------- LEAD FORM → HUBSPOT SUBMISSION ----------
    const form = qs("#leadForm");
    if (!form) return;

    // Status area (create if missing)
    let statusEl = qs("#leadStatus");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.id = "leadStatus";
      statusEl.style.marginTop = "10px";
      statusEl.style.fontSize = "14px";
      statusEl.style.fontWeight = "600";
      form.appendChild(statusEl);
    }

    const setStatus = (msg, type = "info") => {
      statusEl.textContent = msg || "";
      statusEl.style.color =
        type === "ok" ? "#2ecc71" :
        type === "err" ? "#ff6b6b" :
        "#cbd5e1"; // neutral
    };

    const getVal = (name) => {
      const el = qs(`[name="${name}"]`, form);
      return el ? String(el.value || "").trim() : "";
    };

    let isSubmitting = false;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      // These must match your index.html name="" attributes
      const firstName = getVal("firstName");
      const lastName = getVal("lastName");
      const email = getVal("email");

      if (!firstName || !lastName || !email) {
        setStatus("Please complete First name, Last name, and Email.", "err");
        return;
      }

      // Optional: ensure required selects/inputs are present too
      const company = getVal("company");
      const locations = getVal("locations");
      const rtus = getVal("rtus");
      const spend = getVal("spend");

      if (!company || !locations || !rtus || !spend) {
        setStatus("Please complete Company, Number of locations, Avg RTUs, and HVAC spend.", "err");
        return;
      }

      isSubmitting = true;
      setStatus("Submitting…", "info");

      // Your HubSpot identifiers
      const portalId = "245308395";
      const formId = "e71670fc-ea6b-4840-a91e-759ff3a2ea30";
      const endpoint = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;

      // If you want to also include ROI snapshot in the message automatically:
      const roi = computeROI();
      const roiLine =
`ROI snapshot:
- Estimated annual savings ≈ ${fmtUSD(roi.annualSavings)}
- Estimated payback ≈ ${isFinite(roi.paybackYears) ? roi.paybackYears.toFixed(2) + " years" : "N/A"}`;

      const message = getVal("msg");
      const finalMessage = message ? `${message}\n\n${roiLine}` : roiLine;

      const payload = {
        fields: [
          { name: "firstname", value: firstName },
          { name: "lastname", value: lastName },
          { name: "email", value: email },
          { name: "phone", value: getVal("phone") },
          { name: "company", value: company },

          // Custom properties you created in HubSpot
          { name: "number_of_locations", value: locations },
          { name: "avg_rtus_per_location", value: rtus },
          { name: "annual_hvac_spend", value: spend },

          { name: "message", value: finalMessage }
        ],
        context: {
          pageUri: window.location.href,
          pageName: document.title
        }
      };

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
  });
})();
