// RTU-X Optimization Module — ROI + Lead Capture + Subtle Reveal Animation
(function(){
  const $ = (id)=>document.getElementById(id);

  // Year
  const y = $("year");
  if(y) y.textContent = new Date().getFullYear();

  // ROI calculation
  function money(n){
    return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
  }

  function calcROI(){
    const spend = Number($("annualSpend").value || 0);
    const pct = Number($("savingsPct").value || 0) / 100;
    const cost = Number($("systemCost").value || 0);

    const out = $("roiResult");
    if(spend <= 0 || pct <= 0 || cost <= 0){
      out.textContent = "Enter values to estimate payback.";
      out.dataset.payback = "";
      out.dataset.annualSavings = "";
      return;
    }
    const annualSavings = spend * pct;
    const years = cost / annualSavings;
    const months = years * 12;

    out.textContent = `Estimated payback: ${years.toFixed(2)} years (~${Math.round(months)} months) • Annual savings ≈ ${money(annualSavings)}`;
    out.dataset.payback = years.toFixed(2);
    out.dataset.annualSavings = Math.round(annualSavings).toString();
  }

  $("calcBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); calcROI(); });
  ["annualSpend","savingsPct","systemCost"].forEach(id=>{
    $(id)?.addEventListener("input", calcROI);
  });
  calcROI();

  // "Email me this estimate" — prefill the lead form message with ROI estimate
  $("emailEstimateBtn")?.addEventListener("click", (e)=>{
    // ensure ROI is up to date
    calcROI();
    const spend = $("annualSpend").value;
    const pct = $("savingsPct").value;
    const cost = $("systemCost").value;
    const payback = $("roiResult").dataset.payback || "";
    const annualSavings = $("roiResult").dataset.annualSavings || "";

    const msg = $("leadMessage");
    if(msg){
      const lines = [
        "ROI estimate (from website calculator):",
        `- Annual HVAC spend: $${spend}`,
        `- Estimated savings: ${pct}%`,
        `- Installed investment: $${cost}`,
        payback && annualSavings ? `- Estimated annual savings: $${annualSavings} • Payback: ${payback} years` : "",
        "",
        "Site notes:",
      ].filter(Boolean);
      if(!msg.value.trim()){
        msg.value = lines.join("\n");
      }
    }
  });

  // Lead capture submission:
  // Default behavior is a secure CRM form (HubSpot) once configured.
  // Until configured, we fall back to a mailto draft to your Microsoft email.
  const LEAD_TO_EMAIL = "hello@rtu-x.com"; // <-- change if you want a different inbox

  $("leadForm")?.addEventListener("submit", (e)=>{
    e.preventDefault();

    // Collect fields
    const payload = {
      name: $("leadName")?.value?.trim() || "",
      company: $("leadCompany")?.value?.trim() || "",
      email: $("leadEmail")?.value?.trim() || "",
      phone: $("leadPhone")?.value?.trim() || "",
      locations: $("leadLocations")?.value || "",
      rtus: $("leadRTUs")?.value || "",
      message: $("leadMessage")?.value?.trim() || "",
      // Include ROI snapshot if present
      roi: $("roiResult")?.textContent || ""
    };

    // TODO: HubSpot integration (recommended)
    // Replace this fallback by embedding HubSpot form per README.md
    // For now: generate email draft
    const subject = encodeURIComponent("RTU-X Optimization Module — Savings Estimate / Pilot Request");
    const body = encodeURIComponent(
`Hello RTU-X Energy,

I’d like a savings estimate / pilot conversation.

Name: ${payload.name}
Company: ${payload.company}
Email: ${payload.email}
Phone: ${payload.phone}
# of locations: ${payload.locations}
Avg RTUs per location: ${payload.rtus}

ROI snapshot:
${payload.roi}

Message:
${payload.message || "(none)"}

Thanks,
${payload.name}`
    );

    window.location.href = `mailto:${LEAD_TO_EMAIL}?subject=${subject}&body=${body}`;
  });

  // Subtle reveal on scroll
  const els = document.querySelectorAll(".reveal");
  const obs = new IntersectionObserver((entries, observer)=>{
    entries.forEach(ent=>{
      if(ent.isIntersecting){
        ent.target.classList.add("visible");
        observer.unobserve(ent.target);
      }
    });
  }, {threshold: 0.18});
  els.forEach(el=>obs.observe(el));
})();
// ===============================
// HubSpot Lead Capture (RTU-X)
// Connects the site-styled form (#leadForm) to HubSpot Form Submissions API
// Portal: 245308395 | Form: e71670fc-ea6b-4840-a91e-759ff3a2ea30 | Region: na2
// ===============================
(function hubspotLeadCapture() {
  const form = document.getElementById("leadForm");
  if (!form) return;

  // Prevent double-submits
  let isSubmitting = false;

  // Create an inline status element (if not already present)
  let statusEl = form.querySelector(".form-status");
  if (!statusEl) {
    statusEl = document.createElement("div");
    statusEl.className = "form-status";
    statusEl.style.marginTop = "12px";
    statusEl.style.fontSize = "14px";
    statusEl.style.opacity = "0.95";
    form.appendChild(statusEl);
  }

  function setStatus(message, type) {
    statusEl.textContent = message;
    // type: "ok" | "err" | "info"
    if (type === "ok") statusEl.style.color = "#7CFCB0";
    else if (type === "err") statusEl.style.color = "#FFB4B4";
    else statusEl.style.color = "#E7EDF7";
  }

  function getVal(name) {
    const el = form.querySelector(`[name="${name}"]`);
    return el ? String(el.value || "").trim() : "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Required fields (match your HTML)
    const firstName = getVal("firstName");
    const lastName = getVal("lastName");
    const email = getVal("email");

    if (!firstName || !lastName || !email) {
      setStatus("Please complete First name, Last name, and Email.", "err");
      return;
    }

    isSubmitting = true;
    setStatus("Submitting…", "info");

    const portalId = "245308395";
    const formId = "e71670fc-ea6b-4840-a91e-759ff3a2ea30";
    const endpoint = `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`;

    // Map your site fields to HubSpot properties
    // These property names should exist in HubSpot:
    // - firstname, lastname, email are standard
    // - phone, company are standard (company may map differently depending on object; keep as a property for now)
    // - number_of_locations should be the internal name of the custom property you created
    // - message: map to "message" if you created it as a property; otherwise map to "hs_content"
    const payload = {
      fields: [
        { name: "firstname", value: firstName },
        { name: "lastname", value: lastName },
        { name: "email", value: email },
        { name: "phone", value: getVal("phone") },
        { name: "company", value: getVal("company") },
        { name: "number_of_locations", value: getVal("locations") },
        { name: "message", value: getVal("message") }
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

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("HubSpot submission failed:", res.status, text);
        setStatus("Submitted locally, but CRM sync failed. Please email us directly at dan@rtu-x.com.", "err");
        isSubmitting = false;
        return;
      }

      // Success
      setStatus("✅ Thanks — we received your request. We’ll reach out shortly.", "ok");
      form.reset();
    } catch (err) {
      console.error("HubSpot submission error:", err);
      setStatus("Connection issue. Please email us directly at dan@rtu-x.com.", "err");
    } finally {
      isSubmitting = false;
    }
  });
})();
