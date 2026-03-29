/**
 * GreenerCheck white-label embed: loads the calculator in an iframe and forwards
 * leads to your server webhook (see /api/installer/[installerId]/webhook).
 *
 * Usage (one line — place before </body> or without `async` so the script can find itself):
 *   <script src="https://YOUR_DOMAIN/embed.js" data-installer-id="demo" async></script>
 *
 * Optional data attributes (also accepted as query params on the iframe URL):
 *   data-primary-color="#047857"
 *   data-company-name="Acme HVAC"
 *   data-logo-url="https://example.com/logo.png"
 */
(function () {
  function findScript() {
    var cs = document.currentScript;
    if (cs && cs.getAttribute("data-installer-id")) return cs;
    var nodes = document.querySelectorAll("script[src*='embed.js']");
    return nodes.length ? nodes[nodes.length - 1] : null;
  }

  var script = findScript();
  if (!script || !script.src) {
    console.warn("[GreenerCheck embed] Could not resolve embed script element.");
    return;
  }

  var scriptSrc = script.src;
  var base = new URL(scriptSrc).origin;
  var installerId = script.getAttribute("data-installer-id");
  if (!installerId) {
    console.warn("[GreenerCheck embed] Missing data-installer-id on script tag.");
    return;
  }

  var params = new URLSearchParams();
  var pc = script.getAttribute("data-primary-color");
  var cn = script.getAttribute("data-company-name");
  var logo = script.getAttribute("data-logo-url");
  if (pc) params.set("primaryColor", pc);
  if (cn) params.set("companyName", cn);
  if (logo) params.set("logoUrl", logo);

  var qs = params.toString();
  var src =
    base +
    "/embed/" +
    encodeURIComponent(installerId) +
    (qs ? "?" + qs : "");

  var iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = "Ontario retrofit grant calculator";
  iframe.setAttribute("loading", "lazy");
  iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  iframe.style.width = "100%";
  iframe.style.height = "700px";
  iframe.style.border = "none";
  iframe.style.display = "block";

  var parent = script.parentNode;
  if (parent) {
    parent.insertBefore(iframe, script.nextSibling);
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== new URL(scriptSrc).origin) return;
    var d = e.data;
    if (!d || d.type !== "GREENCHECK_EMBED_LEAD") return;
    if (d.installerId !== installerId) return;

    fetch(
      base +
        "/api/installer/" +
        encodeURIComponent(installerId) +
        "/webhook",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d.lead && typeof d.lead === "object" ? d.lead : {}),
        mode: "cors",
      }
    ).catch(function (err) {
      console.warn("[GreenerCheck embed] Webhook forward failed", err);
    });
  });
})();
