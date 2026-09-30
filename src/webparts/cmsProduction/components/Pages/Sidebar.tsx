import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { useHistory, useLocation } from 'react-router-dom';
import '../CSS/Sidebar.scss';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTachometerAlt,
  faFileAlt,
  faTasks,
  faTable,
  faCogs,
  faQuestionCircle,
  faInfoCircle,
  faUpload,
  faArchive,
  faUser,
  faUsers,
  faBars,
  faChevronUp,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import Logo from '../../assets/Images/MG_LOGO.png';
import SPCRUDOPS from '../../service/DAL/spcrudops';
import type { ICmsProductionProps } from '../ICmsProductionProps';

export interface ISidebarProps extends Partial<ICmsProductionProps> {
  onNavigate?: (pageKey: string) => void;
}

const DESKTOP_BREAKPOINT = 768;
const FLYOUT_MARGIN = 12;
const FLYOUT_CLOSE_DELAY = 150;

const PAGE_ROUTES: Record<string, string> = {
  'dashboard': '/',
  'reports-part-action-completed': '/PartActionCompleted',
  'request-ewo-information': '/EWODetails',
  'request-ewo-import': '/ImportEWO',
  'request-stock-update': '/StockUpdate',
  'reports-cms-ageing': '/CMSAgeingReport',
  'reports-bprs-ageing': '/BPRSAgeingReport',
  'help': '/Help',
  'app-settings-user-roles': '/UserRoles',
  'app-settings-assign-primary': '/AssignPrimary',
  'app-settings-cms-request': '/ChangeApproverCMS',
  'app-settings-bprs-request': '/ChangeApproverBPRS',
  'my-actions': '/MyActions',
  'reports-ewo-change-details': '/EWOChangeDetails',
  'reports-ewo-consolidated': '/EWOConsolidated',
  'reports-part-ewo-chronology': '/EWOChronology',
  'reports-part-availability': '/PartAvailability',
  'reports-data-management': '/DataManagement',
  'reports-pre-bp-tracker': '/PreBPTracker',
  'reports-post-bp-tracker': '/PostBPTracker',
};

const SP_LIST_PATHS: Record<string, string> = {
  'settings-cms-list': '/Lists/CMS_List/AllItems.aspx',
  'settings-bprs-list': '/Lists/BPRS_List/AllItems.aspx',
  'settings-parameters': '/Lists/Parameters/AllItems.aspx',
  'settings-acl': '/Lists/CMS_ACL/AllItems.aspx',
  'settings-site-content': '/_layouts/15/viewlsts.aspx',
};

const pageKeyToPath = (pageKey: string): string => PAGE_ROUTES[pageKey] || `/${pageKey}`;

const pathToPageKey = (pathname: string): string => {
  const match = Object.keys(PAGE_ROUTES).filter((key) => PAGE_ROUTES[key] === pathname)[0];
  if (match) {
    return match;
  }
  return pathname === '/' || pathname === '' ? 'dashboard' : pathname.replace(/^\//, '');
};

const buildSPListUrl = (webAbsoluteUrl: any, pageKey: string): string => {
  const relativePath = SP_LIST_PATHS[pageKey];
  if (!relativePath) {
    return '#';
  }
  if (!webAbsoluteUrl) {
    return relativePath;
  }
  const base = String(webAbsoluteUrl).replace(/\/+$/, '');
  return `${base}${relativePath}`;
};

interface IFlyoutPosition {
  top: number;
  left: number;
  maxHeight: number;
}

const DesktopFlyout: React.FC<{
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  className?: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}> = ({ isOpen, anchorRef, className, onMouseEnter, onMouseLeave, children }) => {
  const [position, setPosition] = React.useState<IFlyoutPosition | null>(null);

  const updatePosition = React.useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceAvailable = viewportHeight - FLYOUT_MARGIN * 2;
    const spaceBelow = viewportHeight - rect.top - FLYOUT_MARGIN;

    const maxHeight = Math.min(spaceAvailable, Math.max(spaceBelow, 200));
    let top = rect.top;

    if (top + maxHeight > viewportHeight - FLYOUT_MARGIN) {
      top = Math.max(FLYOUT_MARGIN, viewportHeight - FLYOUT_MARGIN - maxHeight);
    }

    setPosition({
      top,
      left: rect.right,
      maxHeight: Math.min(maxHeight, viewportHeight - top - FLYOUT_MARGIN),
    });
  }, [anchorRef]);

  React.useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return undefined;
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  if (!isOpen || !position) {
    return null;
  }

  return ReactDOM.createPortal(
    <div
      className={`sub-menu desktop-flyout ${className || ''}`}
      style={{ top: position.top, left: position.left, maxHeight: position.maxHeight }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>,
    document.body
  );
};

