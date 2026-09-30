import * as React from "react";
import "../CSS/AssignPrimary.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import CMSACLMaster, { ICMSACLMaster } from "../../service/BAL/CMSACLMaster";
import ParametersMaster, { IParametersMaster } from "../../service/BAL/ParametersMaster";

export interface IAssignPrimaryProps extends ICmsProductionProps {
  onNavigate?: (pageKey: string) => void;
}

interface IPrimaryRoleEntry {
  role: string;
  user: string;
  email: string;
}

interface IACLUserCandidate {
  userName: string;
  userEmail: string;
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
  } else if (raw.results && Array.isArray(raw.results)) {
    rawString = raw.results.join(",");
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

  return roles;
};

const AssignPrimary: React.FC<IAssignPrimaryProps> = (props) => {
  const [primaryParamId, setPrimaryParamId] = React.useState<number | null>(null);
  const [roleEntries, setRoleEntries] = React.useState<IPrimaryRoleEntry[]>([]);
  const [aclCandidates, setAclCandidates] = React.useState<IACLUserCandidate[]>([]);

  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string>("");

  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [selectedRole, setSelectedRole] = React.useState<string>("");
  const [selectedEmail, setSelectedEmail] = React.useState<string>("");
  const [isSaving, setIsSaving] = React.useState<boolean>(false);

  const loadData = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError("");
    try {
      const cmsACLOps = await CMSACLMaster();
      const paramOps = await ParametersMaster();

      const aclFilter = "Role eq 'Editor' and UserName/EMail ne null";
      const [aclItems, paramItems] = await Promise.all([
        cmsACLOps.getCMSACLDataByFilter(
          aclFilter,
          { column: "Id", isAscending: true },
          props,
        ),
        paramOps.getParametersDataByFilter(
          "Title eq 'PrimaryRole'",
          { column: "Id", isAscending: true },
          props,
        ),
      ]);

      const candidates: IACLUserCandidate[] = [];
      aclItems.forEach((item: ICMSACLMaster) => {
        if (!item.UserName) {
          return;
        }
        candidates.push({
          userName: item.UserName.Title || "",
          userEmail: item.UserName.EMail || "",
          roles: parseRoles(item.UserType),
        });
      });

      let parsedRoles: IPrimaryRoleEntry[] = [];
      let paramId: number | null = null;

      if (paramItems.length > 0) {
        const paramItem: IParametersMaster = paramItems[0];
        paramId = paramItem.Id || null;
        try {
          parsedRoles = JSON.parse(paramItem.Details || "[]");
        } catch (e) {
          parsedRoles = [];
        }
      }

      setAclCandidates(candidates);
      setRoleEntries(parsedRoles);
      setPrimaryParamId(paramId);
    } catch (error) {
      console.error("Error loading Assign Primary data:", error);
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

  const eligibleCandidates = React.useMemo(() => {
    return aclCandidates.filter((c) => c.roles.indexOf(selectedRole) !== -1);
  }, [aclCandidates, selectedRole]);

  const handleEditClick = (entry: IPrimaryRoleEntry): void => {
    setSelectedRole(entry.role);
    setSelectedEmail(entry.email || "");
    setIsModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setIsModalOpen(false);
    setSelectedRole("");
    setSelectedEmail("");
  };

  const handleUpdate = async (): Promise<void> => {
    if (primaryParamId === null) {
      return;
    }

    const selectedCandidate = aclCandidates.filter(
      (c) => c.userEmail === selectedEmail,
    )[0];

    const updatedRoles = roleEntries.map((entry) => {
      if (entry.role !== selectedRole) {
        return entry;
      }
      return {
        role: entry.role,
        user: selectedCandidate ? selectedCandidate.userName : "",
        email: selectedEmail,
      };
    });

    setIsSaving(true);
    try {
      const paramOps = await ParametersMaster();
      await paramOps.updateParametersData(
        primaryParamId,
        { Details: JSON.stringify(updatedRoles) },
        props,
      );

      setRoleEntries(updatedRoles);
      handleCloseModal();
    } catch (error) {
      console.error("Error updating primary contact person:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="assign-primary">
      <div className="ap-header">
        <h2>ASSIGN PRIMARY CONTACT PERSON</h2>
      </div>

      <div className="ap-body">
        {isLoading && (
          <div className="ap-loader-wrapper">
            <div className="ap-loader">
              <span className="ap-spinner" />
              <span>Loading data...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="ap-status ap-status-error">{loadError}</div>
        )}

        {!isLoading && !loadError && (
          <div className="ap-table-wrapper">
            <table className="ap-table">
              <thead>
                <tr>
                  <th className="ap-col-edit" />
                  <th>Role</th>
                  <th>Primary Contact Person</th>
                </tr>
              </thead>
              <tbody>
                {roleEntries.length === 0 && (
                  <tr>
                    <td className="ap-no-data" colSpan={3}>
                      No matching records found
                    </td>
                  </tr>
                )}
                {roleEntries.map((entry) => (
                  <tr key={entry.role}>
                    <td className="ap-col-edit">
                      <button
                        type="button"
                        className="ap-edit-btn"
                        onClick={() => handleEditClick(entry)}
                      >
                        Edit
                      </button>
                    </td>
                    <td className="ap-col-role">{entry.role}</td>
                    <td className="ap-col-user">{entry.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="ap-modal-overlay" onClick={handleCloseModal}>
          <div className="ap-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ap-modal-body">
              <label className="ap-modal-label">Role</label>
              <input
                type="text"
                className="ap-modal-role-input"
                value={selectedRole}
                readOnly
              />

              <label className="ap-modal-label">Select User</label>
              <select
                className="ap-modal-select"
                value={selectedEmail}
                onChange={(e) => setSelectedEmail(e.target.value)}
              >
                <option value=""></option>
                {eligibleCandidates.map((candidate) => (
                  <option key={candidate.userEmail} value={candidate.userEmail}>
                    {candidate.userName}
                  </option>
                ))}
              </select>
            </div>

            <div className="ap-modal-footer">
              <button
                type="button"
                className="ap-modal-btn ap-modal-btn-ok"
                onClick={handleUpdate}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "OK"}
              </button>
              <button
                type="button"
                className="ap-modal-btn ap-modal-btn-cancel"
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

export default AssignPrimary;