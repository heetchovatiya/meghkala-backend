export * from './auth.types';

// Add any other custom types here
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  search?: string;
  category?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}