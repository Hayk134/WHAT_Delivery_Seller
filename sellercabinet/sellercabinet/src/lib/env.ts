const fallbackBaseUrl = "http://100.73.27.125:8989";

export const env = {
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL?.toString().replace(/\/$/, "") ??
    fallbackBaseUrl,
};

export function getWsBaseUrl() {
  return env.apiBaseUrl.replace(/^http/i, "ws");
}
