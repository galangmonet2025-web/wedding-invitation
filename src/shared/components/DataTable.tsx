import React from 'react';

export interface Column<T> {
    key: string;
    header: string;
    render?: (item: T) => React.ReactNode;
    sortable?: boolean;
    width?: string;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    loading?: boolean;
    emptyMessage?: string;
    onRowClick?: (item: T) => void;
    selectedIds?: string[];
    onSelectChange?: (ids: string[]) => void;
    idKey?: keyof T;
}

export function DataTable<T extends Record<string, any>>({
    columns,
    data,
    loading = false,
    emptyMessage = 'No data available',
    onRowClick,
    selectedIds = [],
    onSelectChange,
    idKey = 'id' as keyof T,
}: DataTableProps<T>) {
    const allSelected = data.length > 0 && data.every((item) => selectedIds.includes(String(item[idKey])));

    const handleSelectAll = () => {
        if (!onSelectChange) return;
        if (allSelected) {
            onSelectChange([]);
        } else {
            onSelectChange(data.map((item) => String(item[idKey])));
        }
    };

    const handleSelectRow = (id: string) => {
        if (!onSelectChange) return;
        if (selectedIds.includes(id)) {
            onSelectChange(selectedIds.filter((sid) => sid !== id));
        } else {
            onSelectChange([...selectedIds, id]);
        }
    };

    if (loading) {
        return (
            <div className="card p-0 overflow-hidden">
                <div className="animate-pulse">
                    <div className="h-12 bg-gray-100 dark:bg-gray-800" />
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-14 border-b border-gray-100 dark:border-gray-700 flex items-center px-6 gap-4">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/5" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="table-header">
                            {onSelectChange && (
                                <th className="px-6 py-4 text-left w-12">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 text-gold-500 border-gray-300 rounded focus:ring-gold-400 cursor-pointer"
                                    />
                                </th>
                            )}
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className="px-6 py-4 text-left"
                                    style={col.width ? { width: col.width } : undefined}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (onSelectChange ? 1 : 0)}
                                    className="px-6 py-16 text-center"
                                >
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                            <svg className="w-8 h-8 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-400 text-sm">{emptyMessage}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((item, index) => (
                                <tr
                                    key={String(item[idKey]) || index}
                                    className={`table-row ${onRowClick ? 'cursor-pointer' : ''} ${selectedIds.includes(String(item[idKey])) ? 'bg-gold-50/70 dark:bg-gold-900/10' : ''
                                        }`}
                                    onClick={() => onRowClick?.(item)}
                                >
                                    {onSelectChange && (
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(String(item[idKey]))}
                                                onChange={() => handleSelectRow(String(item[idKey]))}
                                                className="w-4 h-4 text-gold-500 border-gray-300 rounded focus:ring-gold-400 cursor-pointer"
                                            />
                                        </td>
                                    )}
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                                            {col.render ? col.render(item) : String(item[col.key] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
