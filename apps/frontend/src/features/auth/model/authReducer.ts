import { Account } from "@/features/auth/model/types";
import { AuthActions } from "@/features/auth/model/authActions";

export interface AuthState {
  token: string | null;
  account: Account | null;
  isLoading: boolean;
}

export const initialState: AuthState = {
  token: null,
  account: null,
  isLoading: true,
};

export function authReducer(state: AuthState, action: AuthActions): AuthState {
  switch (action.type) {
    case "onLogin":
      return {
        ...state,
        token: action.payload.token,
        account: action.payload.account,
        isLoading: false,
      };
    case "onLogout":
      return {
        ...state,
        token: null,
        account: null,
        isLoading: false,
      };
    case "onLoadAccount":
      return {
        ...state,
        account: action.payload,
        isLoading: false,
      };
    case "onSetLoading":
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}
