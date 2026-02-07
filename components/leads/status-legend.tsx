"use client";

import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { useState } from "react";

const STATUS_LEGEND = [
  { status: "draft", label: "Draft", description: "Not sent yet" },
  { status: "queued", label: "Queued", description: "Scheduled to send" },
  { status: "sending", label: "Sending", description: "Sending now" },
  { status: "sent", label: "Sent", description: "First email sent" },
  { status: "followup_queued", label: "Followup Queued", description: "Follow-up scheduled" },
  { status: "followup_sent", label: "Followup Sent", description: "Follow-up sent" },
  { status: "replied", label: "Replied", description: "Lead replied" },
  { status: "failed", label: "Failed", description: "Email not delivered" },
  
] as const;

export function StatusLegend() {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Info className="size-3.5" />
          <span>Status</span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        align="start" 
        className="w-72 p-3"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <p className="text-xs font-semibold text-foreground mb-2">Status Legend</p>
        <div className="grid gap-1.5">
          {STATUS_LEGEND.map(({ status, label, description }) => (
            <div key={status} className="flex items-center justify-between gap-2">
              <Badge
                variant={status}
                className="text-[11px] px-1.5 py-0"
              >
                {label}
              </Badge>
              <span className="text-xs text-muted-foreground text-right">
                {description}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}