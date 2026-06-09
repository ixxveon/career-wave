import axiosInstance from '../../utils/axiosInstance';

interface SettlementParams {
  page?: number;
  size?: number;
  status?: string;
  [key: string]: unknown;
}

interface SettlementStatusData {
  status: string;
  [key: string]: unknown;
}

export const settlementApi = {
  getList: (params?: SettlementParams) =>
    axiosInstance.get('/api/v1/admin/settlements', { params }),
  getDetail: (id: number | string) =>
    axiosInstance.get(`/api/v1/admin/settlements/${id}`),
  updateStatus: (id: number | string, data: SettlementStatusData) =>
    axiosInstance.patch(`/api/v1/admin/settlements/${id}/status`, data),
};
