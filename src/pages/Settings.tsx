import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { APP_VERSION } from "../constants";

export default function Settings() {
  const [tapCount, setTapCount] = useState(0);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleVersionTap = () => {
    if (user?.email !== "rumawatersolutions@gmail.com") return;
    
    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);
    if (newTapCount === 7) {
      setShowPasswordDialog(true);
      setTapCount(0);
    }
  };

  useEffect(() => {
    if (tapCount > 0) {
      const timer = setTimeout(() => setTapCount(0), 2000);
      return () => clearTimeout(timer);
    }
  }, [tapCount]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const response = await fetch("/api/admin-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (response.ok) {
      sessionStorage.setItem("admin_verified", "true");
      setSuccess("Successfully login");
      setTimeout(() => navigate("/admin"), 1000);
    } else {
      setError("Incorrect password");
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const response = await fetch("/api/admin-password/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    if (response.ok) {
      setSuccess("Password changed successfully");
      setShowChangePasswordDialog(false);
    } else {
      setError("Failed to change password");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white rounded-3xl shadow-sm border border-gray-100">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Settings</h1>
      <div className="flex justify-between items-center py-4 border-b border-gray-100">
        <span className="text-gray-600 font-medium">App Version</span>
        <span
          className="text-indigo-600 font-bold cursor-pointer"
          onClick={handleVersionTap}
        >
          {APP_VERSION}
        </span>
      </div>

      {error && <p className="text-red-500 mt-4 font-bold">{error}</p>}
      {success && <p className="text-green-500 mt-4 font-bold">{success}</p>}

      {showPasswordDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <form
            className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm"
          >
            <h2 className="text-xl font-bold mb-4">Enter Admin Password</h2>
            <div className="relative mb-4">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-xl pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowPasswordDialog(false);
                setShowChangePasswordDialog(true);
              }}
              className="text-indigo-600 font-bold mb-4 block"
            >
              Change Password
            </button>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handlePasswordSubmit}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => setShowPasswordDialog(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showChangePasswordDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleUpdatePassword}
            className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm"
          >
            <h2 className="text-xl font-bold mb-4">Change Admin Password</h2>
            <input
              type="password"
              placeholder="Old Password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl mb-4"
              required
            />
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl mb-4"
              required
            />
            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700"
              >
                Update
              </button>
              <button
                type="button"
                onClick={() => setShowChangePasswordDialog(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
