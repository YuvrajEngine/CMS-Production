import * as React from "react";
import { useHistory } from "react-router-dom";
import "../CSS/PartActionCompleted.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import CMSMasterOps, { ICMSMasterItem } from "../../service/BAL/CMSMaster";

export interface IPartActionCompletedProps extends ICmsProductionProps {
  onNavigate?: (pageKey: string) => void;
}

interface IToDoStatusEntry {
  status: string;
  dt: string;
  per: number;
  user: string;
}

interface IPercentColumn {
  key: string;
  label: string;
  statusName: string;
}

interface ITeamColumn {
  key: string;
  label: string;
}

const PERCENT_COLUMNS: IPercentColumn[] = [
  { key: "partAction", label: "Part Action", statusName: "Part Action" },
  {
    key: "partReadinessDate",
    label: "Part Readiness Date",
    statusName: "Part Readiness Date",
  },
  {
    key: "partAvailabilityDate",
    label: "Part Avaialability Date",
    statusName: "Part Avaialability Date",
  },
  { key: "ptrDetails", label: "PTR Details", statusName: "PTR Details" },
  {
    key: "orderingCutOffRequirement",
    label: "Ordering cut-off Requirement",
    statusName: "Ordering cut-off Requirement",
  },
  {
    key: "orderingCutOffStatusUpdate",
    label: "Ordering cut off Status Update",
    statusName: "Ordering cut off Status Update",
  },
  {
    key: "preBPRequirement",
    label: "Pre-BP Requirement",
    statusName: "Pre-BP Requirement",
  },
  {
    key: "preBPStockUpdate",
    label: "Pre-BP Stock Update",
    statusName: "Pre-BP Stock Update",
  },
  { key: "stockUpdate", label: "Stock Update", statusName: "Stock Update" },
  {
    key: "estimatedBPDetails",
    label: "Estimated BP Details",
    statusName: "Estimated BP Details",
  },
  { key: "ecnDetails", label: "ECN Details", statusName: "ECN Details" },
  {
    key: "backflushingUpdate",
    label: "Backflushing Update",
    statusName: "Backflushing Update",
  },
  {
    key: "postBPRequirement",
    label: "Post-BP Requirement",
    statusName: "Post-BP Requirement",
  },
  {
    key: "postBPStockUpdate",
    label: "Post BP Stock Update",
    statusName: "Post BP Stock Update",
  },
  {
    key: "inventoryAdjustmentDetails",
    label: "Inventory Adjustment Details",
    statusName: "Inventory Adjustment Details",
  },
];

