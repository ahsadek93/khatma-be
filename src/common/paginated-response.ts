export type Pagination = {
  currentPage: number;
  perPage: number;
  pages: number;
  from: number;
  to: number;
  total: number;
};

export function paginatedResponse<T>(
  data: T[],
  currentPage: number,
  perPage: number,
  total: number,
) {
  const from = data.length ? (currentPage - 1) * perPage + 1 : 0;
  return {
    data,
    pagination: {
      currentPage,
      perPage,
      pages: Math.ceil(total / perPage),
      from,
      to: data.length ? from + data.length - 1 : 0,
      total,
    },
  };
}
