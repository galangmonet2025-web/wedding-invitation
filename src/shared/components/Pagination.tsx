interface PaginationProps {
    page: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    total: number;
    limit: number;
}

export function Pagination({ page, totalPages, onPageChange, total, limit }: PaginationProps) {
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
        pages.push(1);
        if (page > 3) pages.push('...');
        for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
            pages.push(i);
        }
        if (page < totalPages - 2) pages.push('...');
        pages.push(totalPages);
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing <span className="font-medium text-gray-700 dark:text-gray-200">{start}</span> to{' '}
                <span className="font-medium text-gray-700 dark:text-gray-200">{end}</span> of{' '}
                <span className="font-medium text-gray-700 dark:text-gray-200">{total}</span> results
            </p>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Previous
                </button>
                {pages.map((p, i) =>
                    typeof p === 'string' ? (
                        <span key={`dots-${i}`} className="px-2 text-gray-400">
                            ...
                        </span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => onPageChange(p)}
                            className={`w-9 h-9 text-sm rounded-lg font-medium transition-all duration-200 ${page === p
                                    ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-white shadow-gold'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
                                }`}
                        >
                            {p}
                        </button>
                    )
                )}
                <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page === totalPages}
                    className="px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    Next
                </button>
            </div>
        </div>
    );
}
