import type { WebStory } from "@/lib/v4/types";
import { xml, safePublicLink } from "@/lib/v4/utils";
export function ampStory(
  story: WebStory,
  site: { url: string; fullName: string; logo: string },
  nonce = "",
) {
  const canonical = site.url + "/stories/" + story.slug + "/amp",
    n = nonce ? ' nonce="' + xml(nonce) + '"' : "";
  const absolute = (url: string) => new URL(url, site.url).href;
  const boilerplate =
    "body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}";
  return (
    '<!doctype html><html amp lang="kn"><head><meta charset="utf-8"><script async src="https://cdn.ampproject.org/v0.js"' +
    n +
    '></script><script async custom-element="amp-story" src="https://cdn.ampproject.org/v0/amp-story-1.0.js"' +
    n +
    "></script><title>" +
    xml(story.title_kn) +
    '</title><meta name="viewport" content="width=device-width,minimum-scale=1,initial-scale=1"><link rel="canonical" href="' +
    xml(canonical) +
    '">' +
    (story.is_seed ? '<meta name="robots" content="noindex,nofollow">' : "") +
    "<style amp-boilerplate>" +
    boilerplate +
    '</style><noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript><style amp-custom>amp-story{font-family:Arial,sans-serif;color:#fff}amp-story-grid-layer[template=vertical]{align-content:end;background:linear-gradient(transparent,rgba(0,0,0,.85));padding:32px 24px 64px}h1{font-size:28px;line-height:1.5}p{font-size:14px;line-height:1.5}a{color:#fff}</style></head><body><amp-story standalone title="' +
    xml(story.title_kn) +
    '" publisher="' +
    xml(site.fullName) +
    '" publisher-logo-src="' +
    xml(absolute(site.logo)) +
    '" poster-portrait-src="' +
    xml(absolute(story.cover_url)) +
    '">' +
    story.slides
      .map(
        (s, i) =>
          '<amp-story-page id="slide-' +
          i +
          '"><amp-story-grid-layer template="fill"><amp-img src="' +
          xml(absolute(s.image)) +
          '" width="900" height="1600" layout="responsive" alt="' +
          xml(s.text) +
          '"></amp-img></amp-story-grid-layer><amp-story-grid-layer template="vertical">' +
          (story.is_seed ? "<p>ಮಾದರಿ ಚಿತ್ರಕಥೆ</p>" : "") +
          "<h1>" +
          xml(s.text) +
          "</h1><p>ಚಿತ್ರ: " +
          xml(s.credit) +
          "</p>" +
          "</amp-story-grid-layer>" +
          (s.href && safePublicLink(s.href)
            ? '<amp-story-page-outlink layout="nodisplay"><a href="' +
              xml(absolute(s.href)) +
              '">ಮುಂದೆ ಓದಿ</a></amp-story-page-outlink>'
            : "") +
          "</amp-story-page>",
      )
      .join("") +
    "</amp-story></body></html>"
  );
}
