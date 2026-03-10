import axios from "axios";

export const api = axios.create({
  baseURL: "/api/agents",
  headers: { "Content-Type": "application/json" },
  timeout: 300000, // 5 minutes — branding agent calls Claude twice
});
