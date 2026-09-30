import * as React from 'react';
import { useHistory } from 'react-router-dom';
import { Web } from '@pnp/sp/presets/all';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '../CSS/EWODetails.scss';
import type { ICmsProductionProps } from '../ICmsProductionProps';
import CMSMasterOps, { ICMSMasterItem } from '../../service/BAL/CMSMaster';

export interface IEWODetailsProps extends ICmsProductionProps {
  onNavigate?: (pageKey: string) => void;
}

interface IColumn {
  key: string;
  label: string;
  filterable: boolean;
}

const COLUMNS: IColumn[] = [
  { key: 'ewoNumber', label: 'EWO Number', filterable: true },
  { key: 'title', label: 'Title', filterable: true },
  { key: 'requestor', label: 'Requestor', filterable: true },
  { key: 'homeRoomEwo', label: 'Home Room EWO', filterable: true },
  { key: 'coordinatedEwo', label: 'Coordinated EWO', filterable: true },
  { key: 'status', label: 'Status', filterable: true },
  { key: 'supplier', label: 'Supplier', filterable: true },
  { key: 'program', label: 'Program', filterable: true },
  { key: 'partActionStatus', label: 'Part Action Status', filterable: true },
  { key: 'closeEwo', label: 'Close EWO', filterable: false },
  { key: 'changeStatus', label: 'Change Status', filterable: false }
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Show All EWOs' },
  { value: 'Pending Part Action Details', label: 'Pending Part Action Details' },
  { value: 'Pending for Part Readiness', label: 'Pending for Part Readiness' },
  { value: 'Pending for SCM Head Approval', label: 'Pending for SCM Head Approval' },
  { value: 'Implemented and Closed', label: 'Implemented and Closed' }
];

const ROWS_PER_PAGE = 10;

interface ISPEWOItem {
  Id: number;
  EWONo: string;
  Title: string;
  Initiator: { Title: string } | null;
  ParentWO: string;
  CoOrdinatEWO: string;
  Status: string;
  Supplier: string;
  ProgramType: string;
}

interface IRowData {
  id: number;
  ewoNumber: string;
  title: string;
  requestor: string;
  homeRoomEwo: string;
  coordinatedEwo: string;
  status: string;
  supplier: string;
  program: string;
  partActionStatus: string;
  closeEwo: boolean;
  changeStatus: boolean;
}

const parseJSON = (raw: any, fallback: any): any => {
  if (!raw) {
    return fallback;
  }
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    return fallback;
  }
};

const pad2 = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

