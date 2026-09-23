# N1–N4: Whole site (mobile, footer, 3D, reduced motion, no WebGL)

**Code:** `components/3d/HeroScene.tsx` (lazy in `Home.tsx`) · `index.css` reduced-motion block · `components/Footer.tsx`

## What "correct" means
- **N1:** 375 px, no horizontal scroll on any route of any role; the navbar collapses to a menu.
- **N2:** "Unofficial student project. Clubs and events are sample data." on every page, including logins.
- **N4 reduced motion:**
  - With `prefers-reduced-motion: reduce`, the scene renders **one** static frame and its animation loop stops.
  - It reacts **live** if the OS setting changes while the page is open.
  - CSS transitions and hover lifts are switched off.
- **N4 no WebGL:** the page renders fully without a canvas and with no errors.

## How reduced motion is verified
The scene container carries `data-motion` (`reduced` / `full`) and `data-frames` (the number of frames drawn). The e2e test turns reduced motion on using Chrome's real media emulation and checks:
- the container says `reduced`
- `frames` is 1 and **still** 1 a second later, so no loop is running

Then it switches back to no-preference and checks that frames climb.

## Test cases
| # | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| 1 | emulate reduce, open Home, wait 1.5 s + 1 s | reduced, 1 frame, stays 1 | motion=reduced, frames=1 (still 1 after 1 s) | ✅ |
| 2 | switch emulation back while open | animation resumes | motion=full, frames=24 after 1 s | ✅ |
| 3 | WebGL blocked | page works | 0 canvases, hero + search + featured rendered, 0 page errors | ✅ |
| 4 | 17 routes (public, student, manager, faculty) at 375 px | no sideways scroll | all scrollWidth ≤ 375 | ✅ |
| 5 | 7 routes incl. faculty + login | footer notice | present on all 7 | ✅ |
| 6 | whole e2e run | no uncaught errors | 0 | ✅ |

## Results
2026-09-23 · e2e 6/6. The v1 open item "reduced motion still to verify by hand" is now **implemented properly** (the old code kept the loop running and only skipped the movement) and **verified automatically**. You can also check by hand: Windows Settings → Accessibility → Visual effects → Animation effects **Off**, reload Home, and the shapes stop.
