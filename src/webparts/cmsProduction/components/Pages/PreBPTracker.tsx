import * as React from "react";
import "../CSS/PreBPTracker.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import CMSMasterOps, { ICMSMasterItem } from "../../service/BAL/CMSMaster";

export interface IPreBPTrackerProps extends ICmsProductionProps {
  onNavigate?: (pageKey: string) => void;
}

interface IColumn {
  key: string;
  label: string;
}

const COLUMNS: IColumn[] = [
  { key: "ewono", label: "EWO Number" },
  { key: "oldpn", label: "Old Part Number" },
  { key: "newpn", label: "New Part Number" },
  { key: "oldpnwh", label: "Old PN Warehouse" },
  { key: "oldpnint", label: "Old PN In-Transit" },
  { key: "oldpnsp", label: "Old PN Supplier" },
  { key: "oldpntot", label: "Old PN Total" },
  { key: "oldpncsn", label: "Old PN CSN no." },
  { key: "newpnwh", label: "New PN Warehouse" },
  { key: "newpnint", label: "New PN In-Transit" },
  { key: "newpnsp", label: "New PN Supplier" },
  { key: "newpntot", label: "New PN Total" },
  { key: "newpncsn", label: "New PN CSN no." },
  { key: "stockdt", label: "Stock date" },
  { key: "whremark", label: "Warehouse Remark" },
  { key: "plremark", label: "Planner Remark" },
  { key: "prebpdt", label: "Pre-BP Generated Date" },
  { key: "plname", label: "Planner User Name" },
  { key: "plage", label: "Ageing" },
  { key: "whname", label: "Warehouse User Name" },
  { key: "whage", label: "Ageing" },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 75, 100];

type IRowData = Record<string, string> & { id: string };

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

const formatDateOnly = (raw: string): string => {
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return "";
  }
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
};

const getDateAge = (stdt: Date, enddt: Date): string => {
  const diffMs = enddt.getTime() - stdt.getTime();
  if (isNaN(diffMs)) {
    return "";
  }
  return (diffMs / 1000 / 60 / 60 / 24).toFixed(0);
};

const buildRows = (items: ICMSMasterItem[]): IRowData[] => {
  const rows: IRowData[] = [];

  items.forEach((item) => {
    const prebp = parseJSON((item as any).PreBP, []);
    const prebpageing = parseJSON((item as any).PrePostBPAgeing, []);
    const wf = parseJSON((item as any).WF, []);

    let prebpdt = "";
    let plname = "";
    let plage = "";
    let whname = "";
    let whage = "";

    const tmpprebpage = prebpageing.filter((o: any) => o.action === "PreBP");

    if (tmpprebpage.length) {
      if (tmpprebpage[0].startDT) {
        prebpdt = formatDateOnly(tmpprebpage[0].startDT);
      }

      const plWF = wf.filter((o: any) => o.role === "Planning Team")[0];
      plname = plWF ? plWF.user || "" : "";

      const plDT = prebpageing.filter((o: any) => o.role === "Planning Team")[0];
      const plStart = plDT && plDT.startDT ? new Date(plDT.startDT) : new Date();
      const plEnd = plDT && plDT.endDT ? new Date(plDT.endDT) : new Date();
      plage = getDateAge(plStart, plEnd);

      const whWF = wf.filter((o: any) => o.role === "Warehouse Team")[0];
      whname = whWF ? whWF.user || "" : "";

      const whDT = prebpageing.filter((o: any) => o.role === "Warehouse Team")[0];
      const whStart = whDT && whDT.startDT ? new Date(whDT.startDT) : new Date();
      const whEnd = whDT && whDT.endDT ? new Date(whDT.endDT) : new Date();
      whage = getDateAge(whStart, whEnd);
    }

    prebp.forEach((bp: any, idx: number) => {
      rows.push({
        id: `${item.Id}-${idx}`,
        ewono: item.Title || "",
        oldpn: bp.c1 || "",
        newpn: bp.c2 || "",
        oldpnwh: bp.c3 || "",
        oldpnint: bp.c4 || "",
        oldpnsp: bp.c5 || "",
        oldpntot: bp.c6 || "",
        oldpncsn: bp.c7 || "",
        newpnwh: bp.c8 || "",
        newpnint: bp.c9 || "",
        newpnsp: bp.c10 || "",
        newpntot: bp.c11 || "",
        newpncsn: bp.c12 || "",
        stockdt: bp.c13 || "",
        whremark: bp.c14 || "",
        plremark: bp.c15 || "",
        prebpdt,
        plname,
        plage,
        whname,
        whage,
      });
    });
  });

  return rows;
};

const buildEmptyFilters = (): Record<string, string> => {
  const map: Record<string, string> = {};
  COLUMNS.forEach((col) => {
    map[col.key] = "";
  });
  return map;
};