const Sidebar: React.FC<ISidebarProps> = (props: ISidebarProps) => {

  const { userDisplayName, webAbsoluteUrl, onNavigate } = props;

  const history = useHistory();
  const location = useLocation();

  const propsRef = React.useRef<ISidebarProps>(props);
  propsRef.current = props;

  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const activeTab = pathToPageKey(location.pathname);

  const [requestOpen, setRequestOpen] = React.useState(false);
  const [reportsOpen, setReportsOpen] = React.useState(false);
  const [appSettingsOpen, setAppSettingsOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  const [hoveredMenu, setHoveredMenu] = React.useState<string | null>(null);
  const closeTimerRef = React.useRef<number | null>(null);

  const requestTriggerRef = React.useRef<HTMLDivElement>(null);
  const reportsTriggerRef = React.useRef<HTMLDivElement>(null);
  const appSettingsTriggerRef = React.useRef<HTMLDivElement>(null);
  const settingsTriggerRef = React.useRef<HTMLDivElement>(null);

  const [AppAdmin, setAppAdmin] = React.useState(false);
  const [Admin, setAdmin] = React.useState(false);
  const [Editor, setEditor] = React.useState(false);

  const userEmail = (props.userEmail || '').toLowerCase();
  const employeeId = props.EmployeeId && props.EmployeeId.length > 0
    ? props.EmployeeId[0].EmployeeID
    : undefined;

  React.useEffect(() => {
    let cancelled = false;

    const loadAcl = async () => {
      try {
        const spCrudOps = await SPCRUDOPS();
        const aclItems = await spCrudOps.getData(
          'CMS_ACL',
          'ID,Title,Role,UserName/Title,UserName/EMail',
          'UserName',
          '',
          { column: 'ID', isAscending: true },
          propsRef.current as ICmsProductionProps
        );

        const myRows = aclItems.filter((item: any) =>
          (item.UserName?.EMail || '').toLowerCase() === userEmail
        );

        if (!cancelled) {
          setEditor(myRows.some((row: any) => row.Role === 'Editor'));
          setAdmin(myRows.some((row: any) => row.Title?.includes('SysAdmin')));
          setAppAdmin(myRows.some((row: any) => row.Title?.includes('AppAdmin')));
        }
      } catch (error) {
        console.error('Failed to load CMS_ACL', error);
        if (!cancelled) {
          setEditor(false);
          setAdmin(false);
          setAppAdmin(false);
        }
      }
    };

    if (userEmail) {
      loadAcl();
    }

    return () => {
      cancelled = true;
    };
  }, [userEmail, employeeId]);

  const requestHasActiveChild = activeTab.indexOf('request-') === 0;
  const reportsHasActiveChild = activeTab.indexOf('reports-') === 0;
  const appSettingsHasActiveChild = activeTab.indexOf('app-settings-') === 0;
  const settingsHasActiveChild = activeTab.indexOf('settings-') === 0;

  const isRequestExpanded = requestOpen || requestHasActiveChild || hoveredMenu === 'request';
  const isReportsExpanded = reportsOpen || reportsHasActiveChild || hoveredMenu === 'reports';
  const isAppSettingsExpanded = appSettingsOpen || appSettingsHasActiveChild || hoveredMenu === 'app-settings';
  const isSettingsExpanded = settingsOpen || settingsHasActiveChild || hoveredMenu === 'settings';

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openFlyout = (key: string) => {
    if (window.innerWidth <= DESKTOP_BREAKPOINT) {
      return;
    }
    clearCloseTimer();
    setHoveredMenu(key);
  };

  const scheduleCloseFlyout = () => {
    if (window.innerWidth <= DESKTOP_BREAKPOINT) {
      return;
    }
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setHoveredMenu(null);
    }, FLYOUT_CLOSE_DELAY);
  };

  React.useEffect(() => {
    return () => clearCloseTimer();
  }, []);

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleTabClick = (pageKey: string) => {
    history.push(pageKeyToPath(pageKey));

    if (pageKey.indexOf('request-') === 0) {
      setRequestOpen(true);
    }
    if (pageKey.indexOf('reports-') === 0) {
      setReportsOpen(true);
    }
    if (pageKey.indexOf('app-settings-') === 0) {
      setAppSettingsOpen(true);
    }
    if (pageKey.indexOf('settings-') === 0) {
      setSettingsOpen(true);
    }

    setHoveredMenu(null);
    closeSidebarOnMobile();
    if (onNavigate) {
      onNavigate(pageKey);
    }
  };

  const handleSPListClick = (e: React.MouseEvent<HTMLAnchorElement>, pageKey: string) => {
    e.preventDefault();
    e.stopPropagation();

    const url = buildSPListUrl(webAbsoluteUrl, pageKey);
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (newWindow) {
      newWindow.opener = null;
    }

    setSettingsOpen(true);
    setHoveredMenu(null);
    closeSidebarOnMobile();
    if (onNavigate) {
      onNavigate(pageKey);
    }
  };

  const toggleRequest = () => setRequestOpen(prev => !prev);
  const toggleReports = () => setReportsOpen(prev => !prev);
  const toggleAppSettings = () => setAppSettingsOpen(prev => !prev);
  const toggleSettings = () => setSettingsOpen(prev => !prev);

  const getActiveClass = (tabKey: string) => {
    return activeTab === tabKey ? 'active' : '';
  };

  const requestMenuContent = (
    <>
      <ul>
        <li>
          <a
            className={`nav-link ${getActiveClass('request-ewo-information')}`}
            onClick={() => handleTabClick('request-ewo-information')}
          >
            <FontAwesomeIcon icon={faInfoCircle} /> &nbsp;&nbsp; EWO Information
          </a>
        </li>
        <li>
          <a
            className={`nav-link ${getActiveClass('request-ewo-import')}`}
            onClick={() => handleTabClick('request-ewo-import')}
          >
            <FontAwesomeIcon icon={faUpload} /> &nbsp;&nbsp; EWO Import
          </a>
        </li>
      </ul>
      <div className="report-group-divider" />
      <ul>
        <li>
          <a
            className={`nav-link ${getActiveClass('request-stock-update')}`}
            onClick={() => handleTabClick('request-stock-update')}
          >
            <FontAwesomeIcon icon={faArchive} /> &nbsp;&nbsp; Stock Update
          </a>
        </li>
      </ul>
    </>
  );

  const reportsMenuContent = (
    <>
      <div className="report-group">
        <div className="report-group-title">Summary</div>
        <ul>
          <li>
            <a
              className={`nav-link ${getActiveClass('reports-part-action-completed')}`}
              onClick={() => handleTabClick('reports-part-action-completed')}
            >
              Part Action Completed
            </a>
          </li>
        </ul>
      </div>

      <div className="report-group-divider" />

      <div className="report-group">
        <div className="report-group-title">Ageing</div>
        <ul>
          <li>
            <a
              className={`nav-link ${getActiveClass('reports-cms-ageing')}`}
              onClick={() => handleTabClick('reports-cms-ageing')}
            >
              CMS Ageing
            </a>
          </li>
          <li>
            <a
              className={`nav-link ${getActiveClass('reports-bprs-ageing')}`}
              onClick={() => handleTabClick('reports-bprs-ageing')}
            >
              BPRS Ageing
            </a>
          </li>
        </ul>
      </div>

      <div className="report-group-divider" />

      <div className="report-group">
        <div className="report-group-title">Detail Reports</div>
        <ul>
          <li>
            <a
              className={`nav-link ${getActiveClass('reports-ewo-change-details')}`}
              onClick={() => handleTabClick('reports-ewo-change-details')}
            >
              EWO Change Details
            </a>
          </li>
          <li>
            <a
              className={`nav-link ${getActiveClass('reports-ewo-consolidated')}`}
              onClick={() => handleTabClick('reports-ewo-consolidated')}
            >
              EWO Consolidated
            </a>
          </li>
          <li>
            <a
              className={`nav-link ${getActiveClass('reports-part-ewo-chronology')}`}
              onClick={() => handleTabClick('reports-part-ewo-chronology')}
            >
              Part EWO Chronology
            </a>
          </li>
          <li>
            <a
              className={`nav-link ${getActiveClass('reports-part-availability')}`}
              onClick={() => handleTabClick('reports-part-availability')}
            >
              Part Availability
            </a>
          </li>
          <li>
            <a
              className={`nav-link ${getActiveClass('reports-data-management')}`}
              onClick={() => handleTabClick('reports-data-management')}
            >
              Data Management
            </a>
          </li>
          <li>
            <a
              className={`nav-link ${getActiveClass('reports-pre-bp-tracker')}`}
              onClick={() => handleTabClick('reports-pre-bp-tracker')}
            >
              Pre-BP Tracker
            </a>
          </li>
          <li>
            <a
              className={`nav-link ${getActiveClass('reports-post-bp-tracker')}`}
              onClick={() => handleTabClick('reports-post-bp-tracker')}
            >
              Post-BP Tracker
            </a>
          </li>
        </ul>
      </div>
    </>
  );

  const appSettingsMenuContent = (
    <>
      <div className="report-group">
        <div className="report-group-title">Manage Users</div>
        <ul>
          <li>
            <a
              className={`nav-link ${getActiveClass('app-settings-user-roles')}`}
              onClick={() => handleTabClick('app-settings-user-roles')}
            >
              <FontAwesomeIcon icon={faUser} /> &nbsp;&nbsp; User Roles
            </a>
          </li>
          <li>
            <a
              className={`nav-link ${getActiveClass('app-settings-assign-primary')}`}
              onClick={() => handleTabClick('app-settings-assign-primary')}
            >
              <FontAwesomeIcon icon={faUsers} /> &nbsp;&nbsp; Assign Primary
            </a>
          </li>
        </ul>
      </div>

      <div className="report-group-divider" />

      <div className="report-group">
        <div className="report-group-title">Approver Change</div>
        <ul>
          <li>
            <a
              className={`nav-link ${getActiveClass('app-settings-cms-request')}`}
              onClick={() => handleTabClick('app-settings-cms-request')}
            >
              CMS Request
            </a>
          </li>
          <li>
            <a
              className={`nav-link ${getActiveClass('app-settings-bprs-request')}`}
              onClick={() => handleTabClick('app-settings-bprs-request')}
            >
              BPRS Request
            </a>
          </li>
        </ul>
      </div>
    </>
  );

  const settingsMenuContent = (
    <>
      <div className="report-group">
        <div className="report-group-title">Application List</div>
        <ul>
          <li>
            <a
              className="nav-link"
              href={buildSPListUrl(webAbsoluteUrl, 'settings-cms-list')}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleSPListClick(e, 'settings-cms-list')}
            >
              CMS List
            </a>
          </li>
          <li>
            <a
              className="nav-link"
              href={buildSPListUrl(webAbsoluteUrl, 'settings-bprs-list')}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleSPListClick(e, 'settings-bprs-list')}
            >
              BPRS List
            </a>
          </li>
          <li>
            <a
              className="nav-link"
              href={buildSPListUrl(webAbsoluteUrl, 'settings-parameters')}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleSPListClick(e, 'settings-parameters')}
            >
              Parameters
            </a>
          </li>
          <li>
            <a
              className="nav-link"
              href={buildSPListUrl(webAbsoluteUrl, 'settings-acl')}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleSPListClick(e, 'settings-acl')}
            >
              ACL
            </a>
          </li>
        </ul>
      </div>

      <div className="report-group-divider" />

      <div className="report-group">
        <div className="report-group-title">System Setting</div>
        <ul>
          <li>
            <a
              className="nav-link"
              href={buildSPListUrl(webAbsoluteUrl, 'settings-site-content')}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => handleSPListClick(e, 'settings-site-content')}
            >
              Site Content
            </a>
          </li>
        </ul>
      </div>
    </>
  );

  return (
    <>
      <button
        className="mobile-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <FontAwesomeIcon icon={faBars} />
      </button>

      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>

        <div className="sidehead">
          <img src={Logo} alt="MG Motor Logo" />
          <h2 className="logo">JSW MGI</h2>
        </div>

        <div className="sidehead-user">
          <FontAwesomeIcon icon={faUser} style={{ marginLeft: '20px' }} />
          &nbsp;
          {userDisplayName}
        </div>

        <ul className="nav">

          <li className="nav-item">
            <a
              className={`nav-link ${getActiveClass('dashboard')}`}
              onClick={() => handleTabClick('dashboard')}
            >
              <FontAwesomeIcon icon={faTachometerAlt} /> &nbsp;&nbsp; Dashboard
            </a>
          </li>

          {Editor && (
            <li
              className={`nav-item has-submenu ${requestHasActiveChild ? 'active' : ''}`}
              onMouseEnter={() => openFlyout('request')}
              onMouseLeave={scheduleCloseFlyout}
            >
              <div
                ref={requestTriggerRef}
                className={`nav-link submenu-title ${requestHasActiveChild ? 'active' : ''}`}
                onClick={toggleRequest}
              >
                <span>
                  <FontAwesomeIcon icon={faFileAlt} /> &nbsp;&nbsp; Request
                </span>
                <FontAwesomeIcon icon={isRequestExpanded ? faChevronUp : faChevronDown} />
              </div>

              <div className={`sub-menu mobile-submenu ${isRequestExpanded ? 'show' : ''}`}>
                {requestMenuContent}
              </div>

              <DesktopFlyout
                isOpen={hoveredMenu === 'request'}
                anchorRef={requestTriggerRef}
                onMouseEnter={() => openFlyout('request')}
                onMouseLeave={scheduleCloseFlyout}
              >
                {requestMenuContent}
              </DesktopFlyout>
            </li>
          )}

          <li className="nav-item">
            <a
              className={`nav-link ${getActiveClass('my-actions')}`}
              onClick={() => handleTabClick('my-actions')}
            >
              <FontAwesomeIcon icon={faTasks} /> &nbsp;&nbsp; My Actions
            </a>
          </li>

          <li
            className={`nav-item has-submenu ${reportsHasActiveChild ? 'active' : ''}`}
            onMouseEnter={() => openFlyout('reports')}
            onMouseLeave={scheduleCloseFlyout}
          >
            <div
              ref={reportsTriggerRef}
              className={`nav-link submenu-title ${reportsHasActiveChild ? 'active' : ''}`}
              onClick={toggleReports}
            >
              <span>
                <FontAwesomeIcon icon={faTable} /> &nbsp;&nbsp; Reports
              </span>
              <FontAwesomeIcon icon={isReportsExpanded ? faChevronUp : faChevronDown} />
            </div>

            <div className={`sub-menu reports-menu mobile-submenu ${isReportsExpanded ? 'show' : ''}`}>
              {reportsMenuContent}
            </div>

            <DesktopFlyout
              isOpen={hoveredMenu === 'reports'}
              anchorRef={reportsTriggerRef}
              className="reports-menu"
              onMouseEnter={() => openFlyout('reports')}
              onMouseLeave={scheduleCloseFlyout}
            >
              {reportsMenuContent}
            </DesktopFlyout>
          </li>

          {AppAdmin && (
            <li
              className={`nav-item has-submenu ${appSettingsHasActiveChild ? 'active' : ''}`}
              onMouseEnter={() => openFlyout('app-settings')}
              onMouseLeave={scheduleCloseFlyout}
            >
              <div
                ref={appSettingsTriggerRef}
                className={`nav-link submenu-title ${appSettingsHasActiveChild ? 'active' : ''}`}
                onClick={toggleAppSettings}
              >
                <span>
                  <FontAwesomeIcon icon={faCogs} /> &nbsp;&nbsp; App Settings
                </span>
                <FontAwesomeIcon icon={isAppSettingsExpanded ? faChevronUp : faChevronDown} />
              </div>

              <div className={`sub-menu reports-menu mobile-submenu ${isAppSettingsExpanded ? 'show' : ''}`}>
                {appSettingsMenuContent}
              </div>

              <DesktopFlyout
                isOpen={hoveredMenu === 'app-settings'}
                anchorRef={appSettingsTriggerRef}
                className="reports-menu"
                onMouseEnter={() => openFlyout('app-settings')}
                onMouseLeave={scheduleCloseFlyout}
              >
                {appSettingsMenuContent}
              </DesktopFlyout>
            </li>
          )}

          {Admin && (
            <li
              className={`nav-item has-submenu ${settingsHasActiveChild ? 'active' : ''}`}
              onMouseEnter={() => openFlyout('settings')}
              onMouseLeave={scheduleCloseFlyout}
            >
              <div
                ref={settingsTriggerRef}
                className={`nav-link submenu-title ${settingsHasActiveChild ? 'active' : ''}`}
                onClick={toggleSettings}
              >
                <span>
                  <FontAwesomeIcon icon={faCogs} /> &nbsp;&nbsp; Settings
                </span>
                <FontAwesomeIcon icon={isSettingsExpanded ? faChevronUp : faChevronDown} />
              </div>

              <div className={`sub-menu reports-menu mobile-submenu ${isSettingsExpanded ? 'show' : ''}`}>
                {settingsMenuContent}
              </div>

              <DesktopFlyout
                isOpen={hoveredMenu === 'settings'}
                anchorRef={settingsTriggerRef}
                className="reports-menu"
                onMouseEnter={() => openFlyout('settings')}
                onMouseLeave={scheduleCloseFlyout}
              >
                {settingsMenuContent}
              </DesktopFlyout>
            </li>
          )}

          <li className="nav-item">
            <a
              className={`nav-link ${getActiveClass('help')}`}
              onClick={() => handleTabClick('help')}
            >
              <FontAwesomeIcon icon={faQuestionCircle} /> &nbsp;&nbsp; Help
            </a>
          </li>

        </ul>

      </div>
    </>
  );
};

export default Sidebar;