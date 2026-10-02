import axios from "axios";

/**
 * One axios instance for the whole app.
 *
 * The original code repeated `axios.get("http://localhost:5000/users")` in
 * five files: a deployment to any host other than localhost was impossible
 * without editing source. Here the base URL is same-origin by default and can
 * be overridden at build time with VITE_API_URL.
 */
const baseURL = import.meta.env.VITE_API_URL ?? "";

export const api = axios.create({ baseURL, timeout: 15000 });

/** Turn an axios failure into a message worth showing a user. */
export function describeError(error) {
  const payload = error?.response?.data;
  if (payload?.details?.length) return `${payload.message}: ${payload.details.join("; ")}`;
  if (payload?.message) return payload.message;
  if (error?.code === "ECONNABORTED") return "The request timed out.";
  if (error?.request) return "Cannot reach the API. Is the backend running?";
  return error?.message ?? "Unknown error";
}

export const woods = {
  list: () => api.get("/api/woods").then((response) => response.data.data),
  create: (payload) => api.post("/api/woods", payload).then((response) => response.data.data),
  update: (id, payload) => api.patch(`/api/woods/${id}`, payload).then((response) => response.data.data),
  remove: (id) => api.delete(`/api/woods/${id}`),
};

export const ranking = {
  criteria: () => api.get("/api/ranking/criteria").then((response) => response.data.data),
  compute: () => api.get("/api/ranking").then((response) => response.data),
  preview: (criteria) =>
    api.post("/api/ranking/preview", { criteria }).then((response) => response.data),
};
