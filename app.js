(() => {
  "use strict";

  // ============================================================
  // CONFIG — your Cloudflare Worker endpoint (email delivery)
  // IMPORTANT: Your Worker must accept POST /submit
  // ============================================================
  const WORKER_SUBMIT_URL = "https://rtu-x-lead-email.personalwealth101.workers.dev/submit";

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
    // ROI CALCULATOR (unchanged behavior)
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
        `Estimated annual savings: ${fmtUSD(annualSavings)} • Estimated payback: ${paybackYears.toFixed(2)} years (~${months} months)`;
    }

    calcBtn?.addEventListener("click", renderROI);
    ["input", "change"].forEach((evt) => {
      annualSpendEl?.addEventListener(evt, renderROI);
      savingsPctEl?.addEventListener(evt, renderROI);
      systemCostEl?.addEventListener(evt, renderROI);
    });
    renderROI();

    // Prefill lead form message with ROI snapshot (optional but helpful)
    emailEstimateBtn?.addEventListener("click", () => {
      const msgEl = qs("#msg"); // textarea in your lead form
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

    // ============================================================
    // LEAD FORM → EMAIL VIA CLOUDFLARE WORKER
    // ============================================================
    const form = qs("#leadForm");
    if (!form) return;

    // Status area (create if missing)
    let statusEl = qs("#leadStatus");
    if (!statusEl) {
      statusEl = document.createElement("div");
      statusEl.id = "leadStatus";
      statusEl.style.marginTop = "10px";
      statusEl.style.fontSize = "14px";
      statusEl.style.fontWeight = "650";
      form.appendChild(statusEl);
    }

    const setStatus = (msg, type = "info") => {
      statusEl.textContent = msg || "";
      statusEl.style.color =
        type === "ok" ? "#2ecc71" :
        type === "err" ? "#ff6b6b" :
        "#cbd5e1";
    };

    // reads by name="" attribute (this matches your index.html)
    const getVal = (name) => {
      const el = qs(`[name="${name}"]`, form);
      return el ? String(el.value || "").trim() : "";
    };

    let isSubmitting = false;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (isSubmitting) return;

      // Collect values (send them even if blank — your goal)
      const firstName = getVal("firstName");
      const lastName  = getVal("lastName");
      const email     = getVal("email");
      const phone     = getVal("phone");
      const company   = getVal("company");
      const locations = getVal("locations");
      const rtus      = getVal("rtus");
      const spend     = getVal("spend");
      const msg       = getVal("msg");

      // Minimal validation so you get a usable lead
      if (!email && !phone) {
        setStatus("Please provide at least an Email or Phone so we can reach you.", "err");
        return;
      }

      isSubmitting = true;
      setStatus("Submitting…", "info");

      // ROI snapshot included in email (so you see it in dan@rtu-x.com)
      const roi = computeROI();
      const roiLine =
`ROI snapshot:
- Estimated annual savings ≈ ${fmtUSD(roi.annualSavings)}
- Estimated payback ≈ ${isFinite(roi.paybackYears) ? roi.paybackYears.toFixed(2) + " years" : "N/A"}`;

      // Build form-data payload (easiest for a Worker to parse)
      const fd = new FormData();
      fd.append("firstName", firstName);
      fd.append("lastName", lastName);
      fd.append("email", email);
      fd.append("phone", phone);
      fd.append("company", company);
      fd.append("numberOfLocations", locations);
      fd.append("avgRtusPerLocation", rtus);
      fd.append("approxAnnualHvacSpend", spend);
      fd.append("message", msg);
      fd.append("roiSnapshot", roiLine);

      // Useful metadata
      fd.append("pageUri", window.location.href);
      fd.append("pageName", document.title);
      fd.append("timestamp", new Date().toISOString());

      try {
        const res = await fetch(WORKER_SUBMIT_URL, {
          method: "POST",
          body: fd
        });

        console.log("Lead submit status:", res.status);

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Lead submit failed:", res.status, text);
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
