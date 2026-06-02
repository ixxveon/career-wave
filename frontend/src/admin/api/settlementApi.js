import axiosInstance from '../../utils/axiosInstance';

export const settlementApi = {
  getList: (params) => axiosInstance.get('/api/v1/admin/settlements', { params }),
  getDetail: (id) => axiosInstance.get(`/api/v1/admin/settlements/${id}`),
  updateStatus: (id, data) => axiosInstance.patch(`/api/v1/admin/settlements/${id}/status`, data),
};
