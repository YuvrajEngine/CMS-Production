import * as React from "react";
import "../CSS/UserRoles.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import CMSACLMaster, { ICMSACLMaster } from "../../service/BAL/CMSACLMaster";

export interface IUserRolesProps extends ICmsProductionProps {
  onNavigate?: (pageKey: string) => void;
}

const ROLE_OPTIONS: string[] = [
  "BP Team",
  "Data Management Team",
  "Inventory Team",
  "Line-Feeding Team",
  "Logistics EWO coordinator",
  "Manufacturing Team",
  "ME",
  "Packaging Team",
  "Planning Team",
  "SCM Head",
  "Shop Manager",
  "Shop Team/ Group Leader",
  "SQE Team",
  "Warehouse Manager",
  "Warehouse Team",
  "Quality Team",
];

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

interface IUserRoleRow {
  id: number;
  userNameId: number;
  userName: string;
  roles: string[];
}

const parseRoles = (raw: any): string[] => {
  if (!raw) {
    return [];
  }

  let rawString = "";
  if (typeof raw === "string") {
    rawString = raw;
  } else if (Array.isArray(raw)) {
    rawString = raw.join(",");
  } else {
    rawString = String(raw);
  }

  const roles: string[] = [];
  const parts = rawString.split(",");

  for (let i = 0; i < parts.length; i++) {
    const trimmed = parts[i].trim();
    if (trimmed && roles.indexOf(trimmed) === -1) {
      roles.push(trimmed);
    }
  }

  roles.sort((a, b) => ROLE_OPTIONS.indexOf(a) - ROLE_OPTIONS.indexOf(b));

  return roles;
};

const buildRows = (items: ICMSACLMaster[]): IUserRoleRow[] => {
  const rows: IUserRoleRow[] = [];

  items.forEach((item) => {
    rows.push({
      id: item.Id || 0,
      userNameId: item.UserName && item.UserName.Id ? item.UserName.Id : 0,
      userName: (item.UserName && item.UserName.Title) || item.Title || "",
      roles: parseRoles(item.UserType),
    });
  });

  rows.sort((a, b) => a.userName.localeCompare(b.userName));

  return rows;
};

