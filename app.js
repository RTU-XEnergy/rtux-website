(() => {
  "use strict";

  // ----------------------------
  // Helpers
  // ----------------------------
  const qs = (sel, root = document) => root.querySelector(sel);

  const ready = (fn) => {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  };

  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  const fmtUSD = (n) => {
    const x = Number(n);
    if (!isFinite(x)) return "$0";
    return x.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    });
  };

  // Safely read cookie value (for HubSpot tracking where possible)
  const getCookie = (name) => {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : "";
  };

  // ----------------------------
  // Main
  // ----------------------------
  ready(() => {
    // ----------------------------
    // ROI Calculator
    // ----------------------------
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
      const annualSavings = annualSpend * (savingsPct / 100);
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
        `Estimated annual savings: ${fmtUSD(annualSavings)} • Estimated payback: ${paybackYears.toFixed(2)} years (~${months} months)`;
    }

    calcBtn?.addEventListener("click", renderROI);
    ["input", "change"].forEach((evt) => {
      annualSpendEl?.addEventListener(evt, renderROI);
      savingsPctEl?.addEventListener(evt, renderROI);
      systemCostEl?.addEventListener(evt, renderROI);
    });
    renderROI();

    // Prefill lead-form message with ROI snapshot when clicking "Email me this estimate"
    emailEstimateBtn?.addEventListener("click", () => {
      const msgEl = qs("#msg");
      if (!msgEl) return;

      const roi = computeROI();
      const months = isFinite(roi.paybackYears) ? Math.round(roi.paybackYears * 12) : null;

      const roiBlock =
`ROI snapshot:
- Annual HVAC spend: ${fmtUSD(roi.annualSpend)}
- Expected savings: ${roi.savingsPct}%
- Installed investment: ${fmtUSD(roi.systemCost)}
- Estimated annual savings ≈ ${fmtUSD(roi.annualSavings)}
- Estimated payback ≈ ${isFinite(roi.paybackYears) ? roi.paybackYears.toFixed(2) + " years" : "N/A"}${months ? " (~" + months + " months)" : ""}`;

      if (!msgEl.value) msgEl.value = roiBlock;
      else if (!msgEl.value.includes("ROI snapshot:")) msgEl.value += "\n\n" + roiBlock;
    });

    // ----------------------------
    // Lead Form -> Worker -> Email (and/or HubSpot if Worker does it)
    // ----------------------------
    const form = qs("#leadForm");
    if (!form) return;

    // Status element
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
        "#cbd5e1";
    };

    const getVal = (name) => {
      const el = qs(`[name="${name}"]`, form);
      return el ? String(el.value || "").trim() : "";
    };

    let isSubmitting = false;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      // These must match index.html name="" attributes
      const firstName = getVal("firstName");
      const lastName  = getVal("lastName");
      const email     = getVal("email");

      // Required in your UI
      const company   = getVal("company");
      const locations = getVal("locations");
      const rtus      = getVal("rtus");
      const spend     = getVal("spend");

      if (!firstName || !lastName || !email) {
        setStatus("Please complete First name, Last name, and Email.", "err");
        return;
      }

      if (!company || !locations || !rtus || !spend) {
        setStatus("Please complete Company, Number of locations, Avg RTUs, and HVAC spend.", "err");
        return;
      }

      const phone = getVal("phone");
      const msg   = getVal("msg");

      // Add ROI snapshot to message without overwriting the user's note
      const roi = computeROI();
      const roiLine =
`ROI snapshot:
- Estimated annual savings ≈ ${fmtUSD(roi.annualSavings)}
- Estimated payback ≈ ${isFinite(roi.paybackYears) ? roi.paybackYears.toFixed(2) + " years" : "N/A"}`;

      const finalMessage = msg
        ? (msg.includes("ROI snapshot:") ? msg : `${msg}\n\n${roiLine}`)
        : roiLine;

      isSubmitting = true;
      setStatus("Submitting…", "info");

      // ✅ IMPORTANT: Worker route must be /submit (your Worker error said this explicitly)
      const endpoint = "https://rtu-x-lead-capture.personalwealth101.workers.dev/submit";

      // Payload: includes BOTH your user-friendly fields + HubSpot internal names (if Worker uses them)
      const payload = {
        // Human readable (useful if Worker only emails)
        firstName,
        lastName,
        email,
        phone,
        company,
        numberOfLocations: locations,
        avgRtusPerLocation: rtus,
        approxAnnualHvacSpend: spend,
        message: finalMessage,
        pageUri: window.location.href,
        pageName: document.title,

        // HubSpot-friendly block (if Worker forwards to HubSpot)
        hubspot: {
          fields: [
            { name: "firstname", value: firstName },
            { name: "lastname", value: lastName },
            { name: "email", value: email },
            { name: "phone", value: phone },
            { name: "company", value: company },
            { name: "number_of_locations", value: locations },
            { name: "avg_rtus_per_location", value: rtus },
            { name: "approx_annual_hvac_spend", value: spend },
            { name: "message", value: finalMessage }
          ],
          context: {
            pageUri: window.location.href,
            pageName: document.title,
            hutk: getCookie("hubspotutk") || undefined
          }
        }
      };

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        console.log("Lead submit response status:", res.status);

        const text = await res.text().catch(() => "");
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch (_) {}

        if (!res.ok) {
          console.error("Lead submit failed:", res.status, json || text);
          setStatus("Submitted, but delivery failed. Please email us at dan@rtu-x.com.", "err");
          isSubmitting = false;
          return;
        }

        // If your Worker returns JSON with ok:true, great—if not, still treat 200 as success.
        if (json && json.ok === false) {
          console.error("Worker reported failure:", json);
          setStatus("Submitted, but delivery failed. Please email us at dan@rtu-x.com.", "err");
          isSubmitting = false;
          return;
        }

        setStatus("✅ Thanks — we received your request. We’ll reach out shortly.", "ok");
        form.reset();
      } catch (err) {
        console.error("Lead submit error:", err);
        setStatus("Connection issue. Please email us at dan@rtu-x.com.", "err");
      } finally {
        isSubmitting = false;
      }
    });
  });
})();
