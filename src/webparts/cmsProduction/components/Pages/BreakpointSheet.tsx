import * as React from "react";
import { useHistory, useParams } from "react-router-dom";
import "../CSS/BreakpointSheet.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import CMSMasterOps from "../../service/BAL/CMSMaster";
import BPRSMaster from "../../service/BAL/BPRSMaster";

export interface IBreakpointSheetProps extends ICmsProductionProps {
  bprsId?: number;
  onClose?: () => void;
}

interface IRouteParams {
  bprsId?: string;
}

interface IColumn {
  key: string;
  label: string;
}

interface IEWODetails {
  title: string;
  initname: string;
  hrewo: string;
  coewo: string;
  status: string;
  supplier: string;
  program: string;
}

interface IPartFields {
  nextass: string;
  oldpn: string;
  newpn: string;
  partname: string;
  oldpnqty: string;
  newpnqty: string;
  lr: string;
  kdlc: string;
  shop: string;
  oldpnvariant: string;
  newpnvariant: string;
  model: string;
}

interface IWFEntry {
  role: string;
  user: string;
}

const EMPTY_PART_FIELDS: IPartFields = {
  nextass: "",
  oldpn: "",
  newpn: "",
  partname: "",
  oldpnqty: "",
  newpnqty: "",
  lr: "",
  kdlc: "",
  shop: "",
  oldpnvariant: "",
  newpnvariant: "",
  model: "",
};

const SUMMARY_COLUMNS: IColumn[] = [
  { key: "username", label: "User Name" },
  { key: "approvername", label: "Approver Name" },
  { key: "actiondate", label: "Action Date" },
  { key: "actionremarks", label: "Action Remarks" },
  { key: "comment", label: "Comment" },
];

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

const zeroPad = (value: number, length: number): string => {
  let str = value.toString();
  while (str.length < length) {
    str = `0${str}`;
  }
  return str;
};

