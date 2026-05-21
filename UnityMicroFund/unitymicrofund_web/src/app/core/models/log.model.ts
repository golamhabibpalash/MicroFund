export type LogLevel = 'Error' | 'Warning' | 'Info' | 'Debug' | 'Audit';

export interface LogEntry {
  logId: string;
  timestamp: string;
  logLevel: LogLevel;
  userId?: string;
  userEmail?: string;
  action: string;
  message: string;
  exception?: string;
  ipAddress?: string;
  userAgent?: string;
  module?: string;
  subModule?: string;
  correlationId?: string;
  additionalData?: string;
}

export interface LogFilter {
  fromDate?: string;
  toDate?: string;
  logLevel?: string;
  userId?: string;
  module?: string;
  subModule?: string;
  action?: string;
  search?: string;
  correlationId?: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortDescending: boolean;
}

export interface PagedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface LogStats {
  byLevel: Record<string, number>;
  byModule: Record<string, number>;
  totalCount: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  module?: string;
  description?: string;
  endpoint?: string;
  requestMethod?: string;
  responseStatusCode?: number;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  durationMs?: number;
}

export interface AuditLog {
  id: string;
  entityName: string;
  action: string;
  oldValues?: string;
  newValues?: string;
  description?: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  timestamp: string;
}
