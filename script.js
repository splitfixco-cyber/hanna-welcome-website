const cards = document.querySelectorAll(".flip-card");

// Only one card open at a time: opening a card closes the others.
function flipCard(card) {
  const opening = !card.classList.contains("is-flipped");

  cards.forEach((other) => {
    other.classList.remove("is-flipped");
  });

  card.classList.toggle("is-flipped", opening);
}

cards.forEach((card) => {
  card.addEventListener("click", () => {
    flipCard(card);
  });

  card.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    flipCard(card);
  });
});

const videoThumbs = document.querySelectorAll(".video-thumb[data-video-id]");

videoThumbs.forEach((thumb) => {
  thumb.addEventListener("click", () => {
    const iframe = document.createElement("iframe");
    iframe.src =
      "https://www.youtube-nocookie.com/embed/" +
      thumb.dataset.videoId +
      "?autoplay=1";
    iframe.title = thumb.getAttribute("aria-label");
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    thumb.replaceChildren(iframe);
  });
});

const chips = document.querySelectorAll(".chip[data-filter]");
const bookCards = document.querySelectorAll(".book-card[data-lang]");

function applyFilter(filter) {
  chips.forEach((chip) => {
    chip.classList.toggle("is-active", chip.dataset.filter === filter);
  });

  bookCards.forEach((card) => {
    const langs = card.dataset.lang.split(" ");
    card.classList.toggle(
      "is-hidden",
      filter !== "all" && !langs.includes(filter)
    );
  });
}

if (chips.length > 0) {
  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      applyFilter(chip.dataset.filter);
    });
  });

  const hashFilters = { "#english": "en", "#spanish": "es", "#portuguese": "pt", "#trilingual": "tri" };

  function applyHashFilter() {
    const filter = hashFilters[window.location.hash];

    if (filter) {
      applyFilter(filter);
    }
  }

  window.addEventListener("hashchange", applyHashFilter);
  applyHashFilter();
}

// Newsletter: save the email through /api/subscribe and thank them in place
const avisos = {
  es: { ok: "¡Gracias! Revisa tu correo: te mandé la revista Hey! 💛", error: "No pudimos guardar tu correo. Revísalo e inténtalo de nuevo." },
  en: { ok: "Thank you! Check your inbox: Hey! magazine is on its way 💛", error: "We couldn't save your email. Please check it and try again." },
  pt: { ok: "Obrigada! Veja seu e-mail: a revista Hey! já está a caminho 💛", error: "Não conseguimos salvar seu e-mail. Confira e tente de novo." },
};

document.querySelectorAll("form.newsletter[data-lang]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const texto = avisos[form.dataset.lang] || avisos.en;
    const boton = form.querySelector("button");
    const datos = new FormData(form);
    datos.append("lang", form.dataset.lang);
    datos.append("origen", form.dataset.origen || "");
    boton.disabled = true;

    let aviso = form.nextElementSibling;
    if (!aviso || !aviso.classList.contains("newsletter-aviso")) {
      aviso = document.createElement("p");
      aviso.className = "newsletter-aviso";
      aviso.setAttribute("role", "status");
      form.after(aviso);
    }

    try {
      const respuesta = await fetch(form.action, { method: "POST", body: datos });
      if (!respuesta.ok) throw new Error(respuesta.status);
      aviso.textContent = texto.ok;
      form.reset();
      form.hidden = true;
    } catch {
      aviso.textContent = texto.error;
      boton.disabled = false;
    }
  });
});
