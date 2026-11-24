# solsticegroupusa.com

Static website for Solstice Group LLC. Plain HTML, one stylesheet, one script. No build step, no dependencies. It deploys to GitHub Pages as is.

```
index.html        Home page (services, how we work, about, contact)
privacy.html      Privacy Policy
terms.html        Terms of Use
404.html          Not found page (GitHub Pages serves it automatically)
css/styles.css    All styles, including print
js/main.js        Site config, mobile menu, in-page scrolling, form validation
assets/           Fonts, favicon.svg, favicon.ico, apple-touch-icon.png, og-image.png
tools/            render-assets.cjs (regenerates the icons and the social image)
CNAME             solsticegroupusa.com
robots.txt, sitemap.xml, .nojekyll
```

Preview locally from this folder with any static server, for example:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## 1. Three values to swap before launch

All three live in one config block at the top of `js/main.js`, lines 3 to 7:

```js
const SITE_CONFIG = {
  mailingAddress: "[MAILING ADDRESS PLACEHOLDER]",
  publicPhone: "[PUBLIC PHONE PLACEHOLDER]",
  formspreeEndpoint: "FORMSPREE_ENDPOINT_PLACEHOLDER"
};
```

The script writes the address and phone into the Contact section and the footer of every page. Edit the values once and every page updates.

### Mailing address (line 4)

Replace the text inside the quotes with the address exactly as it should appear, on one line. Example format: `"Street, Suite, City, VA ZIP"`. If you would rather not show an address, set it to `""` and the row disappears.

### Public phone (line 5)

Replace with the number as it should read, for example `"(703) 555-0100"` format. The script turns it into a tap-to-call link automatically. Set it to `""` to hide the row.

### Formspree endpoint (line 6)

1. Create a free account at https://formspree.io and create a new form.
2. Set the form's notification email to info@solsticegroupusa.com.
3. Copy the form endpoint. It looks like `https://formspree.io/f/abcdwxyz`.
4. Paste it as the value of `formspreeEndpoint`.

Until a real endpoint is set, the form still validates, then offers to open the visitor's email app with their message filled in. A direct email link sits under the form at all times. The site's Content Security Policy already allows `https://formspree.io`, so no other change is needed.

### After you swap the address and phone: structured data

The JSON-LD block in the `<head>` of `index.html` leaves out address and telephone on purpose, because placeholder text is not valid structured data. Once the real values exist, add these two properties inside that block, after the `"email"` line, filling in your own values:

```json
"telephone": "+1-<area code>-<number>",
"address": {
  "@type": "PostalAddress",
  "streetAddress": "<street and suite>",
  "addressLocality": "<city>",
  "addressRegion": "VA",
  "postalCode": "<ZIP>",
  "addressCountry": "US"
},
```

## 2. Deploy to GitHub Pages

Push the contents of this folder only. Keep the company formation documents in the parent folder out of the repository.

1. Sign in to GitHub as **AbhayChauhan123** and create a new repository named **solstice-site**. Public, no README, no license (this folder already has what it needs).
2. From inside this folder, run:

   ```bash
   git init
   git add .
   git commit -m "Solstice Group website"
   git branch -M main
   git remote add origin https://github.com/AbhayChauhan123/solstice-site.git
   git push -u origin main
   ```

3. In the repository on GitHub, open **Settings > Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**, **Branch** to **main**, folder **/ (root)**, then **Save**.
5. Under **Custom domain**, enter `solsticegroupusa.com` and **Save**. (The `CNAME` file in this folder already contains it.)
6. Add the DNS records in section 3 below. GitHub's DNS check can take from a few minutes to a few hours to pass.
7. Once the check passes and the certificate is issued, tick **Enforce HTTPS**.

Optional but recommended: verify the domain for your account in **GitHub Settings > Pages > Add a domain**. GitHub gives you a TXT record named `_github-pages-challenge-AbhayChauhan123` to add in Namecheap. This stops anyone else from claiming the domain on GitHub Pages.

## 3. Namecheap DNS records

In Namecheap: **Domain List > solsticegroupusa.com > Manage > Advanced DNS**.

Remove any default **URL Redirect Record** and any **CNAME** on `@` or `www` that points to a Namecheap parking page. Then add:

| Type | Host | Value | TTL |
|---|---|---|---|
| A Record | @ | 185.199.108.153 | Automatic |
| A Record | @ | 185.199.109.153 | Automatic |
| A Record | @ | 185.199.110.153 | Automatic |
| A Record | @ | 185.199.111.153 | Automatic |
| CNAME Record | www | abhaychauhan123.github.io. | Automatic |

**Do not touch any existing TXT records.** They may hold domain verification, SPF, or other records that other services depend on.

## 4. Adding Zoho Mail later

Email records sit beside the website records and do not affect them. The A records and the `www` CNAME stay exactly as above. Never add a CNAME on `@`, because it would replace the A records and take the site down.

1. In Zoho Mail admin, add the domain and verify it with the TXT (or CNAME) value Zoho gives you. Add it as a new record in Advanced DNS. Do not edit existing records.
2. In Namecheap, scroll to **Mail Settings** on the Advanced DNS page and choose **Custom MX**. Add:

   | Type | Host | Value | Priority |
   |---|---|---|---|
   | MX | @ | mx.zoho.com | 10 |
   | MX | @ | mx2.zoho.com | 20 |
   | MX | @ | mx3.zoho.com | 50 |

   Confirm these hostnames in the Zoho admin console first. Accounts in other regions use different hosts, for example `mx.zoho.eu` for EU accounts.
3. SPF: add one TXT record on `@` with the value `v=spf1 include:zoho.com ~all`. A domain may have only one SPF record. If a TXT record on `@` already starts with `v=spf1`, edit that one and add `include:zoho.com` before the `~all` instead of creating a second one.
4. DKIM: in Zoho admin, open **Email Authentication > DKIM**, add a selector (for example `zmail`), and copy the generated key. Add a TXT record with host `zmail._domainkey` and the full key as the value. Then click **Verify** in Zoho.
5. Optional DMARC once SPF and DKIM pass: TXT record, host `_dmarc`, value `v=DMARC1; p=none; rua=mailto:info@solsticegroupusa.com`.

## 5. Regenerating the icons and social image

The favicon, Apple touch icon, and Open Graph image are rendered with the site font (Geist) by `tools/render-assets.cjs`, using Playwright's Chromium. To change them, edit the script and run it from this folder with Playwright available:

```bash
npm install --no-save playwright && npx playwright install chromium
node tools/render-assets.cjs
```

## Notes

- Font: Geist (weights 500 and 700), Latin subset self-hosted from Google Fonts under the SIL Open Font License. No requests go to third-party font servers.
- No cookies, analytics, or trackers. If you add analytics later, update `privacy.html`.
- The Content Security Policy is a meta tag in each page's head. The inline script that adds the `js` class is allowed by its SHA-256 hash; if you edit that one line, update the hash.
- Everything in this folder is published by GitHub Pages, including this README and the `tools` folder. Neither contains anything private.
