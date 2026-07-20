import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface User {
  username: string;
  email: string;
  roles: string[];
}

interface AuthState {
  token: string;
  user: User | null;
  otpRequired: boolean;
  otpEmail: string;
  otpUsername: string;
  authError: string;
  authSuccess: string;
}

const initialState: AuthState = {
  token: localStorage.getItem('token') || '',
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  otpRequired: false,
  otpEmail: '',
  otpUsername: '',
  authError: '',
  authSuccess: '',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthSuccessMsg(state, action: PayloadAction<string>) {
      state.authSuccess = action.payload;
      state.authError = '';
    },
    setAuthErrorMsg(state, action: PayloadAction<string>) {
      state.authError = action.payload;
      state.authSuccess = '';
    },
    setOtpRequiredState(state, action: PayloadAction<{ email: string; username: string }>) {
      state.otpRequired = true;
      state.otpEmail = action.payload.email;
      state.otpUsername = action.payload.username;
      state.authError = '';
    },
    clearOtpState(state) {
      state.otpRequired = false;
      state.otpEmail = '';
      state.otpUsername = '';
    },
    loginSuccess(state, action: PayloadAction<{ token: string; user: User }>) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.otpRequired = false;
      state.authError = '';
      state.authSuccess = '';
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    logout(state) {
      state.token = '';
      state.user = null;
      state.otpRequired = false;
      state.authError = '';
      state.authSuccess = '';
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    clearMessages(state) {
      state.authError = '';
      state.authSuccess = '';
    }
  },
});

export const {
  setAuthSuccessMsg,
  setAuthErrorMsg,
  setOtpRequiredState,
  clearOtpState,
  loginSuccess,
  logout,
  clearMessages
} = authSlice.actions;

export default authSlice.reducer;
