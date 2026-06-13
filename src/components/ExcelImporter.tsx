import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Upload, FileSpreadsheet, Check, AlertCircle, RefreshCw, Database } from "lucide-react";

interface ExcelImporterProps {
  onImportComplete: () => void;
}

export default function ExcelImporter({ onImportComplete }: ExcelImporterProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clearBeforeImport, setClearBeforeImport] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse custom KPI points from ticket Type field
  // Match standard '#' syntax
  const extractPoints = (typeStr: string): number => {
    if (!typeStr) return 0;
    const match = typeStr.match(/#\s*([0-9]+(?:\.[0-9]+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Maps heterogeneous headers from various CRM exports to standard names.
  const mapHeaders = (row: any) => {
    const keys = Object.keys(row);
    
    let resolved_by = "Unassigned";
    let resolved_by_priority = -1;
    
    let type = "";
    let type_priority = -1;
    
    let category = "General";
    let category_priority = -1;
    
    let created_date = "";
    let date_priority = -1;
    
    let status = "Closed";
    let status_priority = -1;

    keys.forEach((k) => {
      const lowerKey = k.toLowerCase().trim();
      const val = row[k] !== undefined && row[k] !== null ? String(row[k]).trim() : "";
      
      if (!val) return;

      // 1. Resolved By
      if (lowerKey === "resolved by" || lowerKey === "resolved_by") {
        if (resolved_by_priority < 3) { resolved_by = val; resolved_by_priority = 3; }
      } else if (lowerKey === "agent" || lowerKey === "technician" || lowerKey === "staff") {
        if (resolved_by_priority < 2) { resolved_by = val; resolved_by_priority = 2; }
      } else if (["user", "solved by", "solved_by", "assigned", "created by"].some(cand => lowerKey.includes(cand))) {
        if (resolved_by_priority < 1) { resolved_by = val; resolved_by_priority = 1; }
      }
      
      // 2. Type / KPI Points Field (Strict exact "type" takes supreme precedence over "subject" / "name")
      if (lowerKey === "type") {
        if (type_priority < 4) { type = val; type_priority = 4; }
      } else if (lowerKey === "ticket_type" || lowerKey === "ticket type") {
        if (type_priority < 3) { type = val; type_priority = 3; }
      } else if (lowerKey === "name" || lowerKey === "activity" || lowerKey === "subject") {
        if (type_priority < 2) { type = val; type_priority = 2; }
      } else if (lowerKey.includes("type") || lowerKey.includes("subject") || lowerKey.includes("title")) {
        if (type_priority < 1) { type = val; type_priority = 1; }
      }
      
      // 3. Category
      if (lowerKey === "ticket category" || lowerKey === "ticket_category") {
        if (category_priority < 3) { category = val; category_priority = 3; }
      } else if (lowerKey === "category" || lowerKey === "topic") {
        if (category_priority < 2) { category = val; category_priority = 2; }
      } else if (lowerKey.includes("category")) {
        if (category_priority < 1) { category = val; category_priority = 1; }
      }
      
      // 4. Date
      if (lowerKey === "created date" || lowerKey === "created_date") {
        if (date_priority < 3) { created_date = val; date_priority = 3; }
      } else if (lowerKey === "created at" || lowerKey === "created_at" || lowerKey === "date") {
        if (date_priority < 2) { created_date = val; date_priority = 2; }
      } else if (lowerKey.includes("date") || lowerKey.includes("time")) {
        if (date_priority < 1) { created_date = val; date_priority = 1; }
      }
      
      // 5. Status
      if (lowerKey === "status") {
        if (status_priority < 3) { status = val; status_priority = 3; }
      } else if (lowerKey === "ticket_status" || lowerKey === "state") {
        if (status_priority < 2) { status = val; status_priority = 2; }
      } else if (lowerKey.includes("status") || lowerKey.includes("state")) {
        if (status_priority < 1) { status = val; status_priority = 1; }
      }
    });

    return {
      "Resolved By": resolved_by || "Unassigned",
      "Type": type || "",
      "Ticket Category": category || "General",
      "Created Date": created_date || new Date().toISOString(),
      "Status": status || "Closed"
    };
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const cleanName = (str: string): string => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\?/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    
    const fileExtension = selectedFile.name.split(".").pop()?.toLowerCase();
    if (fileExtension !== "xlsx" && fileExtension !== "xls" && fileExtension !== "csv") {
      setErrorMsg("Supported formats: .xlsx, .xls, .csv files only.");
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to 2D array for structural analysis
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        if (rawRows.length === 0) {
          throw new Error("The selected Excel sheet appears to be empty.");
        }

        // Check if this sheet is a KPI summary spreadsheet containing call statistics
        const isSummarySheet = rawRows.slice(0, 8).some(row => 
          row && row.some(cell => {
            const cl = typeof cell === "string" ? cleanName(cell) : "";
            return cl.includes("call center") || cl.includes("cuoi tuan bonus") || cl.includes("tong diem") || cl.includes("tng im") || cl.includes("dials");
          })
        );

        if (isSummarySheet) {
          // Identify header row index with "Employees" or "nhan vien"
          let employeesRowIdx = -1;
          for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
            const firstCell = String(rawRows[r]?.[0] || "").trim();
            if (
              firstCell.toLowerCase() === "employees" ||
              firstCell.toLowerCase().includes("employees") ||
              firstCell.toLowerCase().includes("nhan vien") ||
              firstCell.toLowerCase().includes("nhan_vien")
            ) {
              employeesRowIdx = r;
              break;
            }
          }

          if (employeesRowIdx === -1) {
            // Find row containing "Dials" keyword
            for (let r = 0; r < Math.min(rawRows.length, 12); r++) {
              if (rawRows[r]?.some(cell => String(cell || "").toLowerCase().includes("dials"))) {
                employeesRowIdx = r - 1 >= 0 ? r - 1 : r;
                break;
              }
            }
          }

          if (employeesRowIdx === -1) {
            employeesRowIdx = 1; // absolute fallback
          }

          const headerRow = rawRows[employeesRowIdx] || [];
          const typeHeaderRow = rawRows[employeesRowIdx + 1] || [];

          // Locate metadata columns dynamically
          let col_employees = 0;
          let col_dials = 1;
          let col_inbound_connects = 2;
          let col_outbound_connects = 5;
          let col_inbound_calls = 8;
          let col_outbound_calls = 9;

          let col_total_tickets = -1;
          let col_ticket_points = -1;
          let col_weekend_days = -1;
          let col_weekend_points = -1;
          let col_deductions = -1;
          let col_net_score = -1;
          let col_rank = -1;

          headerRow.forEach((cell, idx) => {
            const text = cleanName(String(cell || ""));
            if (text === "employees" || text === "employee") col_employees = idx;
            else if (text === "dials" || text === "dial") col_dials = idx;
            else if (text.includes("inbound connects") || text.includes("inbound_connects") || (text === "inbound" && idx < 5)) col_inbound_connects = idx;
            else if (text.includes("outbound connects") || text.includes("outbound_connects") || (text === "outbound" && idx > 3 && idx < 8)) col_outbound_connects = idx;
          });

          typeHeaderRow.forEach((cell, idx) => {
            const text = cleanName(String(cell || ""));
            if (text === "inbound" && idx > 5) col_inbound_calls = idx;
            else if (text === "outbound" && idx > 5) col_outbound_calls = idx;
            else if (text.includes("total ticket")) col_total_tickets = idx;
            else if (text.includes("tickets points") || text.includes("ticket points")) col_ticket_points = idx;
            else if (text.includes("ngay lam cuoi tuan") || text.includes("ngy lm cuoi tuan") || text.includes("cuoi tuan") && text.includes("ngay") || text.includes("cuoi tuan") && text.includes("ngy") || text.includes("so ngay lam")) {
              col_weekend_days = idx;
            } else if (text.includes("tr point") || text.includes("tru point") || text.includes("tr? point") || text.includes("- point") || text.includes("-point") || text.includes("tru_point")) {
              col_deductions = idx;
            } else if (text.includes("tong diem") || text.includes("total points") || text.includes("tng im") || text === "finish") {
              col_net_score = idx;
            } else if (text === "rank") {
              col_rank = idx;
            }
          });

          // Match weekend reward points column (usually labeled "point")
          for (let i = 0; i < typeHeaderRow.length; i++) {
            const text = cleanName(String(typeHeaderRow[i] || ""));
            if (text === "point") {
              if (col_weekend_days !== -1 && Math.abs(i - col_weekend_days) <= 2) {
                col_weekend_points = i;
                break;
              }
            }
          }

          // Generate category groupings from Row index employeesRowIdx spanned columns
          const categoryGroupings: string[] = [];
          let activeCategory = "General";
          headerRow.forEach((cell, idx) => {
            const strVal = String(cell || "").trim();
            if (strVal && strVal !== "") {
              const text = cleanName(strVal);
              const isFlag = ["employees", "dials", "inbound", "outbound", "total", "task", "cuoi tuan", "point", "rank", "bonus", "minus", "finish"].some(b => text.includes(b));
              if (!isFlag) {
                activeCategory = strVal;
              }
            }
            categoryGroupings[idx] = activeCategory;
          });

          // Build ticket column template maps
          const colToTicketType: Record<number, { typeName: string; category: string; points: number }> = {};
          // Typically ticket types start around column index 10 and end before "total tickets"
          let ticketEndCol = col_total_tickets !== -1 ? col_total_tickets : typeHeaderRow.length;
          for (let c = 10; c < ticketEndCol; c++) {
            const cellVal = String(typeHeaderRow[c] || "").trim();
            if (cellVal && cellVal !== "" && !cellVal.includes("/") && cellVal !== "Total" && !cellVal.toLowerCase().includes("total") && !cellVal.toLowerCase().includes("point")) {
              const pts = extractPoints(cellVal);
              colToTicketType[c] = {
                typeName: cellVal,
                category: categoryGroupings[c] || "General",
                points: pts
              };
            }
          }

          const activeMonthText = "2026-06"; // Default June 2026 for demonstration, can be updated dynamically
          const extractedSummaries: any[] = [];
          const reconstructedTickets: any[] = [];

          // Loop below headers
          for (let r = employeesRowIdx + 2; r < rawRows.length; r++) {
            const row = rawRows[r];
            if (!row || row.length === 0) continue;

            const nameVal = String(row[col_employees] || "").trim();
            if (!nameVal || nameVal === "" || nameVal.toLowerCase() === "total" || nameVal.toLowerCase().includes("tổng") || nameVal.toLowerCase().includes("tong") || nameVal.startsWith(",")) {
              continue; // skip lines
            }

            const dials = Number(row[col_dials]) || 0;
            const inbound_connects = Number(row[col_inbound_connects]) || 0;
            const outbound_connects = Number(row[col_outbound_connects]) || 0;
            const inbound_calls = Number(row[col_inbound_calls]) || 0;
            const outbound_calls = Number(row[col_outbound_calls]) || 0;

            const total_tickets = col_total_tickets !== -1 ? (Number(row[col_total_tickets]) || 0) : 0;
            const ticket_points = col_ticket_points !== -1 ? (Number(row[col_ticket_points]) || 0) : 0;
            const weekend_days = col_weekend_days !== -1 ? (Number(row[col_weekend_days]) || 0) : 0;
            const weekend_points = col_weekend_points !== -1 ? (Number(row[col_weekend_points]) || 0) : 0;
            const deducted_points = col_deductions !== -1 ? (Number(row[col_deductions]) || 0) : 0;
            const total_points = col_net_score !== -1 ? (Number(row[col_net_score]) || 0) : (ticket_points + weekend_points - deducted_points);
            const rank = col_rank !== -1 ? String(row[col_rank] || "").trim() : "";

            let payout = 0;
            // Seek financial payouts in nearby columns backwards from end
            for (let i = row.length - 1; i >= 0; i--) {
              const v = row[i];
              if (v !== undefined && v !== null && v !== "") {
                const strV = typeof v === "string" ? v.replace(/[,\s"VND]/g, "") : String(v);
                const numV = parseFloat(strV);
                if (!isNaN(numV) && numV > 10000) {
                  payout = numV;
                  break;
                }
              }
            }

            extractedSummaries.push({
              employee_name: nameVal,
              month: activeMonthText,
              dials,
              inbound_connects,
              outbound_connects,
              inbound_calls,
              outbound_calls,
              total_tickets,
              ticket_points,
              weekend_days,
              weekend_points,
              deducted_points,
              total_points,
              rank: rank || "Ok",
              payout
            });

            // Reconstruct tickets
            Object.keys(colToTicketType).forEach((colIdxStr) => {
              const colIdx = Number(colIdxStr);
              const qty = Number(row[colIdx]) || 0;
              if (qty > 0) {
                const spec = colToTicketType[colIdx];
                for (let q = 0; q < qty; q++) {
                  reconstructedTickets.push({
                    "Resolved By": nameVal,
                    "Type": spec.typeName,
                    "Ticket Category": spec.category,
                    "Created Date": `${activeMonthText}-12`,
                    "Status": "Closed"
                  });
                }
              }
            });
          }

          if (extractedSummaries.length > 0) {
            setParsedData({
              isSummary: true,
              summaries: extractedSummaries,
              reconstructedTickets
            } as any);

            // Create preview rows from parsed summaries
            setPreviewRows(extractedSummaries.slice(0, 5).map(s => ({
              "Resolved By": s.employee_name,
              "Type": `Extracted: ${s.total_tickets} tickets, Dials: ${s.dials}, Connects: ${s.inbound_connects + s.outbound_connects}`,
              "Ticket Category": `Weekend days: ${s.weekend_days}, Points: ${s.weekend_points}, Net Score: ${s.total_points}`,
              "Status": s.rank || "Ok"
            })));
            setIsProcessing(false);
            return;
          }
        }

        // Fallback to standard raw CRM row import
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (rawJson.length === 0) {
          throw new Error("The selected Excel sheet appears to be empty.");
        }

        // Map data to the normalized CRM model
        const normalized = rawJson.map(mapHeaders);
        setParsedData(normalized);

        // Slice up to 5 rows for an instant interactive UI validation block
        setPreviewRows(normalized.slice(0, 5));
      } catch (err: any) {
        setErrorMsg(err?.message || "Failure parsing database headers inside custom workbook sheet.");
      } finally {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg("I/O file-stream failure reading uploaded file.");
      setIsProcessing(false);
    };

    reader.readAsBinaryString(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const saveToSQLite = async () => {
    const hasAnyData = Array.isArray(parsedData) ? parsedData.length > 0 : (parsedData && (parsedData as any).isSummary);
    if (!hasAnyData) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (clearBeforeImport) {
        const resetResponse = await fetch("/api/reset", {
          method: "POST"
        });
        if (!resetResponse.ok) {
          throw new Error("Failed to clear previous database records before importing.");
        }
      }

      const payload = Array.isArray(parsedData) 
        ? { tickets: parsedData } 
        : parsedData;

      const response = await fetch("/api/tickets/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Server-side integration failure.");
      }

      const resData = await response.json();
      if (resData.isSummary) {
        setSuccessMsg(`Successfully imported ${resData.totalParsed} technician call-center summaries alongside ${resData.inserted} reconstructed ticket metrics.`);
      } else {
        setSuccessMsg(`Successfully imported ${resData.inserted} new tickets (skipped ${resData.skipped} duplicates).`);
      }
      
      // Clear current uploader state
      setFile(null);
      setParsedData([]);
      setPreviewRows([]);
      
      // Callback to refresh rankings and charts
      onImportComplete();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to persist parsed KPI records. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const isDataLoaded = Array.isArray(parsedData)
    ? parsedData.length > 0
    : !!(parsedData && (parsedData as any).isSummary);

  const parsedCount = Array.isArray(parsedData)
    ? parsedData.length
    : (parsedData ? ((parsedData as any).summaries?.length || 0) : 0);

  const isSummaryLoaded = parsedData && (parsedData as any).isSummary;

  return (
    <div id="excel-importer-container" className="bento-card p-6 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 id="excel-importer-title" className="text-base font-bold text-white flex items-center gap-2 uppercase tracking-wider text-slate-300">
            <FileSpreadsheet className="w-5 h-5 text-sky-400" />
            CRM & KPI Excel Import
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Supports standard CRM logs OR pre-calculated Cambodia/Vietnam Call-Center and Ticketing spreadsheets!
          </p>
        </div>
        {isDataLoaded && (
          <button
            onClick={() => {
              setFile(null);
              setParsedData([]);
              setPreviewRows([]);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline transition-all"
            id="clear-parsed-btn"
          >
            Reset
          </button>
        )}
      </div>

      {/* Drag & Drop Area */}
      {!isDataLoaded && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileSelect}
          id="dropzone"
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
            dragActive
              ? "border-sky-500 bg-sky-950/30"
              : "border-slate-800 bg-slate-900/20 hover:border-slate-700 hover:bg-slate-900/40"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleChange}
            accept=".xlsx,.xls,.csv"
            className="hidden"
            id="excel-file-picker"
          />
          <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-sky-400 mb-3 shadow-inner">
            {isProcessing ? (
              <RefreshCw className="w-6 h-6 animate-spin" />
            ) : (
              <Upload className="w-6 h-6" />
            )}
          </div>
          <span className="text-sm font-semibold text-slate-200 text-center">
            {isProcessing ? "Processing spreadsheet..." : "Drag & drop Excel or CSV file here"}
          </span>
          <span className="text-xs text-slate-400 mt-1">or click to browse local files</span>
          <div className="mt-4 flex flex-wrap gap-2 justify-center text-[10px] text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 uppercase font-mono">.xlsx</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 uppercase font-mono">.xls</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 uppercase font-mono">.csv</span>
          </div>
        </div>
      )}

      {/* Validation Interactive Preview */}
      {isDataLoaded && (
        <div id="import-validation-box" className="space-y-4">
          <div className="bg-[#060a1f] rounded-lg p-3 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" /> File Loaded ({isSummaryLoaded ? "KPI Summary Sheet" : "CRM Ticket Sheet"})
              </span>
              <span className="font-mono text-sky-400 font-bold bg-sky-950/40 px-2.5 py-0.5 rounded border border-sky-800/80">
                {parsedCount} technicians loaded
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium truncate">
              Name: <span className="font-mono font-bold text-white">{file?.name}</span>
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300 flex justify-between tracking-wide">
              <span>{isSummaryLoaded ? "Technician Summary Metrics Preview" : "Points Rule Parsing Preview (First 5 Rows)"}</span>
              <span className="text-slate-500 text-[10px]">Verify how metrics are mapped</span>
            </div>
            <div className="border border-slate-800 rounded-lg divide-y divide-slate-800/60 overflow-hidden bg-[#090d23]/40">
              {previewRows.map((row, idx) => {
                const calculatedPoints = isSummaryLoaded ? 0 : extractPoints(row["Type"]);
                return (
                  <div key={idx} className="p-3 text-xs flex items-center justify-between hover:bg-slate-900/40">
                    <div className="truncate max-w-[70%] space-y-0.5">
                      <p className="font-semibold text-white truncate">{row["Resolved By"] || "Blank Ticket Subject"}</p>
                      <div className="flex flex-wrap gap-x-2 text-[10px] text-slate-400 font-medium font-sans">
                        <span className="truncate">{row["Type"]}</span>
                        <span>•</span>
                        <span className="truncate">{row["Ticket Category"]}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 pl-2">
                      <span className="text-[10px] font-mono text-slate-500">{isSummaryLoaded ? "Rank:" : "#points:"}</span>
                      <span className={`font-mono font-bold px-2 py-0.5 rounded-full ${
                        isSummaryLoaded || calculatedPoints > 0
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" 
                          : "bg-slate-800/60 text-slate-400 border border-slate-700/50"
                      }`}>
                        {isSummaryLoaded ? row["Status"] : `+${calculatedPoints}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2.5 py-1.5 px-3 bg-rose-950/15 border border-rose-900/30 rounded-lg select-none">
            <input
              type="checkbox"
              id="clear-before-import-checkbox"
              checked={clearBeforeImport}
              onChange={(e) => setClearBeforeImport(e.target.checked)}
              className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-700 bg-slate-900 cursor-pointer"
            />
            <label
              htmlFor="clear-before-import-checkbox"
              className="text-xs text-rose-200/90 font-semibold cursor-pointer hover:text-white transition-colors"
            >
              Wipe and reset all previous database records before saving this file
            </label>
          </div>

          <button
            onClick={saveToSQLite}
            disabled={isSaving}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-lg disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-950/40 active:translate-y-px transition-all"
            id="commit-import-btn"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Saving records to SQLite database...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 text-emerald-400" /> Save & Commit to SQLite Database
              </>
            )}
          </button>
        </div>
      )}

      {/* Feedback Messages */}
      {errorMsg && (
        <div id="import-error" className="mt-4 p-3 rounded-lg bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs flex gap-2 items-start animate-fade-in">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div id="import-success" className="mt-4 p-3 rounded-lg bg-[#052e16]/40 border border-emerald-900/50 text-emerald-300 text-xs flex gap-2 items-start animate-fade-in">
          <Check className="w-4 h-4 mt-0.5 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
    </div>
  );
}
