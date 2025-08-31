"use client";
import React, { useState, useEffect } from "react";

import GameWeekSummaryStepByStep from "./admin/GameWeekSummaryStepByStep";
// import RevnetSplitHookForm from "./admin/RevnetSplitHookForm";
import RevnetSetHookForm from "./admin/RevnetSetHookForm";
import RevnetInspector from "./admin/RevnetInspector";

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState("gameWeekCasts");
  const [authenticated, setAuthenticated] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const tabs = [
    { id: "gameWeekCasts", label: "Game Week Casts", icon: "🏆" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "teams", label: "Teams", icon: "⚽" },
    { id: "leagues", label: "Leagues", icon: "🏅" },
    { id: "matchRooms", label: "Match Rooms", icon: "💬" },
    { id: "revnet", label: "Revnet", icon: "🛠️" },
  ];

  // Auto-authenticate if stored key matches current env key
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('footy_admin_passkey');
        if (stored && stored === process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
          setAuthenticated(true);
          return;
        }
      }
    } catch {}
  }, []);

  const handleAuthenticate = () => {
    if (apiKeyInput === process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
      setAuthenticated(true);
      try {
        if (rememberMe && typeof window !== 'undefined') {
          localStorage.setItem('footy_admin_passkey', apiKeyInput);
        }
      } catch {}
    } else {
      alert("Invalid Pass key");
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    setApiKeyInput("");
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('footy_admin_passkey');
      }
    } catch {}
  };

  // Show authentication screen if not authenticated
  if (!authenticated) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-purplePanel rounded-lg border border-limeGreenOpacity">
          <h1 className="text-xl font-bold text-notWhite mb-2">Footy App Admin Dashboard</h1>
          <p className="text-sm text-lightPurple mb-4">
            Two-factor authentication required: FID + Password
          </p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-lightPurple mb-2">
                Admin Pass Key
              </label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Enter admin pass key"
                className="w-full p-3 bg-darkPurple border border-limeGreenOpacity rounded-lg text-lightPurple focus:border-deepPink focus:outline-none"
              />
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="rememberMe" className="text-sm text-lightPurple">
                Remember me (stores in browser)
              </label>
            </div>
            
            <button
              onClick={handleAuthenticate}
              className="w-full px-4 py-3 bg-deepPink text-white rounded-lg hover:bg-fontRed font-semibold"
            >
              Authenticate
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 bg-purplePanel rounded-lg border border-limeGreenOpacity">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-notWhite mb-2">Footy App Admin Dashboard</h1>
            <p className="text-sm text-lightPurple">
              Miniapp Admin Panel - Authenticated ✅
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-limeGreenOpacity">
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-deepPink text-deepPink"
                  : "border-transparent text-lightPurple hover:text-notWhite hover:border-limeGreenOpacity"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-purplePanel rounded-xl shadow-lg p-6 border border-limeGreenOpacity">
        {activeTab === "gameWeekCasts" && (
          <GameWeekSummaryStepByStep />
        )}

        {activeTab === "notifications" && (
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-notWhite mb-4">Notifications</h3>
            <p className="text-lightPurple">
              Use the standalone admin panel at /admin for full notification management.
            </p>
            <button
              onClick={() => window.open('/admin', '_blank')}
              className="mt-4 px-4 py-2 bg-deepPink text-white rounded-lg hover:bg-fontRed"
            >
              Open Full Admin Panel
            </button>
          </div>
        )}

        {activeTab === "teams" && (
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-notWhite mb-4">Teams Management</h3>
            <p className="text-lightPurple">
              Use the standalone admin panel at /admin for full teams management.
            </p>
            <button
              onClick={() => window.open('/admin', '_blank')}
              className="mt-4 px-4 py-2 bg-deepPink text-white rounded-lg hover:bg-fontRed"
            >
              Open Full Admin Panel
            </button>
          </div>
        )}

        {activeTab === "leagues" && (
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-notWhite mb-4">Leagues Management</h3>
            <p className="text-lightPurple">
              Use the standalone admin panel at /admin for full leagues management.
            </p>
            <button
              onClick={() => window.open('/admin', '_blank')}
              className="mt-4 px-4 py-2 bg-deepPink text-white rounded-lg hover:bg-fontRed"
            >
              Open Full Admin Panel
            </button>
          </div>
        )}

        {activeTab === "matchRooms" && (
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-notWhite mb-4">Match Rooms</h3>
            <p className="text-lightPurple">
              Use the standalone admin panel at /admin for full match rooms management.
            </p>
            <button
              onClick={() => window.open('/admin', '_blank')}
              className="mt-4 px-4 py-2 bg-deepPink text-white rounded-lg hover:bg-fontRed"
            >
              Open Full Admin Panel
            </button>
          </div>
        )}

        {activeTab === "revnet" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-notWhite mb-2">Revnet Utilities</h3>
              <p className="text-sm text-lightPurple">
                Create a Juicebox Split Hook and set a destination address as a split. Requires admin API key. See docs: split hooks &amp; splits.
              </p>
            </div>
            <div className="p-4 rounded border border-limeGreenOpacity bg-gray-900/40">
              <h4 className="text-notWhite font-semibold mb-2">Project & Token Inspector</h4>
              <p className="text-xs text-gray-400 mb-3">Quickly view current/upcoming ruleset IDs and ERC‑20 token metadata.</p>
              <RevnetInspector />
            </div>
            <RevnetSetHookForm />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
