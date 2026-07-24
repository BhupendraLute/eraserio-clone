"use client";

import { CodeEditor } from "@/components/editor/CodeEditor";
import { DiagramCanvas } from "@/components/editor/DiagramCanvas";
import { usePipelineWorker } from "@/lib/hooks/usePipelineWorker";
import { useDiagramStore } from "@/lib/store/diagram-store";
import { ExportMenu } from "@/components/editor/ExportMenu";
import { DiagramSidebar } from "@/components/editor/DiagramSidebar";
import { useState, useEffect } from "react";
import { useDiagramLibraryStore } from "@/lib/store/diagram-library-store";
import { useDiagramRegistry, useActiveDiagram } from "@/lib/store/diagram-registry";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EditorPage() {
   usePipelineWorker();

   const status = useDiagramStore((s) => s.status);
   const errors = useDiagramStore((s) => s.errors);
   const source = useDiagramStore((s) => s.source);
   const currentDiagramId = useDiagramStore((s) => s.currentDiagramId);
   const loadDiagram = useDiagramStore((s) => s.loadDiagram);

   const activeDiagram = useActiveDiagram();
   const activeDiagramId = useDiagramRegistry((s) => s.activeDiagramId);
   const saveDiagram = useDiagramLibraryStore((s) => s.saveDiagram);

   const [saveOpen, setSaveOpen] = useState(false);
   const [diagramName, setDiagramName] = useState("");

   // Ensure the active diagram from registry is loaded into the editor state on initial mount
   useEffect(() => {
      if (activeDiagram && currentDiagramId !== activeDiagram.id) {
         loadDiagram(activeDiagram.id, activeDiagram.source);
      }
   }, [activeDiagram, currentDiagramId, loadDiagram]);

   const handleOpenSaveDialog = () => {
      setDiagramName(activeDiagram?.name || "");
      setSaveOpen(true);
   };

   const handleSave = () => {
      if (!diagramName.trim()) return;
      saveDiagram(diagramName.trim(), source);
      setSaveOpen(false);
   };

   return (
      <div className="flex h-screen w-full">
         <DiagramSidebar />
         <div className="flex h-screen flex-1 flex-col">
            <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
               <span className="text-sm font-medium truncate max-w-xs">
                  {activeDiagram?.name || "Diagram editor"}
               </span>
               <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                     {status === "pending" && "Parsing…"}
                     {status === "ok" && errors.length === 0 && "Up to date"}
                     {status === "ok" &&
                        errors.length > 0 &&
                        `${errors.length} warning${errors.length === 1 ? "" : "s"}`}
                     {status === "error" &&
                        `${errors.filter((e) => e.severity === "error").length} error${
                           errors.filter((e) => e.severity === "error")
                              .length === 1
                              ? ""
                              : "s"
                        }`}
                  </span>
                  <ExportMenu />
                  <Button
                     variant="outline"
                     size="sm"
                     onClick={handleOpenSaveDialog}
                  >
                     <Save className="mr-2 h-4 w-4" />
                     Save to library
                  </Button>
               </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
               <div className="w-1/2 border-r">
                  <CodeEditor />
               </div>
               <div className="w-1/2">
                  <DiagramCanvas />
               </div>
            </div>

            {errors.length > 0 && (
               <div className="max-h-32 shrink-0 overflow-auto border-t p-2 text-xs">
                  {errors.map((e, i) => (
                     <div
                        key={i}
                        className={
                           e.severity === "error"
                              ? "text-destructive"
                              : "text-amber-600"
                        }
                     >
                        {e.severity === "error" ? "✕" : "⚠"} {e.stage}:{" "}
                        {e.message}
                        {e.line ? ` (line ${e.line})` : ""}
                     </div>
                  ))}
               </div>
            )}
         </div>
         <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogContent>
               <DialogHeader>
                  <DialogTitle>Save diagram to library</DialogTitle>
               </DialogHeader>
               <Input
                  placeholder="Diagram name"
                  value={diagramName}
                  onChange={(e) => setDiagramName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
               />
               <DialogFooter>
                  <Button onClick={handleSave}>Save</Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>
      </div>
   );
}
