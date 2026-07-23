import type { LaidOutNode } from "@/lib/layout/types";

export interface ExportBounds {
   minX: number;
   minY: number;
   width: number;
   height: number;
}

const EXPORT_PADDING = 40;

export function computeFlowchartBounds(nodes: LaidOutNode[]): ExportBounds {
   if (nodes.length === 0) return { minX: 0, minY: 0, width: 400, height: 300 };
   const minX = Math.min(...nodes.map((n) => n.x));
   const minY = Math.min(...nodes.map((n) => n.y));
   const maxX = Math.max(...nodes.map((n) => n.x + n.width));
   const maxY = Math.max(...nodes.map((n) => n.y + n.height));
   return { minX, minY, width: maxX - minX, height: maxY - minY };
}

// Copies each element's resolved fill/stroke color from the live,
// on-screen SVG into the corresponding element in the clone, as
// explicit attributes. Necessary because the clone is serialized
// standalone with no Tailwind stylesheet or CSS custom properties
// attached — var(--background), currentColor, and any Tailwind
// class-based coloring all resolve to nothing there, falling back to
// SVG's default black fill. getComputedStyle on the *live* elements
// already resolves all of that correctly, so we just transfer it over.
function inlineComputedColors(
   sourceRoot: SVGSVGElement,
   cloneRoot: SVGSVGElement,
) {
   const sourceEls = sourceRoot.querySelectorAll<SVGElement>("*");
   const cloneEls = cloneRoot.querySelectorAll<SVGElement>("*");

   sourceEls.forEach((sourceEl, i) => {
      const cloneEl = cloneEls[i];
      if (!cloneEl) return;

      const computed = window.getComputedStyle(sourceEl);

      if (computed.fill && computed.fill !== "none") {
         cloneEl.setAttribute("fill", computed.fill);
      }
      if (computed.stroke && computed.stroke !== "none") {
         cloneEl.setAttribute("stroke", computed.stroke);
      }
   });
}

// Clones the live SVG, strips the pan/zoom transform so the export
// reflects the full diagram (not just the current viewport), sets an
// explicit viewBox/size around the content bounds, and adds a white
// background rect so PNG exports aren't transparent.
export function serializeForExport(
   svgEl: SVGSVGElement,
   bounds: ExportBounds,
): string {
   const clone = svgEl.cloneNode(true) as SVGSVGElement;

   inlineComputedColors(svgEl, clone);

   const transformGroup = clone.querySelector("g");
   if (transformGroup) transformGroup.removeAttribute("transform");

   const minX = bounds.minX - EXPORT_PADDING;
   const minY = bounds.minY - EXPORT_PADDING;
   const width = bounds.width + EXPORT_PADDING * 2;
   const height = bounds.height + EXPORT_PADDING * 2;

   clone.setAttribute("viewBox", `${minX} ${minY} ${width} ${height}`);
   clone.setAttribute("width", String(width));
   clone.setAttribute("height", String(height));
   clone.removeAttribute("class");

   const bgRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
   );
   bgRect.setAttribute("x", String(minX));
   bgRect.setAttribute("y", String(minY));
   bgRect.setAttribute("width", String(width));
   bgRect.setAttribute("height", String(height));
   bgRect.setAttribute("fill", "#ffffff");
   clone.insertBefore(bgRect, clone.firstChild);

   return new XMLSerializer().serializeToString(clone);
}

export function downloadSvg(svgString: string, filename: string) {
   const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
   triggerDownload(blob, filename);
}

export async function downloadPng(
   svgString: string,
   pixelWidth: number,
   pixelHeight: number,
   filename: string,
   scale = 2,
) {
   const svgBlob = new Blob([svgString], {
      type: "image/svg+xml;charset=utf-8",
   });
   const url = URL.createObjectURL(svgBlob);

   const img = new Image();
   await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
         reject(new Error("Failed to load SVG for PNG export"));
      img.src = url;
   });

   const canvas = document.createElement("canvas");
   canvas.width = pixelWidth * scale;
   canvas.height = pixelHeight * scale;
   const ctx = canvas.getContext("2d");
   if (!ctx) throw new Error("Canvas 2D context not available");
   ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
   URL.revokeObjectURL(url);

   const pngBlob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
         (b) => (b ? resolve(b) : reject(new Error("PNG export failed"))),
         "image/png",
      );
   });

   triggerDownload(pngBlob, filename);
}

function triggerDownload(blob: Blob, filename: string) {
   const url = URL.createObjectURL(blob);
   const a = document.createElement("a");
   a.href = url;
   a.download = filename;
   document.body.appendChild(a);
   a.click();
   document.body.removeChild(a);
   URL.revokeObjectURL(url);
}
