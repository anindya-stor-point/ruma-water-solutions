import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { safeStringify, safeError, getApiUrl } from "../firebase";
import WaterLoadingAnimation from "../components/WaterLoadingAnimation";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const code = searchParams.get("code");
    
    if (code) {
      // Send code to backend to exchange for token
      fetch(getApiUrl("/api/auth/google/callback"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: safeStringify({ code }),
      })
        .then((res) => res.json())
        .then(() => {
          // Notify parent window (if opened in popup)
          if (window.opener) {
            window.opener.postMessage({ type: "OAUTH_AUTH_SUCCESS" }, "*");
            window.close();
          } else {
            navigate("/");
          }
        })
        .catch((err) => {
          safeError("Auth error", err);
          if (window.opener) {
            window.close();
          } else {
            navigate("/");
          }
        });
    } else {
      // If no code, just close or redirect
      if (window.opener) {
        window.close();
      } else {
        navigate("/");
      }
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <WaterLoadingAnimation />
        <h2 className="text-2xl font-bold text-gray-900">Authenticating...</h2>
        <p className="text-gray-500 mt-2">Please wait while we securely log you in.</p>
      </div>
    </div>
  );
}
