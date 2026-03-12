# Third String Shirts

Depth chart drip for people who peaked in warmups.

This repo powers [thirdstringshirts.com](https://www.thirdstringshirts.com/), a custom storefront for mildly unhinged t-shirts aimed at backups, bench legends, and anyone with elite confidence and extremely average measurable results.

It is a static site. No framework. No build step. No VC-funded delusion deck. Just HTML, CSS, JavaScript, and a stubborn commitment to making the repo page look cooler than it has any right to.

## What this is

- A custom storefront layered on top of Spreadshirt fulfillment.
- A brand site with the same tone as the shirts: self-aware, loud, and not especially interested in acting professional.
- A small pile of admin tools for managing inventory and taglines without making everything worse.

## What's in the repo

- `index.html`, `about.html`, `faq.html`, `contact.html`, `all-shirts.html`, `shop.html`: the public-facing site.
- `css/`: global styles, homepage variants, and the rest of the visual bad decisions.
- `js/`: storefront logic, homepage population, testimonials, and hero rotation.
- `data/`: inventory and tagline data that feed the site.
- `assets/`: logo and product imagery.
- `tools/`: internal utility pages and scripts for inventory/tagline wrangling.

## Run it locally

You can open the pages directly, but using a tiny local server avoids dumb browser file restrictions:

```bash
python3 -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000).

## Rich preview product pages

Shirt share links now live under `/shirt/.../` so text messages and social apps can render the actual shirt art from `og:image` metadata.

When inventory or taglines change, regenerate those static product pages with:

```bash
node tools/generate-product-pages.js
```

## Notes

- Checkout is fulfilled through Spreadshirt.
- The live site uses the custom domain in [`CNAME`](/Users/markvahrenwald/Repositories/thirdstringshirts/CNAME).
- Tooling notes live in [`tools/README.md`](/Users/markvahrenwald/Repositories/thirdstringshirts/tools/README.md).

If you are somehow a fourth stringer, this repo is not for you.
