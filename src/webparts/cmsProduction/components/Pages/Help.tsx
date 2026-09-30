import * as React from "react";
import "../CSS/Help.scss";
import type { ICmsProductionProps } from "../ICmsProductionProps";
import cmsWorkflowImage from "../../assets/Images/WorkFlow.png";

export interface IHelpProps extends ICmsProductionProps {
  onNavigate?: (pageKey: string) => void;
}

type HelpTabKey = "about" | "workflow" | "matrix";

interface IHelpTab {
  key: HelpTabKey;
  label: string;
  icon: string;
}

const HELP_TABS: IHelpTab[] = [
  { key: "about", label: "About", icon: "fas fa-circle-info" },
  { key: "workflow", label: "Workflow", icon: "fas fa-diagram-project" },
  { key: "matrix", label: "Responsibility Matrix", icon: "fas fa-table-list" },
];

interface IResponsibilityRow {
  srNo: number;
  role: string;
  currentDept: string;
}

const RESPONSIBILITY_MATRIX: IResponsibilityRow[] = [
  { srNo: 1, role: "Part Action - Gloster", currentDept: "Break-Pointing Team" },
  { srNo: 2, role: "Part readiness Date - LC", currentDept: "SQE" },
  { srNo: 3, role: "Part readiness Date - KD", currentDept: "Break-pointing Team" },
  { srNo: 4, role: "Part readiness Date - Inhouse", currentDept: "SQE" },
  { srNo: 5, role: "Part availability Date - LC", currentDept: "SQE" },
  { srNo: 6, role: "Part availability Date - KD", currentDept: "Planner" },
  { srNo: 7, role: "Part availability Date - Inhouse", currentDept: "SQE" },
  { srNo: 8, role: "Ordering cutoff update", currentDept: "Planner" },
  { srNo: 9, role: "Stock Upload - WH", currentDept: "WH Team" },
  { srNo: 10, role: "Stock Upload - In-transit", currentDept: "Planner" },
  { srNo: 11, role: "Stock Upload - Open Orders", currentDept: "Planner" },
  { srNo: 12, role: "Stock Upload - Vendor", currentDept: "Planner" },
  { srNo: 13, role: "Expected BP Date", currentDept: "Break-Pointing Team" },
  { srNo: 14, role: "ECN Update", currentDept: "Break-Pointing Team" },
  { srNo: 15, role: "Implementation Cut-off Details", currentDept: "Manufacturing Team" },
  { srNo: 16, role: "BP Cut Off Update", currentDept: "Break-Pointing Team" },
  { srNo: 17, role: "Backflushing + Routing Update", currentDept: "Break-Pointing Team" },
  { srNo: 18, role: "Inventory Adjustment Update", currentDept: "Inventory Team" },
];

const padTwoDigits = (value: number): string => {
  const str = String(value);
  return str.length < 2 ? `0${str}` : str;
};

interface IAboutSection {
  title: string;
  points: string[];
}

const ABOUT_SECTIONS: IAboutSection[] = [
  {
    title: "Change Management System (CMS) Overview",
    points: [
      "Developed for MGI cars to track and manage engineering changes.",
      "Acts as a centralized platform for overseeing the entire change process.",
      "Focuses on modifications to car components' design, production, and processes.",
    ],
  },
  {
    title: "Nature of Engineering Changes",
    points: [
      "Encompasses additions, deletions, replacements, alterations in quantity, design modifications, process adjustments etc.",
    ],
  },
  {
    title: "Role of the CMS",
    points: [
      "Acts as a consolidation platform for data and information.",
      "Integrates data from different portals into a single interface.",
      "Streamlines the change management process.",
    ],
  },
  {
    title: "Benefits of the CMS",
    points: [
      "Simplifies access to relevant data.",
      "Eliminates the need to navigate through multiple systems.",
      "Improves efficiency and accuracy in managing changes.",
    ],
  },
];

const Help: React.FC<IHelpProps> = () => {
  const [activeTab, setActiveTab] = React.useState<HelpTabKey>("about");

  return (
    <div className="help-page">
      <div className="help-header">
        <h2>HELP</h2>
      </div>

      <div className="help-body">
        <div className="help-panel">
          <div className="help-tabs">
            {HELP_TABS.map((tab) => (
              <button
                type="button"
                key={tab.key}
                className={activeTab === tab.key ? "active" : ""}
                onClick={() => setActiveTab(tab.key)}
              >
                <i className={tab.icon} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="help-content">
            {activeTab === "about" && (
              <div className="help-about">
                {ABOUT_SECTIONS.map((section, idx) => (
                  <section className="help-about-section" key={section.title}>
                    <h3>
                      <span className="help-about-index">{padTwoDigits(idx + 1)}</span>
                      {section.title}
                    </h3>
                    <ul>
                      {section.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            {activeTab === "workflow" && (
              <div className="help-workflow">
                <div className="help-workflow-frame">
                  <img
                    src={cmsWorkflowImage}
                    alt="CMS Workflow"
                    className="help-workflow-image"
                  />
                </div>
              </div>
            )}

            {activeTab === "matrix" && (
              <div className="help-matrix-wrapper">
                <table className="help-matrix-table">
                  <thead>
                    <tr>
                      <th className="help-col-srno">Sr.No</th>
                      <th>Roles</th>
                      <th>Current Dept</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RESPONSIBILITY_MATRIX.map((row) => (
                      <tr key={row.srNo}>
                        <td className="help-col-srno">
                          <span className="help-srno-badge">{row.srNo}</span>
                        </td>
                        <td className="help-col-role">{row.role}</td>
                        <td>{row.currentDept}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>       
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;