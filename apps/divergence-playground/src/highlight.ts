import Prism from "prismjs";
import "prismjs/components/prism-css";
import "prismjs/themes/prism.css";

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function highlightCss(code: string) {
  return Prism.highlight(code, Prism.languages.css, "css");
}

export function highlightText(code: string) {
  return escapeHtml(code);
}