const UserRoles: React.FC<IUserRolesProps> = (props) => {
  const [allRows, setAllRows] = React.useState<IUserRoleRow[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string>("");

  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [userNameFilter, setUserNameFilter] = React.useState<string>("");
  const [roleFilter, setRoleFilter] = React.useState<string>("");
  const [rowsPerPage, setRowsPerPage] = React.useState<number>(25);
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [selectedRow, setSelectedRow] = React.useState<IUserRoleRow | null>(null);
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  const loadData = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError("");
    try {
      const cmsACLOps = await CMSACLMaster();
      const items = await cmsACLOps.getAllCMSACLData(props);
      setAllRows(buildRows(items));
    } catch (error) {
      console.error("Error loading User Roles data:", error);
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
    const userFilter = userNameFilter.trim().toLowerCase();
    const roleFilterValue = roleFilter.trim().toLowerCase();

    return allRows.filter((row) => {
      const rolesText = row.roles.join(", ");

      if (term) {
        const haystack = `${row.userName} ${rolesText}`.toLowerCase();
        if (haystack.indexOf(term) === -1) {
          return false;
        }
      }

      if (userFilter && row.userName.toLowerCase().indexOf(userFilter) === -1) {
        return false;
      }

      if (roleFilterValue && rolesText.toLowerCase().indexOf(roleFilterValue) === -1) {
        return false;
      }

      return true;
    });
  }, [allRows, searchTerm, userNameFilter, roleFilter]);

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

  const handleUserNameFilterChange = (value: string): void => {
    setUserNameFilter(value);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (value: string): void => {
    setRoleFilter(value);
    setCurrentPage(1);
  };

  const handleClearSearch = (): void => {
    setSearchTerm("");
    setUserNameFilter("");
    setRoleFilter("");
    setCurrentPage(1);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const handleExcelExport = (): void => {
    const header = ["User Name", "Role Assign"];

    const csvRows = filteredRows.map((row) => {
      const cells = [row.userName, row.roles.join(", ")];
      return cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",");
    });

    const csvContent = [header.join(","), ...csvRows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "UserRoles.csv";
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

  const handleEditClick = (row: IUserRoleRow): void => {
    setSelectedRow(row);
    setSelectedRoles(row.roles.slice());
    setIsModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setIsModalOpen(false);
    setSelectedRow(null);
    setSelectedRoles([]);
  };

  const handleRoleToggle = (role: string): void => {
    setSelectedRoles((prev) => {
      const idx = prev.indexOf(role);
      if (idx === -1) {
        return prev.concat([role]);
      }
      const next = prev.slice();
      next.splice(idx, 1);
      return next;
    });
  };

  const handleUpdate = async (): Promise<void> => {
    if (!selectedRow) {
      return;
    }

    const orderedRoles = ROLE_OPTIONS.filter((role) => selectedRoles.indexOf(role) !== -1);

    setIsSaving(true);
    try {
      const cmsACLOps = await CMSACLMaster();
      await cmsACLOps.updateCMSACLData(
        selectedRow.id,
        { UserType: { results: orderedRoles } } as any,
        props,
      );

      handleCloseModal();
      await loadData();
    } catch (error) {
      console.error("Error updating user roles:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="user-roles">
      <div className="ur-header">
        <h2>USER MASTER</h2>
      </div>

      <div className="ur-body">
        <div className="ur-toolbar">
          <div className="ur-toolbar-left">
            <label className="ur-rows-select">
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
              className="ur-btn ur-btn-excel"
              onClick={handleExcelExport}
            >
              <i className="fas fa-file-excel" />
              Excel
            </button>

            <button
              type="button"
              className="ur-btn ur-btn-clear"
              onClick={handleClearSearch}
            >
              <i className="fas fa-times-circle" />
              Clear Search
            </button>
          </div>

          <div className="ur-toolbar-right">
            <label className="ur-search-label">Search:</label>
            <div className="ur-search">
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder=""
              />
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="ur-loader-wrapper">
            <div className="ur-loader">
              <span className="ur-spinner" />
              <span>Loading data...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="ur-status ur-status-error">{loadError}</div>
        )}

        {!isLoading && !loadError && (
          <>
            <div className="ur-summary">
              Showing {startEntry} to {endEntry} of {totalRows} entries
            </div>

            <div className="ur-table-wrapper">
              <table className="ur-table">
                <thead>
                  <tr>
                    <th className="ur-col-edit" />
                    <th>
                      User Name
                    </th>
                    <th>
                      Role Assign
                    </th>
                  </tr>
                  <tr className="ur-filter-row">
                    <th className="ur-col-edit" />
                    <th>
                      <input
                        type="text"
                        value={userNameFilter}
                        onChange={(e) => handleUserNameFilterChange(e.target.value)}
                        placeholder="Search..."
                      />
                    </th>
                    <th>
                      <input
                        type="text"
                        value={roleFilter}
                        onChange={(e) => handleRoleFilterChange(e.target.value)}
                        placeholder="Search..."
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.length === 0 && (
                    <tr>
                      <td className="ur-no-data" colSpan={3}>
                        No matching records found
                      </td>
                    </tr>
                  )}
                  {pagedRows.map((row) => (
                    <tr key={row.id}>
                      <td className="ur-col-edit">
                        <button
                          type="button"
                          className="ur-edit-btn"
                          onClick={() => handleEditClick(row)}
                        >
                          Edit
                        </button>
                      </td>
                      <td className="ur-col-username">{row.userName}</td>
                      <td className="ur-col-roles">{row.roles.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ur-pagination">
              <button
                type="button"
                className="ur-page-btn"
                disabled={safePage === 1}
                onClick={() => goToPage(safePage - 1)}
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`ellipsis-${idx}`} className="ur-page-ellipsis">
                    ...
                  </span>
                ) : (
                  <button
                    type="button"
                    key={page}
                    className={`ur-page-btn ${page === safePage ? "ur-page-btn-active" : ""}`}
                    onClick={() => goToPage(page as number)}
                  >
                    {page}
                  </button>
                ),
              )}

              <button
                type="button"
                className="ur-page-btn"
                disabled={safePage === totalPages}
                onClick={() => goToPage(safePage + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      {isModalOpen && selectedRow && (
        <div className="ur-modal-overlay" onClick={handleCloseModal}>
          <div className="ur-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ur-modal-header">
              <h3>EDIT USER ROLE</h3>
            </div>

            <div className="ur-modal-body">
              <label className="ur-modal-label">User Name</label>
              <input
                type="text"
                className="ur-modal-username-input"
                value={selectedRow.userName}
                readOnly
              />

              <label className="ur-modal-label">Select Role</label>
              <div className="ur-role-grid">
                {ROLE_OPTIONS.map((role) => (
                  <label key={role} className="ur-role-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedRoles.indexOf(role) !== -1}
                      onChange={() => handleRoleToggle(role)}
                    />
                    <span>{role}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="ur-modal-footer">
              <button
                type="button"
                className="ur-modal-btn ur-modal-btn-update"
                onClick={handleUpdate}
                disabled={isSaving}
              >
                {isSaving ? "Updating..." : "Update"}
              </button>
              <button
                type="button"
                className="ur-modal-btn ur-modal-btn-cancel"
                onClick={handleCloseModal}
                disabled={isSaving}
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

export default UserRoles;