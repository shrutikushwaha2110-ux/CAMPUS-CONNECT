# N1–N4: Whole-site (mobile, footer, 3D, fallback)

**Requirements (SPEC §5):** N1 375 px · N2 footer notice · N3 purposeful 3D · N4 works without WebGL / with reduced motion
**Code:** `components/3d/HeroScene.tsx` (lazy in `Home.tsx`) · `components/Footer.tsx` · Tailwind breakpoints

## What "correct" means
- At 375 px there is no horizontal scroll on any route and the nav collapses to a menu.
- Every page shows "Unofficial student project. Clubs and events are sample data."
- The 3D scene sits behind the hero, and all text and controls stay HTML. Mobile gets 4 shapes and no particles.
- If WebGL creation fails, the page still renders with no uncaught error. Under reduced motion, nothing animates.

## Test cases
| # | Input | Expected | Actual | Pass/Fail |
|---|---|---|---|---|
| 1 | 9 routes at 375×812 | scrollWidth = 375 | 375 on all 9 | ✅ |
| 2 | 9 routes | footer notice | present on all 9 | ✅ |
| 3 | Home desktop | shapes + particles, UI usable | as expected (screenshot) | ✅ |
| 4 | Force `getContext('webgl')` → null | Home still works | 0 canvases, hero/search/featured OK, no uncaught errors | ✅ |
| 5 | OS reduced motion on | shapes still | **to verify by hand** | ⬜ |
| 6 | `npm run build` | passes | passes; HeroScene split into its own 481 KB chunk | ✅ |

## Results
2026-09-23 · 5/6 pass, 1 still to verify manually.
