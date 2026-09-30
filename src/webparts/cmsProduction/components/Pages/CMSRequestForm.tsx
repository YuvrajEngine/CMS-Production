import * as React from "react";
import { useHistory, useLocation, useParams } from "react-router-dom";
import "../CSS/CMSRequestForm.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import CMSMasterOps, { ICMSMasterItem } from "../../service/BAL/CMSMaster";
import BPRSMaster from "../../service/BAL/BPRSMaster";

export interface ICMSRequestFormProps extends ICmsProductionProps {
  cmsId?: number;
  onClose?: () => void;
}

interface IRouteParams {
  cmsId?: string;
}

type TabKey = "partaction" | "prebp" | "postbp";

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

const PARTACTION_COLUMNS: IColumn[] = [
  { key: "srno", label: "Sr.No" },
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
  { key: "model", label: "Model" },
  { key: "changetype", label: "Change Type" },
  { key: "changemethod", label: "Change Method" },
  { key: "postatus", label: "PO Status" },
  { key: "homologation", label: "Homologation / Certification / Mandatory EWO Required." },
  { key: "mandatorydt", label: "Mandatory Date" },
  { key: "project", label: "Project" },
  { key: "suppcode", label: "Supplier Code" },
  { key: "commodity", label: "Commodity" },
  { key: "qualityleader", label: "Quality Leader/ Manager" },
  { key: "wh", label: "WH" },
  { key: "whmanager", label: "WH Manager" },
  { key: "me", label: "ME" },
  { key: "shopteamleader", label: "Shop Team/ Group Leader" },
  { key: "shopmanager", label: "Shop Manager" },
  { key: "partreadinessdt", label: "Part Readiness Date" },
  { key: "partavailabilitydt", label: "Part Availability Date" },
  { key: "ptrno", label: "PTR Number" },
  { key: "ptrstatus", label: "PTR Status" },
  { key: "ptrclosure", label: "PTR Closure" },
  { key: "orderingcutoffreq", label: "Ordering Cut off Required" },
  { key: "orderingcutoffstatus", label: "Ordering Cut off Status" },
  { key: "orderingcutoffremarks", label: "Ordering Cutoff Remarks" },
  { key: "prebpenable", label: "Pre-BP Enable" },
  { key: "oldpnsapstock", label: "Old PN SAP stock" },
  { key: "oldpnintransitstock", label: "Old PN In-Transit stock" },
  { key: "oldpnopenorderstock", label: "Old PN Open order stock" },
  { key: "oldpntotalstock", label: "Old PN Total Stock" },
  { key: "newpnsapstock", label: "New PN SAP stock" },
  { key: "newpnintransitstock", label: "New PN In-Transit stock" },
  { key: "newpnopenorderstock", label: "New PN Open order stock" },
  { key: "newpntotalstock", label: "New PN Total Stock" },
  { key: "stockupdatedt", label: "Date of stock update" },
  { key: "estimatedbpyear", label: "Estimated BP year" },
  { key: "estimatedbpmonth", label: "Estimated BP Month" },
  { key: "estimatedbpweek", label: "Estimated BP Week" },
  { key: "ecnnumber", label: "ECN Number" },
  { key: "backflushingstatus", label: "Backflushing Status" },
  { key: "postbpenable", label: "Post-BP Enable" },
  { key: "inventoryremarks", label: "Inventory Remarks" },
  { key: "bprsno", label: "BPRS Number" },
  { key: "bprsstatus", label: "BPRS Status" },
];

const BP_COLUMNS: IColumn[] = [
  { key: "srno", label: "Sr.No" },
  { key: "oldpn", label: "Old Part Number" },
  { key: "newpn", label: "New Part Number" },
  { key: "oldpnwh", label: "Old PN Warehouse" },
  { key: "oldpnint", label: "Old PN In-Transit" },
  { key: "oldpnsp", label: "Old PN Supplier" },
  { key: "oldpntot", label: "Old PN Total" },
  { key: "oldpncsn", label: "Old PN CSN no." },
  { key: "newpnwh", label: "New PN Warehouse" },
  { key: "newpnint", label: "New PN In-Transit" },
  { key: "newpnsp", label: "New PN Supplier" },
  { key: "newpntot", label: "New PN Total" },
  { key: "newpncsn", label: "New PN CSN no." },
  { key: "stockdt", label: "Stock date" },
  { key: "whremark", label: "Warehouse Remark" },
  { key: "plremark", label: "Planner Remark" },
];

