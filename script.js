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
