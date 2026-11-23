import axios from "axios";
//Local URL  http://localhost:5000/api
//Production URL https://sro-corelynxlogistics.vercel.app/api
const API = axios.create({
  baseURL: "https://sro-corelynxlogistics.vercel.app/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;