const SUMMARY_COLUMNS: IColumn[] = [
  { key: "username", label: "User Name" },
  { key: "approvername", label: "Approver Name" },
  { key: "actiondate", label: "Action Date" },
  { key: "actionremarks", label: "Action Remarks" },
  { key: "comment", label: "Comment" },
];

type InfoModalKey = "status" | "overallstatus" | "teamresponsibility";
type StageKey = "Part Action" | "Pre BP" | "Post BP";

const STATUS_ORDER: string[] = [
  "Part Action",
  "Part Readiness Date",
  "Part Avaialability Date",
  "PTR Details",
  "Ordering cut-off Requirement",
  "Ordering cut off Status Update",
  "Pre-BP Requirement",
  "Pre-BP Stock Update",
  "Stock Update",
  "Estimated BP Details",
  "ECN Details",
  "Backflushing Update",
  "Post-BP Requirement",
  "Post BP Stock Update",
  "Inventory Adjustment Details",
];

const OVERALL_STATUS_TEAMS: string[] = [
  "BP Team",
  "SQE Team",
  "Planning Team",
  "Warehouse Team",
  "Inventory Team",
  "Data Management Team",
];

const OVERALL_STATUS_STAGES: StageKey[] = ["Part Action", "Pre BP", "Post BP"];

const STATUS_STAGE_TEAM_MAP: Record<string, { stage: StageKey; team: string }> = {
  "Part Action": { stage: "Part Action", team: "BP Team" },
  "Part Readiness Date": { stage: "Part Action", team: "SQE Team" },
  "Part Avaialability Date": { stage: "Pre BP", team: "Planning Team" },
  "PTR Details": { stage: "Part Action", team: "SQE Team" },
  "Ordering cut-off Requirement": { stage: "Part Action", team: "BP Team" },
  "Ordering cut off Status Update": { stage: "Post BP", team: "Planning Team" },
  "Pre-BP Requirement": { stage: "Part Action", team: "BP Team" },
  "Pre-BP Stock Update": { stage: "Pre BP", team: "Warehouse Team" },
  "Stock Update": { stage: "Pre BP", team: "Warehouse Team" },
  "Estimated BP Details": { stage: "Part Action", team: "BP Team" },
  "ECN Details": { stage: "Part Action", team: "BP Team" },
  "Backflushing Update": { stage: "Part Action", team: "BP Team" },
  "Post-BP Requirement": { stage: "Part Action", team: "BP Team" },
  "Post BP Stock Update": { stage: "Post BP", team: "Warehouse Team" },
  "Inventory Adjustment Details": { stage: "Part Action", team: "Inventory Team" },
};

interface ITeamResponsibilityItem {
  label: string;
  emphasis?: boolean;
}

interface ITeamResponsibilityGroup {
  team: string;
  items: ITeamResponsibilityItem[];
}