const PreBPTracker: React.FC<IPreBPTrackerProps> = (props) => {
  const [allRows, setAllRows] = React.useState<IRowData[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string>("");

  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [columnFilters, setColumnFilters] = React.useState<Record<string, string>>(buildEmptyFilters());
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(10);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  const loadData = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError("");
    try {
      const cmsMasterOps = CMSMasterOps();
      const items = await cmsMasterOps.getCMSMasterData(
        "",
        { column: "Id", isAscending: false },
        props,
      );
      setAllRows(buildRows(items));
    } catch (error) {
      console.error("Error loading Pre-BP Tracker data:", error);
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

  const filteredRows = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allRows.filter((row) => {
      if (term) {
        const haystack = COLUMNS.map((col) => row[col.key] || "")
          .join(" ")
          .toLowerCase();
        if (haystack.indexOf(term) === -1) {
          return false;
        }
      }

      for (const col of COLUMNS) {
        const filterValue = columnFilters[col.key].trim().toLowerCase();
        if (!filterValue) {
          continue;
        }
        const cellValue = (row[col.key] || "").toLowerCase();
        if (cellValue.indexOf(filterValue) === -1) {
          return false;
        }
      }

      return true;
    });
  }, [allRows, searchTerm, columnFilters]);

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const pagedRows = React.useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, safePage, rowsPerPage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleColumnFilterChange = (key: string, value: string): void => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleClearSearch = (): void => {
    setSearchTerm("");
    setColumnFilters(buildEmptyFilters());
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const handleExcelExport = (): void => {
    const header = COLUMNS.map((col) => col.label);
    const csvRows = filteredRows.map((row) => {
      const cells = COLUMNS.map((col) => row[col.key] || "");
      return cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [header.join(","), ...csvRows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "PreBPTracker.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  const startEntry = totalRows === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const endEntry = Math.min(safePage * rowsPerPage, totalRows);

  return (
    <div className="pre-bp-tracker">
      <div className="pbt-header">
        <h2>PRE BP TRACKER</h2>
      </div>

      <div className="pbt-body">
        <div className="pbt-toolbar">
          <div className="pbt-toolbar-left">
            <label className="pbt-rows-select">
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

            <button type="button" className="pbt-btn pbt-btn-excel" onClick={handleExcelExport}>
              Excel
            </button>

            <button type="button" className="pbt-btn pbt-btn-neutral" onClick={handleClearSearch}>
              Clear Search
            </button>
          </div>

          <div className="pbt-toolbar-right">
            <div className="pbt-search">
              <input type="text" value={searchTerm} onChange={handleSearchChange} placeholder="Search in all fields..." />
            </div>
          </div> 
        </div>

        {isLoading && (
          <div className="pbt-loader-wrapper">
            <div className="pbt-loader">
              <span className="pbt-spinner" />
              <span>Loading data...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="pbt-status pbt-status-error">{loadError}</div>
        )}

        {!isLoading && !loadError && (
          <>
            <div className="pbt-summary">
              Showing {startEntry} to {endEntry} of {totalRows} entries
            </div>

            <div className="pbt-table-wrapper">
              <table className="pbt-table">
                <thead>
                  <tr>
                    {COLUMNS.map((column, idx) => (
                      <th key={`${column.key}-${idx}`} className={column.key === "ewono" ? "pbt-col-ewo" : ""}>
                        <input
                          type="text"
                          value={columnFilters[column.key]}
                          onChange={(e) => handleColumnFilterChange(column.key, e.target.value)}
                          placeholder="Search..."
                        />
                        <div className="pbt-th-label">
                          {column.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 && (
                    <tr>
                      <td className="pbt-no-data" colSpan={COLUMNS.length}>
                        No matching records found
                      </td>
                    </tr>
                  )}
                  {pagedRows.map((row) => (
                    <tr key={row.id}>
                      {COLUMNS.map((column, idx) => (
                        <td
                          key={`${row.id}-${column.key}-${idx}`}
                          className={column.key === "ewono" ? "pbt-col-ewo" : ""}
                        >
                          {column.key === "ewono" && (
                            <i className="fas fa-folder-open pbt-file-icon" />
                          )}
                          {row[column.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pbt-pagination">
              <button
                type="button"
                className="pbt-page-btn"
                disabled={safePage === 1}
                onClick={() => goToPage(safePage - 1)}
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="pbt-page-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    key={page}
                    className={`pbt-page-btn ${page === safePage ? "pbt-page-btn-active" : ""}`}
                    onClick={() => goToPage(page as number)}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                className="pbt-page-btn"
                disabled={safePage === totalPages}
                onClick={() => goToPage(safePage + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PreBPTracker;