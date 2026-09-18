# GSAP component motion

`src/components/motion/SiteMotion.tsx` is mounted once in the root layout. GSAP 3.15 drives the motion; IntersectionObserver starts each reveal when the component enters the viewport. Components remain server rendered and visible without JavaScript.

- News, event, community, collection and other registered cards rise 38px and scale from 0.965 over 0.78 seconds, with 75ms stagger steps and a capped group delay.
- Headings, forms, utility panels, navigation items and footer columns enter with a 26px movement. Text stays opaque throughout to preserve contrast.
- Pointer and keyboard focus lift cards 8px. Card images zoom to 1.055, then ease back on exit. Buttons have press/release feedback.
- Open dialogs scale and move into position, with staggered navigation links. Expanded details panels reveal their contents.
- MutationObserver registers streamed, filtered and dynamically mounted components. Route changes dispose observers, listeners and animation contexts. GSAP matchMedia reverts motion immediately when reduced motion is selected.
- Ad units and editorial text bodies are excluded from movement. Reading remains native; scrolling is not intercepted.

For a new reusable component, use an existing registered component class or add `data-motion="card"` for a card and `data-motion="reveal"` for a section. Use `data-motion="off"` on a subtree to opt out. Avoid placing a reveal on a container that already has individually animated cards.

Browser tests in `tests/e2e/motion.spec.ts` verify actual GSAP transforms, below-fold activation, dynamically inserted cards, pointer feedback, reduced-motion changes, ad exclusion and route navigation. The implementation follows the GSAP [context](https://gsap.com/docs/v3/GSAP/gsap.context()/) and [responsive motion](https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/) patterns.