const TEAM_RESPONSIBILITY: ITeamResponsibilityGroup[] = [
  {
    team: "BP TEAM",
    items: [
      { label: "Next Up Assembly" },
      { label: "Old Part Number" },
      { label: "New Part Number" },
      { label: "Part Name" },
      { label: "Old Part Qty" },
      { label: "New Part Qty" },
      { label: "L/R" },
      { label: "LC/KD/Inhouse" },
      { label: "Shop" },
      { label: "Old part variant applicability" },
      { label: "New part variant applicability" },
      { label: "Model" },
      { label: "Change Type" },
      { label: "Change Method" },
      { label: "PO Status" },
      { label: "Homologation /Certification/ Mandatory EWO Required." },
      { label: "Mandatory Date" },
      { label: "Project" },
      { label: "Supplier Code" },
      { label: "Commodity" },
      { label: "Quality Leader/ Manager" },
      { label: "WH" },
      { label: "WH Manager" },
      { label: "ME" },
      { label: "Shop Team/ Group Leader" },
      { label: "Shop Manager" },
      { label: "Part Readiness Date", emphasis: true },
      { label: "Ordering Cut off Required" },
      { label: "Pre-BP Enable" },
      { label: "Old PN SAP stock" },
      { label: "Old PN In-Transit stock" },
      { label: "Old PN Open order stock" },
      { label: "New PN SAP stock" },
      { label: "New PN In-Transit stock" },
      { label: "New PN Open order stock" },
      { label: "Estimated BP year" },
      { label: "Estimated BP Month" },
      { label: "Estimated BP Week" },
      { label: "ECN Number" },
      { label: "Backflushing Status" },
      { label: "Post-BP Enable" },
    ],
  },
  {
    team: "PLANNING TEAM",
    items: [
      { label: "Part Availability Date", emphasis: true },
      { label: "Ordering Cut off Status" },
      { label: "Ordering Cutoff Remarks" },
      { label: "Pre-BP Old PN In-Transit" },
      { label: "Pre-BP Old PN Supplier" },
      { label: "Pre-BP New PN In-Transit" },
      { label: "Pre-BP New PN Supplier" },
      { label: "Post-BP Old PN In-Transit" },
      { label: "Post-BP Old PN Supplier" },
      { label: "Post-BP New PN In-Transit" },
      { label: "Post-BP New PN Supplier" },
    ],
  },
  {
    team: "SQE TEAM",
    items: [
      { label: "Part Readiness Date", emphasis: true },
      { label: "Part Availability Date", emphasis: true },
      { label: "PTR Number" },
    ],
  },
  {
    team: "WAREHOUSE TEAM",
    items: [
      { label: "Pre-BP Old PN Warehouse" },
      { label: "Pre-BP Old PN CSN no." },
      { label: "Pre-BP New PN Warehouse" },
      { label: "Pre-BP New PN CSN no." },
      { label: "Pre-BP Stock date" },
      { label: "Pre-BP Remark" },
      { label: "Post-BP Old PN Warehouse" },
      { label: "Post-BP Old PN CSN no." },
      { label: "Post-BP New PN Warehouse" },
      { label: "Post-BP New PN CSN no." },
      { label: "Post-BP Stock date" },
      { label: "Post-BP Remark" },
    ],
  },
  {
    team: "INVENTORY TEAM",
    items: [{ label: "Inventory Remarks" }],
  },
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

const buildPartActionRows = (
  partActionRaw: any,
  actionTakenRaw: any,
  ewoTitle: string,
  bprsForItem: any[],
  todoStatusRows: ITodoStatusRow[],
): Record<string, string>[] => {
  const partaction = parseJSON(partActionRaw, []);
  const actiontaken = parseJSON(actionTakenRaw, []);

  const getTodoValue = (statusLabel: string): string => {
    const found = todoStatusRows.filter((t) => t.status === statusLabel)[0];
    return found ? found.updatedon : "";
  };

  return partaction.map((pa: any, idx: number) => {
    const at = actiontaken.filter((o: any) => o.c0 === pa.c0)[0] || {};
    const bprsMatch = bprsForItem.filter((o: any) => (o.CMSSrNo || "").toString() === (pa.c0 || "").toString())[0];
    const bprsWF = bprsMatch ? buildWFEntries(bprsMatch.WF) : [];
    const bprsIdValue = bprsMatch ? (bprsMatch.Id ?? bprsMatch.ID ?? 0) : 0;

    return {
      id: `pa-${idx}`,
      srno: pa.c0 || "",
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
      model: pa.c12 || "",
      changetype: pa.c13 || "",
      changemethod: pa.c14 || "",
      postatus: pa.c15 || "",
      homologation: pa.c16 || "",
      mandatorydt: pa.c17 || "",
      project: pa.c18 || "",
      suppcode: pa.c19 || "",
      commodity: pa.c20 || "",
      qualityleader: getWFUser(bprsWF, "Quality Team"),
      wh: getWFUser(bprsWF, "Warehouse Team"),
      whmanager: getWFUser(bprsWF, "Logistics EWO coordinator"),
      me: getWFUser(bprsWF, "ME"),
      shopteamleader: getWFUser(bprsWF, "Shop Team/ Group Leader"),
      shopmanager: getWFUser(bprsWF, "Shop Manager"),
      partreadinessdt: getTodoValue("Part Readiness Date"),
      partavailabilitydt: getTodoValue("Part Avaialability Date"),
      ptrno: at.c29 || "",
      ptrstatus: at.c30 || "",
      ptrclosure: at.c31 || "",
      orderingcutoffreq: at.c32 || "",
      orderingcutoffstatus: at.c33 || "",
      orderingcutoffremarks: at.c34 || "",
      prebpenable: at.c35 || "",
      oldpnsapstock: at.c36 || "",
      oldpnintransitstock: at.c37 || "",
      oldpnopenorderstock: at.c38 || "",
      oldpntotalstock: at.c39 || "",
      newpnsapstock: at.c40 || "",
      newpnintransitstock: at.c41 || "",
      newpnopenorderstock: at.c42 || "",
      newpntotalstock: at.c43 || "",
      stockupdatedt: at.c44 || "",
      estimatedbpyear: at.c45 || "",
      estimatedbpmonth: at.c46 || "",
      estimatedbpweek: at.c47 || "",
      ecnnumber: at.c48 || "",
      backflushingstatus: at.c49 || "",
      postbpenable: at.c50 || "",
      inventoryremarks: at.c51 || "",
      bprsno: bprsMatch ? `EWO/${ewoTitle}/${zeroPad(bprsIdValue, 6)}` : "",
      bprsstatus: bprsMatch ? bprsMatch.Status || "" : "",
    };
  });
};

const buildBPRows = (raw: any): Record<string, string>[] => {
  const bp = parseJSON(raw, []);
  return bp.map((b: any, idx: number) => ({
    id: `bp-${idx}`,
    srno: (idx + 1).toString(),
    oldpn: b.c1 || "",
    newpn: b.c2 || "",
    oldpnwh: b.c3 || "",
    oldpnint: b.c4 || "",
    oldpnsp: b.c5 || "",
    oldpntot: b.c6 || "",
    oldpncsn: b.c7 || "",
    newpnwh: b.c8 || "",
    newpnint: b.c9 || "",
    newpnsp: b.c10 || "",
    newpntot: b.c11 || "",
    newpncsn: b.c12 || "",
    stockdt: b.c13 || "",
    whremark: b.c14 || "",
    plremark: b.c15 || "",
  }));
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

const getFirstDefined = (entry: any, keys: string[]): string => {
  for (const key of keys) {
    if (entry && entry[key] !== undefined && entry[key] !== null && entry[key] !== "") {
      return entry[key].toString();
    }
  }
  return "";
};

const parsePercentNumber = (raw: any): number | null => {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }
  const num = parseFloat(raw.toString().replace("%", ""));
  return isNaN(num) ? null : num;
};

const isWholeNumber = (num: number): boolean => {
  return num % 1 === 0;
};

const formatPercent = (raw: any): string => {
  const num = parsePercentNumber(raw);
  if (num === null) {
    return "";
  }
  return isWholeNumber(num) ? `${num}%` : `${num.toFixed(2)}%`;
};

interface IWFEntry {
  role: string;
  user: string;
}

interface IAgeingEntry {
  role: string;
  startDT?: string;
  endDT?: string;
}

interface ITodoStatusRow {
  id: string;
  status: string;
  per: any;
  updatedby: string;
  updatedon: string;
}

const buildWFEntries = (raw: any): IWFEntry[] => {
  const wf = parseJSON(raw, []);
  return Array.isArray(wf) ? wf : [];
};

const buildAgeingEntries = (raw: any): IAgeingEntry[] => {
  const ageing = parseJSON(raw, []);
  return Array.isArray(ageing) ? ageing : [];
};

const getWFUser = (wf: IWFEntry[], role: string): string => {
  const entry = wf.filter((o) => o.role === role)[0];
  return entry ? entry.user : "";
};

const buildTodoStatusRows = (raw: any): ITodoStatusRow[] => {
  const todo = parseJSON(raw, []);
  const list: any[] = Array.isArray(todo) ? todo : [];
  return STATUS_ORDER.map((statusLabel, idx) => {
    const entry = list.filter((o) => o.status === statusLabel)[0];
    return {
      id: `todo-${idx}`,
      status: statusLabel,
      per: entry ? entry.per : "",
      updatedby: entry ? getFirstDefined(entry, ["updatedby", "updatedBy", "user", "by"]) : "",
      updatedon: entry ? getFirstDefined(entry, ["updatedon", "updatedOn", "dt", "date", "modifiedon"]) : "",
    };
  });
};

const CMSRequestForm: React.FC<ICMSRequestFormProps> = (props) => {
  const history = useHistory();
  const location = useLocation();
  const routeParams = useParams<IRouteParams>();

  const isLimitedView = React.useMemo<boolean>(() => {
    return new URLSearchParams(location.search).get("fullView") !== "1";
  }, [location.search]);

  const effectiveCmsId = React.useMemo<number | null>(() => {
    if (typeof props.cmsId === "number" && !isNaN(props.cmsId)) {
      return props.cmsId;
    }
    const parsed = routeParams.cmsId ? parseInt(routeParams.cmsId, 10) : NaN;
    return isNaN(parsed) ? null : parsed;
  }, [props.cmsId, routeParams.cmsId]);

  const [item, setItem] = React.useState<ICMSMasterItem | null>(null);
  const [bprsRows, setBprsRows] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string>("");
  const [activeTab, setActiveTab] = React.useState<TabKey>("partaction");
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [activeInfoModal, setActiveInfoModal] = React.useState<InfoModalKey | null>(null);

  const loadData = React.useCallback(async (): Promise<void> => {
    if (effectiveCmsId === null) {
      setIsLoading(false);
      setLoadError("No request selected.");
      return;
    }
    setIsLoading(true);
    setLoadError("");
    try {
      const cmsMasterOps = CMSMasterOps();
      const data = await cmsMasterOps.getCMSMasterById(effectiveCmsId, props);
      setItem(data);

      if (data) {
        const bprsOps = await BPRSMaster();
        const allBprs = await bprsOps.getAllBPRSData(props);
        const filtered = Array.isArray(allBprs) ? allBprs.filter((o: any) => o.Title === data.Title) : [];
        setBprsRows(filtered);
      } else {
        setBprsRows([]);
      }
    } catch (error) {
      console.error("Error loading CMS request data:", error);
      setLoadError("Unable to load request data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [effectiveCmsId, props.currentSPContext]);

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

  const handleClose = (): void => {
    if (props.onClose) {
      props.onClose();
      return;
    }
    history.push("/");
  };

  const closeInfoModal = (): void => {
    setActiveInfoModal(null);
  };

  React.useEffect(() => {
    setSearchTerm("");
  }, [activeTab]);

  const ewoDetails = React.useMemo<Partial<IEWODetails>>(() => {
    return parseJSON(item ? (item as any).EWODetails : "", {});
  }, [item]);

  const todoStatusRows = React.useMemo(() => buildTodoStatusRows(item ? (item as any).ToDoStatus : ""), [item]);
  const wfEntries = React.useMemo(() => buildWFEntries(item ? (item as any).WF : ""), [item]);
  const ageingEntries = React.useMemo(() => buildAgeingEntries(item ? (item as any).Ageing : ""), [item]);

  const partActionRows = React.useMemo(
    () =>
      buildPartActionRows(
        item ? (item as any).PartAction : "",
        item ? (item as any).ActionTaken : "",
        item ? item.Title : "",
        bprsRows,
        todoStatusRows,
      ),
    [item, bprsRows, todoStatusRows],
  );
  const preBPRows = React.useMemo(() => buildBPRows(item ? (item as any).PreBP : ""), [item]);
  const postBPRows = React.useMemo(() => buildBPRows(item ? (item as any).PostBP : ""), [item]);
  const summaryRows = React.useMemo(() => buildSummaryRows(item ? (item as any).Summary : ""), [item]);

  const overallStatusPercent = React.useMemo(() => {
    const nums = todoStatusRows
      .map((t) => parsePercentNumber(t.per))
      .filter((n): n is number => n !== null);
    if (!nums.length) {
      return null;
    }
    return nums.reduce((sum, n) => sum + n, 0) / nums.length;
  }, [todoStatusRows]);

  const overallStatusMatrix = React.useMemo(() => {
    const matrix: Record<string, Record<string, number | null>> = {};
    const dmEntry = ageingEntries.filter((o) => o.role === "Data Management Team")[0];
    const dmPercent = dmEntry ? (dmEntry.endDT ? 100 : 0) : null;

    OVERALL_STATUS_TEAMS.forEach((team) => {
      matrix[team] = {};
      OVERALL_STATUS_STAGES.forEach((stage) => {
        if (team === "Data Management Team") {
          matrix[team][stage] = stage === "Part Action" ? dmPercent : null;
          return;
        }
        const matchingStatuses = STATUS_ORDER.filter((label) => {
          const map = STATUS_STAGE_TEAM_MAP[label];
          return map && map.stage === stage && map.team === team;
        });
        if (!matchingStatuses.length) {
          matrix[team][stage] = null;
          return;
        }
        const nums = matchingStatuses
          .map((label) => todoStatusRows.filter((t) => t.status === label)[0])
          .map((entry) => (entry ? parsePercentNumber(entry.per) : null))
          .filter((n): n is number => n !== null);
        matrix[team][stage] = nums.length ? nums.reduce((sum, n) => sum + n, 0) / nums.length : null;
      });
    });
    return matrix;
  }, [todoStatusRows, ageingEntries]);

  const activeColumns = activeTab === "partaction" ? PARTACTION_COLUMNS : BP_COLUMNS;
  const activeTabLabel = activeTab === "partaction" ? "Part Actions" : activeTab === "prebp" ? "Pre-BP" : "Post-BP";

  const activeRows =
    activeTab === "partaction" ? partActionRows : activeTab === "prebp" ? preBPRows : postBPRows;

  const filteredRows = React.useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return activeRows;
    }
    return activeRows.filter((row) => {
      const haystack = activeColumns
        .map((col) => row[col.key] || "")
        .join(" ")
        .toLowerCase();
      return haystack.indexOf(term) !== -1;
    });
  }, [activeRows, activeColumns, searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
  };

  const handleExport = (): void => {
    const header = activeColumns.map((col) => col.label);
    const csvRows = filteredRows.map((row) => activeColumns.map((col) => row[col.key] || ""));
    const csvContent = [header, ...csvRows]
      .map((cells) => cells.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${item ? item.Title : "CMSRequest"}-${activeTab}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cms-request-form">
      <div className="crf-header">
        <h2>CHANGE MANAGEMENT SYSTEM</h2>
        <div className="crf-header-actions">
          <button type="button" className="crf-header-btn" onClick={() => setActiveInfoModal("status")}>
            <i className="fas fa-info-circle" /> Status
          </button>
          {!isLimitedView && (
            <button type="button" className="crf-header-btn" onClick={() => setActiveInfoModal("overallstatus")}>
              <i className="fas fa-info-circle" /> Overall Status{" "}
              {overallStatusPercent !== null ? `${overallStatusPercent.toFixed(2)}%` : "--"}
            </button>
          )}
          <button
            type="button"
            className="crf-header-btn crf-header-btn-help"
            onClick={() => setActiveInfoModal("teamresponsibility")}
            aria-label="Team Responsibility"
          >
            ?
          </button>
          <button type="button" className="crf-close-btn" onClick={handleClose} aria-label="Close">
            &times;
          </button>
        </div>
      </div>

      <div className="crf-body">
        {isLoading && (
          <div className="crf-loader-wrapper">
            <div className="crf-loader">
              <span className="crf-spinner" />
              <span>Loading request...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && <div className="crf-status crf-status-error">{loadError}</div>}

        {!isLoading && !loadError && item && (
          <>
            <div className="crf-section-header">
              <h3>EWO DETAILS</h3>
            </div>

            <div className="crf-details-grid crf-details-grid-2">
              <div className="crf-field crf-field-ewono">
                <label>EWO Number</label>
                <div className="crf-field-value">
                  <i className="fas fa-folder-open crf-file-icon" />
                  {item.Title}
                </div>
              </div>
              <div className="crf-field">
                <label>EWO Title</label>
                <div className="crf-field-value">{ewoDetails.title || ""}</div>
              </div>
            </div>

            <div className="crf-details-grid crf-details-grid-6">
              <div className="crf-field">
                <label>Home Room EWO</label>
                <div className="crf-field-value">{ewoDetails.hrewo || ""}</div>
              </div>
              <div className="crf-field">
                <label>Coordinated EWO</label>
                <div className="crf-field-value">{ewoDetails.coewo || ""}</div>
              </div>
              <div className="crf-field">
                <label>Supplier</label>
                <div className="crf-field-value">{ewoDetails.supplier || ""}</div>
              </div>
              <div className="crf-field">
                <label>Program</label>
                <div className="crf-field-value">{ewoDetails.program || ""}</div>
              </div>
              <div className="crf-field">
                <label>Requestor</label>
                <div className="crf-field-value">{ewoDetails.initname || ""}</div>
              </div>
              <div className="crf-field">
                <label>Status</label>
                <div className="crf-field-value">{ewoDetails.status || ""}</div>
              </div>
            </div>

            <div className="crf-tabs">
              <button
                type="button"
                className={`crf-tab-btn ${activeTab === "partaction" ? "crf-tab-btn-active" : ""}`}
                onClick={() => setActiveTab("partaction")}
              >
                Part Action
              </button>
              {!isLimitedView && (
                <button
                  type="button"
                  className={`crf-tab-btn ${activeTab === "prebp" ? "crf-tab-btn-active" : ""}`}
                  onClick={() => setActiveTab("prebp")}
                >
                  Pre-BP
                </button>
              )}
              {!isLimitedView && (
                <button
                  type="button"
                  className={`crf-tab-btn ${activeTab === "postbp" ? "crf-tab-btn-active" : ""}`}
                  onClick={() => setActiveTab("postbp")}
                >
                  Post-BP
                </button>
              )}
            </div>

            <div className="crf-tab-toolbar">
              <input
                type="text"
                className="crf-tab-search"
                placeholder={`search in ${activeTabLabel}...`}
                value={searchTerm}
                onChange={handleSearchChange}
              />
              <button type="button" className="crf-download-btn" onClick={handleExport} aria-label="Download">
                <i className="fas fa-download" />
              </button>
            </div>

            <div className="crf-table-wrapper">
              <table className="crf-table">
                <thead>
                  <tr>
                    {activeColumns.map((col) => (
                      <th key={col.key}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 && (
                    <tr>
                      <td className="crf-no-data" colSpan={activeColumns.length}>
                        No records found
                      </td>
                    </tr>
                  )}
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      {activeColumns.map((col) => (
                        <td key={col.key}>{row[col.key] || ""}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="crf-section-header crf-summary-header">
              <h3>SUMMARY</h3>
            </div>

            <div className="crf-table-wrapper">
              <table className="crf-table">
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
                      <td className="crf-no-data" colSpan={SUMMARY_COLUMNS.length}>
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

      {activeInfoModal === "status" && (
        <div className="crf-modal-overlay" onClick={closeInfoModal}>
          <div className="crf-modal" onClick={(e) => e.stopPropagation()}>
            <div className="crf-modal-header">
              <span className="crf-modal-icon">
                <i className="fas fa-sync-alt" />
              </span>
              <h3>ACTIVITY STATUS</h3>
              <button type="button" className="crf-modal-close" onClick={closeInfoModal} aria-label="Close">
                &times;
              </button>
            </div>
            <div className="crf-modal-body">
              <table className="crf-modal-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Updated By</th>
                    <th>Updated On</th>
                    <th>% Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {todoStatusRows.map((row) => {
                    const num = parsePercentNumber(row.per);
                    return (
                      <tr key={row.id}>
                        <td>{row.status}</td>
                        <td>{row.updatedby}</td>
                        <td>{row.updatedon}</td>
                        <td>
                          <div className="crf-progress-cell">
                            <div className="crf-progress-track">
                              <div
                                className="crf-progress-fill"
                                style={{ width: `${num !== null ? Math.min(num, 100) : 0}%` }}
                              />
                            </div>
                            <span className="crf-progress-label">{formatPercent(row.per)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeInfoModal === "overallstatus" && (
        <div className="crf-modal-overlay" onClick={closeInfoModal}>
          <div className="crf-modal crf-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="crf-modal-header">
              <span className="crf-modal-icon">
                <i className="fas fa-percentage" />
              </span>
              <h3>OVER ALL STATUS</h3>
              <button type="button" className="crf-modal-close" onClick={closeInfoModal} aria-label="Close">
                &times;
              </button>
            </div>
            <div className="crf-modal-body">
              <table className="crf-modal-table crf-matrix-table">
                <thead>
                  <tr>
                    <th />
                    {OVERALL_STATUS_TEAMS.map((team) => (
                      <th key={team}>{team}</th>
                    ))}
                  </tr>
                  <tr>
                    <th />
                    {OVERALL_STATUS_TEAMS.map((team) => (
                      <th key={`${team}-user`}>{getWFUser(wfEntries, team)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {OVERALL_STATUS_STAGES.map((stage) => (
                    <tr key={stage}>
                      <td className="crf-matrix-stage">{stage}</td>
                      {OVERALL_STATUS_TEAMS.map((team) => {
                        const value = overallStatusMatrix[team] ? overallStatusMatrix[team][stage] : null;
                        return (
                          <td key={`${stage}-${team}`}>
                            {value !== null && (
                              <div className="crf-progress-cell">
                                <div className="crf-progress-track">
                                  <div className="crf-progress-fill" style={{ width: `${Math.min(value, 100)}%` }} />
                                </div>
                                <span className="crf-progress-label">
                                  {isWholeNumber(value) ? `${value}%` : `${value.toFixed(2)}%`}
                                </span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeInfoModal === "teamresponsibility" && (
        <div className="crf-modal-overlay" onClick={closeInfoModal}>
          <div className="crf-modal crf-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="crf-modal-header">
              <span className="crf-modal-icon">
                <i className="fas fa-users" />
              </span>
              <h3>TEAM RESPONSIBILITY TO UPDATE COLUMNS</h3>
              <button type="button" className="crf-modal-close" onClick={closeInfoModal} aria-label="Close">
                &times;
              </button>
            </div>
            <div className="crf-modal-body">
              <div className="crf-team-grid">
                {TEAM_RESPONSIBILITY.map((group) => (
                  <div className="crf-team-card" key={group.team}>
                    <div className="crf-team-card-header">{group.team}</div>
                    <ul className="crf-team-card-list">
                      {group.items.map((teamItem, idx) => (
                        <li key={`${group.team}-${idx}`} className={teamItem.emphasis ? "crf-team-item-emphasis" : ""}>
                          {teamItem.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CMSRequestForm;