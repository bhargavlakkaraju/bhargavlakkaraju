"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Papa from "papaparse";
import { FileSpreadsheet, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

const CRM_FIELDS = [
  { value: "", label: "— skip this column —" },
  { value: "name", label: "Full name" },
  { value: "firstName", label: "First name" },
  { value: "lastName", label: "Last name" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "title", label: "Job title" },
  { value: "company", label: "Company name" },
  { value: "campaign", label: "Campaign name" },
  { value: "status", label: "Status" },
  { value: "tags", label: "Tags" },
  { value: "note", label: "Note" },
  { value: "custom", label: "Keep as custom field" },
] as const;

// Best-effort auto-mapping from common sheet header names
function guessField(header: string): string {
  const h = header.toLowerCase().replace(/[^a-z]/g, "");
  if (/^(fullname|name|contactname|leadname)$/.test(h)) return "name";
  if (/first/.test(h)) return "firstName";
  if (/(last|surname)/.test(h)) return "lastName";
  if (/(email|mail)/.test(h)) return "email";
  if (/(phone|mobile|whatsapp|contactno|number)/.test(h)) return "phone";
  if (/(company|organisation|organization|client|firm)/.test(h)) return "company";
  if (/campaign/.test(h)) return "campaign";
  if (/(designation|title|role)/.test(h)) return "title";
  if (/status/.test(h)) return "status";
  if (/tag/.test(h)) return "tags";
  if (/(note|comment|remark)/.test(h)) return "note";
  return "custom";
}

type Result = { created: number; updated: number; errors: { row: number; error: string }[] };

export function CsvImporter() {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  function onFile(file: File) {
    setResult(null);
    setParseError(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const cols = res.meta.fields ?? [];
        if (!cols.length || !res.data.length) {
          setParseError("Could not find any rows. Make sure the first row of your sheet contains column headers.");
          return;
        }
        setFileName(file.name);
        setHeaders(cols);
        setRows(res.data);
        setMapping(Object.fromEntries(cols.map((c) => [c, guessField(c)])));
      },
      error: () => setParseError("Could not parse this file. Export your sheet as CSV and try again."),
    });
  }

  const mappedPreview = useMemo(() => rows.slice(0, 5), [rows]);

  async function runImport() {
    setImporting(true);
    const payloadRows = rows.map((row) => {
      const out: Record<string, unknown> = {};
      const custom: Record<string, string> = {};
      for (const [col, field] of Object.entries(mapping)) {
        const value = (row[col] ?? "").trim();
        if (!value || !field) continue;
        if (field === "custom") custom[col] = value;
        else out[field] = value;
      }
      if (Object.keys(custom).length) out.customData = custom;
      out.source = "csv-import";
      return out;
    });

    const res = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, rows: payloadRows }),
    });
    setImporting(false);
    if (res.ok) {
      setResult(await res.json());
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setParseError(
        "Import failed — check that mapped columns contain valid data" +
          (data?.error ? ` (${JSON.stringify(data.error).slice(0, 200)})` : "")
      );
    }
  }

  return (
    <div className="space-y-6">
      <label className="card flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-300 bg-white/50 py-12 transition hover:border-brand-400 hover:bg-brand-50/40">
        <FileSpreadsheet className="h-10 w-10 text-slate-400" />
        <div className="text-center">
          <div className="text-sm font-medium">{fileName ?? "Drop or choose a CSV file"}</div>
          <div className="mt-1 text-xs text-slate-500">
            In Google Sheets: File → Download → Comma Separated Values (.csv)
          </div>
        </div>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
      </label>

      {parseError && (
        <div className="card flex items-center gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" /> {parseError}
        </div>
      )}

      {headers.length > 0 && !result && (
        <>
          <div className="card p-5">
            <h2 className="mb-1 text-sm font-semibold text-slate-700">Map your columns</h2>
            <p className="mb-4 text-xs text-slate-500">
              We guessed the mapping from your headers — adjust anything that looks wrong. Unmapped columns are kept
              as custom fields on each contact.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {headers.map((h) => (
                <div key={h} className="flex items-center gap-2 rounded-lg border border-slate-200 p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{h}</div>
                    <div className="truncate text-xs text-slate-400">e.g. {rows[0]?.[h] || "—"}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
                  <select
                    value={mapping[h] ?? ""}
                    onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value }))}
                    className="input w-40"
                  >
                    {CRM_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
              Preview — first {mappedPreview.length} of {rows.length} rows
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs text-slate-500">
                    {headers.map((h) => (
                      <th key={h} className="whitespace-nowrap px-4 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mappedPreview.map((row, i) => (
                    <tr key={i}>
                      {headers.map((h) => (
                        <td key={h} className="whitespace-nowrap px-4 py-2 text-slate-600">
                          {row[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={runImport} disabled={importing} className="btn-primary">
              {importing ? "Importing…" : `Import ${rows.length} rows`}
            </button>
          </div>
        </>
      )}

      {result && (
        <div className="card flex items-start gap-3 border-emerald-200 bg-emerald-50 p-5">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" />
          <div className="text-sm">
            <div className="font-semibold text-emerald-800">
              Import complete — {result.created} created, {result.updated} updated
              {result.errors.length > 0 && `, ${result.errors.length} failed`}
            </div>
            <p className="mt-1 text-emerald-700">
              Duplicates were matched by email/phone and updated instead of duplicated.
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-xs text-red-600">
                {result.errors.slice(0, 10).map((e) => (
                  <li key={e.row}>
                    Row {e.row}: {e.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
