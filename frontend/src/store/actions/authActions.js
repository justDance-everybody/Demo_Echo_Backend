/**
 * 认证相关的Action Creators
 */

import { AUTH_ACTIONS } from '../reducers/authReducer';

// 登录相关actions
export const loginStart = () => ({
  type: AUTH_ACTIONS.LOGIN_START,
});

export const loginSuccess = (user, token) => ({
  type: AUTH_ACTIONS.LOGIN_SUCCESS,
  payload: { user, token },
});

export const loginFailure = (error) => ({
  type: AUTH_ACTIONS.LOGIN_FAILURE,
  payload: { error },
});

export const logout = () => ({
  type: AUTH_ACTIONS.LOGOUT,
});

export const clearError = () => ({
  type: AUTH_ACTIONS.CLEAR_ERROR,
});

export const updateUser = (user) => ({
  type: AUTH_ACTIONS.UPDATE_USER,
  payload: { user },
});

// 复合actions（异步操作）
export const performLogin = (credentials) => async (dispatch, getState, { authService }) => {
  try {
    dispatch(loginStart());
    const { user, token } = await authService.login(credentials);
    dispatch(loginSuccess(user, token));
    return { success: true, user, token };
  } catch (error) {
    dispatch(loginFailure(error.message));
    return { success: false, error: error.message };
  }
};

export const performLogout = () => async (dispatch, getState, { authService }) => {
  try {
    await authService.logout();
    dispatch(logout());
    return { success: true };
  } catch (error) {
    // 即使登出失败，也清除本地状态
    dispatch(logout());
    return { success: false, error: error.message };
  }
};

export const refreshToken = () => async (dispatch, getState, { authService }) => {
  try {
    const { token } = await authService.refreshToken();
    const state = getState();
    dispatch(loginSuccess(state.auth.user, token));
    return { success: true, token };
  } catch (error) {
    dispatch(logout());
    return { success: false, error: error.message };
  }
};