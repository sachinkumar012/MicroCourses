import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../services/api";

const FeatureContext = createContext({});

export const useFeatures = () => {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error("useFeatures must be used within FeatureProvider");
  return ctx;
};

export const FeatureProvider = ({ children }) => {
  const [features, setFeatures] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get("/features");
        if (mounted) setFeatures(res.data || {});
      } catch (err) {
        console.error("Failed to load features", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <FeatureContext.Provider value={{ features, loading }}>
      {children}
    </FeatureContext.Provider>
  );
};
