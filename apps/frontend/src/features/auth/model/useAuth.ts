import { useReducer } from "react";
import { authReducer, initialState } from "@/features/auth/model/authReducer";
import * as AuthApi from "@/features/auth/api/auth.api";

export function useAuth() {
  const [state, dispatch] = useReducer(authReducer, initialState);

  async function login(username: string, password: string) {
    const { access_token } = await AuthApi.login(username, password);
    localStorage.setItem("access_token", access_token);

    const account = await AuthApi.fetchMe();
    dispatch({ type: "onLogin", payload: { token: access_token, account } });
    return account;
  }

  async function register(username: string, email: string, password: string, playerName?: string) {
    await AuthApi.register(username, email, password, playerName);
    return await login(username, password);
  }

  async function loadCurrentUser() {
    const token = localStorage.getItem("access_token");
    if (!token) {
      dispatch({ type: "onSetLoading", payload: false });
      return;
    }
    try {
      const account = await AuthApi.fetchMe();
      dispatch({ type: "onLogin", payload: { token, account } });
    } catch {
      localStorage.removeItem("access_token");
      dispatch({ type: "onSetLoading", payload: false });
    }
  }

  function logout() {
    localStorage.removeItem("access_token");
    dispatch({ type: "onLogout" });
  }

  return {
    state,
    actions: { login, logout, register, loadCurrentUser },
  };
}