const TEAM_COLUMNS: ITeamColumn[] = [
  { key: "bpTeam", label: "BP Team" },
  { key: "dataManagementTeam", label: "Data Management Team" },
  { key: "inventoryTeam", label: "Inventory Team" },
  { key: "planningTeam", label: "Planning Team" },
  { key: "sqeTeam", label: "SQE Team" },
  { key: "warehouseTeam", label: "Warehouse Team" },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

interface IRowData {
  id: number;
  ewoNumbers: string[];
  status: string;
  percentages: Record<string, number | null>;
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

const parseToDoStatus = (raw: string): Record<string, number | null> => {
  const map: Record<string, number | null> = {};
  PERCENT_COLUMNS.forEach((col) => {
    map[col.key] = null;
  });

  if (!raw) {
    return map;
  }

  try {
    const entries: IToDoStatusEntry[] = JSON.parse(raw);
    entries.forEach((entry) => {
      const col = PERCENT_COLUMNS.filter(
        (c) => c.statusName === entry.status,
      )[0];
      if (col) {
        map[col.key] = typeof entry.per === "number" ? entry.per : null;
      }
    });
  } catch (e) {
    return map;
  }

  return map;
};

const ALL_FILTER_KEYS: string[] = [
  "ewo",
  ...PERCENT_COLUMNS.map((c) => c.key),
  ...TEAM_COLUMNS.map((c) => c.key),
];

const buildEmptyFilters = (): Record<string, string> => {
  const map: Record<string, string> = {};
  ALL_FILTER_KEYS.forEach((key) => {
    map[key] = "";
  });
  return map;
};

const PartActionCompleted: React.FC<IPartActionCompletedProps> = (props) => {
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
          "Status eq 'Implemented and Closed'",
          { column: "Id", isAscending: false },
          props,
        );

        const rows: IRowData[] = items.map((item) => ({
          id: item.Id || 0,
          ewoNumbers: parseEwoNumbers(item.Title),
          status: item.Status,
          percentages: parseToDoStatus(item.ToDoStatus),
        }));

        if (isMounted) {
          setAllRows(rows);
        }
      } catch (error) {
        console.error("Error loading Part Action Completed data:", error);
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
          ...PERCENT_COLUMNS.map((col) => `${row.percentages[col.key] ?? ""}`),
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

      for (const col of PERCENT_COLUMNS) {
        const filterValue = columnFilters[col.key].trim().toLowerCase();
        if (!filterValue) {
          continue;
        }
        const cellValue =
          row.percentages[col.key] === null
            ? ""
            : `${row.percentages[col.key]}`;
        if (cellValue.toLowerCase().indexOf(filterValue) === -1) {
          return false;
        }
      }

      for (const col of TEAM_COLUMNS) {
        const filterValue = columnFilters[col.key].trim().toLowerCase();
        if (!filterValue) {
          continue;
        }
        return false;
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

  const handleRowsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ): void => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const handleExcelExport = (): void => {
    const header = [
      "EWO Number",
      ...PERCENT_COLUMNS.map((c) => c.label),
      ...TEAM_COLUMNS.map((c) => c.label),
    ];

    const csvRows = filteredRows.map((row) => {
      const cells = [
        row.ewoNumbers.join(" | "),
        ...PERCENT_COLUMNS.map((col) =>
          row.percentages[col.key] === null
            ? ""
            : `${row.percentages[col.key]}`,
        ),
        ...TEAM_COLUMNS.map(() => ""),
      ];
      return cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = [header.join(","), ...csvRows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "PartActionCompleted.csv";
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
    <div className="part-action-completed">
      <div className="pac-header">
        <h2>CMS PART ACTION COMPLETED</h2>
      </div>

      <div className="pac-body">
        <div className="pac-toolbar">
          <div className="pac-toolbar-left">
            <label className="pac-rows-select">
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
              className="pac-btn pac-btn-excel"
              onClick={handleExcelExport}
            >
              <i className="fas fa-file-excel" />
              Excel
            </button>
          </div>

          <div className="pac-toolbar-right">
            <div className="pac-search">
              <i className="fas fa-search pac-search-icon" />
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
          <div className="pac-loader-wrapper">
            <div className="pac-loader">
              <span className="pac-spinner" />
              <span>Loading data...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="pac-status pac-status-error">{loadError}</div>
        )}

        {!isLoading && !loadError && (
          <>
            <div className="pac-summary">
              Showing {startEntry} to {endEntry} of {totalRows} entries
            </div>

            <div className="pac-table-wrapper">
              <table className="pac-table">
                <thead>
                  <tr>
                    <th className="pac-col-ewo">EWO Number</th>
                    <th>Part Action</th>
                    <th>Part Readiness Date</th>
                    <th>Part Avaialability Date</th>
                    <th>PTR Details</th>
                    <th>Ordering cut-off Requirement</th>
                    <th>Ordering cut off Status Update</th>
                    <th>Pre-BP Requirement</th>
                    <th>Pre-BP Stock Update</th>
                    <th>Stock Update</th>
                    <th>Estimated BP Details</th>
                    <th>ECN Details</th>
                    <th>Backflushing Update</th>
                    <th>Post-BP Requirement</th>
                    <th>Post BP Stock Update</th>
                    <th>Inventory Adjustment Details</th>
                    <th>BP Team</th>
                    <th>Data Management Team</th>
                    <th>Inventory Team</th>
                    <th>Planning Team</th>
                    <th>SQE Team</th>
                    <th>Warehouse Team</th>
                  </tr>
                  <tr className="pac-filter-row">
                    <th className="pac-col-ewo">
                      <input
                        type="text"
                        value={columnFilters.ewo}
                        onChange={(e) =>
                          handleColumnFilterChange("ewo", e.target.value)
                        }
                        placeholder="Search..."
                      />
                    </th>
                    {PERCENT_COLUMNS.map((col) => (
                      <th key={col.key}>
                        <input
                          type="text"
                          value={columnFilters[col.key]}
                          onChange={(e) =>
                            handleColumnFilterChange(col.key, e.target.value)
                          }
                          placeholder="Search..."
                        />
                      </th>
                    ))}
                    {TEAM_COLUMNS.map((col) => (
                      <th key={col.key} className="pac-col-team">
                        <input
                          type="text"
                          value={columnFilters[col.key]}
                          onChange={(e) =>
                            handleColumnFilterChange(col.key, e.target.value)
                          }
                          placeholder="Search..."
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 && (
                    <tr>
                      <td
                        className="pac-no-data"
                        colSpan={
                          1 + PERCENT_COLUMNS.length + TEAM_COLUMNS.length
                        }
                      >
                        No matching records found
                      </td>
                    </tr>
                  )}
                  {pagedRows.map((row) => (
                    <tr key={row.id}>
                      <td className="pac-col-ewo">
                        <span
                          className="pac-file-icon"
                          onClick={() => handleOpenForm(row.id)}
                        >
                          <i className="fas fa-folder-open" />
                        </span>
                        <span className="pac-ewo-list">
                          {row.ewoNumbers.map((ewo, idx) => (
                            <div key={idx}>{ewo}</div>
                          ))}
                        </span>
                      </td>
                      <td>
                        {row.percentages.partAction === null
                          ? "-"
                          : row.percentages.partAction}
                      </td>
                      <td>
                        {row.percentages.partReadinessDate === null
                          ? "-"
                          : row.percentages.partReadinessDate}
                      </td>
                      <td>
                        {row.percentages.partAvailabilityDate === null
                          ? "-"
                          : row.percentages.partAvailabilityDate}
                      </td>
                      <td>
                        {row.percentages.ptrDetails === null
                          ? "-"
                          : row.percentages.ptrDetails}
                      </td>
                      <td>
                        {row.percentages.orderingCutOffRequirement === null
                          ? "-"
                          : row.percentages.orderingCutOffRequirement}
                      </td>
                      <td>
                        {row.percentages.orderingCutOffStatusUpdate === null
                          ? "-"
                          : row.percentages.orderingCutOffStatusUpdate}
                      </td>
                      <td>
                        {row.percentages.preBPRequirement === null
                          ? "-"
                          : row.percentages.preBPRequirement}
                      </td>
                      <td>
                        {row.percentages.preBPStockUpdate === null
                          ? "-"
                          : row.percentages.preBPStockUpdate}
                      </td>
                      <td>
                        {row.percentages.stockUpdate === null
                          ? "-"
                          : row.percentages.stockUpdate}
                      </td>
                      <td>
                        {row.percentages.estimatedBPDetails === null
                          ? "-"
                          : row.percentages.estimatedBPDetails}
                      </td>
                      <td>
                        {row.percentages.ecnDetails === null
                          ? "-"
                          : row.percentages.ecnDetails}
                      </td>
                      <td>
                        {row.percentages.backflushingUpdate === null
                          ? "-"
                          : row.percentages.backflushingUpdate}
                      </td>
                      <td>
                        {row.percentages.postBPRequirement === null
                          ? "-"
                          : row.percentages.postBPRequirement}
                      </td>
                      <td>
                        {row.percentages.postBPStockUpdate === null
                          ? "-"
                          : row.percentages.postBPStockUpdate}
                      </td>
                      <td>
                        {row.percentages.inventoryAdjustmentDetails === null
                          ? "-"
                          : row.percentages.inventoryAdjustmentDetails}
                      </td>
                      <td className="pac-col-team" />
                      <td className="pac-col-team" />
                      <td className="pac-col-team" />
                      <td className="pac-col-team" />
                      <td className="pac-col-team" />
                      <td className="pac-col-team" />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pac-pagination">
              <button
                type="button"
                className="pac-page-btn"
                disabled={safePage === 1}
                onClick={() => goToPage(safePage - 1)}
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="pac-page-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    key={page}
                    className={`pac-page-btn ${page === safePage ? "pac-page-btn-active" : ""}`}
                    onClick={() => goToPage(page as number)}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                className="pac-page-btn"
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

export default PartActionCompleted;