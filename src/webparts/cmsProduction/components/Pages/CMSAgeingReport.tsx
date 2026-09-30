import * as React from "react";
import { useHistory } from "react-router-dom";
import "../CSS/CMSAgeingReport.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import CMSMasterOps, { ICMSMasterItem } from "../../service/BAL/CMSMaster";

export interface ICMSAgeingReportProps extends ICmsProductionProps {
  onNavigate?: (pageKey: string) => void;
}

interface IWFEntry {
  role: string;
  user: string;
  email?: string;
  startDT?: string;
  endDT?: string;
}

interface IAgeingEntry {
  role: string;
  startDT: string;
  endDT: string;
}

interface ITeamColumn {
  key: string;
  label: string;
  roleName: string;
}

const TEAM_COLUMNS: ITeamColumn[] = [
  { key: "bpTeam", label: "BP Team", roleName: "BP Team" },
  { key: "sqeTeam", label: "SQE Team", roleName: "SQE Team" },
  { key: "planningTeam", label: "Planning Team", roleName: "Planning Team" },
  { key: "warehouseTeam", label: "Warehouse Team", roleName: "Warehouse Team" },
  { key: "inventoryTeam", label: "Inventory Team", roleName: "Inventory Team" },
  {
    key: "dataManagementTeam",
    label: "Data Management Team",
    roleName: "Data Management Team",
  },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

interface IRowData {
  id: number;
  ewoNumbers: string[];
  status: string;
  teamUsers: Record<string, string>;
  teamAgeing: Record<string, number | null>;
}

const parseEwoNumbers = (title: string): string[] => {
  if (!title) {
    return [];
  }
  return title
    .split(/<br\s*\/?>/gi)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
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
    map[col.key] = "-";
  });

  if (!raw) {
    return map;
  }

  try {
    const entries: IWFEntry[] = JSON.parse(raw);
    entries.forEach((entry) => {
      const col = TEAM_COLUMNS.filter((c) => c.roleName === entry.role)[0];
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
      const col = TEAM_COLUMNS.filter((c) => c.roleName === entry.role)[0];
      if (col) {
        map[col.key] = computeAgeingDays(entry.startDT, entry.endDT);
      }
    });
  } catch (e) {
    return map;
  }

  return map;
};

const ALL_FILTER_KEYS: string[] = [
  "ewo",
  "status",
  ...TEAM_COLUMNS.map((c) => c.key),
];

const buildEmptyFilters = (): Record<string, string> => {
  const map: Record<string, string> = {};
  ALL_FILTER_KEYS.forEach((key) => {
    map[key] = "";
  });
  return map;
};

const CMSAgeingReport: React.FC<ICMSAgeingReportProps> = (props) => {
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
        const cmsMasterOps = CMSMasterOps();
        const items: ICMSMasterItem[] = await cmsMasterOps.getCMSMasterData(
          "",
          { column: "Id", isAscending: false },
          props,
        );

        const rows: IRowData[] = items.map((item) => ({
          id: item.Id || 0,
          ewoNumbers: parseEwoNumbers(item.Title),
          status: item.Status,
          teamUsers: parseWFData(item.WF),
          teamAgeing: parseAgeingData(item.Ageing),
        }));

        if (isMounted) {
          setAllRows(rows);
        }
      } catch (error) {
        console.error("Error loading CMS Ageing Report data:", error);
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
          ...row.ewoNumbers,
          row.status,
          ...TEAM_COLUMNS.map((col) => row.teamUsers[col.key]),
          ...TEAM_COLUMNS.map((col) => `${row.teamAgeing[col.key] ?? ""}`),
        ]
          .join(" ")
          .toLowerCase();
        if (haystack.indexOf(term) === -1) {
          return false;
        }
      }

      const ewoFilter = columnFilters.ewo.trim().toLowerCase();
      if (
        ewoFilter &&
        row.ewoNumbers.join(" ").toLowerCase().indexOf(ewoFilter) === -1
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
      "EWO Number",
      "Status",
      ...TEAM_COLUMNS.reduce<string[]>((acc, col) => {
        acc.push(col.label, "Ageing");
        return acc;
      }, []),
    ];

    const csvRows = filteredRows.map((row) => {
      const cells = [
        row.ewoNumbers.join(" | "),
        row.status,
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
    link.download = "CMSAgeingReport.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenForm = (rowId: number): void => {
    history.push(`/CMSRequestForm/${rowId}`);
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
    <div className="cms-ageing-report">
      <div className="car-header">
        <h2>CMS AGEING REPORT</h2>
      </div>

      <div className="car-body">
        <div className="car-toolbar">
          <div className="car-toolbar-left">
            <label className="car-rows-select">
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
              className="car-btn car-btn-excel"
              onClick={handleExcelExport}
            >
              <i className="fas fa-file-excel" />
              Excel
            </button>

            <button
              type="button"
              className="car-btn car-btn-clear"
              onClick={handleClearSearch}
            >
              <i className="fas fa-times-circle" />
              Clear Search
            </button>
          </div>

          <div className="car-toolbar-right">
            <div className="car-search">
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
          <div className="car-loader-wrapper">
            <div className="car-loader">
              <span className="car-spinner" />
              <span>Loading data...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="car-status car-status-error">{loadError}</div>
        )}

        {!isLoading && !loadError && (
          <>
            <div className="car-summary">
              Showing {startEntry} to {endEntry} of {totalRows} entries
            </div>

            <div className="car-table-wrapper">
              <table className="car-table">
                <thead>
                  <tr>
                    <th className="car-col-ewo">
                      EWO Number 
                    </th>
                    <th>
                      Status 
                    </th>
                    {TEAM_COLUMNS.map((col) => (
                      <React.Fragment key={col.key}>
                        <th>
                          {col.label} 
                        </th>
                        <th className="car-col-ageing">
                          Ageing 
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                  <tr className="car-filter-row">
                    <th className="car-col-ewo">
                      <input
                        type="text"
                        value={columnFilters.ewo}
                        onChange={(e) =>
                          handleColumnFilterChange("ewo", e.target.value)
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
                        <th className="car-col-ageing" />
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 && (
                    <tr>
                      <td
                        className="car-no-data"
                        colSpan={2 + TEAM_COLUMNS.length * 2}
                      >
                        No matching records found
                      </td>
                    </tr>
                  )}
                  {pagedRows.map((row) => (
                    <tr key={row.id}>
                      <td className="car-col-ewo">
                        <span
                          className="car-file-icon"
                          onClick={() => handleOpenForm(row.id)}
                        >
                          <i className="fas fa-folder-open" />
                        </span>
                        <span className="car-ewo-list">
                          {row.ewoNumbers.map((ewo, idx) => (
                            <div key={idx}>{ewo}</div>
                          ))}
                        </span>
                      </td>
                      <td>{row.status}</td>
                      {TEAM_COLUMNS.map((col) => (
                        <React.Fragment key={col.key}>
                          <td>{row.teamUsers[col.key]}</td>
                          <td className="car-col-ageing">
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

            <div className="car-pagination">
              <button
                type="button"
                className="car-page-btn"
                disabled={safePage === 1}
                onClick={() => goToPage(safePage - 1)}
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="car-page-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    key={page}
                    className={`car-page-btn ${page === safePage ? "car-page-btn-active" : ""}`}
                    onClick={() => goToPage(page as number)}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                className="car-page-btn"
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

export default CMSAgeingReport;