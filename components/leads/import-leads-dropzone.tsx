"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { Upload, Loader2, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

type Lead = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  position: string | null;
  notes: string | null;
  status: string;
  initialSentAt: string | null;
  followupSentAt: string | null;
  lastError: string | null;
  hasReplied: boolean;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ImportLeadsDropzoneProps = {
  campaignSeedId: string;
  onImportComplete: (leads: Lead[]) => void;
};

type ParsedRow = {
  name?: string;
  email?: string;
  company?: string;
  position?: string;
  notes?: string;
};

// Column name mappings (case-insensitive)
const COLUMN_MAPPINGS: Record<string, keyof ParsedRow> = {
  name: "name",
  email: "email",
  company: "company",
  position: "position",
  notes: "notes",
  // Common alternatives
  "full name": "name",
  "first name": "name",
  "e-mail": "email",
  "email address": "email",
  "company name": "company",
  organization: "company",
  title: "position",
  "job title": "position",
  role: "position",
  note: "notes",
  comments: "notes",
};

function normalizeColumnName(col: string): keyof ParsedRow | null {
  const normalized = col.toLowerCase().trim();
  return COLUMN_MAPPINGS[normalized] ?? null;
}

function parseSheetToLeads(sheet: XLSX.WorkSheet): ParsedRow[] {
  // Get raw data as array of arrays
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });

  if (rawData.length === 0) return [];

  // Map column names from first row
  const firstRow = rawData[0];
  const columnMap: Record<string, keyof ParsedRow> = {};

  for (const key of Object.keys(firstRow)) {
    const mapped = normalizeColumnName(key);
    if (mapped) {
      columnMap[key] = mapped;
    }
  }

  // Parse rows
  const leads: ParsedRow[] = [];
  for (const row of rawData) {
    const lead: ParsedRow = {};
    let hasData = false;

    for (const [originalCol, mappedCol] of Object.entries(columnMap)) {
      const value = row[originalCol];
      if (value !== undefined && value !== null && value !== "") {
        lead[mappedCol] = String(value).trim();
        hasData = true;
      }
    }

    // Skip completely empty rows
    if (hasData) {
      leads.push(lead);
    }
  }

  return leads;
}

export function ImportLeadsDropzone({
  campaignSeedId,
  onImportComplete,
}: ImportLeadsDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      const validTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.ms-excel", // .xls
        "text/csv",
        "application/csv",
      ];
      const validExtensions = [".xlsx", ".xls", ".csv"];
      const hasValidExtension = validExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      );

      if (!validTypes.includes(file.type) && !hasValidExtension) {
        toast.error("Please upload an Excel (.xlsx, .xls) or CSV file");
        return;
      }

      setIsImporting(true);
      try {
        // Read file
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          toast.error("No sheets found in the file");
          return;
        }

        const sheet = workbook.Sheets[sheetName];
        const leads = parseSheetToLeads(sheet);

        if (leads.length === 0) {
          toast.error("No valid leads found in the file");
          return;
        }

        // Send to API
        const response = await fetch(
          `/api/campaigns/${campaignSeedId}/leads/import`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ leads }),
          }
        );

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error ?? "Failed to import leads");
        }

        const result = await response.json();
        const { summary, imported } = result;

        // Show summary toast
        const parts: string[] = [];
        if (summary.imported > 0) {
          parts.push(`Imported ${summary.imported}`);
        }
        if (summary.skipped > 0) {
          parts.push(`Skipped ${summary.skipped} duplicates`);
        }
        if (summary.failed > 0) {
          parts.push(`${summary.failed} failed`);
        }

        if (summary.imported > 0) {
          toast.success(parts.join(". "));
          onImportComplete(imported);
        } else if (summary.skipped > 0 || summary.failed > 0) {
          toast.warning(parts.join(". "));
        } else {
          toast.error("No leads were imported");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to import leads"
        );
      } finally {
        setIsImporting(false);
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [campaignSeedId, onImportComplete]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  return (
    <div
      className={cn(
        "mt-4 rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/50",
        isImporting && "pointer-events-none opacity-60"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
        disabled={isImporting}
      />
      <div className="flex flex-col items-center gap-2">
        {isImporting ? (
          <>
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Importing leads...</p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Upload className="size-5" />
              <FileSpreadsheet className="size-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              Drop an Excel or CSV file here, or click to upload
            </p>
            <p className="text-xs text-muted-foreground/70">
              Columns: Name, Email, Company, Position, Notes
            </p>
          </>
        )}
      </div>
    </div>
  );
}