const formatDateTime = (d: Date): string => {
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const EWO_SITE_URL = 'https://mgmotor.sharepoint.com/ewo';

const fetchAllEWOs = async (): Promise<ISPEWOItem[]> => {
  const web = Web(EWO_SITE_URL);

  let page: any = await web.lists
    .getByTitle('EWOList')
    .items.select('Id', 'EWONo', 'Title', 'Initiator/Title', 'ParentWO', 'CoOrdinatEWO', 'Status', 'Supplier', 'ProgramType')
    .expand('Initiator')
    .filter(`WOType eq 'EWO'`)
    .top(2000)
    .getPaged();

  let results: ISPEWOItem[] = page.results;

  while (page.hasNext) {
    page = await page.getNext();
    results = results.concat(page.results);
  }

  return results;
};

const statusColorClass = (status: string): string => {
  if (status === 'Pending Part Action Details') {
    return 'ewod-txt-light-gray';
  }
  if (status === 'Pending for Part Readiness') {
    return 'ewod-txt-yellow';
  }
  if (status === 'Pending for SCM Head Approval') {
    return 'ewod-txt-blue';
  }
  if (status === 'Implemented and Closed') {
    return 'ewod-txt-green';
  }
  return '';
};

const buildRows = (cmsItems: ICMSMasterItem[], ewoItems: ISPEWOItem[]): IRowData[] => {
  return cmsItems.map((item) => {
    const ewodetails = parseJSON((item as any).EWODetails, {});
    const matchedEwo = ewoItems.filter((o) => o.EWONo === item.Title)[0];

    const title = matchedEwo ? matchedEwo.Title : ewodetails.title || '';
    const requestor = matchedEwo ? (matchedEwo.Initiator ? matchedEwo.Initiator.Title : '') : ewodetails.initname || '';
    const homeRoomEwo = matchedEwo ? matchedEwo.ParentWO : ewodetails.hrewo || '';
    const coordinatedEwo = matchedEwo ? matchedEwo.CoOrdinatEWO : ewodetails.coewo || '';
    const status = matchedEwo ? matchedEwo.Status : ewodetails.status || '';
    const supplier = matchedEwo ? matchedEwo.Supplier : ewodetails.supplier || '';
    const program = matchedEwo ? matchedEwo.ProgramType : ewodetails.program || '';

    const partActionStatus = (item as any).Status || '';
    const closeEwo = partActionStatus === 'Pending Part Action Details';
    const changeStatus = !closeEwo && partActionStatus !== 'Implemented and Closed' && partActionStatus !== 'Closed';

    return {
      id: item.Id || 0,
      ewoNumber: item.Title || '',
      title,
      requestor,
      homeRoomEwo,
      coordinatedEwo,
      status,
      supplier,
      program,
      partActionStatus,
      closeEwo,
      changeStatus,
    };
  });
};

const buildEmptyFilters = (): Record<string, string> => {
  const map: Record<string, string> = {};
  COLUMNS.forEach((col) => {
    if (col.filterable) {
      map[col.key] = '';
    }
  });
  return map;
};

const EWODetails: React.FC<IEWODetailsProps> = (props) => {
  const history = useHistory();

  const [allRows, setAllRows] = React.useState<IRowData[]>([]);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [loadError, setLoadError] = React.useState<string>('');
  const [processingId, setProcessingId] = React.useState<number | null>(null);

  const [columnFilters, setColumnFilters] =
    React.useState<Record<string, string>>(buildEmptyFilters());
  const [currentPage, setCurrentPage] = React.useState<number>(1);

  const loadData = React.useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setLoadError('');
    try {
      const cmsMasterOps = CMSMasterOps();
      const [cmsItems, ewoItems] = await Promise.all([
        cmsMasterOps.getCMSMasterData('', { column: 'Id', isAscending: false }, props),
        fetchAllEWOs(),
      ]);
      setAllRows(buildRows(cmsItems, ewoItems));
    } catch (error) {
      console.error('Error loading EWO Details data:', error);
      setLoadError('Unable to load data. Please refresh the page.');
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
    return allRows.filter((row) => {
      for (const col of COLUMNS) {
        if (!col.filterable) {
          continue;
        }
        const filterValue = (columnFilters[col.key] || '').trim().toLowerCase();
        if (!filterValue) {
          continue;
        }
        const cellValue = ((row as any)[col.key] || '').toLowerCase();
        if (cellValue.indexOf(filterValue) === -1) {
          return false;
        }
      }

      return true;
    });
  }, [allRows, columnFilters]);

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const pagedRows = React.useMemo(() => {
    const start = (safePage - 1) * ROWS_PER_PAGE;
    return filteredRows.slice(start, start + ROWS_PER_PAGE);
  }, [filteredRows, safePage]);

  const handleColumnFilterChange = (key: string, value: string): void => {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    handleColumnFilterChange('partActionStatus', e.target.value);
  };

  const handleOpenForm = (rowId: number): void => {
    history.push(`/CMSRequestForm/${rowId}`);
  };

  const getCurrentUserDisplayName = (): string => {
    return (props as any).currentSPContext?.pageContext?.user?.displayName || 'System';
  };

  const handleCloseEwo = async (rowId: number): Promise<void> => {
    const confirmed = window.confirm('This will Mark EWO as closed.\nYou will not be able to change status back.');
    if (!confirmed) {
      return;
    }
    setProcessingId(rowId);
    try {
      const cmsMasterOps = CMSMasterOps();
      const item = await cmsMasterOps.getCMSMasterById(rowId, props);
      const summary = parseJSON(item ? (item as any).Summary : '', []);
      summary.push({
        c0: getCurrentUserDisplayName(),
        c1: '',
        c2: formatDateTime(new Date()),
        c3: 'Request Closed',
        c4: 'No Action Required',
      });

      await (cmsMasterOps as any).updateCMSMaster?.(rowId, {
        Status: 'Closed',
        Stage: 99,
        Summary: JSON.stringify(summary),
      }, props);

      await loadData();
    } catch (error) {
      console.error('Error closing EWO:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleEditStatus = async (rowId: number, currentStatus: string): Promise<void> => {
    const newStatus = window.prompt('Change EWO Status', currentStatus);
    if (newStatus === null || newStatus === currentStatus) {
      return;
    }
    setProcessingId(rowId);
    try {
      const cmsMasterOps = CMSMasterOps();
      const item = await cmsMasterOps.getCMSMasterById(rowId, props);
      const ewodetails = parseJSON(item ? (item as any).EWODetails : '', {});
      ewodetails.status = newStatus;

      await (cmsMasterOps as any).updateCMSMaster?.(rowId, {
        EWODetails: JSON.stringify(ewodetails),
      }, props);

      await loadData();
    } catch (error) {
      console.error('Error updating EWO status:', error);
    } finally {
      setProcessingId(null);
    }
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
      pages.push('...');
    }
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (safePage < totalPages - 2) {
      pages.push('...');
    }
    pages.push(totalPages);
    return pages;
  };

  const startEntry = totalRows === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1;
  const endEntry = Math.min(safePage * ROWS_PER_PAGE, totalRows);

  return (
    <div className="ewo-details">

      <div className="ewod-header-tab">
        <h2>EWO DETAILS</h2>
      </div>

      <div className="ewod-body">

        <div className="ewod-toolbar">
          <label className="ewod-status-filter">
            Filter by Status
            <select value={columnFilters.partActionStatus || ''} onChange={handleStatusFilterChange}>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isLoading && (
          <div className="ewod-loader-wrapper">
            <div className="ewod-loader">
              <span className="ewod-spinner" />
              <span>Loading data...</span>
            </div>
          </div>
        )}

        {!isLoading && loadError && (
          <div className="ewod-status-msg ewod-status-msg-error">{loadError}</div>
        )}

        {!isLoading && !loadError && (
          <>
            <div className="ewod-summary">
              Showing {startEntry} to {endEntry} of {totalRows} entries
            </div>

            <div className="ewod-table-wrapper">
              <table className="ewod-table">

                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        className={column.key === 'title' ? 'ewod-col-title' : ''}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="ewod-filter-row">
                    {COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        className={column.key === 'title' ? 'ewod-col-title' : ''}
                      >
                        {column.filterable && (
                          <input
                            type="text"
                            value={columnFilters[column.key] || ''}
                            onChange={(e) =>
                              handleColumnFilterChange(column.key, e.target.value)
                            }
                            placeholder="Search..."
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>

                  {pagedRows.length === 0 ? (
                    <tr>
                      <td
                        className="ewod-no-data"
                        colSpan={COLUMNS.length}
                      >
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((row) => (
                      <tr key={row.id}>
                        <td className="ewod-col-ewo">
                          <i
                            className="fas fa-folder-open ewod-file-icon"
                            onClick={() => handleOpenForm(row.id)}
                          />
                          {row.ewoNumber}
                        </td>
                        <td className="ewod-col-title">{row.title || '-'}</td>
                        <td>{row.requestor || '-'}</td>
                        <td>{row.homeRoomEwo || '-'}</td>
                        <td>{row.coordinatedEwo || '-'}</td>
                        <td>{row.status || '-'}</td>
                        <td>{row.supplier || '-'}</td>
                        <td>{row.program || '-'}</td>
                        <td>
                          <span className={`ewod-status-lbl ${statusColorClass(row.partActionStatus)}`}>
                            {row.partActionStatus || '-'}
                          </span>
                        </td>
                        <td>
                          {row.closeEwo && (
                            <button
                              type="button"
                              className="ewod-action-btn ewod-btn-close"
                              disabled={processingId === row.id}
                              onClick={() => handleCloseEwo(row.id)}
                            >
                              {processingId === row.id ? 'Please wait...' : 'Mark Close'}
                            </button>
                          )}
                        </td>
                        <td>
                          {row.changeStatus && (
                            <button
                              type="button"
                              className="ewod-action-btn ewod-btn-edit"
                              disabled={processingId === row.id}
                              onClick={() => handleEditStatus(row.id, row.status)}
                            >
                              {processingId === row.id ? 'Please wait...' : 'Edit Status'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}

                </tbody>

              </table>
            </div>

            <div className="ewod-pagination">
              <button
                type="button"
                className="ewod-page-btn"
                disabled={safePage === 1}
                onClick={() => goToPage(safePage - 1)}
              >
                Previous
              </button>

              {getPageNumbers().map((page, idx) =>
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="ewod-page-ellipsis">
                    ...
                  </span>     
                ) : (
                  <button
                    type="button"
                    key={page}
                    className={`ewod-page-btn ${page === safePage ? 'ewod-page-btn-active' : ''}`}
                    onClick={() => goToPage(page as number)}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                type="button"
                className="ewod-page-btn"
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

export default EWODetails;