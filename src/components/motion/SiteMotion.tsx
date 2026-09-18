"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap } from "gsap";

// Shared coverage for server-rendered and client-rendered components. New custom
// surfaces can opt in with data-motion="card" or data-motion="reveal".
const cards = [
  ".hero-story",
  ".news-card",
  ".event-card",
  ".community-card",
  ".collection-card",
  ".collection-grid > figure",
  ".stat-card",
  ".stat",
  ".desk-card",
  ".horizontal-card",
  ".support-card",
  ".plan-card",
  ".reader-history > *",
  ".directory-link",
  '[data-motion="card"]',
].join(",");
const panels = [
  ".utility-panel",
  ".facts-panel",
  ".timeline-panel",
  ".calendar",
  ".filters",
  ".public-filter",
  ".form-grid",
  ".login-card",
  ".auth-card",
  ".empty-state",
  ".notice",
  ".location-disclosure",
  ".value-chart",
  ".event-detail",
  ".resource-list",
  ".stats-grid > *",
  ".metric-grid > *",
  ".dashboard-grid > *",
].join(",");
const reveals = [
  cards,
  panels,
  ".page-heading",
  ".section-title",
  ".discovery-heading",
  ".article-header",
  ".article-dates",
  ".breadcrumb",
  ".footer-grid > *",
  ".footer-bottom",
  ".brand",
  ".masthead-actions",
  '[data-motion="reveal"]',
  ".form-grid > .field",
  ".location-fields > .field",
  ".filter-row > .field",
  ".category-nav > a",
  ".bottom-nav > a",
  ".tabs > a",
  ".page-shell > h1",
].join(",");
const controls =
  ".button,.icon-button,.chip,.tabs > a,.category-nav > a,.bottom-nav > a,.mega-menu > a,summary";
const excluded =
  '.ad-slot,.ad-sidebar,.mobile-sticky-ad,[data-motion="off"],.prose,.tiptap';

