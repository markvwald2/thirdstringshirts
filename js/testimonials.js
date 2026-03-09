(function initTestimonials() {
  const sections = document.querySelectorAll('.testimonials');
  if (!sections.length) return;

  sections.forEach((section) => {
    const track = section.querySelector('.testimonials-track');
    const slides = Array.from(section.querySelectorAll('.testimonial-slide'));
    const prevButton = section.querySelector('.testimonials-prev');
    const nextButton = section.querySelector('.testimonials-next');

    if (!track || !slides.length || !prevButton || !nextButton) return;

    let index = 0;
    let timer = null;

    const update = () => {
      track.style.transform = `translateX(-${index * 100}%)`;
    };

    const next = () => {
      index = (index + 1) % slides.length;
      update();
    };

    const prev = () => {
      index = (index - 1 + slides.length) % slides.length;
      update();
    };

    const restartTimer = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(next, 5000);
    };

    prevButton.addEventListener('click', () => {
      prev();
      restartTimer();
    });

    nextButton.addEventListener('click', () => {
      next();
      restartTimer();
    });

    section.addEventListener('mouseenter', () => {
      if (timer) clearInterval(timer);
    });

    section.addEventListener('mouseleave', restartTimer);

    section.addEventListener('focusin', () => {
      if (timer) clearInterval(timer);
    });

    section.addEventListener('focusout', (event) => {
      if (section.contains(event.relatedTarget)) return;
      restartTimer();
    });

    update();
    restartTimer();
  });
})();
