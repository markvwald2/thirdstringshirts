(function applyRandomHeroVariant() {
  const hero = document.querySelector(".hero");
  if (!hero) return;

  const headline = hero.querySelector("h1");
  const subhead = hero.querySelector("p");
  const cta = hero.querySelector(".mock-actions .button");
  const sideCard = hero.querySelector(".hero-card");
  if (!headline || !subhead || !cta || !sideCard) return;

  const variants = [
    {
      cls: "hero-variant-1",
      h1: "DEPTH CHART DRIP FOR PEOPLE WHO PEAKED IN WARMUPS.",
      p: "Built for role players, loud bench guys, and anyone one bad decision from elite status.",
      cta: "Run The Shop",
      note:
        "<p><strong>Third String Creed</strong></p>" +
        "<p>1. Be loud anyway.</p>" +
        "<p>2. Miss shots confidently.</p>" +
        "<p>3. Blame the refs politely.</p>"
    },
    {
      cls: "hero-variant-2",
      h1: "BENCH MOB UNIFORMS FOR THE LOUDEST NAME ON THE ROSTER.",
      p: "Snarky shirts for backups, benchwarmers, and occasional legends with suspicious confidence.",
      cta: "Shop The Bench",
      note:
        "<p><strong>Bench Mob Values</strong></p>" +
        "<p>1. Effort over elegance.</p>" +
        "<p>2. Chaos over polish.</p>" +
        "<p>3. Shirt game over game game.</p>"
    },
    {
      cls: "hero-variant-3",
      h1: "STARTING LINEUP ENERGY, BACKUP PLAN CREDENTIALS.",
      p: "Wearable trash talk for people who clap from the sideline and still call game.",
      cta: "See The Lineup",
      note:
        "<p><strong>Eligibility Requirements</strong></p>" +
        "<p>1. Mid stats accepted.</p>" +
        "<p>2. Delusional confidence preferred.</p>" +
        "<p>3. Trash talk mandatory.</p>"
    },
    {
      cls: "hero-variant-4",
      h1: "UNDERDOG MERCH FOR PEOPLE WHO STILL TALK TRASH DOWN 20.",
      p: "If your best skill is confidence and your second best is sarcasm, you are home.",
      cta: "Browse The Chaos",
      note:
        "<p><strong>Game Plan</strong></p>" +
        "<p>1. Wear absurd shirt.</p>" +
        "<p>2. Talk reckless.</p>" +
        "<p>3. Pretend this was the strategy.</p>"
    },
    {
      cls: "hero-variant-5",
      h1: "SHIRTS FOR 3RD STRINGERS. ATTITUDE FOR STARTERS.",
      p: "Average records. Elite shirt game. Zero plans to act normal about it.",
      cta: "Enter The Shop",
      note:
        "<p><strong>Official Policy</strong></p>" +
        "<p>1. Third stringers welcome.</p>" +
        "<p>2. Second stringers tolerated.</p>" +
        "<p>3. Fourth stringers under review.</p>"
    }
  ];

  const selected = variants[Math.floor(Math.random() * variants.length)];
  hero.classList.add(selected.cls);
  headline.textContent = selected.h1;
  subhead.textContent = selected.p;
  cta.textContent = selected.cta;
  sideCard.innerHTML = selected.note;
})();
