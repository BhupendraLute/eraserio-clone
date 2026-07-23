"use client";

import { useDiagramStore } from "@/lib/store/diagram-store";
import {
   serializeForExport,
   downloadSvg,
   downloadPng,
   computeFlowchartBounds,
} from "@/lib/export/svg-export";
import { Button } from "@/components/ui/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";

const EXPORT_PADDING = 40; // must match EXPORT_PADDING in svg-export.ts

export function ExportMenu() {
   const diagramKind = useDiagramStore((s) => s.diagramKind);
   const nodes = useDiagramStore((s) => s.nodes);
   const sequenceWidth = useDiagramStore((s) => s.sequenceWidth);
   const sequenceHeight = useDiagramStore((s) => s.sequenceHeight);
   const svgElement = useDiagramStore((s) => s.svgElement);

   const getBounds = () =>
      diagramKind === "sequence"
         ? { minX: 0, minY: 0, width: sequenceWidth, height: sequenceHeight }
         : computeFlowchartBounds(nodes);

   const handleExportSvg = () => {
      if (!svgElement) return;
      const svgString = serializeForExport(svgElement, getBounds());
      downloadSvg(svgString, "diagram.svg");
   };

   const handleExportPng = async () => {
      if (!svgElement) return;
      const bounds = getBounds();
      const svgString = serializeForExport(svgElement, bounds);
      await downloadPng(
         svgString,
         bounds.width + EXPORT_PADDING * 2,
         bounds.height + EXPORT_PADDING * 2,
         "diagram.png",
      );
   };

   return (
      <DropdownMenu>
         <DropdownMenuTrigger
            className="inline-flex h-8 items-center gap-2 rounded-md border px-3 text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
            disabled={!svgElement}
         >
            <Download className="h-4 w-4" />
            Export
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportSvg}>
               Export as SVG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPng}>
               Export as PNG
            </DropdownMenuItem>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}