const formatDate = (raw: any): string => {
  if (!raw) {
    return "";
  }
  const d = new Date(raw);
  if (isNaN(d.getTime())) {
    return raw.toString();
  }
  const dd = zeroPad(d.getDate(), 2);
  const mm = zeroPad(d.getMonth() + 1, 2);
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const buildPartFields = (partActionRaw: any, cmsSrNo: any): IPartFields => {
  const partaction = parseJSON(partActionRaw, []);
  const match = partaction.filter((pa: any) => (pa.c0 || "").toString() === (cmsSrNo || "").toString())[0];
  if (!match) {
    return EMPTY_PART_FIELDS;
  }
  return {
    nextass: match.c1 || "",
    oldpn: match.c2 || "",
    newpn: match.c3 || "",
    partname: match.c4 || "",
    oldpnqty: match.c5 || "",
    newpnqty: match.c6 || "",
    lr: match.c7 || "",
    kdlc: match.c8 || "",
    shop: match.c9 || "",
    oldpnvariant: match.c10 || "",
    newpnvariant: match.c11 || "",
    model: match.c12 || "",
  };
};

const buildSummaryRows = (raw: any): Record<string, string>[] => {
  const summary = parseJSON(raw, []);
  return summary.map((s: any, idx: number) => ({
    id: `sum-${idx}`,
    username: s.c0 || "",
    approvername: s.c1 || "",
    actiondate: s.c2 || "",
    actionremarks: s.c3 || "",
    comment: s.c4 || "",
  }));
};

const buildWFEntries = (raw: any): IWFEntry[] => {
  const wf = parseJSON(raw, []);
  return Array.isArray(wf) ? wf : [];
};

const BreakpointSheet: React.FC<IBreakpointSheetProps> = (props) => {
  const history = useHistory();
  const routeParams = useParams<IRouteParams>();

  const effectiveBprsId = React.useMemo<number | null>(() => {
    if (typeof props.bprsId === "number" && !isNaN(props.bprsId)) {
      return props.bprsId;
    }
    const parsed = routeParams.bprsId ? parseInt(routeParams.bprsId, 10) : NaN;
    return isNaN(parsed) ? null : parsed;
  }, [props.bprsId, routeParams.bprsId]);

  const [bprsItem, setBprsItem] = React.useState<any>(null);
  const [cmsItem, setCmsItem] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string>("");

  const loadData = React.useCallback(async (): Promise<void> => {
    if (effectiveBprsId === null) {
      setIsLoading(false);
      setLoadError("No request selected.");
      return;
    }
    setIsLoading(true);
    setLoadError("");
    try {
      const bprsOps = await BPRSMaster();
      const allBprs = await bprsOps.getAllBPRSData(props);
      const foundBprs = Array.isArray(allBprs)
        ? allBprs.filter((o: any) => (o.Id ?? o.ID) === effectiveBprsId)[0]
        : null;

      if (!foundBprs) {
        setBprsItem(null);
        setCmsItem(null);
        setLoadError("Request not found.");
        return;
      }

      setBprsItem(foundBprs);

      const cmsMasterOps = CMSMasterOps();
      const matchedCms = await cmsMasterOps.getCMSMasterByEWONo(foundBprs.Title, props);
      setCmsItem(matchedCms);
    } catch (error) {
      console.error("Error loading breakpoint sheet data:", error);
      setLoadError("Unable to load request data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [effectiveBprsId, props.currentSPContext]);

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

  const ewoDetails = React.useMemo<Partial<IEWODetails>>(() => {
    return parseJSON(cmsItem ? cmsItem.EWODetails : "", {});
  }, [cmsItem]);

  const partFields = React.useMemo<IPartFields>(() => {
    if (!cmsItem || !bprsItem) {
      return EMPTY_PART_FIELDS;
    }
    return buildPartFields(cmsItem.PartAction, bprsItem.CMSSrNo);
  }, [cmsItem, bprsItem]);

  const summaryRows = React.useMemo(() => buildSummaryRows(bprsItem ? bprsItem.Summary : ""), [bprsItem]);

  const wfEntries = React.useMemo(() => buildWFEntries(bprsItem ? bprsItem.WF : ""), [bprsItem]);

  const breakPointDT = React.useMemo(() => parseJSON(bprsItem ? bprsItem.BreakPointDT : "", {}), [bprsItem]);
  const cutoffDisplay = breakPointDT.cutoff || "";
  const dateDisplay = formatDate(breakPointDT.date);
  const timeDisplay = breakPointDT.time || "";

  const bprsNumber = React.useMemo<string>(() => {
    if (!bprsItem) {
      return "";
    }
    const idValue = bprsItem.Id ?? bprsItem.ID ?? 0;
    return `EWO/${bprsItem.Title}/${zeroPad(idValue, 6)}`;
  }, [bprsItem]);

  const handleClose = (): void => {
    if (props.onClose) {
      props.onClose();
      return;
    }
    history.push("/");
  };

  return (
    <div className="breakpoint-sheet">
      <div className="bps-header">
        <div className="bps-header-top">
          <h2>BREAKPOINT REMINDING SHEET</h2>
          <button type="button" className="bps-close-btn" onClick={handleClose} aria-label="Close">
            &times;
          </button>
        </div>
        {wfEntries.length > 0 && (
          <div className="bps-approvers-row">
            <div className="bps-approvers-list">
              {wfEntries.map((entry, idx) => (
                <span className="bps-approver-pill" key={`${entry.role}-${idx}`} title={entry.role}>
                  {entry.user}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bps-body">
        {isLoading && (
          <div className="bps-loader-wrapper">
            <div className="bps-loader">
              <span className="bps-spinner" />
              <span>Loading request...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && <div className="bps-status bps-status-error">{loadError}</div>}

        {!isLoading && !loadError && bprsItem && (
          <>
            <div className="bps-section-header">
              <h3>EWO DETAILS</h3>
              {bprsItem.Status && (
                <span className="bps-status-badge">
                  STATUS: <strong>{bprsItem.Status}</strong>
                </span>
              )}
            </div>

            <div className="bps-details-grid bps-details-grid-3">
              <div className="bps-field">
                <label>EWO Number</label>
                <div className="bps-field-value">
                  <i className="fas fa-folder-open bps-file-icon" />
                  {bprsItem.Title || ""}
                </div>
              </div>
              <div className="bps-field">
                <label>BPRS Number</label>
                <div className="bps-field-value">
                  <i className="fas fa-folder-open bps-file-icon" />
                  {bprsNumber}
                </div>
              </div>
              <div className="bps-field">
                <label>EWO Title</label>
                <div className="bps-field-value">{ewoDetails.title || ""}</div>
              </div>
            </div>

            <div className="bps-details-grid bps-details-grid-6">
              <div className="bps-field">
                <label>Home Room EWO</label>
                <div className="bps-field-value">{ewoDetails.hrewo || ""}</div>
              </div>
              <div className="bps-field">
                <label>Coordinated EWO</label>
                <div className="bps-field-value">{ewoDetails.coewo || ""}</div>
              </div>
              <div className="bps-field">
                <label>Supplier</label>
                <div className="bps-field-value">{ewoDetails.supplier || ""}</div>
              </div>
              <div className="bps-field">
                <label>Program</label>
                <div className="bps-field-value">{ewoDetails.program || ""}</div>
              </div>
              <div className="bps-field">
                <label>Requestor</label>
                <div className="bps-field-value">{ewoDetails.initname || ""}</div>
              </div>
              <div className="bps-field">
                <label>Status</label>
                <div className="bps-field-value">{ewoDetails.status || ""}</div>
              </div>
            </div>

            <div className="bps-details-grid bps-details-grid-2col">
              <div className="bps-field">
                <label className="bps-label-strong">Next Up Assembly</label>
                <div className="bps-field-value">{partFields.nextass}</div>
              </div>
              <div className="bps-field">
                <label className="bps-label-strong">Old Part Number</label>
                <div className="bps-field-value">{partFields.oldpn}</div>
              </div>
              <div className="bps-field">
                <label className="bps-label-strong">New Part Number</label>
                <div className="bps-field-value">{partFields.newpn}</div>
              </div>
              <div className="bps-field">
                <label className="bps-label-strong">Part Name</label>
                <div className="bps-field-value">{partFields.partname}</div>
              </div>
              <div className="bps-field">
                <label className="bps-label-strong">Old Part Qty</label>
                <div className="bps-field-value">{partFields.oldpnqty}</div>
              </div>
              <div className="bps-field">
                <label className="bps-label-strong">New Part Qty</label>
                <div className="bps-field-value">{partFields.newpnqty}</div>
              </div>
              <div className="bps-field">
                <label className="bps-label-strong">L/R</label>
                <div className="bps-field-value">{partFields.lr}</div>
              </div>
              <div className="bps-field">
                <label className="bps-label-strong">LC/KD/Inhouse</label>
                <div className="bps-field-value">{partFields.kdlc}</div>
              </div>
              <div className="bps-field">
                <label className="bps-label-strong">Shop</label>
                <div className="bps-field-value">{partFields.shop}</div>
              </div>
              <div className="bps-field">
                <label className="bps-label-strong">Old Part Variant Applicability</label>
                <div className="bps-field-value">{partFields.oldpnvariant}</div>
              </div>
              <div className="bps-field">
                <label className="bps-label-strong">New Part Variant Applicability</label>
                <div className="bps-field-value">{partFields.newpnvariant}</div>
              </div>
              <div className="bps-field">
                <label className="bps-label-strong">Model</label>
                <div className="bps-field-value">{partFields.model}</div>
              </div>
            </div>

            <div className="bps-details-grid bps-details-grid-cutoff">
              <div className="bps-field">
                <label>
                  <span className="bps-required">*</span> Cut-Off
                </label>
                <div className="bps-field-value">{cutoffDisplay}</div>
              </div>
              <div className="bps-field">
                <label>
                  <span className="bps-required">*</span> Date
                </label>
                <div className="bps-field-value">{dateDisplay}</div>
              </div>
              <div className="bps-field">
                <label>Time</label>
                <div className="bps-field-value">{timeDisplay}</div>
              </div>
            </div>

            <div className="bps-section-header bps-summary-header">
              <h3>SUMMARY</h3>
            </div>

            <div className="bps-table-wrapper">
              <table className="bps-table">
                <thead>
                  <tr>
                    {SUMMARY_COLUMNS.map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.length === 0 && (
                    <tr>
                      <td className="bps-no-data" colSpan={SUMMARY_COLUMNS.length}>
                        No summary records found
                      </td>
                    </tr>
                  )}
                  {summaryRows.map((row) => (
                    <tr key={row.id}>
                      {SUMMARY_COLUMNS.map((col) => (
                        <td key={col.key}>{row[col.key] || ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>  
              </table>
            </div>
          </>
        )}
      </div>
    </div>   
  );
};

export default BreakpointSheet;