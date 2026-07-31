"use client";

import { useEffect, useRef } from "react";
import { useDiagramStore } from "@/lib/store/diagram-store";
import { useDiagramRegistry } from "@/lib/store/diagram-registry";
import { pushDiagnostics } from "@/lib/dsl/codemirror-lint";
import { pipelineErrorsToDiagnostics } from "@/lib/dsl/diagnostics";
import type {
   PipelineRequest,
   PipelineResponse,
} from "@/workers/pipeline.worker";

const DEBOUNCE_MS = 200;

export function usePipelineWorker() {
   const source = useDiagramStore((s) => s.source);
   const applyResult = useDiagramStore((s) => s.applyResult);
   const setErrors = useDiagramStore((s) => s.setErrors);
   const setPending = useDiagramStore((s) => s.setPending);

   const workerRef = useRef<Worker | null>(null);

   const requestId = useRef(0);
   const latestSentId = useRef(0);
   const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
   );

   // Create the worker once on mount and wire up its message handler. The
   // worker lives in a ref (never React state), so no re-render is triggered
   // and no state is set from inside an effect.
   useEffect(() => {
      const w = new Worker(
         new URL("../../workers/pipeline.worker.ts", import.meta.url),
      );
      workerRef.current = w;

      w.onmessage = (event: MessageEvent<PipelineResponse>) => {
         const res = event.data;
         if (res.id !== latestSentId.current) return;

         const view = useDiagramStore.getState().editorView;

         if (res.ok) {
            applyResult(res.result, res.diagnostics);
            if (view) {
               const diagnostics = pipelineErrorsToDiagnostics(
                  view.state,
                  res.diagnostics,
               );
               pushDiagnostics(view, diagnostics);
            }
         } else {
            setErrors(res.errors);
            if (view) {
               const diagnostics = pipelineErrorsToDiagnostics(
                  view.state,
                  res.errors,
               );
               pushDiagnostics(view, diagnostics);
            }
         }
      };

      return () => {
         w.terminate();
         workerRef.current = null;
      };
   }, [applyResult, setErrors]);

   // Keep the registry's stored source in sync as the user types, so any doc
   // embed referencing this diagram id always resolves to current content,
   // then debounce the pipeline request that runs the parser + layout engine.
   useEffect(() => {
      const worker = workerRef.current;
      if (!worker) return;

      const currentDiagramId = useDiagramStore.getState().currentDiagramId;
      if (currentDiagramId) {
         useDiagramRegistry.getState().updateSource(currentDiagramId, source);
      }

      if (debounceTimer.current) clearTimeout(debounceTimer.current);

      debounceTimer.current = setTimeout(() => {
         const id = ++requestId.current;
         latestSentId.current = id;
         setPending();
         const request: PipelineRequest = { id, source };
         worker.postMessage(request);
      }, DEBOUNCE_MS);

      return () => {
         if (debounceTimer.current) clearTimeout(debounceTimer.current);
      };
   }, [source, setPending]);
}
