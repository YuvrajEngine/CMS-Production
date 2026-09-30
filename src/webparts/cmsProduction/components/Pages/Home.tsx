import * as React from 'react';
import '../CSS/Home.scss';
import { ICmsProductionProps } from '../../components/ICmsProductionProps';
import CMSMasterOps from '../../service/BAL/CMSMaster';
import BPRSMaster from '../../service/BAL/BPRSMaster';

export interface IHomeProps extends ICmsProductionProps {
  onNavigate?: (pageKey: string) => void;
}

interface IWFEntry {
  role: string;
  startDT: string;
  endDT: string;
}

interface IAgeingEntry {
  role: string;
  ageing: string | number;
}

interface IRoleWorkflowEntry extends IWFEntry {
  ageing: string | number | null;
}

interface IPendingItem {
  id: number;
  title: string;
}

interface IRoleAggregate {
  count: number;
  items: IPendingItem[];
}

interface ICMSStats {
  bpTeamActionRequired: number;
  totalSubmitted: number;
  underProgress: number;
  implementedAndClosed: number;
  roleData: Record<string, IRoleAggregate>;
}

interface IBPRSStats {
  roleData: Record<string, IRoleAggregate>;
}

type ModalListType = 'cms' | 'bprs';

interface IModalState {
  isOpen: boolean;
  title: string;
  items: IPendingItem[];
  listType: ModalListType;
}

const IMPLEMENTED_AND_CLOSED_STATUS = 'Implemented and Closed';

const safeJsonParse = <T,>(value: string | null | undefined, fallback: T): T => {
  if (!value) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(value);
    return (parsed ?? fallback) as T;
  } catch (error) {
    return fallback;
  }
};

const parseWF = (wf: string): IWFEntry[] => {
  const entries = safeJsonParse<IWFEntry[]>(wf, []);
  return Array.isArray(entries) ? entries : [];
};

const parseAgeing = (ageing: string): IAgeingEntry[] => {
  const entries = safeJsonParse<IAgeingEntry[]>(ageing, []);
  return Array.isArray(entries) ? entries : [];
};

const mergeByRole = (wfEntries: IWFEntry[], ageingEntries: IAgeingEntry[]): IRoleWorkflowEntry[] => {
  const ageingByRole = new Map<string, string | number>();
  ageingEntries.forEach((entry) => {
    if (entry && entry.role) {
      ageingByRole.set(entry.role, entry.ageing);
    }
  });

  return wfEntries
    .filter((entry) => !!entry && !!entry.role)
    .map((entry) => ({
      ...entry,
      ageing: ageingByRole.has(entry.role) ? (ageingByRole.get(entry.role) as string | number) : null,
    }));
};

const isPendingEntry = (entry: IRoleWorkflowEntry): boolean => {
  return !entry.endDT || entry.endDT.trim() === '';
};

const getPendingRoleData = (
  items: Array<{ Id: number; Title: string; WF: string; Ageing: string }>,
): Record<string, IRoleAggregate> => {
  const roleData: Record<string, IRoleAggregate> = {};

  items.forEach((item) => {
    const wfEntries = parseWF(item.WF);
    const ageingEntries = parseAgeing(item.Ageing);
    const merged = mergeByRole(wfEntries, ageingEntries);

    merged.filter(isPendingEntry).forEach((entry) => {
      if (!roleData[entry.role]) {
        roleData[entry.role] = { count: 0, items: [] };
      }
      roleData[entry.role].count += 1;
      if (item.Title) {
        roleData[entry.role].items.push({ id: item.Id, title: item.Title });
      }
    });
  });

  return roleData;
};

const getRoleCount = (roleData: Record<string, IRoleAggregate>, role: string): number => {
  return roleData[role]?.count ?? 0;
};

const getRoleItems = (roleData: Record<string, IRoleAggregate>, role: string): IPendingItem[] => {
  return roleData[role]?.items ?? [];
};

const formatCount = (value: number | undefined): string => {
  if (value === undefined) {
    return '--';
  }
  return value < 10 ? `0${value}` : `${value}`;
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalContentStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '6px',
  width: '520px',
  maxWidth: '90vw',
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
};

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid #e1e1e1',
};

const modalTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '20px',
  fontWeight: 600,
  color: '#1a1a1a',
};

const modalCloseButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '18px',
  color: '#666666',
  cursor: 'pointer',
  lineHeight: 1,
};

const modalSearchWrapperStyle: React.CSSProperties = {
  padding: '16px 20px',
};

const modalSearchInputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px 10px 36px',
  border: '1px solid #d0d0d0',
  borderRadius: '4px',
  fontSize: '14px',
  outline: 'none',
};

const modalSearchIconWrapperStyle: React.CSSProperties = {
  position: 'relative',
};

const modalSearchIconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '12px',
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#8a8a8a',
  pointerEvents: 'none',
};

const modalListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '16px',
  padding: '4px 20px 20px 20px',
  overflowY: 'auto',
};

const modalListItemStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '14px',
  color: '#1a1a1a',
  lineHeight: '16px',
  cursor: 'pointer',
};

const modalEmptyStateStyle: React.CSSProperties = {
  padding: '0 20px 20px 20px',
  fontSize: '14px',
  color: '#8a8a8a',
};

const modalListItemIconStyle: React.CSSProperties = {
  color: '#000000',
  fontSize: '14px',
  width: '16px',
  textAlign: 'center',
  flexShrink: 0,
  lineHeight: 1,
};

const FolderIcon: React.FC = () => <i className="fas fa-folder-open" style={modalListItemIconStyle} />;

const SearchIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="11" y1="11" x2="15" y2="15" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const Home: React.FC<IHomeProps> = (props: IHomeProps) => {

  const { onNavigate } = props;
  const cmsProps: ICmsProductionProps = props;

  const [cmsStats, setCmsStats] = React.useState<ICMSStats | null>(null);
  const [bprsStats, setBprsStats] = React.useState<IBPRSStats | null>(null);
  const [, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [modalState, setModalState] = React.useState<IModalState | null>(null);
  const [modalSearchText, setModalSearchText] = React.useState<string>('');

  const handleCardClick = (pageKey: string) => {
    if (onNavigate) {
      onNavigate(pageKey);
    }
  };

  const openRoleModal = (title: string, items: IPendingItem[], listType: ModalListType) => {
    setModalSearchText('');
    setModalState({ isOpen: true, title, items, listType });
  };

  const closeModal = () => {
    setModalState(null);
    setModalSearchText('');
  };

  const handleRequestOpen = (item: IPendingItem, listType: ModalListType) => {
    closeModal();
    const path = listType === 'cms' ? `/CMSRequestForm/${item.id}?fullView=1` : `/BPRSRequestForm/${item.id}`;
    const baseUrl = window.location.href.split('#')[0];
    const url = `${baseUrl}#${path}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  React.useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async (): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        const cmsOps = CMSMasterOps();
        const bprsOps = await BPRSMaster();

        const [cmsItems, bprsItems] = await Promise.all([
          cmsOps.getCMSMasterData('', { column: 'Id', isAscending: false }, cmsProps),
          bprsOps.getAllBPRSData(cmsProps),
        ]);

        const bpTeamActionRequired = cmsItems.filter((item) => item.Stage === 0).length;
        const totalSubmitted = cmsItems.filter((item) => (item.Stage ?? 0) >= 1).length;
        const underProgress = cmsItems.filter(
          (item) => (item.Stage ?? 0) >= 1 && item.Status !== IMPLEMENTED_AND_CLOSED_STATUS,
        ).length;
        const implementedAndClosed = cmsItems.filter(
          (item) => item.Status === IMPLEMENTED_AND_CLOSED_STATUS,
        ).length;

        const cmsRoleData = getPendingRoleData(
          cmsItems.map((item) => ({ Id: item.Id as number, Title: item.Title, WF: item.WF, Ageing: item.Ageing })),
        );
        const bprsRoleData = getPendingRoleData(
          bprsItems.map((item: any) => ({ Id: item.Id as number, Title: item.Title, WF: item.WF, Ageing: item.Ageing })),
        );

        if (isMounted) {
          setCmsStats({
            bpTeamActionRequired,
            totalSubmitted,
            underProgress,
            implementedAndClosed,
            roleData: cmsRoleData,
          });
          setBprsStats({ roleData: bprsRoleData });
        }
      } catch (err) {
        if (isMounted) {
          setError('Unable to load dashboard data. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboardData().catch(() => {
      if (isMounted) {
        setError('Unable to load dashboard data. Please try again later.');
      }
    });

    return () => {
      isMounted = false;
    };
  }, [cmsProps]);

  const filteredModalItems = modalState
    ? modalState.items.filter((item) => item.title.toLowerCase().indexOf(modalSearchText.toLowerCase()) !== -1)
    : [];

  return (
    <div className="home-dashboard">

      <div className="dashboard-header">
        <h2>CHANGE MANAGEMENT SYSTEM</h2>
      </div>

      {error && <div className="dashboard-error">{error}</div>}

      <div className="dashboard-body">

        <div className="dashboard-section">
          <h2 className="dashboard-section-title">CMS</h2>

          <div className="dashboard-card-grid">

            <div className="dashboard-card" onClick={() => handleCardClick('cms-bp-team-action-required')}>
              <span className="dashboard-card-count">{formatCount(cmsStats?.bpTeamActionRequired)}</span>
              <span className="dashboard-card-title">BP Team Action Required</span>
            </div>

            <div className="dashboard-card" onClick={() => handleCardClick('cms-total-submitted')}>
              <span className="dashboard-card-count">{formatCount(cmsStats?.totalSubmitted)}</span>
              <span className="dashboard-card-title">Total CMS Submitted</span>
            </div>

            <div className="dashboard-card" onClick={() => handleCardClick('cms-under-progress')}>
              <span className="dashboard-card-count">{formatCount(cmsStats?.underProgress)}</span>
              <span className="dashboard-card-title">Under Progress Request</span>
            </div>

            <div className="dashboard-card" onClick={() => handleCardClick('cms-implemented-closed')}>
              <span className="dashboard-card-count">{formatCount(cmsStats?.implementedAndClosed)}</span>
              <span className="dashboard-card-title">Implemented And Closed</span>
            </div>

            <div
              className="dashboard-card"
              onClick={() => openRoleModal('Inventory Team', cmsStats ? getRoleItems(cmsStats.roleData, 'Inventory Team') : [], 'cms')}
            >
              <span className="dashboard-card-count">
                {formatCount(cmsStats ? getRoleCount(cmsStats.roleData, 'Inventory Team') : undefined)}
              </span>
              <span className="dashboard-card-title">Inventory Team</span>
            </div>
          </div>

          <hr className="dashboard-divider" />

          <div className="dashboard-card-grid">

            <div
              className="dashboard-card"
              onClick={() => openRoleModal('Planning Team', cmsStats ? getRoleItems(cmsStats.roleData, 'Planning Team') : [], 'cms')}
            >
              <span className="dashboard-card-count">
                {formatCount(cmsStats ? getRoleCount(cmsStats.roleData, 'Planning Team') : undefined)}
              </span>
              <span className="dashboard-card-title">Planning Team</span>
            </div>

            <div
              className="dashboard-card"
              onClick={() => openRoleModal('Warehouse Team', cmsStats ? getRoleItems(cmsStats.roleData, 'Warehouse Team') : [], 'cms')}
            >
              <span className="dashboard-card-count">
                {formatCount(cmsStats ? getRoleCount(cmsStats.roleData, 'Warehouse Team') : undefined)}
              </span>
              <span className="dashboard-card-title">Warehouse Team</span>
            </div>

            <div
              className="dashboard-card"
              onClick={() => openRoleModal('BP Team', cmsStats ? getRoleItems(cmsStats.roleData, 'BP Team') : [], 'cms')}
            >
              <span className="dashboard-card-count">
                {formatCount(cmsStats ? getRoleCount(cmsStats.roleData, 'BP Team') : undefined)}
              </span>
              <span className="dashboard-card-title">BP Team</span>
            </div>

            <div
              className="dashboard-card"
              onClick={() => openRoleModal('Data Management Team', cmsStats ? getRoleItems(cmsStats.roleData, 'Data Management Team') : [], 'cms')}
            >
              <span className="dashboard-card-count">
                {formatCount(cmsStats ? getRoleCount(cmsStats.roleData, 'Data Management Team') : undefined)}
              </span>
              <span className="dashboard-card-title">Data Management Team</span>
            </div>

            <div
              className="dashboard-card"
              onClick={() => openRoleModal('SQE Team', cmsStats ? getRoleItems(cmsStats.roleData, 'SQE Team') : [], 'cms')}
            >
              <span className="dashboard-card-count">
                {formatCount(cmsStats ? getRoleCount(cmsStats.roleData, 'SQE Team') : undefined)}
              </span>
              <span className="dashboard-card-title">SQE Team</span>
            </div>

          </div>

        </div>

        <hr className="dashboard-divider" />

        <div className="dashboard-section">
          <h2 className="dashboard-section-title">BPRS</h2>

          <div className="dashboard-card-grid">

            <div
              className="dashboard-card"
              onClick={() => openRoleModal('Manufacturing Team', bprsStats ? getRoleItems(bprsStats.roleData, 'Manufacturing Team') : [], 'bprs')}
            >
              <span className="dashboard-card-count">
                {formatCount(bprsStats ? getRoleCount(bprsStats.roleData, 'Manufacturing Team') : undefined)}
              </span>
              <span className="dashboard-card-title">Manufacturing Team</span>
            </div>

            <div
              className="dashboard-card"
              onClick={() => openRoleModal('Line-Feeding Team', bprsStats ? getRoleItems(bprsStats.roleData, 'Line-Feeding Team') : [], 'bprs')}
            >
              <span className="dashboard-card-count">
                {formatCount(bprsStats ? getRoleCount(bprsStats.roleData, 'Line-Feeding Team') : undefined)}
              </span>
              <span className="dashboard-card-title">Line-Feeding Team</span>
            </div>

            <div
              className="dashboard-card"
              onClick={() => openRoleModal('Logistics EWO Coordinator', bprsStats ? getRoleItems(bprsStats.roleData, 'Logistics EWO Coordinator') : [], 'bprs')}
            >
              <span className="dashboard-card-count">
                {formatCount(bprsStats ? getRoleCount(bprsStats.roleData, 'Logistics EWO Coordinator') : undefined)}
              </span>
              <span className="dashboard-card-title">Logistics EWO Coordinator</span>
            </div>

            <div
              className="dashboard-card"
              onClick={() => openRoleModal('ME', bprsStats ? getRoleItems(bprsStats.roleData, 'ME') : [], 'bprs')}
            >
              <span className="dashboard-card-count">
                {formatCount(bprsStats ? getRoleCount(bprsStats.roleData, 'ME') : undefined)}
              </span>
              <span className="dashboard-card-title">ME</span>
            </div>

            <div
              className="dashboard-card"
              onClick={() => openRoleModal('Quality Team', bprsStats ? getRoleItems(bprsStats.roleData, 'Quality Team') : [], 'bprs')}
            >
              <span className="dashboard-card-count">
                {formatCount(bprsStats ? getRoleCount(bprsStats.roleData, 'Quality Team') : undefined)}
              </span>
              <span className="dashboard-card-title">Quality Team</span>
            </div>

            <div
              className="dashboard-card"
              onClick={() => openRoleModal('Shop Team/ Group Leader', bprsStats ? getRoleItems(bprsStats.roleData, 'Shop Team/ Group Leader') : [], 'bprs')}
            >
              <span className="dashboard-card-count">
                {formatCount(bprsStats ? getRoleCount(bprsStats.roleData, 'Shop Team/ Group Leader') : undefined)}
              </span>
              <span className="dashboard-card-title">Shop Team/ Group Leader</span>
            </div>

            <div
              className="dashboard-card"
              onClick={() => openRoleModal('Warehouse Team', bprsStats ? getRoleItems(bprsStats.roleData, 'Warehouse Team') : [], 'bprs')}
            >
              <span className="dashboard-card-count">
                {formatCount(bprsStats ? getRoleCount(bprsStats.roleData, 'Warehouse Team') : undefined)}
              </span>
              <span className="dashboard-card-title">Warehouse Team</span>
            </div>

          </div>

        </div>

      </div>

      {modalState && modalState.isOpen && (
        <div style={modalOverlayStyle} onClick={closeModal}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>{modalState.title}</h3>
              <button style={modalCloseButtonStyle} onClick={closeModal} aria-label="Close">
                X
              </button>
            </div>

            <div style={modalSearchWrapperStyle}>
              <div style={modalSearchIconWrapperStyle}>
                <span style={modalSearchIconStyle}>
                  <SearchIcon />
                </span>
                <input
                  type="text"
                  style={modalSearchInputStyle}
                  placeholder="Search for EWO.."
                  value={modalSearchText}
                  onChange={(e) => setModalSearchText(e.target.value)}
                />
              </div>
            </div>

            {filteredModalItems.length > 0 ? (
              <div style={modalListStyle}>
                {filteredModalItems.map((item, index) => (
                  <div
                    style={modalListItemStyle}
                    key={`${item.id}-${index}`}
                    onClick={() => handleRequestOpen(item, modalState.listType)}
                  >
                    <FolderIcon />
                    <span>{item.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={modalEmptyStateStyle}>No EWO records found.</div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default Home;