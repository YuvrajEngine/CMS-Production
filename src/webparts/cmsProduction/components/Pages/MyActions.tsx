import * as React from "react";
import "../CSS/MyActions.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import CMSMasterOps, { ICMSMasterItem } from "../../service/BAL/CMSMaster";
import BPRSMaster, { IBPRSMaster } from "../../service/BAL/BPRSMaster";

export interface IMyActionsProps extends ICmsProductionProps {
  onNavigate?: (pageKey: string) => void;
}

interface IWFEntry {
  role: string;
  user: string;
  email: string;
}

interface IAgeingEntry {
  role: string;
  startDT: string;
  endDT: string;
}

type PendingListType = "cms" | "bprs";

interface IPendingItem {
  id: number;
  role: string;
  title: string;
  displayTitle: string;
}

const pad2 = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

const padWithZeros = (value: string, length: number): string => {
  let result = value;
  while (result.length < length) {
    result = "0" + result;
  }
  return result;
};

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

const groupByRole = (items: IPendingItem[]): Record<string, IPendingItem[]> => {
  const map: Record<string, IPendingItem[]> = {};
  items.forEach((item) => {
    if (!map[item.role]) {
      map[item.role] = [];
    }
    map[item.role].push(item);
  });
  return map;
};

const buildBPRSDisplayTitle = (title: string, id: number): string => {
  const paddedId = padWithZeros(String(id), 6);
  const parts = (title || "").split("/");
  if (parts.length > 1) {
    const yearNum = parseInt(parts[2], 10);
    const yearPart = isNaN(yearNum) ? parts[2] : String(yearNum);
    return `EWO/${yearPart}/${paddedId}`;
  }
  return `EWO/${title || ""}/${paddedId}`;
};

