import { Account } from "@/features/auth/model/types";

export type onLogin = {
  type: "onLogin";
  payload: { token: string; account: Account };
};

export type onLogout = {
  type: "onLogout";
};

export type onLoadAccount = {
  type: "onLoadAccount";
  payload: Account;
};

export type onSetLoading = {
  type: "onSetLoading";
  payload: boolean;
};

export type AuthActions = onLogin | onLogout | onLoadAccount | onSetLoading;
