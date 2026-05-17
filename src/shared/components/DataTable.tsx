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

    if (loading && data.length === 0) {
        return (
            <div className="space-y-4">
                {/* Desktop skeleton */}
                <div className="hidden md:block card p-0 overflow-hidden">
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
                {/* Mobile skeleton */}
                <div className="block md:hidden space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="card p-4 space-y-3 animate-pulse border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <div className="h-2 bg-gray-150 dark:bg-gray-700 rounded w-1/3" />
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                                </div>
                                <div className="space-y-1">
                                    <div className="h-2 bg-gray-150 dark:bg-gray-700 rounded w-1/3" />
                                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="card p-6 py-16 text-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-300 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                    </div>
                    <p className="text-gray-400 text-sm">{emptyMessage}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block card p-0 overflow-hidden">
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="table-header">
                                {onSelectChange && (
                                    <th className="px-3 py-3 sm:px-6 sm:py-4 text-left w-10 sm:w-12 shrink-0">
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
                                        className="px-3 py-3 sm:px-6 sm:py-4 text-left text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                                        style={col.width ? { width: col.width } : undefined}
                                    >
                                        {col.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((item, index) => (
                                <tr
                                    key={String(item[idKey]) || index}
                                    className={`table-row ${onRowClick ? 'cursor-pointer' : ''} ${selectedIds.includes(String(item[idKey])) ? 'bg-gold-50/70 dark:bg-gold-900/10' : ''
                                        }`}
                                    onClick={() => onRowClick?.(item)}
                                >
                                    {onSelectChange && (
                                        <td className="px-3 py-3 sm:px-6 sm:py-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(String(item[idKey]))}
                                                onChange={() => handleSelectRow(String(item[idKey]))}
                                                className="w-4 h-4 text-gold-500 border-gray-300 rounded focus:ring-gold-400 cursor-pointer"
                                            />
                                        </td>
                                    )}
                                    {columns.map((col) => (
                                        <td key={col.key} className="px-3 py-3 sm:px-6 sm:py-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300 max-w-[150px] sm:max-w-none truncate sm:whitespace-normal">
                                            {col.render ? col.render(item) : String(item[col.key] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile Cards List View */}
            <div className="block md:hidden space-y-2.5">
                {data.map((item, index) => {
                    const isSelected = selectedIds.includes(String(item[idKey]));
                    const actionColumn = columns.find((col) => col.key === 'actions');
                    const displayColumns = columns.filter((col) => col.key !== 'actions');
                    const primaryCol = displayColumns[0];
                    const otherCols = displayColumns.slice(1);

                    return (
                        <div
                            key={String(item[idKey]) || index}
                            className={`card p-2.5 space-y-1.5 relative transition-all duration-300 border ${
                                isSelected
                                    ? 'border-gold-400 bg-gold-50/10 dark:bg-gold-950/5 shadow-md shadow-gold-500/5'
                                    : 'border-gray-100 dark:border-gray-800'
                            }`}
                            onClick={() => onRowClick?.(item)}
                        >
                            {/* Header Row */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                    {onSelectChange && (
                                        <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleSelectRow(String(item[idKey]))}
                                                className="w-3.5 h-3.5 text-gold-500 border-gray-300 rounded focus:ring-gold-400 cursor-pointer"
                                            />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        {primaryCol && (
                                            <div className="text-[13px] font-bold text-gray-800 dark:text-white leading-tight">
                                                {primaryCol.render ? primaryCol.render(item) : String(item[primaryCol.key] ?? '')}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Actions Column in Header */}
                                {actionColumn && (
                                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        <div className="scale-90 origin-right flex gap-1">
                                            {actionColumn.render?.(item)}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-0.5">
                                {otherCols.map((col) => (
                                    <div key={col.key} className="space-y-0.5 min-w-0">
                                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider block">
                                            {col.header}
                                        </span>
                                        <div className="text-[10.5px] text-gray-700 dark:text-gray-350 break-words font-medium leading-tight">
                                            {col.render ? col.render(item) : String(item[col.key] ?? '')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
