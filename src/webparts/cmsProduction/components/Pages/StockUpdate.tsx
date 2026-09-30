import * as React from "react";
import "../CSS/StockUpdate.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import CMSMasterOps, { ICMSMasterItem } from "../../service/BAL/CMSMaster";

export interface IStockUpdateProps extends ICmsProductionProps {
    onNavigate?: (pageKey: string) => void;
}

interface IColumn {
    key: string;
    label: string;
}

const COLUMNS: IColumn[] = [
    { key: "ewoNo", label: "EWONo" },
    { key: "srNo", label: "Sr.No" },
    { key: "nextAssembly", label: "Next Up Assembly" },
    { key: "oldPartNo", label: "Old Part Number" },
    { key: "newPartNo", label: "New Part Number" },
    { key: "partName", label: "Part Name" },
    { key: "oldQty", label: "Old Part Qty" },
    { key: "newQty", label: "New Part Qty" },
    { key: "lr", label: "L/R" },
    { key: "lc", label: "LC/KD/Inhouse" },
    { key: "shop", label: "Shop" },
    { key: "oldVariant", label: "Old Part Variant Applicability" },
    { key: "newVariant", label: "New Part Variant Applicability" },
    { key: "model", label: "Model" },
    { key: "changeType", label: "Change Type" },
    { key: "changeMethod", label: "Change Method" }
];

const STOCK_COLUMNS = [
    "Old PN SAP stock",
    "Old PN In-Transit stock",
    "Old PN Open order stock",
    "New PN SAP stock",
    "New PN In-Transit stock",
    "New PN Open order stock"
];

const CSV_TEMPLATE_HEADERS = [
    "EWONo",
    "Sr.No",
    "Next Up Assembly",
    "Old Part Number",
    "New Part Number",
    "Part Name",
    "Old Part Qty",
    "New Part Qty",
    "L/R",
    "LC/KD/Inhouse",
    "Shop",
    "Old part variant applicability",
    "New part variant applicability",
    "Model",
    "Change Type",
    "Change Method",
    ...STOCK_COLUMNS
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

interface IRowData {
    id: string;
    ewoNo: string;
    srNo: string;
    nextAssembly: string;
    oldPartNo: string;
    newPartNo: string;
    partName: string;
    oldQty: string;
    newQty: string;
    lr: string;
    lc: string;
    shop: string;
    oldVariant: string;
    newVariant: string;
    model: string;
    changeType: string;
    changeMethod: string;
}

interface IUploadStatusRow {
    ewoNo: string;
    state: "pending" | "success" | "error";
    message: string;
}

const parseJSON = (raw: any, fallback: any): any => {
    if (!raw) {
        return fallback;
    }
    try {
        return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
        return fallback;
    }
};

const pad2 = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

const formatDateTime = (d: Date): string => {
    return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const formatDateOnly = (d: Date): string => {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const buildRows = (items: ICMSMasterItem[]): IRowData[] => {
    const rows: IRowData[] = [];

    items.forEach((item) => {
        const partaction = parseJSON((item as any).PartAction, []);

        partaction.forEach((pa: any, idx: number) => {
            rows.push({
                id: `${item.Id}-${idx}`,
                ewoNo: item.Title || "",
                srNo: pa.c0 || "",
                nextAssembly: pa.c1 || "",
                oldPartNo: pa.c2 || "",
                newPartNo: pa.c3 || "",
                partName: pa.c4 || "",
                oldQty: pa.c5 || "",
                newQty: pa.c6 || "",
                lr: pa.c7 || "",
                lc: pa.c8 || "",
                shop: pa.c9 || "",
                oldVariant: pa.c10 || "",
                newVariant: pa.c11 || "",
                model: pa.c12 || "",
                changeType: pa.c13 || "",
                changeMethod: pa.c14 || "",
            });
        });
    });

    return rows;
};


const parseCsvLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (inQuotes) {
            if (char === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                current += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ",") {
            cells.push(current);
            current = "";
        } else {
            current += char;
        }
    }
    cells.push(current);
    return cells.map((c) => c.trim());
};

const parseCsvText = (text: string): Record<string, string>[] => {
    const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim() !== "");
    if (lines.length < 2) {
        return [];
    }
    const headers = parseCsvLine(lines[0]);
    return lines.slice(1).map((line) => {
        const cells = parseCsvLine(line);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
            row[h] = cells[idx] !== undefined ? cells[idx] : "";
        });
        return row;
    });
};

