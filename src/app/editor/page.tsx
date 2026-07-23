"use client";

import { CodeEditor } from "@/components/editor/CodeEditor";
import { DiagramCanvas } from "@/components/editor/DiagramCanvas";
import { usePipelineWorker } from "@/lib/hooks/usePipelineWorker";
import { useDiagramStore } from "@/lib/store/diagram-store";
import { ExportMenu } from "@/components/editor/ExportMenu";

export default function EditorPage() {
   usePipelineWorker();

   const status = useDiagramStore((s) => s.status);
   const errors = useDiagramStore((s) => s.errors);

   return (
      <div className="flex h-screen w-full flex-col">
         <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
            <span className="text-sm font-medium">Diagram editor</span>
            <div className="flex items-center gap-3">
               <span className="text-xs text-muted-foreground">
                  {status === "pending" && "Parsing…"}
                  {status === "ok" && errors.length === 0 && "Up to date"}
                  {status === "ok" &&
                     errors.length > 0 &&
                     `${errors.length} warning${errors.length === 1 ? "" : "s"}`}
                  {status === "error" &&
                     `${errors.filter((e) => e.severity === "error").length} error${
                        errors.filter((e) => e.severity === "error").length ===
                        1
                           ? ""
                           : "s"
                     }`}
               </span>
               <ExportMenu />
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
                     {e.severity === "error" ? "✕" : "⚠"} {e.stage}: {e.message}
                     {e.line ? ` (line ${e.line})` : ""}
                  </div>
               ))}
            </div>
         )}
      </div>
   );
}
