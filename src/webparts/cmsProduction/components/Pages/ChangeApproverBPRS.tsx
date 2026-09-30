import * as React from "react";
import "../CSS/ChangeApproverBPRS.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import BPRSMaster, { IBPRSMaster } from "../../service/BAL/BPRSMaster";
import CMSACLMaster from "../../service/BAL/CMSACLMaster";

export interface IChangeApproverBPRSProps extends ICmsProductionProps {
  onNavigate?: (pageKey: string) => void;
}

interface IWFEntry {
  role: string;
  user: string;
  email: string;
}

interface IRowData {
  id: number;
  title: string;
  requestNumber: string;
  wf: IWFEntry[];
  summaryRaw: string;
}

interface IACLCandidate {
  userName: string;
  userEmail: string;
}

const BPRS_ROLES: string[] = [
  "Line-Feeding Team",
  "Logistics EWO coordinator",
  "ME",
  "Manufacturing Team",
  "Quality Team",
  "Shop Manager",
  "Shop Team/ Group Leader",
  "Warehouse Team",
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const parseWF = (raw: any): IWFEntry[] => {
  if (!raw) {
    return [];
  }
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((entry: any) => ({
      role: entry.role || "",
      user: entry.user || "",
      email: entry.email || "",
    }));
  } catch (e) {
    return [];
  }
};

const pad2 = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

