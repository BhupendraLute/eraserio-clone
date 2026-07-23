'use client';

import { useEffect, useRef, useState } from 'react';
import { useDiagramStore } from '@/lib/store/diagram-store';
import { pushDiagnostics } from '@/lib/dsl/codemirror-lint';
import { pipelineErrorsToDiagnostics } from '@/lib/dsl/diagnostics';
import type { PipelineRequest, PipelineResponse } from '@/workers/pipeline.worker';

const DEBOUNCE_MS = 200;

export function usePipelineWorker() {
  const source = useDiagramStore((s) => s.source);
  const applyResult = useDiagramStore((s) => s.applyResult);
  const setErrors = useDiagramStore((s) => s.setErrors);
  const setPending = useDiagramStore((s) => s.setPending);

  const [worker, setWorker] = useState<Worker | null>(null);

  const requestId = useRef(0);
  const latestSentId = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const w = new Worker(new URL('../../workers/pipeline.worker.ts', import.meta.url));
    setWorker(w);
    return () => w.terminate();
  }, []);

  useEffect(() => {
    if (!worker) return;

    worker.onmessage = (event: MessageEvent<PipelineResponse>) => {
      const res = event.data;
      if (res.id !== latestSentId.current) return;

      const view = useDiagramStore.getState().editorView;

      if (res.ok) {
        applyResult(res.result);
        if (view) pushDiagnostics(view, []);
      } else {
        setErrors(res.errors);
        if (view) {
          const diagnostics = pipelineErrorsToDiagnostics(view.state, res.errors);
          pushDiagnostics(view, diagnostics);
        }
      }
    };
  }, [worker, applyResult, setErrors]);

  useEffect(() => {
    if (!worker) return;

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
  }, [source, worker, setPending]);
}