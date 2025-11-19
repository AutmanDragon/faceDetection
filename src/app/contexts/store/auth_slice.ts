import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// 1. สร้าง Interface สำหรับ User ให้ชัดเจน
interface User {
  id: string;
  name: string;
  email: string;
  isTeacher: boolean;
}

// 2. อัปเดต State ให้มี token ด้วย
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 3. แก้ไข PayloadAction ให้รับ object ที่มี user และ token
    login: (state, action: PayloadAction<{ user: User, token: string }>) => {
      state.isAuthenticated = true;
      // 4. ดึงข้อมูลจาก action.payload.user และ action.payload.token
      state.user = action.payload.user;
      state.token = action.payload.token;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.token = null;
    },
  },
});

export const { login, logout } = authSlice.actions;
export default authSlice.reducer;

