import * as React from "react";
import { useHistory } from "react-router-dom";
import "../CSS/EWOChronology.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import CMSMasterOps, { ICMSMasterItem } from "../../service/BAL/CMSMaster";

export interface IEWOChronologyProps extends ICmsProductionProps {
  onNavigate?: (pageKey: string) => void;
}

interface IColumn {
  key: string;
  label: string;
}

const COLUMNS: IColumn[] = [
  { key: "ewono", label: "EWO Number" },
  { key: "nextass", label: "Next Up Assembly" },
  { key: "oldpn", label: "Old Part Number" },
  { key: "newpn", label: "New Part Number" },
  { key: "partname", label: "Part Name" },
  { key: "oldpnqty", label: "Old Part Quantity" },
  { key: "newpnqty", label: "New Part Quantity" },
  { key: "kdlc", label: "KD/LC" },
  { key: "shop", label: "Shop" },
  { key: "oldpnvariant", label: "Old Part Variant Applicability" },
  { key: "newpnvariant", label: "New Part Variant Applicability" },
  { key: "model", label: "Model" },
  { key: "changetype", label: "Change Type" },
  { key: "changemethod", label: "Change Method" },
  { key: "ewostatus", label: "EWO Status" },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 75, 100];

interface IPartActionRow {
  cmsId: number;
  ewono: string;
  status: string;
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  c5: string;
  c6: string;
  c7: string;
  c9: string;
  c10: string;
  c11: string;
  c12: string;
  c13: string;
  c14: string;
}

