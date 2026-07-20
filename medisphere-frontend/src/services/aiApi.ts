import api from './api';

// ===========================
// AI Prediction Service APIs
// ===========================

export const predictCVD = (data: any) =>
  api.post('/api/prediction/cvd', data);

export const predictDiabetes = (data: any) =>
  api.post('/api/prediction/diabetes', data);

export const getPredictionHistory = (patientId: string) =>
  api.get(`/api/prediction/history/${patientId}`);

export const getLatestPrediction = (patientId: string) =>
  api.get(`/api/prediction/latest/${patientId}`);

export const deletePrediction = (id: string) =>
  api.delete(`/api/prediction/${id}`);

export const getPredictionAccuracy = () =>
  api.get('/api/prediction/accuracy');

export const getPredictionCalibration = () =>
  api.get('/api/prediction/calibration');

export const getBiasAudit = () =>
  api.get('/api/prediction/bias-audit');

// ===========================
// Explainability Service APIs
// ===========================

export const generateExplanation = (patientId: string, data: any) =>
  api.post(`/api/explanation/${patientId}`, data);

export const getExplanation = (patientId: string) =>
  api.get(`/api/explanation/${patientId}`);

export const validateExplanation = () =>
  api.get('/api/explanation/validate');

// ===========================
// Model Management APIs
// ===========================

export const createModel = (data: any) =>
  api.post('/api/model', data);

export const getAllModels = () =>
  api.get('/api/model');

export const getLatestModel = () =>
  api.get('/api/model/latest');

export const updateModel = (version: string, data: any) =>
  api.put(`/api/model/${version}`, data);

export const deleteModel = (version: string) =>
  api.delete(`/api/model/${version}`);

export const getModelStatus = () =>
  api.get('/api/model/status');
