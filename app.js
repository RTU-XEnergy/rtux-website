(() => {
  "use strict";

  // =========================================================
  // CONFIG (ONLY EDIT THESE IF NEEDED)
  // =========================================================
  // This is your Cloudflare Worker endpoint that emails dan@rtu-x.com
  const LEAD_WORKER_ENDPOINT = "https://rtu-x-lead-capture.personalwealth101.workers.dev/lead";

  // =========================================================
  // HELPERS
  // =========================================================
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

  // =========================================================
  // MAIN
  // =========================================================
  ready(() => {
    // ---------------------------------------------------------
    // ROI CALCULATOR
    // ---------------------------------------------------------
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

    calcBtn?.addEventListener("click", renderROI);
    ["input", "change"].forEach((evt) => {
      annualSpendEl?.addEventListener(evt, renderROI);
      savingsPctEl?.addEventListener(evt, renderROI);
      systemCostEl?.addEventListener(evt, renderROI);
    });
    renderROI();

    // Prefill message box with ROI snapshot when user clicks “Email me this estimate”
    emailEstimateBtn?.addEventListener("click", () => {
      const msgEl = qs("#msg"); // textarea in the lead form
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

    // ---------------------------------------------------------
    // LEAD FORM → EMAIL (VIA CLOUDFLARE WORKER)
    // ---------------------------------------------------------
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

      // MUST match index.html name="" attributes
      const firstName = getVal("firstName");
      const lastName = getVal("lastName");
      const email = getVal("email");
      const phone = getVal("phone");
      const company = getVal("company");
      const locations = getVal("locations");
      const rtus = getVal("rtus");
      const spend = getVal("spend");
      const msg = getVal("msg");

      // Required validation (keep this strict)
      if (!firstName || !lastName || !email) {
        setStatus("Please complete First name, Last name, and Email.", "err");
        return;
      }
      if (!company || !locations || !rtus || !spend) {
        setStatus("Please complete Company, Number of locations, Avg RTUs, and HVAC spend.", "err");
        return;
      }

      isSubmitting = true;
      setStatus("Submitting…", "info");

      // ROI snapshot appended to message
      const roi = computeROI();
      const roiLine =
`ROI snapshot:
- Estimated annual savings ≈ ${fmtUSD(roi.annualSavings)}
- Estimated payback ≈ ${isFinite(roi.paybackYears) ? roi.paybackYears.toFixed(2) + " years" : "N/A"}`;

      const finalMessage = msg ? `${msg}\n\n${roiLine}` : roiLine;

      // IMPORTANT: This payload is for YOUR WORKER (simple JSON)
      const payload = {
        firstName,
        lastName,
        email,
        phone,
        company,
        locations,
        rtus,
        spend,
        message: finalMessage,
        pageUri: window.location.href,
        pageName: document.title
      };

      try {
        const res = await fetch(LEAD_WORKER_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        console.log("Lead worker response status:", res.status);

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Lead worker failed:", res.status, text);
          setStatus("Connection issue. Please email us at dan@rtu-x.com.", "err");
          return;
        }

        setStatus("✅ Thanks — we received your request. We’ll reach out shortly.", "ok");
        form.reset();
      } catch (err) {
        console.error("Lead worker error:", err);
        setStatus("Connection issue. Please email us at dan@rtu-x.com.", "err");
      } finally {
        isSubmitting = false;
      }
    });
  });
})();
