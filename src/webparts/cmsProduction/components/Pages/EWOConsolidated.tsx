import * as React from "react";
import { useHistory } from "react-router-dom";
import { Web } from "@pnp/sp/presets/all";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "../CSS/EWOConsolidated.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import CMSMasterOps, { ICMSMasterItem } from "../../service/BAL/CMSMaster";
import BPRSMaster, { IBPRSMaster } from "../../service/BAL/BPRSMaster";

export interface IEWOConsolidatedProps extends ICmsProductionProps {
  onNavigate?: (pageKey: string) => void;
}

interface IColumn {
  key: string;
  label: string;
}

const COLUMNS: IColumn[] = [
  { key: "ewono", label: "EWO Number" },
  { key: "ewotitle", label: "Title" },
  { key: "eworequestor", label: "Requestor" },
  { key: "hrewo", label: "Home Room EWO" },
  { key: "coewo", label: "Coordinated EWO" },
  { key: "supplier", label: "Supplier" },
  { key: "program", label: "Program" },
  { key: "ewostatus", label: "EWO Status" },
  { key: "ewoclosedt", label: "EWO Close" },
  { key: "cmsstatus", label: "CMS Status" },
  { key: "nextass", label: "Next Up Assembly" },
  { key: "oldpn", label: "Old Part Number" },
  { key: "newpn", label: "New Part Number" },
  { key: "partname", label: "Part Name" },
  { key: "oldpnqty", label: "Old Part Qty" },
  { key: "newpnqty", label: "New Part Qty" },
  { key: "lr", label: "L/R" },
  { key: "kdlc", label: "LC/KD/Inhouse" },
  { key: "shop", label: "Shop" },
  { key: "oldpnvariant", label: "Old part variant applicability" },
  { key: "newpnvariant", label: "New part variant applicability" },
  { key: "changetype", label: "Change Type" },
  { key: "changemethod", label: "Change Method" },
  { key: "postatus", label: "PO Status" },
  { key: "suppcode", label: "Supplier Code" },
  { key: "ptrno", label: "PTR Number" },
  { key: "oldpnsap", label: "Old PN SAP stock" },
  { key: "oldpnintr", label: "Old PN In-Transit stock" },
  { key: "oldpnordstock", label: "Old PN Open order stock" },
  { key: "oldpntotstock", label: "Old PN Total Stock" },
  { key: "newpnsap", label: "New PN SAP stock" },
  { key: "newpnintr", label: "New PN In-Transit stock" },
  { key: "newpnordstock", label: "New PN Open order stock" },
  { key: "newpntotstock", label: "New PN Total Stock" },
  { key: "bpweek", label: "Estimated BP Week" },
  { key: "ecnno", label: "ECN Number" },
  { key: "backflushstatus", label: "Backflushing Status" },
  { key: "bprsno", label: "BPRS Number" },
  { key: "actualbpDT", label: "Actual BP Date" },
  { key: "vincutoff", label: "VIN cut-off" },
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 75, 100];

type IRowData = Record<string, string> & { id: string };

interface ISPEWOItem {
  Id: number;
  EWONo: string;
  Status: string;
  StageDate: string;
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

const padWithZeros = (value: string, length: number): string => {
  let result = value;
  while (result.length < length) {
    result = "0" + result;
  }
  return result;
};

const pad2 = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

const formatDateOnly = (raw: string): string => {
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return "";
  }
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
};

const buildBPRSNoPrefix = (title: string): string => {
  const parts = (title || "").split("/");
  if (parts.length >= 3) {
    const yearNum = parseInt(parts[2], 10);
    const yearPart = isNaN(yearNum) ? parts[2] : String(yearNum);
    return `EWO-${yearPart}/${parts[1]}/`;
  }
  return `${title || ""}-`;
};

const EWO_SITE_URL = "https://mgmotor.sharepoint.com/ewo";

const fetchAllEWOStatus = async (
  props: ICmsProductionProps
): Promise<ISPEWOItem[]> => {
  const web = Web(EWO_SITE_URL);

  let page: any = await web.lists
    .getByTitle("EWOList")
    .items.select("Id", "EWONo", "Status", "StageDate")
    .top(2000)
    .getPaged();

  let results: ISPEWOItem[] = page.results;

  while (page.hasNext) {
    page = await page.getNext();
    results = results.concat(page.results);
  }

  return results;
};

