'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDocumentStore } from '@/lib/store/document-store';

interface AIDiagramModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PRESET_PROMPTS = [
  {
    title: 'Microservices Auth System',
    description: 'Client, API Gateway, Auth Service, and Database sequence diagram',
    dsl: `sequence-diagram

participant Client
participant APIGateway [icon: globe]
participant AuthService [icon: key]
participant Database [icon: database]

Client -> APIGateway: POST /api/v1/login
APIGateway -> AuthService: Validate User Passkey
AuthService -> Database: Query User Credentials
Database --> AuthService: User Record
AuthService --> APIGateway: Signed JWT Token
APIGateway --> Client: 200 OK + Bearer Token
`,
  },
  {
    title: 'AWS Cloud Architecture',
    description: 'Route53, CloudFront CDN, EC2 Instances & S3 Storage',
    dsl: `flowchart

User [icon: user]
Route53 [icon: globe]
CloudFront [icon: cloud]
ALB [icon: server]
AppServer1 [icon: server]
AppServer2 [icon: server]
RDS [icon: database]
S3Bucket [icon: archive]

User > Route53: DNS Lookup
Route53 > CloudFront: Edge Distribution
CloudFront > ALB: Route Traffic
ALB > AppServer1: Load Balance
ALB > AppServer2: Load Balance
AppServer1 > RDS: Query Data
AppServer2 > S3Bucket: Upload Assets
`,
  },
  {
    title: 'Order Processing Pipeline',
    description: 'Event-driven order checkout and payment processing',
    dsl: `flowchart

Customer [icon: user]
CheckoutAPI [icon: code]
PaymentGateway [icon: credit-card]
KafkaTopics [icon: layers]
FulfillmentService [icon: box]
EmailNotifier [icon: mail]

Customer > CheckoutAPI: Submit Order
CheckoutAPI > PaymentGateway: Charge Credit Card
PaymentGateway > KafkaTopics: Publish OrderCreated Event
KafkaTopics > FulfillmentService: Process Shipping
KafkaTopics > EmailNotifier: Send Confirmation Email
`,
  },
];

export function AIDiagramModal({ open, onOpenChange }: AIDiagramModalProps) {
  const router = useRouter();
  const createDocument = useDocumentStore((s) => s.createDocument);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (customDsl?: string, customTitle?: string) => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      // Simulate intelligent diagram generator pipeline
      await new Promise((resolve) => setTimeout(resolve, 800));

      const dslContent =
        customDsl ||
        `flowchart

User [icon: user]
ArchitectaAI [icon: cpu]
DiagramEngine [icon: code]
Canvas [icon: layout]

User > ArchitectaAI: Prompt "${prompt || 'System Architecture'}"
ArchitectaAI > DiagramEngine: Parse DSL Tokens
DiagramEngine > Canvas: Auto-Layout Render
`;

      const title = customTitle || prompt || 'AI Generated Diagram';
      const newDocId = await createDocument(title, dslContent);
      onOpenChange(false);
      router.push(`/workspace/${newDocId}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl bg-zinc-950 border-zinc-800 text-zinc-100 p-6 rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <DialogTitle className="text-lg font-extrabold tracking-tight text-white">
                Architecta AI Diagram Generator
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Describe your system architecture or choose a preset prompt to generate a Diagram-as-Code instantly.
          </DialogDescription>
        </DialogHeader>

        {/* Input Form */}
        <div className="space-y-4 py-2">
          <div>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Create a sequence diagram showing OAuth authentication flow between Client, Auth Server, and Database..."
              className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
            />
          </div>

          {/* Preset Prompts Catalog */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              Quick AI Presets
            </div>
            <div className="grid grid-cols-1 gap-2">
              {PRESET_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleGenerate(preset.dsl, preset.title)}
                  disabled={isGenerating}
                  className="flex items-start justify-between p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-800/80 hover:border-purple-500/40 transition-all text-left group"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-zinc-200 group-hover:text-purple-300 transition-colors">
                      {preset.title}
                    </div>
                    <div className="text-[11px] text-zinc-500">{preset.description}</div>
                  </div>
                  <Wand2 className="h-4 w-4 text-zinc-600 group-hover:text-purple-400 transition-colors mt-0.5 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs gap-2 px-5 h-9 rounded-xl shadow-lg shadow-purple-600/20"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Generating Diagram...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Generate Diagram</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
