import * as React from "react";
import { useHistory } from "react-router-dom";
import "../CSS/BPRSAgeingReport.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import BPRSMaster, { IBPRSMaster } from "../../service/BAL/BPRSMaster";

export interface IBPRSAgeingReportProps extends ICmsProductionProps {
  onNavigate?: (pageKey: string) => void;
}

interface IWFEntry {
  role: string;
  user: string;
  email?: string;
}

interface IAgeingEntry {
  role: string;
  startDT: string;
  endDT: string;
}

interface ITeamColumn {
  key: string;
  label: string;
}

const TEAM_COLUMNS: ITeamColumn[] = [
  { key: "manufacturingTeam", label: "Manufacturing Team" },
  { key: "lineFeedingTeam", label: "Line-Feeding Team" },
  { key: "logisticsEwoCoordinator", label: "Logistics EWO coordinator" },
  { key: "meTeam", label: "ME Team" },
  { key: "qualityTeam", label: "Quality Team" },
  { key: "shopTeamGroupLeaderTeam", label: "Shop Team/ Group Leader Team" },
  { key: "warehouseTeam", label: "Warehouse Team" },
  { key: "shopManager", label: "Shop Manager" },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

interface IRowData {
  id: number;
  bprsNumber: string;
  status: string;
  ewoNumber: string;
  teamUsers: Record<string, string>;
  teamAgeing: Record<string, number | null>;
}

const normalizeRole = (role: string): string => {
  if (!role) {
    return "";
  }
  return role
    .toLowerCase()
    .replace(/team/g, "")
    .replace(/[^a-z0-9]/g, "");
};

const parseFlexibleDate = (dateStr: string): Date | null => {
  if (!dateStr) {
    return null;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const isoDate = new Date(dateStr);
    return isNaN(isoDate.getTime()) ? null : isoDate;
  }
  const ddmmyyyy = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const parsedDate = new Date(year, month, day);
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
  return null;
};

const computeAgeingDays = (startDT: string, endDT: string): number | null => {
  const start = parseFlexibleDate(startDT);
  if (!start) {
    return null;
  }
  const end = endDT ? parseFlexibleDate(endDT) : new Date();
  if (!end) {
    return null;
  }
  const diffMs = end.getTime() - start.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return days >= 0 ? days : null;
};

const parseWFData = (raw: string): Record<string, string> => {
  const map: Record<string, string> = {};
  TEAM_COLUMNS.forEach((col) => {
    map[col.key] = "";
  });

  if (!raw) {
    return map;
  }

  try {
    const entries: IWFEntry[] = JSON.parse(raw);
    entries.forEach((entry) => {
      const normalizedRole = normalizeRole(entry.role);
      const col = TEAM_COLUMNS.filter(
        (c) => normalizeRole(c.label) === normalizedRole,
      )[0];
      if (col && entry.user) {
        map[col.key] = entry.user;
      }
    });
  } catch (e) {
    return map;
  }

  return map;
};

const parseAgeingData = (raw: string): Record<string, number | null> => {
  const map: Record<string, number | null> = {};
  TEAM_COLUMNS.forEach((col) => {
    map[col.key] = null;
  });

  if (!raw) {
    return map;
  }

  try {
    const entries: IAgeingEntry[] = JSON.parse(raw);
    entries.forEach((entry) => {
      const normalizedRole = normalizeRole(entry.role);
      const col = TEAM_COLUMNS.filter(
        (c) => normalizeRole(c.label) === normalizedRole,
      )[0];
      if (col) {
        map[col.key] = computeAgeingDays(entry.startDT, entry.endDT);
      }
    });
  } catch (e) {
    return map;
  }

  return map;
};

const padWithZeros = (value: string, length: number): string => {
  let result = value;
  while (result.length < length) {
    result = "0" + result;
  }
  return result;
};

const generateBPRSNumber = (id: number): string => {
  return `EWO-${padWithZeros(String(id), 6)}`;
};

const ALL_FILTER_KEYS: string[] = [
  "bprsNumber",
  "status",
  "ewoNumber",
  ...TEAM_COLUMNS.map((c) => c.key),
];

const buildEmptyFilters = (): Record<string, string> => {
  const map: Record<string, string> = {};
  ALL_FILTER_KEYS.forEach((key) => {
    map[key] = "";
  });
  return map;
};

const BPRSAgeingReport: React.FC<IBPRSAgeingReportProps> = (props) => {
  const history = useHistory();

  const [allRows, setAllRows] = React.useState<IRowData[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string>("");

  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [columnFilters, setColumnFilters] =
    React.useState<Record<string, string>>(buildEmptyFilters());
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(10);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  React.useEffect(() => {
    let isMounted = true;

    const loadData = async (): Promise<void> => {
      setIsLoading(true);
      setLoadError("");
      try {
        const bprsMasterOps = await BPRSMaster();
        const items: IBPRSMaster[] = await bprsMasterOps.getAllBPRSData(
          props,
        );

        const rows: IRowData[] = items.map((item) => ({
          id: item.Id || 0,
          bprsNumber: generateBPRSNumber(item.Id || 0),
          status: item.Status,
          ewoNumber: item.Title,
          teamUsers: parseWFData(item.WF),
          teamAgeing: parseAgeingData(item.Ageing),
        }));

        if (isMounted) {
          setAllRows(rows);
        }
      } catch (error) {
        console.error("Error loading BPRS Ageing Report data:", error);
        if (isMounted) {
          setLoadError("Unable to load data. Please refresh the page.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData().catch((error) => console.error(error));

    return () => {
      isMounted = false;
    };
  }, [props.currentSPContext]);

  const filteredRows = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return allRows.filter((row) => {
      if (term) {
        const haystack = [
          row.bprsNumber,
          row.status,
          row.ewoNumber,
          ...TEAM_COLUMNS.map((col) => row.teamUsers[col.key]),
          ...TEAM_COLUMNS.map((col) => `${row.teamAgeing[col.key] ?? ""}`),
        ]
          .join(" ")
          .toLowerCase();
        if (haystack.indexOf(term) === -1) {
          return false;
        }
      }

      const bprsFilter = columnFilters.bprsNumber.trim().toLowerCase();
      if (
        bprsFilter &&
        row.bprsNumber.toLowerCase().indexOf(bprsFilter) === -1
      ) {
        return false;
      }

      const statusFilter = columnFilters.status.trim().toLowerCase();
      if (
        statusFilter &&
        row.status.toLowerCase().indexOf(statusFilter) === -1
      ) {
        return false;
      }

      const ewoFilter = columnFilters.ewoNumber.trim().toLowerCase();
      if (
        ewoFilter &&
        row.ewoNumber.toLowerCase().indexOf(ewoFilter) === -1
      ) {
        return false;
      }

      for (const col of TEAM_COLUMNS) {
        const filterValue = columnFilters[col.key].trim().toLowerCase();
        if (!filterValue) {
          continue;
        }
        const cellValue = row.teamUsers[col.key] || "";
        if (cellValue.toLowerCase().indexOf(filterValue) === -1) {
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

  const handleRowsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ): void => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const handleExcelExport = (): void => {
    const header = [
      "BPRS Number",
      "Status",
      "EWO Number",
      ...TEAM_COLUMNS.reduce<string[]>((acc, col) => {
        acc.push(col.label, "Ageing");
        return acc;
      }, []),
    ];

    const csvRows = filteredRows.map((row) => {
      const cells = [
        row.bprsNumber,
        row.status,
        row.ewoNumber,
        ...TEAM_COLUMNS.reduce<string[]>((acc, col) => {
          acc.push(
            row.teamUsers[col.key] || "",
            row.teamAgeing[col.key] === null
              ? ""
              : `${row.teamAgeing[col.key]}`,
          );
          return acc;
        }, []),
      ];
      return cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = [header.join(","), ...csvRows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "BPRSAgeingReport.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenForm = (rowId: number): void => {
    history.push(`/BPRSRequestForm/${rowId}`);
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
    <div className="bprs-ageing-report">
      <div className="bar-header">
        <h2>BPRS AGEING REPORT</h2>
      </div>

      <div className="bar-body">
        <div className="bar-toolbar">
          <div className="bar-toolbar-left">
            <label className="bar-rows-select">
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

            <button
              type="button"
              className="bar-btn bar-btn-excel"
              onClick={handleExcelExport}
            >
              <i className="fas fa-file-excel" />
              Excel
            </button>

            <button
              type="button"
              className="bar-btn bar-btn-clear"
              onClick={handleClearSearch}
            >
              <i className="fas fa-times-circle" />
              Clear Search
            </button>
          </div>

          <div className="bar-toolbar-right">
            <div className="bar-search">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search in all fields..."
              />
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="bar-loader-wrapper">
            <div className="bar-loader">
              <span className="bar-spinner" />
              <span>Loading data...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="bar-status bar-status-error">{loadError}</div>
        )}

        {!isLoading && !loadError && (
          <>
            <div className="bar-summary">
              Showing {startEntry} to {endEntry} of {totalRows} entries
            </div>

            <div className="bar-table-wrapper">
              <table className="bar-table">
                <thead>
                  <tr>
                    <th className="bar-col-bprs">
                      BPRS Number 
                    </th>
                    <th>
                      Status 
                    </th>
                    <th>
                      EWO Number 
                    </th>
                    {TEAM_COLUMNS.map((col) => (
                      <React.Fragment key={col.key}>
                        <th>
                          {col.label} 
                        </th>
                        <th className="bar-col-ageing">
                          Ageing 
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                  <tr className="bar-filter-row">
                    <th className="bar-col-bprs">
                      <input
                        type="text"
                        value={columnFilters.bprsNumber}
                        onChange={(e) =>
                          handleColumnFilterChange("bprsNumber", e.target.value)
                        }
                        placeholder="Search..."
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        value={columnFilters.status}
                        onChange={(e) =>
                          handleColumnFilterChange("status", e.target.value)
                        }
                        placeholder="Search..."
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        value={columnFilters.ewoNumber}
                        onChange={(e) =>
                          handleColumnFilterChange("ewoNumber", e.target.value)
                        }
                        placeholder="Search..."
                      />
                    </th>
                    {TEAM_COLUMNS.map((col) => (
                      <React.Fragment key={col.key}>
                        <th>
                          <input
                            type="text"
                            value={columnFilters[col.key]}
                            onChange={(e) =>
                              handleColumnFilterChange(col.key, e.target.value)
                            }
                            placeholder="Search..."
                          />
                        </th>
                        <th className="bar-col-ageing" />
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 && (
                    <tr>
                      <td
                        className="bar-no-data"
                        colSpan={3 + TEAM_COLUMNS.length * 2}
                      >
                        No matching records found
                      </td>
                    </tr>
                  )}
                  {pagedRows.map((row) => (
                    <tr key={row.id}>
                      <td className="bar-col-bprs">
                        <span
                          className="bar-file-icon"
                          onClick={() => handleOpenForm(row.id)}
                        >
                          <i className="fas fa-folder-open" />
                        </span>
                        <span>{row.bprsNumber}</span>
                      </td>
                      <td>{row.status}</td>
                      <td>{row.ewoNumber}</td>
                      {TEAM_COLUMNS.map((col) => (
                        <React.Fragment key={col.key}>
                          <td>{row.teamUsers[col.key]}</td>
                          <td className="bar-col-ageing">
                            {row.teamAgeing[col.key] === null
                              ? ""
                              : row.teamAgeing[col.key]}
                          </td>
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bar-pagination">
              <button
                type="button"
                className="bar-page-btn"
                disabled={safePage === 1}
                onClick={() => goToPage(safePage - 1)}
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="bar-page-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    key={page}
                    className={`bar-page-btn ${page === safePage ? "bar-page-btn-active" : ""}`}
                    onClick={() => goToPage(page as number)}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                className="bar-page-btn"
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

export default BPRSAgeingReport;