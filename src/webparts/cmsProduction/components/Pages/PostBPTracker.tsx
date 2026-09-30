import * as React from "react";
import "../CSS/PostBPTracker.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import CMSMasterOps, { ICMSMasterItem } from "../../service/BAL/CMSMaster";

export interface IPostBPTrackerProps extends ICmsProductionProps {
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
  { key: "postbpdt", label: "Post-BP Generated Date" },
  { key: "plname", label: "Planner User Name" },
  { key: "plage", label: "Ageing" },
  { key: "whname", label: "Warehouse User Name" },
  { key: "whage", label: "Ageing" },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 75, 100];

interface IRowData {
  id: string;
  ewono: string;
  oldpn: string;
  newpn: string;
  oldpnwh: string;
  oldpnint: string;
  oldpnsp: string;
  oldpntot: string;
  oldpncsn: string;
  newpnwh: string;
  newpnint: string;
  newpnsp: string;
  newpntot: string;
  newpncsn: string;
  stockdt: string;
  whremark: string;
  plremark: string;
  postbpdt: string;
  plname: string;
  plage: string;
  whname: string;
  whage: string;
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

const zeroPad = (value: number): string => {
  const str = value.toString();
  return str.length < 2 ? `0${str}` : str;
};

const formatDate = (dt: any): string => {
  if (!dt) {
    return "";
  }
  const d = new Date(dt);
  if (isNaN(d.getTime())) {
    return "";
  }
  const dd = zeroPad(d.getDate());
  const mm = zeroPad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const getDateAge = (stdt: any, enddt: any): string => {
  const diff = new Date(enddt).getTime() - new Date(stdt).getTime();
  if (isNaN(diff)) {
    return "";
  }
  return (diff / 1000 / 60 / 60 / 24).toFixed(0);
};

const buildRows = (items: ICMSMasterItem[]): IRowData[] => {
  const rows: IRowData[] = [];

  items.forEach((item) => {
    const postbp = parseJSON((item as any).PostBP, []);
    const postbpageing = parseJSON((item as any).PrePostBPAgeing, []);
    const wf = parseJSON((item as any).WF, []);

    let postbpdt = "";
    let plname = "";
    let plage = "";
    let whname = "";
    let whage = "";

    const tmppostbpage = postbpageing.filter((o: any) => o.action === "PostBP");
    if (tmppostbpage.length) {
      postbpdt = formatDate(tmppostbpage[0].startDT);

      const plEntry = wf.filter((o: any) => o.role === "Planning Team")[0];
      plname = plEntry ? plEntry.user : "";

      const plDt = postbpageing.filter((o: any) => o.role === "Planning Team")[0];
      if (plDt) {
        const stdt = plDt.startDT ? new Date(plDt.startDT) : new Date();
        const endt = plDt.endDT ? new Date(plDt.endDT) : new Date();
        plage = getDateAge(stdt, endt);
      }

      const whEntry = wf.filter((o: any) => o.role === "Warehouse Team")[0];
      whname = whEntry ? whEntry.user : "";

      const whDt = postbpageing.filter((o: any) => o.role === "Warehouse Team")[0];
      if (whDt) {
        const stdt = whDt.startDT ? new Date(whDt.startDT) : new Date();
        const endt = whDt.endDT ? new Date(whDt.endDT) : new Date();
        whage = getDateAge(stdt, endt);
      }
    }

    if (postbp.length) {
      postbp.forEach((bp: any, idx: number) => {
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
          postbpdt,
          plname,
          plage,
          whname,
          whage,
        });
      });
    }
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

const PostBPTracker: React.FC<IPostBPTrackerProps> = (props) => {
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
        "Stage ge 1",
        { column: "Id", isAscending: false },
        props,
      );
      setAllRows(buildRows(items));
    } catch (error) {
      console.error("Error loading Post BP Tracker data:", error);
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
        const haystack = COLUMNS.map((col) => (row as any)[col.key] || "")
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
        const cellValue = ((row as any)[col.key] || "").toLowerCase();
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
      const cells = COLUMNS.map((col) => (row as any)[col.key] || "");
      return cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [header.join(","), ...csvRows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "PostBPTracker.csv";
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
    <div className="post-bp-tracker">
      <div className="pbp-header">
        <h2>POST BP TRACKER</h2>
      </div>

      <div className="pbp-body">
        <div className="pbp-toolbar">
          <div className="pbp-toolbar-left">
            <label className="pbp-rows-select">
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

            <button type="button" className="pbp-btn pbp-btn-excel" onClick={handleExcelExport}>
              Excel
            </button>

            <button type="button" className="pbp-btn pbp-btn-neutral" onClick={handleClearSearch}>
              Clear Search
            </button>
          </div>

          <div className="pbp-toolbar-right">
            <div className="pbp-search">
              <input type="text" value={searchTerm} onChange={handleSearchChange} placeholder="Search in all fields..." />
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="pbp-loader-wrapper">
            <div className="pbp-loader">
              <span className="pbp-spinner" />
              <span>Loading data...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="pbp-status pbp-status-error">{loadError}</div>
        )}

        {!isLoading && !loadError && (
          <>
            <div className="pbp-summary">
              Showing {startEntry} to {endEntry} of {totalRows} entries
            </div>

            <div className="pbp-table-wrapper">
              <table className="pbp-table">
                <thead>
                  <tr>
                    {COLUMNS.map((column, idx) => (
                      <th key={`${column.key}-${idx}`} className={column.key === "ewono" ? "pbp-col-ewo" : ""}>
                        <input
                          type="text"
                          value={columnFilters[column.key]}
                          onChange={(e) => handleColumnFilterChange(column.key, e.target.value)}
                          placeholder="Search..."
                        />
                        <div className="pbp-th-label">
                          {column.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 && (
                    <tr>
                      <td className="pbp-no-data" colSpan={COLUMNS.length}>
                        No matching records found
                      </td>
                    </tr>
                  )}
                  {pagedRows.map((row) => (
                    <tr key={row.id}>
                      <td className="pbp-col-ewo">
                        <i className="fas fa-folder-open pbp-file-icon" />
                        {row.ewono}
                      </td>
                      <td>{row.oldpn}</td>
                      <td>{row.newpn}</td>
                      <td>{row.oldpnwh}</td>
                      <td>{row.oldpnint}</td>
                      <td>{row.oldpnsp}</td>
                      <td>{row.oldpntot}</td>
                      <td>{row.oldpncsn}</td>
                      <td>{row.newpnwh}</td>
                      <td>{row.newpnint}</td>
                      <td>{row.newpnsp}</td>
                      <td>{row.newpntot}</td>
                      <td>{row.newpncsn}</td>
                      <td>{row.stockdt}</td>
                      <td>{row.whremark}</td>
                      <td>{row.plremark}</td>
                      <td>{row.postbpdt}</td>
                      <td>{row.plname}</td>
                      <td>{row.plage}</td>
                      <td>{row.whname}</td>
                      <td>{row.whage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pbp-pagination">
              <button
                type="button"
                className="pbp-page-btn"
                disabled={safePage === 1}
                onClick={() => goToPage(safePage - 1)}
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="pbp-page-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    key={page}
                    className={`pbp-page-btn ${page === safePage ? "pbp-page-btn-active" : ""}`}
                    onClick={() => goToPage(page as number)}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                className="pbp-page-btn"
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

export default PostBPTracker;