const downloadCsv = (headers: string[], rows: string[][], fileName: string): void => {
    const escapeCell = (cell: string): string => `"${(cell || "").replace(/"/g, '""')}"`;
    const csvContent = [headers, ...rows]
        .map((r) => r.map(escapeCell).join(","))
        .join("\r\n");
    const blob = new Blob(["\ufeff", csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const dedupeStrings = (values: string[]): string[] => {
    const result: string[] = [];
    for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (value && result.indexOf(value) === -1) {
            result.push(value);
        }
    }
    return result;
};

const StockUpdate: React.FC<IStockUpdateProps> = (props) => {
    const [activeTab, setActiveTab] = React.useState<"stock" | "upload">("stock");

    const [rawItems, setRawItems] = React.useState<ICMSMasterItem[]>([]);
    const [allRows, setAllRows] = React.useState<IRowData[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [loadError, setLoadError] = React.useState<string>("");
    const [rowsPerPage, setRowsPerPage] = React.useState<number>(10);
    const [currentPage, setCurrentPage] = React.useState<number>(1);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [selectedFileName, setSelectedFileName] = React.useState<string>("");
    const [parsedCsvRows, setParsedCsvRows] = React.useState<Record<string, string>[]>([]);
    const [uploadStatusRows, setUploadStatusRows] = React.useState<IUploadStatusRow[]>([]);
    const [isUploading, setIsUploading] = React.useState<boolean>(false);
    const [uploadMessage, setUploadMessage] = React.useState<string>("");

    const loadData = React.useCallback(async (): Promise<void> => {
        setIsLoading(true);
        setLoadError("");
        try {
            const cmsMasterOps = CMSMasterOps();
            const items: ICMSMasterItem[] = await cmsMasterOps.getCMSMasterData(
                "Stage eq 1",
                { column: "Id", isAscending: false },
                props,
            );
            setRawItems(items);
            setAllRows(buildRows(items));
        } catch (error) {
            console.error("Error loading Stock Update data:", error);
            setLoadError("Unable to load data. Please refresh the page.");
        } finally {
            setIsLoading(false);
        }
    }, [props.currentSPContext]);

    React.useEffect(() => {
        let isMounted = true;
        loadData().catch((error) => {
            if (isMounted) {
                console.error(error);
            }
        });
        return () => {
            isMounted = false;
        };
    }, [loadData]);

    const totalRows = allRows.length;
    const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
    const safePage = Math.min(currentPage, totalPages);

    const pagedRows = React.useMemo(() => {
        const start = (safePage - 1) * rowsPerPage;
        return allRows.slice(start, start + rowsPerPage);
    }, [allRows, safePage, rowsPerPage]);

    const startEntry = totalRows === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
    const endEntry = Math.min(safePage * rowsPerPage, totalRows);

    const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        setRowsPerPage(parseInt(e.target.value, 10));
        setCurrentPage(1);
    };

    const goToPage = (page: number): void => {
        if (page < 1 || page > totalPages) {
            return;
        }
        setCurrentPage(page);
    };

    const getPageNumbers = (): (number | string)[] => {
        const pages: (number | string)[] = [];
        const maxButtons = 5;

        if (totalPages <= maxButtons + 2) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
            return pages;
        }

        pages.push(1);
        if (safePage > 3) {
            pages.push("...");
        }
        const start = Math.max(2, safePage - 1);
        const end = Math.min(totalPages - 1, safePage + 1);
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        if (safePage < totalPages - 2) {
            pages.push("...");
        }
        pages.push(totalPages);
        return pages;
    };

    const handleExcelExport = (): void => {
        const header = COLUMNS.map((col) => col.label);
        const csvRows = allRows.map((row) => {
            const cells = COLUMNS.map((col) => (row as any)[col.key] || "");
            return cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",");
        });
        const csvContent = [header.join(","), ...csvRows].join("\r\n");
        const blob = new Blob(["\ufeff", csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "CMS-BulkData-InventoryTemplate.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadTemplate = (): void => {
        downloadCsv(CSV_TEMPLATE_HEADERS, [], "StockUploadTemplate");
    };

    const handleChooseFile = (): void => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files && e.target.files[0];
        setUploadMessage("");
        setParsedCsvRows([]);
        setUploadStatusRows([]);

        if (!file) {
            setSelectedFileName("");
            return;
        }

        setSelectedFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = (event.target?.result as string) || "";
            const rows = parseCsvText(text);

            if (!rows.length) {
                setUploadMessage("The selected file has no data rows.");
                return;
            }

            const headerKeys = Object.keys(rows[0]);
            const missingHeaders = CSV_TEMPLATE_HEADERS.filter((h) => headerKeys.indexOf(h) === -1);
            if (missingHeaders.length) {
                setUploadMessage(
                    `Invalid template - missing column(s): ${missingHeaders.join(", ")}. Please use the downloaded template.`,
                );
                return;
            }

            setParsedCsvRows(rows);

            const uniqueEwoNos = dedupeStrings(rows.map((r) => r["EWONo"]));
            setUploadStatusRows(
                uniqueEwoNos.map((ewoNo: string) => ({ ewoNo, state: "pending" as const, message: "" })),
            );
        };
        reader.onerror = () => {
            setUploadMessage("Unable to read the selected file.");
        };
        reader.readAsText(file);

        e.target.value = "";
    };

    const getCurrentUserDisplayName = (): string => {
        return (props as any).currentSPContext?.pageContext?.user?.displayName || "System";
    };

    const handleUpload = async (): Promise<void> => {
        if (!parsedCsvRows.length) {
            setUploadMessage("Please choose a file first.");
            return;
        }

        setIsUploading(true);
        setUploadMessage("");

        const uniqueEwoNos = dedupeStrings(parsedCsvRows.map((r) => r["EWONo"]));
        const cmsMasterOps = CMSMasterOps();
        const today = new Date();

        for (const ewoNo of uniqueEwoNos) {
            const matchedItem = rawItems.filter((o) => o.Title === ewoNo)[0];
            if (!matchedItem) {
                setUploadStatusRows((prev) =>
                    prev.map((r) => (r.ewoNo === ewoNo ? { ...r, state: "error", message: "EWO not found" } : r)),
                );
                continue;
            }

            try {
                const actionTaken = parseJSON((matchedItem as any).ActionTaken, []);
                const rowsForEwo = parsedCsvRows.filter((r) => r["EWONo"] === ewoNo);

                rowsForEwo.forEach((row) => {
                    const idx = actionTaken.findIndex((o: any) => o.c0 === row["Sr.No"]);
                    if (idx === -1) {
                        return;
                    }
                    const opss = Number(row["Old PN SAP stock"] || 0);
                    const opits = Number(row["Old PN In-Transit stock"] || 0);
                    const opoos = Number(row["Old PN Open order stock"] || 0);
                    const npss = Number(row["New PN SAP stock"] || 0);
                    const npits = Number(row["New PN In-Transit stock"] || 0);
                    const npoos = Number(row["New PN Open order stock"] || 0);

                    actionTaken[idx].c36 = opss;
                    actionTaken[idx].c37 = opits;
                    actionTaken[idx].c38 = opoos;
                    actionTaken[idx].c39 = opss + opits + opoos;
                    actionTaken[idx].c40 = npss;
                    actionTaken[idx].c41 = npits;
                    actionTaken[idx].c42 = npoos;
                    actionTaken[idx].c43 = npss + npits + npoos;
                    actionTaken[idx].c44 = formatDateOnly(today);
                });

                const ageing = parseJSON((matchedItem as any).Ageing, []);
                const requiredFields = ["c27", "c32", "c35", "c36", "c37", "c38", "c40", "c41", "c42", "c45", "c46", "c47", "c48", "c49", "c50"];
                const okAgeing = requiredFields.every(
                    (field) => actionTaken.filter((o: any) => Boolean(o[field])).length === actionTaken.length,
                );
                if (okAgeing) {
                    const bpIdx = ageing.findIndex((o: any) => o.role === "BP Team");
                    if (bpIdx !== -1) {
                        ageing[bpIdx].endDT = formatDateOnly(today);
                    }
                }

                const todoStatus = parseJSON((matchedItem as any).ToDoStatus, []);
                const stockFields = ["c36", "c37", "c38", "c40", "c41", "c42"];
                let filledCount = 0;
                stockFields.forEach((field) => {
                    filledCount += actionTaken.filter((o: any) => Boolean(o[field])).length;
                });
                const todoIdx = todoStatus.findIndex((o: any) => o.status === "Stock Update");
                if (todoIdx !== -1) {
                    todoStatus[todoIdx].dt = formatDateTime(today);
                    todoStatus[todoIdx].user = getCurrentUserDisplayName();
                    todoStatus[todoIdx].per = Number(
                        ((filledCount * 100) / (6 * actionTaken.length)).toFixed(2),
                    );
                }

                const summary = parseJSON((matchedItem as any).Summary, []);
                summary.push({
                    c0: getCurrentUserDisplayName(),
                    c1: "",
                    c2: formatDateTime(today),
                    c3: "Bulk Inventory Uploaded",
                    c4: "",
                });

                await (cmsMasterOps as any).updateCMSMaster?.(matchedItem.Id, {
                    ActionTaken: JSON.stringify(actionTaken),
                    Ageing: JSON.stringify(ageing),
                    ToDoStatus: JSON.stringify(todoStatus),
                    Summary: JSON.stringify(summary),
                }, props);

                setUploadStatusRows((prev) =>
                    prev.map((r) => (r.ewoNo === ewoNo ? { ...r, state: "success", message: "" } : r)),
                );
            } catch (error) {
                console.error(`Error updating stock for ${ewoNo}:`, error);
                setUploadStatusRows((prev) =>
                    prev.map((r) => (r.ewoNo === ewoNo ? { ...r, state: "error", message: "Update failed" } : r)),
                );
            }
        }

        setIsUploading(false);
        setUploadMessage("Processing complete. Check the status column below.");
        loadData().catch((error) => console.error(error));
    };

    return (

        <div className="stock-update">

            <div className="stock-header">
                <h2>BULK UPLOAD DATA</h2>
            </div>

            <div className="stock-body">

                <div className="stock-tabs">

                    <button
                        type="button"
                        className={activeTab === "stock" ? "active" : ""}
                        onClick={() => setActiveTab("stock")}
                    >
                        Data for Stock Upload
                    </button>

                    <button
                        type="button"
                        className={activeTab === "upload" ? "active" : ""}
                        onClick={() => setActiveTab("upload")}
                    >
                        Upload
                    </button>

                </div>

                {activeTab === "stock" && (
                    <>
                        <div className="stock-toolbar">
                            <div className="stock-toolbar-left">
                                <label className="stock-rows-select">
                                    Show
                                    <select value={rowsPerPage} onChange={handleRowsPerPageChange}>
                                        {ROWS_PER_PAGE_OPTIONS.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                    rows
                                </label>

                                <button type="button" className="stock-btn stock-btn-excel" onClick={handleExcelExport}>
                                    <i className="fas fa-file-excel" />
                                    Excel
                                </button>
                            </div>
                        </div>

                        {isLoading && (
                            <div className="stock-loader-wrapper">
                                <div className="stock-loader">
                                    <span className="stock-spinner" />
                                    <span>Loading data...</span>
                                </div>
                            </div>
                        )}

                        {!isLoading && loadError && (
                            <div className="stock-status stock-status-error">{loadError}</div>
                        )}

                        {!isLoading && !loadError && (
                            <>
                                <div className="stock-summary">
                                    Showing {startEntry} to {endEntry} of {totalRows} entries
                                </div>

                                <div className="stock-table-wrapper">

                                    <table className="stock-table">

                                        <thead>
                                            <tr>
                                                {COLUMNS.map((column) => (
                                                    <th key={column.key}>
                                                        {column.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>

                                        <tbody>

                                            {pagedRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={COLUMNS.length} className="stock-no-data">
                                                        No Records Found
                                                    </td>
                                                </tr>
                                            ) : (
                                                pagedRows.map((row) => (
                                                    <tr key={row.id}>
                                                        {COLUMNS.map((column) => (
                                                            <td key={column.key}>{(row as any)[column.key] || "-"}</td>
                                                        ))}
                                                    </tr>
                                                ))
                                            )}

                                        </tbody>

                                    </table>

                                </div>

                                <div className="stock-pagination">
                                    <button
                                        type="button"
                                        className="stock-page-btn"
                                        disabled={safePage === 1}
                                        onClick={() => goToPage(safePage - 1)}
                                    >
                                        Previous
                                    </button>

                                    {getPageNumbers().map((page, idx) =>
                                        page === "..." ? (
                                            <span key={`ellipsis-${idx}`} className="stock-page-ellipsis">
                                                ...
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                key={page}
                                                className={`stock-page-btn ${page === safePage ? "stock-page-btn-active" : ""}`}
                                                onClick={() => goToPage(page as number)}
                                            >
                                                {page}
                                            </button>
                                        ),
                                    )}

                                    <button
                                        type="button"
                                        className="stock-page-btn"
                                        disabled={safePage === totalPages}
                                        onClick={() => goToPage(safePage + 1)}
                                    >
                                        Next
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}

                {activeTab === "upload" && (
                    <div className="stock-upload-panel">

                        <div className="stock-upload-toolbar">
                            <input
                                type="file"
                                accept=".csv"
                                ref={fileInputRef}
                                onChange={handleFileSelected}
                                className="stock-upload-file-input"
                            />

                            <button type="button" className="stock-btn stock-btn-choose" onClick={handleChooseFile}>
                                <i className="fas fa-upload" />
                                {selectedFileName || "Choose CSV File"}
                            </button>

                            <button type="button" className="stock-btn stock-btn-template" onClick={handleDownloadTemplate}>
                                <i className="fas fa-download" />
                                Download Template
                            </button>

                            <button
                                type="button"
                                className="stock-btn stock-btn-submit"
                                onClick={handleUpload}
                                disabled={isUploading || !parsedCsvRows.length}
                            >
                                <i className="fas fa-cloud-upload-alt" />
                                {isUploading ? "Uploading..." : "Upload"}
                            </button>
                        </div>

                        {uploadMessage && (
                            <div className="stock-upload-message">{uploadMessage}</div>
                        )}

                        {uploadStatusRows.length > 0 && (
                            <div className="stock-table-wrapper">
                                <table className="stock-table stock-upload-status-table">
                                    <thead>
                                        <tr>
                                            <th>EWO Number</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {uploadStatusRows.map((row) => (
                                            <tr key={row.ewoNo}>
                                                <td>{row.ewoNo}</td>
                                                <td className={`stock-upload-status stock-upload-status-${row.state}`}>
                                                    {row.state === "success" && <i className="fas fa-check-circle" />}
                                                    {row.state === "error" && <i className="fas fa-times-circle" />}
                                                    {row.state === "pending" && <i className="fas fa-hourglass-half" />}
                                                    {" "}
                                                    {row.state === "pending" ? "Pending" : row.state === "success" ? "Updated" : row.message}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </div>
                )}

            </div>

        </div>

    );
};

export default StockUpdate;