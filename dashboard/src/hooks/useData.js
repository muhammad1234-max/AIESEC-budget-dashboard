import { useState, useEffect } from 'react';

function apiUrl(path) {
  const base = import.meta.env.VITE_API_BASE_URL ? String(import.meta.env.VITE_API_BASE_URL) : '';
  if (!base) return path;
  return base.replace(/\/$/, '') + path;
}

export function useData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const cacheBuster = new Date().getTime();

      const resApi = await fetch(apiUrl(`/api/data?t=${cacheBuster}`));
      if (resApi.ok) {
        const jsonData = await resApi.json();
        setData(jsonData);
        setLoading(false);
        setError(null);
        return;
      }

      const res = await fetch(`/data.json?t=${cacheBuster}`);
      const jsonData = await res.json();
      setData(jsonData);
      setLoading(false);
      setError(null);
    } catch (err) {
      console.error("Error loading data:", err);
      setError(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(fetchData, 0);

    // Poll every 3 seconds
    const interval = setInterval(fetchData, 3000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(interval);
    };
  }, []);

  return { data, loading, error };
}
