export interface ApiResponse<TData> {
  success: boolean;
  statusCode: number;
  message: string;
  data: TData;
}

export interface PageResult<TItem> {
  content: TItem[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PagedResponse<TItem> {
  items: TItem[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export function mapPageResultToPagedResponse<TItem>(page: PageResult<TItem>): PagedResponse<TItem> {
  return {
    items: page.content,
    page: page.page,
    size: page.size,
    totalItems: page.totalElements,
    totalPages: page.totalPages,
  };
}

export function mapPagedResponseToPageResult<TItem>(page: PagedResponse<TItem>): PageResult<TItem> {
  return {
    content: page.items,
    page: page.page,
    size: page.size,
    totalElements: page.totalItems,
    totalPages: page.totalPages,
  };
}
