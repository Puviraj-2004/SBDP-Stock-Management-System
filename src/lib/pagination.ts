export const DEFAULT_PAGE_SIZE = 20;

export function parsePage(value: unknown) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function getPagination(page: number, pageSize = DEFAULT_PAGE_SIZE) {
  return {
    take: pageSize,
    skip: (page - 1) * pageSize
  };
}

export function getPageCount(total: number, pageSize = DEFAULT_PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / pageSize));
}