export function SiteMotion() {
  const pathname = usePathname();
  useEffect(() => {
    // AMP has its own document; the regular pages keep their HTML visible even
    // before this enhancement starts or when JavaScript is unavailable.
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      document.documentElement.dataset.motionEngine = "gsap";
      const context = gsap.context(() => {}, document.body);
      const seen = new Set<HTMLElement>();
      const pending = new Set<HTMLElement>();
      const opened = new WeakSet<HTMLElement>();
      const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
      let scanFrame = 0;
      let revealFrame = 0;
      const run = (callback: () => void) => context.add(callback);

      function flush() {
        revealFrame = 0;
        const batch = [...pending].filter((element) => element.isConnected);
        pending.clear();
        run(() => {
          const timeline = gsap.timeline();
          batch.forEach((element, index) => {
            element.dataset.motionState = "revealing";
            const isCard = element.matches(cards);
            // Animate only transforms: text keeps its full contrast throughout.
            timeline.fromTo(
              element,
              { y: isCard ? 38 : 26, scale: isCard ? 0.965 : 1 },
              {
                y: 0,
                scale: 1,
                duration: isCard ? 0.78 : 0.65,
                ease: "power3.out",
                clearProps: "transform",
                onComplete: () => {
                  element.dataset.motionState = "ready";
                },
              },
              Math.min(index % 8, 5) * 0.075,
            );
          });
        });
      }
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const element = entry.target as HTMLElement;
            observer.unobserve(element);
            pending.add(element);
          }
          if (pending.size && !revealFrame)
            revealFrame = requestAnimationFrame(flush);
        },
        { threshold: 0.06 },
      );

      function scan() {
        scanFrame = 0;
        // Forget removed cards; retained layout controls do not replay on every
        // text update. Only child-list / open changes schedule this scan.
        for (const element of seen) {
          if (!element.isConnected) {
            observer.unobserve(element);
            gsap.killTweensOf(element);
            seen.delete(element);
          }
        }
        document.querySelectorAll<HTMLElement>(reveals).forEach((element) => {
          if (seen.has(element) || element.closest(excluded)) return;
          // Avoid moving a panel and the cards inside it at the same time.
          if (element.matches(panels) && element.querySelector(cards)) return;
          seen.add(element);
          element.dataset.motionItem = element.matches(cards)
            ? "card"
            : "section";
          element.dataset.motionState = "waiting";
          observer.observe(element);
        });
        document
          .querySelectorAll<HTMLElement>("dialog[open],details[open]")
          .forEach((element) => {
            if (opened.has(element) || element.closest(excluded)) return;
            opened.add(element);
            if (element.matches("dialog")) {
              run(() => {
                gsap.fromTo(
                  element,
                  { y: 30, scale: 0.96 },
                  {
                    y: 0,
                    scale: 1,
                    duration: 0.48,
                    ease: "back.out(1.15)",
                    clearProps: "transform",
                  },
                );
                const links = element.querySelectorAll(".mega-menu > a");
                if (links.length)
                  gsap.fromTo(
                    links,
                    { x: -14 },
                    {
                      x: 0,
                      duration: 0.4,
                      stagger: { each: 0.025, amount: 0.4 },
                      ease: "power2.out",
                      clearProps: "transform",
                    },
                  );
              });
            } else {
              run(() => {
                const content = Array.from(element.children).filter(
                  (child) => child.tagName !== "SUMMARY",
                );
                if (content.length)
                  gsap.fromTo(
                    content,
                    { y: -12 },
                    {
                      y: 0,
                      duration: 0.45,
                      ease: "power3.out",
                      clearProps: "transform",
                    },
                  );
              });
            }
          });
      }
      const mutation = new MutationObserver((records) => {
        for (const record of records) {
          if (
            record.type === "attributes" &&
            record.target instanceof HTMLElement &&
            !record.target.hasAttribute("open")
          )
            opened.delete(record.target);
        }
        if (!scanFrame) scanFrame = requestAnimationFrame(scan);
      });
      mutation.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["open"],
      });
      scan();

      function cardFeedback(event: Event, active: boolean) {
        if (event instanceof PointerEvent && !finePointer.matches) return;
        const target =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>(cards)
            : null;
        if (
          !target ||
          target.closest(excluded) ||
          target.dataset.motionState !== "ready"
        )
          return;
        const related = (event as FocusEvent | PointerEvent).relatedTarget;
        if (related instanceof Node && target.contains(related)) return;
        target.dataset.motionHover = active ? "true" : "false";
        run(() => {
          gsap.to(target, {
            y: active ? -8 : 0,
            duration: active ? 0.36 : 0.5,
            ease: "power3.out",
            overwrite: "auto",
            ...(!active && { clearProps: "transform" }),
          });
          const image = target.querySelector(
            ".card-image img,.collection-image img,.hero-image img",
          );
          if (image)
            gsap.to(image, {
              scale: active ? 1.055 : 1,
              duration: 0.65,
              ease: "power3.out",
              overwrite: "auto",
              ...(!active && { clearProps: "transform" }),
            });
        });
      }
      const over = (event: Event) => cardFeedback(event, true);
      const out = (event: Event) => cardFeedback(event, false);
      let pressed: HTMLElement | null = null;
      function release() {
        if (!pressed) return;
        const element = pressed;
        pressed = null;
        run(() => {
          gsap.to(element, {
            scale: 1,
            duration: 0.4,
            ease: "back.out(2)",
            overwrite: "auto",
            clearProps: "transform",
          });
        });
      }
      function press(event: PointerEvent) {
        const target =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>(controls)
            : null;
        if (
          !target ||
          target.closest(excluded) ||
          target.matches(":disabled,[aria-disabled=true]")
        )
          return;
        pressed = target;
        run(() => {
          gsap.to(target, {
            scale: 0.94,
            duration: 0.16,
            ease: "power2.out",
            overwrite: "auto",
          });
        });
      }
      document.addEventListener("pointerover", over);
      document.addEventListener("pointerout", out);
      document.addEventListener("focusin", over);
      document.addEventListener("focusout", out);
      document.addEventListener("pointerdown", press);
      document.addEventListener("pointerup", release);
      document.addEventListener("pointercancel", release);
      window.addEventListener("blur", release);
      return () => {
        observer.disconnect();
        mutation.disconnect();
        cancelAnimationFrame(scanFrame);
        cancelAnimationFrame(revealFrame);
        document.removeEventListener("pointerover", over);
        document.removeEventListener("pointerout", out);
        document.removeEventListener("focusin", over);
        document.removeEventListener("focusout", out);
        document.removeEventListener("pointerdown", press);
        document.removeEventListener("pointerup", release);
        document.removeEventListener("pointercancel", release);
        window.removeEventListener("blur", release);
        context.revert();
        seen.forEach((element) => {
          delete element.dataset.motionItem;
          delete element.dataset.motionState;
          delete element.dataset.motionHover;
        });
        delete document.documentElement.dataset.motionEngine;
      };
    });
    return () => media.revert();
  }, [pathname]);
  return null;
}