const formatDateTime = (date: Date): string => {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

const padWithZeros = (value: string, length: number): string => {
  let result = value;
  while (result.length < length) {
    result = "0" + result;
  }
  return result;
};

const buildRequestNumber = (title: string, id: number): string => {
  const paddedId = padWithZeros(String(id), 6);
  const parts = (title || "").split("/");
  if (parts.length >= 3) {
    const yearNum = parseInt(parts[2], 10);
    const yearPart = isNaN(yearNum) ? parts[2] : String(yearNum);
    return `${parts[0]}-${yearPart}/${parts[1]}/${paddedId}`;
  }
  return `${title || ""}-${paddedId}`;
};

const ChangeApproverBPRS: React.FC<IChangeApproverBPRSProps> = (props) => {
  const [allRows, setAllRows] = React.useState<IRowData[]>([]);
  const [aclCandidates, setAclCandidates] = React.useState<IACLCandidate[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string>("");

  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [requestFilter, setRequestFilter] = React.useState<string>("");
  const [approversFilter, setApproversFilter] = React.useState<string>("");
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(10);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  const [selectedIds, setSelectedIds] = React.useState<number[]>([]);
  const [highlightedIds, setHighlightedIds] = React.useState<number[]>([]);

  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [selectedRole, setSelectedRole] = React.useState<string>("ALL");
  const [findWhatEmail, setFindWhatEmail] = React.useState<string>("");
  const [replaceWithEmail, setReplaceWithEmail] = React.useState<string>("");
  const [isApplying, setIsApplying] = React.useState<boolean>(false);

  const loadData = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError("");
    try {
      const bprsMasterOps = await BPRSMaster();
      const cmsACLOps = await CMSACLMaster();

      const [bprsItems, aclItems] = await Promise.all([
        bprsMasterOps.getBPRSDataByFilter(
          "Stage ne 3",
          { column: "Id", isAscending: true },
          props,
        ),
        cmsACLOps.getCMSACLDataByFilter(
          "Role eq 'Editor' and UserName/EMail ne null",
          { column: "Id", isAscending: true },
          props,
        ),
      ]);

      const rows: IRowData[] = bprsItems.map((item: IBPRSMaster) => ({
        id: item.Id || 0,
        title: item.Title || "",
        requestNumber: buildRequestNumber(item.Title || "", item.Id || 0),
        wf: parseWF(item.WF),
        summaryRaw: item.Summary || "[]",
      }));

      const candidates: IACLCandidate[] = [];
      aclItems.forEach((item) => {
        if (!item.UserName) {
          return;
        }
        candidates.push({
          userName: item.UserName.Title || "",
          userEmail: item.UserName.EMail || "",
        });
      });

      setAllRows(rows);
      setAclCandidates(candidates);
      setSelectedIds([]);
      setHighlightedIds([]);
    } catch (error) {
      console.error("Error loading Change Approver BPRS data:", error);
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
    const reqFilter = requestFilter.trim().toLowerCase();
    const apprFilter = approversFilter.trim().toLowerCase();

    return allRows.filter((row) => {
      const approversText = row.wf.map((w) => w.user).join(", ");

      if (term) {
        const haystack = `${row.requestNumber} ${approversText}`.toLowerCase();
        if (haystack.indexOf(term) === -1) {
          return false;
        }
      }

      if (reqFilter && row.requestNumber.toLowerCase().indexOf(reqFilter) === -1) {
        return false;
      }

      if (apprFilter && approversText.toLowerCase().indexOf(apprFilter) === -1) {
        return false;
      }

      return true;
    });
  }, [allRows, searchTerm, requestFilter, approversFilter]);

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

  const handleClearSearch = (): void => {
    setSearchTerm("");
    setRequestFilter("");
    setApproversFilter("");
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const handleExcelExport = (): void => {
    const header = ["Request Number", "Approvers"];
    const csvRows = filteredRows.map((row) => {
      const cells = [row.requestNumber, row.wf.map((w) => w.user).join(", ")];
      return cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [header.join(","), ...csvRows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ChangeApproverBPRS.csv";
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

  const toggleRowSelected = (id: number): void => {
    setSelectedIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1) {
        return prev.concat([id]);
      }
      const next = prev.slice();
      next.splice(idx, 1);
      return next;
    });
  };

  const handleSelectAll = (): void => {
    const pageIds = pagedRows.map((r) => r.id);
    setSelectedIds((prev) => {
      const next = prev.slice();
      pageIds.forEach((id) => {
        if (next.indexOf(id) === -1) {
          next.push(id);
        }
      });
      return next;
    });
  };

  const handleDeselectAll = (): void => {
    const pageIds = pagedRows.map((r) => r.id);
    setSelectedIds((prev) => prev.filter((id) => pageIds.indexOf(id) === -1));
  };

  const handleRefresh = (): void => {
    loadData().catch((error) => console.error(error));
  };

  const handleOpenChangeApprover = (): void => {
    setSelectedRole("ALL");
    setFindWhatEmail("");
    setReplaceWithEmail("");
    setIsModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setIsModalOpen(false);
  };

  const getCandidateName = (email: string): string => {
    const found = aclCandidates.filter((c) => c.userEmail === email)[0];
    return found ? found.userName : "";
  };

  const handleApply = async (): Promise<void> => {
    if (selectedIds.length === 0) {
      setIsModalOpen(false);
      return;
    }

    const fromUser = { user: getCandidateName(findWhatEmail), email: findWhatEmail };
    const toUser = { user: getCandidateName(replaceWithEmail), email: replaceWithEmail };

    setIsApplying(true);
    const newHighlighted: number[] = [];
    const updatedRowsMap: Record<number, IWFEntry[]> = {};

    try {
      const bprsMasterOps = await BPRSMaster();

      for (let i = 0; i < selectedIds.length; i++) {
        const id = selectedIds[i];
        const row = allRows.filter((r) => r.id === id)[0];
        if (!row) {
          continue;
        }

        const wf = row.wf.map((w) => ({ role: w.role, user: w.user, email: w.email }));
        let found = false;

        if (selectedRole === "ALL") {
          wf.forEach((w) => {
            if (w.email === fromUser.email) {
              w.user = toUser.user;
              w.email = toUser.email;
              found = true;
            }
          });
        } else {
          let idx = -1;
          for (let j = 0; j < wf.length; j++) {
            if (wf[j].email === fromUser.email && wf[j].role === selectedRole) {
              idx = j;
              break;
            }
          }
          if (idx !== -1) {
            wf[idx].user = toUser.user;
            wf[idx].email = toUser.email;
            found = true;
          }
        }

        if (found) {
          const newWFJson = JSON.stringify(wf);

          let summaryArr: any[] = [];
          try {
            summaryArr = JSON.parse(row.summaryRaw || "[]");
          } catch (e) {
            summaryArr = [];
          }
          summaryArr.push({
            c0: props.userDisplayName || "",
            c1: "",
            c2: formatDateTime(new Date()),
            c3: "Change User",
            c4: `${selectedRole !== "ALL" ? selectedRole + " " : ""}${fromUser.user} - ${toUser.user}`,
          });
          const newSummaryJson = JSON.stringify(summaryArr);

          await bprsMasterOps.updateBPRSData(
            id,
            { WF: newWFJson, Summary: newSummaryJson },
            props,
          );

          updatedRowsMap[id] = wf;
          newHighlighted.push(id);
        }
      }

      setAllRows((prev) =>
        prev.map((r) => (updatedRowsMap[r.id] ? { ...r, wf: updatedRowsMap[r.id] } : r)),
      );
      setHighlightedIds(newHighlighted);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error updating approvers:", error);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="change-approver-bprs">
      <div className="cab-header">
        <h2>CHANGE APPROVER BPRS</h2>
      </div>

      <div className="cab-body">
        <div className="cab-toolbar">
          <div className="cab-toolbar-top">
            <div className="cab-toolbar-left">
              <label className="cab-rows-select">
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

              <button type="button" className="cab-btn cab-btn-excel" onClick={handleExcelExport}>
                Excel
              </button>

              <button type="button" className="cab-btn cab-btn-neutral" onClick={handleClearSearch}>
                Clear Search
              </button>

              <button
                type="button"
                className="cab-btn cab-btn-primary"
                onClick={handleOpenChangeApprover}
              >
                Change/Replace Selected Approver
              </button>

              <button type="button" className="cab-btn cab-btn-neutral" onClick={handleSelectAll}>
                Select ALL
              </button>

              <button type="button" className="cab-btn cab-btn-neutral" onClick={handleDeselectAll}>
                De-select ALL
              </button>

              <button type="button" className="cab-btn cab-btn-neutral" onClick={handleRefresh}>
                Refresh
              </button>
            </div>

            <div className="cab-toolbar-right">
              <div className="cab-search">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search in All Fields..."
                />
              </div>
            </div>
          </div>

          <div className="cab-toolbar-note">
            <strong>Note:</strong> Refresh data before you make changes to avoid flow issue
          </div>
        </div>

        {isLoading && (
          <div className="cab-loader-wrapper">
            <div className="cab-loader">
              <span className="cab-spinner" />
              <span>Loading data...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="cab-status cab-status-error">{loadError}</div>
        )}

        {!isLoading && !loadError && (
          <>
            <div className="cab-summary">
              Showing {startEntry} to {endEntry} of {totalRows} entries
            </div>

            <div className="cab-table-wrapper">
              <table className="cab-table">
                <thead>
                  <tr>
                    <th className="cab-col-check" />
                    <th>
                      <div className="cab-th-label">Request Number</div>
                      <input
                        type="text"
                        value={requestFilter}
                        onChange={(e) => {
                          setRequestFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Search..."
                      />
                    </th>
                    <th>
                      <div className="cab-th-label">Approvers</div>
                      <input
                        type="text"
                        value={approversFilter}
                        onChange={(e) => {
                          setApproversFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        placeholder="Search..."
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 && (
                    <tr>
                      <td className="cab-no-data" colSpan={3}>
                        No matching records found
                      </td>
                    </tr>
                  )}
                  {pagedRows.map((row) => (
                    <tr
                      key={row.id}
                      className={highlightedIds.indexOf(row.id) !== -1 ? "cab-row-updated" : ""}
                    >
                      <td className="cab-col-check">
                        <input
                          type="checkbox"
                          checked={selectedIds.indexOf(row.id) !== -1}
                          onChange={() => toggleRowSelected(row.id)}
                        />
                      </td>
                      <td>{row.requestNumber}</td>
                      <td>{row.wf.map((w) => w.user).join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cab-pagination">
              <button
                type="button"
                className="cab-page-btn"
                disabled={safePage === 1}
                onClick={() => goToPage(safePage - 1)}
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="cab-page-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    key={page}
                    className={`cab-page-btn ${page === safePage ? "cab-page-btn-active" : ""}`}
                    onClick={() => goToPage(page as number)}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                className="cab-page-btn"
                disabled={safePage === totalPages}
                onClick={() => goToPage(safePage + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="cab-modal-overlay" onClick={handleCloseModal}>
          <div className="cab-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cab-modal-body">
              <label className="cab-modal-label">Role</label>
              <select
                className="cab-modal-select"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="ALL">ALL</option>
                {BPRS_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>

              <label className="cab-modal-label">Find What</label>
              <select
                className="cab-modal-select"
                value={findWhatEmail}
                onChange={(e) => setFindWhatEmail(e.target.value)}
              >
                <option value=""></option>
                {aclCandidates.map((candidate) => (
                  <option key={candidate.userEmail} value={candidate.userEmail}>
                    {candidate.userName}
                  </option>
                ))}
              </select>

              <label className="cab-modal-label">Replace With</label>
              <select
                className="cab-modal-select"
                value={replaceWithEmail}
                onChange={(e) => setReplaceWithEmail(e.target.value)}
              >
                <option value=""></option>
                {aclCandidates.map((candidate) => (
                  <option key={candidate.userEmail} value={candidate.userEmail}>
                    {candidate.userName}
                  </option>
                ))}
              </select>
            </div>

            <div className="cab-modal-footer">
              <button
                type="button"
                className="cab-modal-btn cab-modal-btn-apply"
                onClick={handleApply}
                disabled={isApplying}
              >
                {isApplying ? "Applying..." : "Apply"}
              </button>
              <button
                type="button"
                className="cab-modal-btn cab-modal-btn-cancel"
                onClick={handleCloseModal}
                disabled={isApplying}
              >
                Cancel
              </button>     
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeApproverBPRS;