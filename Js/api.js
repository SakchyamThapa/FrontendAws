import { getToken } from './sessionStorage.js';

const BASE_URL = "https://backendaws.onrender.com/api";

export const apiCall = async (endpoint, method = "GET", data = null) => {
  const token = getToken();

  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` })
    },
    body: data ? JSON.stringify(data) : null,
  });

  return res.json();
};