const buildRows = (
  cmsItems: ICMSMasterItem[],
  bprsItems: IBPRSMaster[],
  spewo: ISPEWOItem[],
): IRowData[] => {
  const rows: IRowData[] = [];

  cmsItems.forEach((item) => {
    const ewodetails = parseJSON((item as any).EWODetails, {});
    const partaction = parseJSON((item as any).PartAction, []);
    const actiontaken = parseJSON((item as any).ActionTaken, []);

    let ewostatus = ewodetails.status || "";
    let ewoclosedt = "";

    const spewoMatch = spewo.filter((o) => o.EWONo === item.Title)[0];
    if (spewoMatch) {
      ewostatus = spewoMatch.Status || "";
      if (ewostatus === "Approved and Close" && spewoMatch.StageDate) {
        ewoclosedt = formatDateOnly(spewoMatch.StageDate);
      }
    }

    const bprsNoPrefix = buildBPRSNoPrefix(item.Title || "");

    partaction.forEach((pa: any, idx: number) => {
      const bprsFound = bprsItems.filter(
        (b) => b.Title === item.Title && b.CMSSrNo === pa.c0,
      )[0];

      let bprsno = "";
      let actualbpDT = "";
      let vincutoff = "";

      if (bprsFound) {
        bprsno = `${bprsNoPrefix}${padWithZeros(String(bprsFound.Id || 0), 6)}`;
        const bpdt = parseJSON(bprsFound.BreakPointDT, {});
        if (bpdt.date) {
          actualbpDT = formatDateOnly(bpdt.date);
        }
        if (bpdt.time) {
          actualbpDT = actualbpDT ? `${actualbpDT} ${bpdt.time}` : bpdt.time;
        }
        vincutoff = bprsFound.VINCutOff || "";
      }

      const at = actiontaken.filter((o: any) => o.c0 === pa.c0)[0] || {};

      rows.push({
        id: `${item.Id}-${idx}`,
        cmsId: String(item.Id || 0),
        ewono: item.Title || "",
        ewotitle: ewodetails.title || "",
        eworequestor: ewodetails.initname || "",
        hrewo: ewodetails.hrewo || "",
        coewo: ewodetails.coewo || "",
        supplier: ewodetails.supplier || "",
        program: ewodetails.program || "",
        ewostatus,
        ewoclosedt,
        cmsstatus: (item as any).Status || "",
        nextass: pa.c1 || "",
        oldpn: pa.c2 || "",
        newpn: pa.c3 || "",
        partname: pa.c4 || "",
        oldpnqty: pa.c5 || "",
        newpnqty: pa.c6 || "",
        lr: pa.c7 || "",
        kdlc: pa.c8 || "",
        shop: pa.c9 || "",
        oldpnvariant: pa.c10 || "",
        newpnvariant: pa.c11 || "",
        changetype: pa.c12 || "",
        changemethod: pa.c13 || "",
        postatus: pa.c14 || "",
        suppcode: pa.c19 || "",
        ptrno: at.c29 || "",
        oldpnsap: at.c36 || "",
        oldpnintr: at.c37 || "",
        oldpnordstock: at.c38 || "",
        oldpntotstock: at.c39 || "",
        newpnsap: at.c40 || "",
        newpnintr: at.c41 || "",
        newpnordstock: at.c42 || "",
        newpntotstock: at.c43 || "",
        bpweek: at.c47 || "",
        ecnno: at.c48 || "",
        backflushstatus: at.c49 || "",
        bprsno,
        actualbpDT,
        vincutoff,
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

const EWOConsolidated: React.FC<IEWOConsolidatedProps> = (props) => {
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
      const bprsMasterOps = await BPRSMaster();

      const [cmsItems, bprsItems, spewo] = await Promise.all([
        cmsMasterOps.getCMSMasterData(
          "Stage ge 1",
          { column: "Id", isAscending: false },
          props,
        ),
        bprsMasterOps.getAllBPRSData(props),
        fetchAllEWOStatus(props),
      ]);

      setAllRows(buildRows(cmsItems, bprsItems, spewo));
    } catch (error) {
      console.error("Error loading EWO Consolidated data:", error);
      setLoadError("Unable to load data. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  }, [props.currentSPContext, props.webAbsoluteUrl]);

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
    link.download = "EWOConsolidatedDetails.csv";
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

  const handleOpenForm = (cmsId: string): void => {
    history.push(`/CMSRequestForm/${cmsId}`);
  };

  const startEntry = totalRows === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const endEntry = Math.min(safePage * rowsPerPage, totalRows);

  return (
    <div className="ewo-consolidated">
      <div className="ecod-header">
        <h2>EWO CONSOLIDATED DETAILS</h2>
      </div>

      <div className="ecod-body">
        <div className="ecod-toolbar">
          <div className="ecod-toolbar-left">
            <label className="ecod-rows-select">
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

            <button type="button" className="ecod-btn ecod-btn-excel" onClick={handleExcelExport}>
              Excel
            </button>

            <button type="button" className="ecod-btn ecod-btn-neutral" onClick={handleClearSearch}>
              Clear Search
            </button>
          </div>

          <div className="ecod-toolbar-right">
            <div className="ecod-search">
              <input type="text" value={searchTerm} onChange={handleSearchChange} placeholder="Search in all fields..." />
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="ecod-loader-wrapper">
            <div className="ecod-loader">
              <span className="ecod-spinner" />
              <span>Loading data...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="ecod-status ecod-status-error">{loadError}</div>
        )}

        {!isLoading && !loadError && (
          <>
            <div className="ecod-summary">
              Showing {startEntry} to {endEntry} of {totalRows} entries
            </div>

            <div className="ecod-table-wrapper">
              <table className="ecod-table">
                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th key={column.key} className={column.key === "ewono" ? "ecod-col-ewo" : ""}>
                        <input
                          type="text"
                          value={columnFilters[column.key]}
                          onChange={(e) => handleColumnFilterChange(column.key, e.target.value)}
                          placeholder="Search..."
                        />
                        <div className="ecod-th-label">
                          {column.label}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 && (
                    <tr>
                      <td className="ecod-no-data" colSpan={COLUMNS.length}>
                        No matching records found
                      </td>
                    </tr>
                  )}
                  {pagedRows.map((row) => (
                    <tr key={row.id}>
                      {COLUMNS.map((column) => (
                        <td
                          key={column.key}
                          className={column.key === "ewono" ? "ecod-col-ewo" : ""}
                        >
                          {column.key === "ewono" && (
                            <i
                              className="fas fa-folder-open ecod-file-icon"
                              onClick={() => handleOpenForm(row.cmsId)}
                            />
                          )}
                          {row[column.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ecod-pagination">
              <button
                type="button"
                className="ecod-page-btn"
                disabled={safePage === 1}
                onClick={() => goToPage(safePage - 1)}
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="ecod-page-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    key={page}
                    className={`ecod-page-btn ${page === safePage ? "ecod-page-btn-active" : ""}`}
                    onClick={() => goToPage(page as number)}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                className="ecod-page-btn"
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

export default EWOConsolidated;