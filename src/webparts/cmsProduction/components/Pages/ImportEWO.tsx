import * as React from 'react';
import '../CSS/ImportEWO.scss';
import type { ICmsProductionProps } from '../ICmsProductionProps';
import CMSMasterOps, { ICMSMasterItem } from '../../service/BAL/CMSMaster';

export interface IImportEWOProps extends ICmsProductionProps {
    onNavigate?: (pageKey: string) => void;
}

interface IColumn {
    key: string;
    label: string;
}

const COLUMNS: IColumn[] = [
    { key: 'ewoNumber', label: 'EWO Number' },
    { key: 'title', label: 'Title' },
    { key: 'requestor', label: 'Requestor' },
    { key: 'homeRoomEwo', label: 'Home Room EWO' },
    { key: 'coordinatedEwo', label: 'Coordinated EWO' },
    { key: 'status', label: 'Status' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'program', label: 'Program' }
];

const REQUIRED_HEADERS = COLUMNS.map((col) => col.label);

const DEFAULT_TODO_STATUS = [
    { status: 'Part Action', dt: '', per: 0, user: '' },
    { status: 'Part Readiness Date', dt: '', per: 0, user: '' },
    { status: 'Part Avaialability Date', dt: '', per: 0, user: '' },
    { status: 'PTR Details', dt: '', per: 0, user: '' },
    { status: 'Ordering cut-off Requirement', dt: '', per: 0, user: '' },
    { status: 'Ordering cut off Status Update', dt: '', per: 0, user: '' },
    { status: 'Pre-BP Requirement', dt: '', per: 0, user: '' },
    { status: 'Pre-BP Stock Update', dt: '', per: 0, user: '' },
    { status: 'Stock Update', dt: '', per: 0, user: '' },
    { status: 'Estimated BP Details', dt: '', per: 0, user: '' },
    { status: 'ECN Details', dt: '', per: 0, user: '' },
    { status: 'Backflushing Update', dt: '', per: 0, user: '' },
    { status: 'Post-BP Requirement', dt: '', per: 0, user: '' },
    { status: 'Post BP Stock Update', dt: '', per: 0, user: '' },
    { status: 'Inventory Adjustment Details', dt: '', per: 0, user: '' },
];

interface IPreviewRow {
    ewoNumber: string;
    title: string;
    requestor: string;
    homeRoomEwo: string;
    coordinatedEwo: string;
    status: string;
    supplier: string;
    program: string;
}

const pad2 = (value: number): string => (value < 10 ? `0${value}` : `${value}`);

