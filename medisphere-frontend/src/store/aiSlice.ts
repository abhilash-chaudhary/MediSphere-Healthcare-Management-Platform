import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PredictionResult {
  id: string;
  patientId: string;
  riskType: string;
  riskPercentage: number;
  riskLevel: string;
  confidence: number;
  predictionDate: string;
  modelVersion: string;
}

interface ExplanationResult {
  patientId: string;
  risk: string;
  topFactors: string[];
  factors: { name: string; contribution: number; description: string }[];
}

interface ModelVersion {
  id: string;
  version: string;
  accuracy: number;
  createdDate: string;
  status: string;
}

interface AIState {
  predictions: PredictionResult[];
  latestPrediction: PredictionResult | null;
  explanation: ExplanationResult | null;
  models: ModelVersion[];
  predictionLoading: boolean;
  explanationLoading: boolean;
  modelLoading: boolean;
}

const initialState: AIState = {
  predictions: [],
  latestPrediction: null,
  explanation: null,
  models: [],
  predictionLoading: false,
  explanationLoading: false,
  modelLoading: false,
};

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    setPredictions(state, action: PayloadAction<PredictionResult[]>) {
      state.predictions = action.payload;
    },
    setLatestPrediction(state, action: PayloadAction<PredictionResult | null>) {
      state.latestPrediction = action.payload;
    },
    setExplanation(state, action: PayloadAction<ExplanationResult | null>) {
      state.explanation = action.payload;
    },
    setModels(state, action: PayloadAction<ModelVersion[]>) {
      state.models = action.payload;
    },
    setPredictionLoading(state, action: PayloadAction<boolean>) {
      state.predictionLoading = action.payload;
    },
    setExplanationLoading(state, action: PayloadAction<boolean>) {
      state.explanationLoading = action.payload;
    },
    setModelLoading(state, action: PayloadAction<boolean>) {
      state.modelLoading = action.payload;
    },
  },
});

export const {
  setPredictions,
  setLatestPrediction,
  setExplanation,
  setModels,
  setPredictionLoading,
  setExplanationLoading,
  setModelLoading,
} = aiSlice.actions;

export default aiSlice.reducer;
