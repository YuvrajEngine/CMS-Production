import * as React from "react";
import { useHistory } from "react-router-dom";
import "../CSS/EWOChangeDetails.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import CMSMasterOps, { ICMSMasterItem } from "../../service/BAL/CMSMaster";

export interface IEWOChangeDetailsProps extends ICmsProductionProps {
  onNavigate?: (pageKey: string) => void;
}

interface IColumn {
  key: string;
  label: string;
}

const COLUMNS: IColumn[] = [
  { key: "ewono", label: "EWO Number" },
  { key: "ewotitle", label: "EWO Title" },
  { key: "oldpn", label: "Old Part Number" },
  { key: "newpn", label: "New Part Number" },
  { key: "partname", label: "Part Name" },
  { key: "oldpnqty", label: "Old Part Quantity" },
  { key: "newpnqty", label: "New Part Quantity" },
  { key: "kdlc", label: "KD/LC" },
  { key: "shop", label: "Shop" },
  { key: "oldpnvariant", label: "Old Part Variant Applicability" },
  { key: "newpnvariant", label: "New Part Variant Applicability" },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 75, 100];

interface IRowData {
  id: string;
  cmsId: number;
  ewono: string;
  ewotitle: string;
  oldpn: string;
  newpn: string;
  partname: string;
  oldpnqty: string;
  newpnqty: string;
  kdlc: string;
  shop: string;
  oldpnvariant: string;
  newpnvariant: string;
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

const buildRows = (items: ICMSMasterItem[]): IRowData[] => {
  const rows: IRowData[] = [];

  items.forEach((item) => {
    const ewodetails = parseJSON((item as any).EWODetails, {});
    const partaction = parseJSON((item as any).PartAction, []);
    const ewotitle = ewodetails.title || "";

    partaction.forEach((pa: any, idx: number) => {
      rows.push({
        id: `${item.Id}-${idx}`,
        cmsId: (item.Id as number) || 0,
        ewono: item.Title || "",
        ewotitle,
        oldpn: pa.c2 || "",
        newpn: pa.c3 || "",
        partname: pa.c4 || "",
        oldpnqty: pa.c5 || "",
        newpnqty: pa.c6 || "",
        kdlc: pa.c7 || "",
        shop: pa.c9 || "",
        oldpnvariant: pa.c10 || "",
        newpnvariant: pa.c11 || "",
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

const EWOChangeDetails: React.FC<IEWOChangeDetailsProps> = (props) => {
  const history = useHistory();
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
      console.error("Error loading EWO Change Details data:", error);
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
    link.download = "EWOChangeDetails.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleOpenForm = (cmsId: number): void => {
    history.push(`/CMSRequestForm/${cmsId}`);
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
    <div className="ewo-change-details">
      <div className="ecd-header">
        <h2>EWO CHANGE DETAILS</h2>
      </div>

      <div className="ecd-body">
        <div className="ecd-toolbar">
          <div className="ecd-toolbar-left">
            <label className="ecd-rows-select">
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

            <button type="button" className="ecd-btn ecd-btn-excel" onClick={handleExcelExport}>
              Excel
            </button>

            <button type="button" className="ecd-btn ecd-btn-neutral" onClick={handleClearSearch}>
              Clear Search
            </button>
          </div>

          <div className="ecd-toolbar-right">
            <div className="ecd-search">
              <input type="text" value={searchTerm} onChange={handleSearchChange} placeholder="Search in all fields..." />
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="ecd-loader-wrapper">
            <div className="ecd-loader">
              <span className="ecd-spinner" />
              <span>Loading data...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="ecd-status ecd-status-error">{loadError}</div>
        )}

        {!isLoading && !loadError && (
          <>
            <div className="ecd-summary">
              Showing {startEntry} to {endEntry} of {totalRows} entries
            </div>

            <div className="ecd-table-wrapper">
              <table className="ecd-table">
                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th key={column.key} className={column.key === "ewono" ? "ecd-col-ewo" : ""}>
                        <input
                          type="text"
                          value={columnFilters[column.key]}
                          onChange={(e) => handleColumnFilterChange(column.key, e.target.value)}
                          placeholder="Search..."
                        />
                        <div className="ecd-th-label">
                          {column.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 && (
                    <tr>
                      <td className="ecd-no-data" colSpan={COLUMNS.length}>
                        No matching records found
                      </td>
                    </tr>
                  )}
                  {pagedRows.map((row) => (
                    <tr key={row.id}>
                      <td className="ecd-col-ewo">
                        <span className="ecd-file-icon" onClick={() => handleOpenForm(row.cmsId)}>
                          <i className="fas fa-folder-open" />
                        </span>
                        {row.ewono}
                      </td>
                      <td>{row.ewotitle}</td>
                      <td>{row.oldpn}</td>
                      <td>{row.newpn}</td>
                      <td>{row.partname}</td>
                      <td>{row.oldpnqty}</td>
                      <td>{row.newpnqty}</td>
                      <td>{row.kdlc}</td>
                      <td>{row.shop}</td>
                      <td>{row.oldpnvariant}</td>
                      <td>{row.newpnvariant}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ecd-pagination">
              <button
                type="button"
                className="ecd-page-btn"
                disabled={safePage === 1}
                onClick={() => goToPage(safePage - 1)}
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="ecd-page-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    key={page}
                    className={`ecd-page-btn ${page === safePage ? "ecd-page-btn-active" : ""}`}
                    onClick={() => goToPage(page as number)}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                className="ecd-page-btn"
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

export default EWOChangeDetails;