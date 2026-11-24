/* Solstice Group website contact form handler (Google Apps Script).
 *
 * Paste this file into a new project at https://script.google.com while signed in to the
 * Google account that should receive inquiries, then Deploy > New deployment > Web app,
 * Execute as: Me, Who has access: Anyone. Put the web app URL in FORM_ENDPOINT in js/main.js.
 *
 * Each valid submission is emailed to the account that owns this script, with Reply-To set
 * to the visitor, so replying in Gmail answers them directly. No address is stored here.
 */

/* Longest value accepted per field, matching the maxlength attributes on the form. */
var LIMITS = { name: 120, company: 160, email: 200, phone: 40, inquiry_type: 60, message: 5000 };

/* Safety valve against floods: at most this many emails per hour. */
var HOURLY_LIMIT = 30;

var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function doPost(e) {
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    /* Bots fill the hidden field. Report success so they learn nothing. */
    if (data._honey) return reply_(true);

    var form = {};
    Object.keys(LIMITS).forEach(function (key) {
      form[key] = String(data[key] || "").trim().slice(0, LIMITS[key]);
    });

    if (!form.name || !form.company || !form.inquiry_type || form.message.length < 10 || !EMAIL_PATTERN.test(form.email)) {
      return reply_(false, "Some fields are missing or invalid.");
    }

    var cache = CacheService.getScriptCache();
    var sent = Number(cache.get("sent") || 0);
    if (sent >= HOURLY_LIMIT) return reply_(false, "Too many messages right now. Try again later.");
    cache.put("sent", String(sent + 1), 3600);

    var rows = [
      ["Name", form.name],
      ["Company", form.company],
      ["Email", form.email],
      ["Phone", form.phone || "Not provided"],
      ["Inquiry type", form.inquiry_type],
      ["Message", form.message]
    ];

    MailApp.sendEmail({
      to: Session.getEffectiveUser().getEmail(),
      replyTo: form.email,
      name: "Solstice Group website",
      subject: "Website inquiry: " + form.inquiry_type,
      body: rows.map(function (row) { return row[0] + ": " + row[1]; }).join("\n"),
      htmlBody: "<table cellpadding=\"6\" style=\"border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px\">" +
        rows.map(function (row) {
          return "<tr><th align=\"left\" valign=\"top\" style=\"color:#4B5563;font-weight:600;white-space:nowrap\">" + escape_(row[0]) +
            "</th><td style=\"white-space:pre-wrap\">" + escape_(row[1]) + "</td></tr>";
        }).join("") + "</table>"
    });

    return reply_(true);
  } catch (err) {
    return reply_(false, "Your message could not be sent.");
  }
}

/* Opening the web app URL in a browser shows that it is running. */
function doGet() {
  return reply_(true, "Solstice Group contact form endpoint.");
}

function reply_(ok, message) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: ok, message: message || "" }))
    .setMimeType(ContentService.MimeType.JSON);
}

function escape_(text) {
  return String(text).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c];
  });
}
