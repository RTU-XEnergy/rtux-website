# RTU-X Optimization Module — Option 1 Franchise Owner Site

This is a fast, secure, static one-page site designed for franchise owners.
It includes:
- Professional hero + credibility sections
- Embedded ROI calculator
- Lead capture form (email fallback)
- Subtle non-flashy animation

## Tell it where to send leads (email fallback)
Open `app.js` and set:
- `LEAD_TO_EMAIL = "hello@rtu-x.com"` (or your preferred Microsoft 365 inbox)

## Recommended: HubSpot Lead Capture (most secure)
Why: role-based access + audit trails + easy future CRM workflows.

### Option A (simple): Use HubSpot embedded form
1) In HubSpot, create a form named: `RTU-X Website Lead (Owners)`
2) Add fields matching the site: name, company, email, phone, locations, RTUs, message
3) Get the embed code.
4) Replace the `<form id="leadForm">...</form>` in `index.html` with the HubSpot embed snippet.
   (Or keep the form and submit via HubSpot API later.)

### Option B (advanced): Submit to HubSpot Forms API
If you want, I can generate a version that POSTs directly to HubSpot with:
- Portal ID
- Form GUID
- Page URI / page name
- Optional UTM capture

## Spam protection (recommended)
Add one of these:
- Cloudflare Turnstile (preferred if you host on Cloudflare)
- Google reCAPTCHA

You can place the widget inside the lead form area in `index.html`.

## Hosting (easy + secure)
- Cloudflare Pages, Netlify, or Vercel

### Cloudflare Pages
1) Create a new Pages project
2) Upload the folder contents:
   - index.html
   - styles.css
   - app.js
   - assets/rtux-logo.png
3) Set your custom domain (RTU-X.com)
4) SSL will be automatic

## Files
- `index.html`  — main site
- `styles.css`  — styling
- `app.js`      — ROI calculator + lead capture fallback + animation
- `assets/rtux-logo.png` — logo used in header
