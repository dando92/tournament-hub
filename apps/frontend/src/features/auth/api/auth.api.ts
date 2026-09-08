import axios from "axios";
import { Account } from "@/features/auth/model/types";

export async function login(username: string, password: string): Promise<{ access_token: string }> {
  const response = await axios.post<{ access_token: string }>("auth/login", { username, password });
  return response.data;
}

export async function register(username: string, email: string, password: string, playerName?: string): Promise<Account> {
  const response = await axios.post<Account>("user", { username, email, password, playerName });
  return response.data;
}

export async function fetchMe(): Promise<Account> {
  const response = await axios.get<Account>("auth/me");
  return response.data;
}
