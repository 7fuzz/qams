export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    totalPages: number;
    currentPage: number;
    pageSize: number;
}

export function createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
): PaginatedResponse<T> {
    return {
        data,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        pageSize: limit
    };
}