const MyActions: React.FC<IMyActionsProps> = (props) => {
  const [cmsPendingByRole, setCmsPendingByRole] = React.useState<Record<string, IPendingItem[]>>({});
  const [bprsPendingByRole, setBprsPendingByRole] = React.useState<Record<string, IPendingItem[]>>({});
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string>("");

  const [isModalOpen, setIsModalOpen] = React.useState<boolean>(false);
  const [modalRole, setModalRole] = React.useState<string>("");
  const [modalItems, setModalItems] = React.useState<IPendingItem[]>([]);
  const [modalListType, setModalListType] = React.useState<PendingListType>("cms");

  const loadData = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError("");
    try {
      const userEmail = props.userEmail || "";
      const cmsMasterOps = CMSMasterOps();
      const bprsMasterOps = await BPRSMaster();

      const [cmsItems, bprsItems] = await Promise.all([
        cmsMasterOps.getCMSMasterData(
          "Stage ge 1",
          { column: "Id", isAscending: true },
          props,
        ),
        bprsMasterOps.getAllBPRSData(props),
      ]);

      const cmsPending: IPendingItem[] = [];
      cmsItems.forEach((item: ICMSMasterItem) => {
        const wf: IWFEntry[] = parseJSON((item as any).WF, []);
        const ag: IAgeingEntry[] = parseJSON((item as any).Ageing, []);

        wf.forEach((entry) => {
          if (entry.email !== userEmail) {
            return;
          }
          const ageingMatch = ag.filter((a) => a.role === entry.role)[0];
          const endDT = ageingMatch ? ageingMatch.endDT : "";
          if (endDT === "") {
            cmsPending.push({
              id: (item.Id as number) || 0,
              role: entry.role,
              title: item.Title || "",
              displayTitle: item.Title || "",
            });
          }
        });
      });

      const bprsPending: IPendingItem[] = [];
      bprsItems.forEach((item: IBPRSMaster) => {
        const wf: IWFEntry[] = parseJSON(item.WF, []);
        const ag: IAgeingEntry[] = parseJSON(item.Ageing, []);

        wf.forEach((entry) => {
          if (entry.email !== userEmail) {
            return;
          }
          const ageingMatch = ag.filter((a) => a.role === entry.role)[0];
          const endDT = ageingMatch ? ageingMatch.endDT : "";
          if (endDT === "") {
            bprsPending.push({
              id: item.Id || 0,
              role: entry.role,
              title: item.Title || "",
              displayTitle: buildBPRSDisplayTitle(item.Title || "", item.Id || 0),
            });
          }
        });
      });

      setCmsPendingByRole(groupByRole(cmsPending));
      setBprsPendingByRole(groupByRole(bprsPending));
    } catch (error) {
      console.error("Error loading My Actions data:", error);
      setLoadError("Unable to load data. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  }, [props.currentSPContext, props.userEmail]);

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

  const handleCardClick = (role: string, items: IPendingItem[], listType: PendingListType): void => {
    setModalRole(role);
    setModalItems(items);
    setModalListType(listType);
    setIsModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setIsModalOpen(false);
    setModalRole("");
    setModalItems([]);
  };

  const handleItemOpen = (item: IPendingItem): void => {
    handleCloseModal();
    const path = modalListType === "cms" ? `/CMSRequestForm/${item.id}?fullView=1` : `/BPRSRequestForm/${item.id}`;
    const baseUrl = window.location.href.split("#")[0];
    const url = `${baseUrl}#${path}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const cmsRoles = Object.keys(cmsPendingByRole);
  const bprsRoles = Object.keys(bprsPendingByRole);

  return (
    <div className="my-actions">
      <div className="mpa-header">
        <h2>MY PENDING ACTION</h2>
      </div>

      <div className="mpa-body">
        {isLoading && (
          <div className="mpa-loader-wrapper">
            <div className="mpa-loader">
              <span className="mpa-spinner" />
              <span>Loading data...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="mpa-status mpa-status-error">{loadError}</div>
        )}

        {!isLoading && !loadError && (
          <>
            <div className="mpa-section-title">CMS</div>
            <div className="mpa-card-row">
              {cmsRoles.length === 0 && (
                <div className="mpa-no-pending">No pending actions</div>
              )}
              {cmsRoles.map((role) => (
                <div className="mpa-card" key={`cms-${role}`}>
                  <button
                    type="button"
                    className="mpa-card-link"
                    onClick={() => handleCardClick(role, cmsPendingByRole[role], "cms")}
                  >
                    <span className="mpa-card-count">
                      {pad2(cmsPendingByRole[role].length)}
                    </span>
                    <span className="mpa-card-title">{role}</span>
                  </button>
                </div>
              ))}
            </div>

            <hr className="mpa-divider" />

            <div className="mpa-section-title">BPRS</div>
            <div className="mpa-card-row">
              {bprsRoles.length === 0 && (
                <div className="mpa-no-pending">No pending actions</div>
              )}
              {bprsRoles.map((role) => (
                <div className="mpa-card" key={`bprs-${role}`}>
                  <button
                    type="button"
                    className="mpa-card-link"
                    onClick={() => handleCardClick(role, bprsPendingByRole[role], "bprs")}
                  >
                    <span className="mpa-card-count">
                      {pad2(bprsPendingByRole[role].length)}
                    </span>
                    <span className="mpa-card-title">{role}</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="mpa-modal-overlay" onClick={handleCloseModal}>
          <div className="mpa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mpa-modal-header">
              <h3>{modalRole}</h3>
            </div>
            <div className="mpa-modal-body">
              <ul className="mpa-modal-list">
                {modalItems.map((item, idx) => (
                  <li key={idx} onClick={() => handleItemOpen(item)}>
                    <i className="fas fa-folder-open" />
                    <span>{item.displayTitle}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mpa-modal-footer">
              <button
                type="button"
                className="mpa-modal-btn mpa-modal-btn-close"
                onClick={handleCloseModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>   
      )}
    </div>
  );
};

export default MyActions;   