interface IRowData {
  id: string;
  cmsId: number;
  ewono: string;
  nextass: string;
  oldpn: string;
  newpn: string;
  partname: string;
  oldpnqty: string;
  newpnqty: string;
  kdlc: string;
  shop: string;
  oldpnvariant: string;
  newpnvariant: string;
  model: string;
  changetype: string;
  changemethod: string;
  ewostatus: string;
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

const buildPartActionRows = (items: ICMSMasterItem[]): IPartActionRow[] => {
  const rows: IPartActionRow[] = [];

  items.forEach((item) => {
    const partaction = parseJSON((item as any).PartAction, []);

    partaction.forEach((pa: any) => {
      rows.push({
        cmsId: item.Id || 0,
        ewono: item.Title || "",
        status: item.Status || "",
        c1: pa.c1 || "",
        c2: pa.c2 || "",
        c3: pa.c3 || "",
        c4: pa.c4 || "",
        c5: pa.c5 || "",
        c6: pa.c6 || "",
        c7: pa.c7 || "",
        c9: pa.c9 || "",
        c10: pa.c10 || "",
        c11: pa.c11 || "",
        c12: pa.c12 || "",
        c13: pa.c13 || "",
        c14: pa.c14 || "",
      });
    });
  });

  return rows;
};

const runChronologySearch = (rows: IPartActionRow[], startPartNo: string): IPartActionRow[] => {
  let findPartNo = startPartNo;
  let pnfound: IPartActionRow[] = [];

  rows.forEach(() => {
    const f = rows.filter((o) => o.c2 === findPartNo);
    if (f.length) {
      pnfound = pnfound.concat(f);
      findPartNo = f[0].c3;
    }
  });

  rows.forEach(() => {
    const f = rows.filter((o) => o.c3 === findPartNo);
    if (f.length) {
      const fx: IPartActionRow[] = [];
      f.forEach((x) => {
        const isDuplicate = pnfound.some((o) => o.c2 === x.c2 && o.c3 === x.c3);
        if (!isDuplicate) {
          fx.push(x);
        }
      });
      if (fx.length) {
        pnfound = pnfound.concat(fx);
        findPartNo = fx[fx.length - 1].c2;
      } else {
        findPartNo = f[f.length - 1].c2;
      }
    }
  });

  return pnfound;
};

const mapToRowData = (rows: IPartActionRow[]): IRowData[] =>
  rows.map((r, idx) => ({
    id: `${r.cmsId}-${idx}`,
    cmsId: r.cmsId,
    ewono: r.ewono,
    nextass: r.c1,
    oldpn: r.c2,
    newpn: r.c3,
    partname: r.c4,
    oldpnqty: r.c5,
    newpnqty: r.c6,
    kdlc: r.c7,
    shop: r.c9,
    oldpnvariant: r.c10,
    newpnvariant: r.c11,
    model: r.c12,
    changetype: r.c13,
    changemethod: r.c14,
    ewostatus: r.status,
  }));

const buildEmptyFilters = (): Record<string, string> => {
  const map: Record<string, string> = {};
  COLUMNS.forEach((col) => {
    map[col.key] = "";
  });
  return map;
};

const EWOChronology: React.FC<IEWOChronologyProps> = (props) => {
  const history = useHistory();

  const [allPartActionRows, setAllPartActionRows] = React.useState<IPartActionRow[]>([]);
  const [displayedRows, setDisplayedRows] = React.useState<IRowData[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string>("");

  const [partNoInput, setPartNoInput] = React.useState<string>("");
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
      setAllPartActionRows(buildPartActionRows(items));
    } catch (error) {
      console.error("Error loading Part EWO Chronology data:", error);
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

  const handlePartNoInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPartNoInput(e.target.value);
  };

  const handlePartNumberSearch = (): void => {
    const term = partNoInput.trim();
    if (!term) {
      setDisplayedRows([]);
      setCurrentPage(1);
      return;
    }
    const result = runChronologySearch(allPartActionRows, term);
    setDisplayedRows(mapToRowData(result));
    setSearchTerm("");
    setColumnFilters(buildEmptyFilters());
    setCurrentPage(1);
  };

  const handlePartNoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === "Enter") {
      handlePartNumberSearch();
    }
  };

  const filteredRows = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return displayedRows.filter((row) => {
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
  }, [displayedRows, searchTerm, columnFilters]);

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
    link.download = "PartEWOChronology.csv";
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
    <div className="ewo-chronology">
      <div className="epc-header">
        <h2>PART EWO CHRONOLOGY</h2>
      </div>

      <div className="epc-body">
        {isLoading && (
          <div className="epc-loader-wrapper">
            <div className="epc-loader">
              <span className="epc-spinner" />
              <span>Loading data...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && <div className="epc-status epc-status-error">{loadError}</div>}

        {!isLoading && !loadError && (
          <>
            <div className="epc-partno-row">
              <input
                type="text"
                value={partNoInput}
                onChange={handlePartNoInputChange}
                onKeyDown={handlePartNoKeyDown}
                placeholder="search by part number..."
                className="epc-partno-input"
              />
              <button type="button" className="epc-search-btn" onClick={handlePartNumberSearch}>
                <i className="fas fa-search" /> Search
              </button>
            </div>

            <div className="epc-divider" />

            <div className="epc-toolbar">
              <div className="epc-toolbar-left">
                <label className="epc-rows-select">
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

                <button type="button" className="epc-btn-excel" onClick={handleExcelExport}>
                  Excel
                </button>

                <button type="button" className="epc-btn-clear" onClick={handleClearSearch}>
                  Clear Search
                </button>
              </div>

              <div className="epc-toolbar-right">
                <div className="epc-search">
                  <input type="text" value={searchTerm} onChange={handleSearchChange} placeholder="Search in all fields..." />
                </div>
              </div>
            </div>

            <div className="epc-summary">
              Showing {startEntry} to {endEntry} of {totalRows} entries
            </div>

            <div className="epc-table-wrapper">
              <table id="partEWOChronology_DataTable" className="epc-table">
                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th key={column.key} className={column.key === "ewono" ? "epc-col-ewo" : ""}>
                        <input
                          type="text"
                          value={columnFilters[column.key]}
                          onChange={(e) => handleColumnFilterChange(column.key, e.target.value)}
                          placeholder="Search"
                        />
                        <div className="epc-th-label">
                          {column.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 && (
                    <tr>
                      <td className="epc-no-data" colSpan={COLUMNS.length}>
                        No data available in table
                      </td>
                    </tr>
                  )}
                  {pagedRows.map((row) => (
                    <tr key={row.id}>
                      <td className="epc-col-ewo">
                        <i
                          className="fas fa-folder-open epc-file-icon"
                          onClick={() => handleOpenForm(row.cmsId)}
                        />
                        {row.ewono}
                      </td>
                      <td>{row.nextass}</td>
                      <td>{row.oldpn}</td>
                      <td>{row.newpn}</td>
                      <td>{row.partname}</td>
                      <td>{row.oldpnqty}</td>
                      <td>{row.newpnqty}</td>
                      <td>{row.kdlc}</td>
                      <td>{row.shop}</td>
                      <td>{row.oldpnvariant}</td>
                      <td>{row.newpnvariant}</td>
                      <td>{row.model}</td>
                      <td>{row.changetype}</td>
                      <td>{row.changemethod}</td>
                      <td>{row.ewostatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="epc-pagination">
              <button
                type="button"
                className="epc-page-btn"
                disabled={safePage === 1}
                onClick={() => goToPage(safePage - 1)}
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="epc-page-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    key={page}
                    className={`epc-page-btn ${page === safePage ? "epc-page-btn-active" : ""}`}
                    onClick={() => goToPage(page as number)}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                className="epc-page-btn"
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

export default EWOChronology;