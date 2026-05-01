(() => {
  // <stdin>
  document.documentElement.classList.add("js");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initContactForm);
  } else {
    initContactForm();
  }
  function initContactForm() {
    const contactForm = document.querySelector(".js-contact-form");
    if (!contactForm) {
      return;
    }
    const statusContainer = contactForm.closest(".page") || document;
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const statusElement = statusContainer.querySelector(".form-status");
    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const endpoint = resolveEndpoint(contactForm);
      if (!endpoint) {
        setStatus("error", "Sorry, the contact form is not configured yet.");
        return;
      }
      const formData = new FormData(contactForm);
      const payload = {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        message: String(formData.get("message") || "").trim(),
        turnstileToken: String(formData.get("cf-turnstile-response") || "").trim(),
        honeypot: String(formData.get("company") || "").trim(),
        sourceUrl: window.location.href
      };
      if (!payload.turnstileToken) {
        setStatus("error", "Please complete the verification challenge before sending.");
        return;
      }
      setBusy(true);
      setStatus("pending", "Please wait while your message is being sent...");
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify(payload)
        });
        const data = await readJson(response);
        if (!response.ok || !data.ok) {
          setStatus("error", data.message || "Sorry, we could not send your message. Please try again.");
          resetTurnstile();
          return;
        }
        contactForm.reset();
        resetTurnstile();
        setStatus("success", "Thank you. Message sent.");
      } catch {
        setStatus("error", "Sorry, there was a network issue while sending your message. Please try again.");
        resetTurnstile();
      } finally {
        setBusy(false);
      }
    });
    function setBusy(isBusy) {
      if (submitButton) {
        submitButton.disabled = isBusy;
        submitButton.textContent = isBusy ? "Sending..." : "Send message";
      }
    }
    function setStatus(state, text) {
      if (!statusElement) {
        return;
      }
      statusElement.textContent = text;
      statusElement.dataset.state = state;
    }
    function resetTurnstile() {
      if (window.turnstile && typeof window.turnstile.reset === "function") {
        window.turnstile.reset();
      }
    }
  }
  function resolveEndpoint(form) {
    const primary = form.dataset.contactEndpoint || "";
    const local = form.dataset.contactLocalEndpoint || "";
    const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    if (isLocalHost && local) {
      return local;
    }
    return primary;
  }
  async function readJson(response) {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }
})();
