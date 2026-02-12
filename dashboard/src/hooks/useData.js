import { useState, useEffect } from 'react';

export function useData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/data.json?t=' + new Date().getTime()); // Prevent caching
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
    fetchData();

    // Poll every 3 seconds
    const interval = setInterval(fetchData, 3000);

    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}