const formatDateTime = (d: Date): string => {
    return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

const parseCsvLine = (line: string): string[] => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (inQuotes) {
            if (char === '"' && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = false;
            } else {
                current += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === ',') {
            cells.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    cells.push(current);
    return cells.map((c) => c.trim());
};

const parseCsvText = (text: string): Record<string, string>[] => {
    const cleanedText = text.replace(/^\uFEFF/, '');
    const lines = cleanedText.split(/\r\n|\n|\r/).filter((line) => line.trim() !== '');
    if (lines.length < 2) {
        return [];
    }
    const headers = parseCsvLine(lines[0]);
    return lines.slice(1).map((line) => {
        const cells = parseCsvLine(line);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => {
            row[h] = cells[idx] !== undefined ? cells[idx] : '';
        });
        return row;
    });
};

const dedupeStrings = (values: string[]): string[] => {
    const result: string[] = [];
    for (let i = 0; i < values.length; i++) {
        const value = values[i];
        if (value && result.indexOf(value) === -1) {
            result.push(value);
        }
    }
    return result;
};

// CSV export/template — kept consistent with the .csv file input this page
// actually accepts (the old .xls HTML-table trick produced a file the input
// couldn't even open, since it only accepts .csv).
const downloadCsv = (headers: string[], rows: string[][], fileName: string): void => {
    const escapeCell = (cell: string): string => `"${(cell || '').replace(/"/g, '""')}"`;
    const csvContent = [headers, ...rows]
        .map((r) => r.map(escapeCell).join(','))
        .join('\r\n');
    const blob = new Blob(['\ufeff', csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const ImportEWO: React.FC<IImportEWOProps> = (props) => {

    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const [rawItems, setRawItems] = React.useState<ICMSMasterItem[]>([]);
    const [isLoading, setIsLoading] = React.useState<boolean>(true);
    const [selectedFileName, setSelectedFileName] = React.useState<string>('');
    const [previewRows, setPreviewRows] = React.useState<IPreviewRow[]>([]);
    const [isImporting, setIsImporting] = React.useState<boolean>(false);
    const [importStatusVisible, setImportStatusVisible] = React.useState<boolean>(false);

    const loadData = React.useCallback(async (): Promise<void> => {
        setIsLoading(true);
        try {
            const cmsMasterOps = CMSMasterOps();
            const items: ICMSMasterItem[] = await cmsMasterOps.getCMSMasterData(
                '',
                { column: 'Id', isAscending: false },
                props,
            );
            setRawItems(items);
        } catch (error) {
            console.error('Error loading CMS data for EWO import:', error);
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

    const handleDownloadTemplate = (): void => {
        downloadCsv(REQUIRED_HEADERS, [], 'EWOImportTemplate');
    };

    const handleExportPreview = (): void => {
        const rows = previewRows.map((row) => COLUMNS.map((col) => (row as any)[col.key] || ''));
        downloadCsv(REQUIRED_HEADERS, rows, 'EWOImportPreview');
    };

    const handleChooseFile = (): void => {
        fileInputRef.current?.click();
    };

    const getCurrentUserDisplayName = (): string => {
        return (props as any).currentSPContext?.pageContext?.user?.displayName || 'System';
    };

    const isValidExcelUpload = (json: Record<string, string>[]): Record<string, string>[] | null => {
        const uploadedFileKeys = Object.keys(json[0]);

        for (const col of REQUIRED_HEADERS) {
            if (uploadedFileKeys.indexOf(col) === -1) {
                window.alert('Invalid excel template selected.\nCannot import the file!!');
                return null;
            }
        }

        const ewoNumbers = json.map((o) => o['EWO Number']);
        const uniqueEwoNumbers = dedupeStrings(ewoNumbers);

        if (uniqueEwoNumbers.length !== ewoNumbers.filter(Boolean).length) {
            window.alert('Duplicate EWO Found in your excel upload, File should have unique EWO number.\nCannot import the file!!');
            return null;
        }

        return json;
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const file = e.target.files && e.target.files[0];
        setImportStatusVisible(false);
        setPreviewRows([]);

        if (!file) {
            setSelectedFileName('');
            return;
        }

        setSelectedFileName(file.name);

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = (event.target?.result as string) || '';
            const json = parseCsvText(text);

            if (!json.length) {
                window.alert('The selected file has no data rows.');
                return;
            }

            const validated = isValidExcelUpload(json);
            if (!validated) {
                return;
            }

            const rows: IPreviewRow[] = [];
            validated.forEach((r) => {
                const ewono = (r['EWO Number'] || '').trim();
                if (ewono === '') {
                    return;
                }
                rows.push({
                    ewoNumber: ewono,
                    title: (r['Title'] || '').trim(),
                    requestor: (r['Requestor'] || '').trim(),
                    homeRoomEwo: (r['Home Room EWO'] || '').trim(),
                    coordinatedEwo: (r['Coordinated EWO'] || '').trim(),
                    status: (r['Status'] || '').trim(),
                    supplier: (r['Supplier'] || '').trim(),
                    program: (r['Program'] || '').trim(),
                });
            });

            setPreviewRows(rows);
        };
        reader.onerror = () => {
            window.alert('Unable to read the selected file.');
        };
        reader.readAsText(file);

        e.target.value = '';
    };

    const handleImport = async (): Promise<void> => {
        if (!previewRows.length) {
            window.alert('Please choose a file first.');
            return;
        }

        setIsImporting(true);
        const cmsMasterOps = CMSMasterOps();

        for (const row of previewRows) {
            const z = {
                title: row.title,
                initname: row.requestor,
                hrewo: row.homeRoomEwo,
                coewo: row.coordinatedEwo,
                status: row.status,
                supplier: row.supplier,
                program: row.program,
            };

            const existing = rawItems.filter((o) => o.Title === row.ewoNumber)[0];

            try {
                if (!existing) {
                    const summary = [{
                        c0: getCurrentUserDisplayName(),
                        c1: '',
                        c2: formatDateTime(new Date()),
                        c3: 'Request Created',
                        c4: 'Uploaded Data',
                    }];

                    await cmsMasterOps.createCMSMaster({
                        Title: row.ewoNumber,
                        EWODetails: JSON.stringify(z),
                        Summary: JSON.stringify(summary),
                        ToDoStatus: JSON.stringify(DEFAULT_TODO_STATUS),
                    }, props);
                } else {
                    await cmsMasterOps.updateCMSMaster(existing.Id as number, {
                        Title: row.ewoNumber,
                        EWODetails: JSON.stringify(z),
                    }, props);
                }
            } catch (error) {
                console.error(`Error importing EWO ${row.ewoNumber}:`, error);
            }
        }

        setIsImporting(false);
        setImportStatusVisible(true);
        await loadData();
    };

    return (
        <div className="import-ewo">

            <div className="import-header">
                <h2>IMPORT EWO</h2>
            </div>

            <div className="import-body">

                <div className="import-toolbar">

                    <div className="import-toolbar-left">

                        <input
                            type="file"
                            accept=".csv"
                            ref={fileInputRef}
                            onChange={handleFileSelected}
                            className="import-file-input-hidden"
                        />

                        <button type="button" className="import-btn import-btn-upload" onClick={handleChooseFile}>
                            <i className="fas fa-upload" />
                            {selectedFileName || 'EWO CSV File'}
                        </button>

                        <button
                            type="button"
                            className="import-btn import-btn-import"
                            onClick={handleImport}
                            disabled={isImporting || !previewRows.length}
                        >
                            <i className="fas fa-cloud-upload-alt" />
                            {isImporting ? 'Importing...' : 'Import'}
                        </button>

                        <button type="button" className="import-btn import-btn-download" onClick={handleDownloadTemplate}>
                            <i className="fas fa-download" />
                            Download Template
                        </button>

                        <button
                            type="button"
                            className="import-btn import-btn-download"
                            onClick={handleExportPreview}
                            disabled={!previewRows.length}
                        >
                            <i className="fas fa-file-excel" />
                            Excel
                        </button>

                    </div>

                </div>

                {importStatusVisible && (
                    <div className="import-status-msg">Data imported/updated successfully !!</div>
                )}

                <div className="import-table-wrapper">

                    <table className="import-table">

                        <thead>
                            <tr>
                                {COLUMNS.map(column => (
                                    <th key={column.key}>
                                        {column.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>

                            {isLoading ? (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="import-no-data">
                                        Loading...
                                    </td>
                                </tr>
                            ) : previewRows.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={COLUMNS.length}
                                        className="import-no-data"
                                    >
                                        No Records Found
                                    </td>
                                </tr>
                            ) : (
                                previewRows.map((row, idx) => (
                                    <tr key={`${row.ewoNumber}-${idx}`}>
                                        <td>{row.ewoNumber}</td>
                                        <td>{row.title}</td>
                                        <td>{row.requestor}</td>
                                        <td>{row.homeRoomEwo}</td>
                                        <td>{row.coordinatedEwo}</td>
                                        <td>{row.status}</td>
                                        <td>{row.supplier}</td>
                                        <td>{row.program}</td>
                                    </tr>
                                ))
                            )}

                        </tbody>

                    </table>

                </div>

            </div>

        </div>
    );
};

export default ImportEWO;