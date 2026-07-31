'use client';

import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Image, FileText, FileCode, X } from 'lucide-react';

interface ExportMenuProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  onClose: () => void;
}

export function ExportMenu({ svgRef, onClose }: ExportMenuProps) {
  const exportSvg = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'whiteboard.svg';
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  }, [svgRef, onClose]);

  const exportPng = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const { toPng } = await import('html-to-image');
    try {
      const dataUrl = await toPng(svg as unknown as HTMLElement, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'whiteboard.png';
      a.click();
    } catch {
      // Fallback: SVG-based export
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx?.scale(2, 2);
        ctx?.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = 'whiteboard.png';
        a.click();
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
    onClose();
  }, [svgRef, onClose]);

  const exportPdf = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const { default: jsPDF } = await import('jspdf');
    const { toPng } = await import('html-to-image');
    try {
      const dataUrl = await toPng(svg as unknown as HTMLElement, { backgroundColor: '#ffffff', pixelRatio: 2 });
      const img = new window.Image();
      img.onload = () => {
        const pdf = new jsPDF({
          orientation: img.width > img.height ? 'landscape' : 'portrait',
          unit: 'px',
          format: [img.width / 2, img.height / 2],
        });
        pdf.addImage(dataUrl, 'PNG', 0, 0, img.width / 2, img.height / 2);
        pdf.save('whiteboard.pdf');
      };
      img.src = dataUrl;
    } catch {
      // Fallback
    }
    onClose();
  }, [svgRef, onClose]);

  return (
    <div className="rounded-xl border bg-background/95 p-2 shadow-xl backdrop-blur animate-in fade-in zoom-in-95">
      <div className="mb-1.5 flex items-center justify-between px-1">
        <span className="text-xs font-bold text-foreground">Export</span>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        <Button variant="ghost" size="sm" className="h-8 justify-start gap-2 text-xs" onClick={exportPng}>
          <Image className="h-3.5 w-3.5 text-emerald-500" />
          Export as PNG
        </Button>
        <Button variant="ghost" size="sm" className="h-8 justify-start gap-2 text-xs" onClick={exportSvg}>
          <FileCode className="h-3.5 w-3.5 text-blue-500" />
          Export as SVG
        </Button>
        <Button variant="ghost" size="sm" className="h-8 justify-start gap-2 text-xs" onClick={exportPdf}>
          <FileText className="h-3.5 w-3.5 text-rose-500" />
          Export as PDF
        </Button>
      </div>
    </div>
  );
}
