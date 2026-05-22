import axiosInstance from '../../utils/axiosInstance';

export const settlementApi = {
  getList: (params) => axiosInstance.get('/api/admin/settlements', { params }),
  getDetail: (id) => axiosInstance.get(`/api/admin/settlements/${id}`),
  updateStatus: (id, data) => axiosInstance.patch(`/api/admin/settlements/${id}/status`, data),
};
