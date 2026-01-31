import { publicEnv } from "@/env/public";
import axios from "axios";

export const api = axios.create({
  baseURL: publicEnv.NEXT_PUBLIC_API_URL + "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});
