/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Redis } from "@upstash/redis";
import { useEffect, useState } from "react";

const redis = new Redis({
  url: process.env.NEXT_PUBLIC_KV_REST_API_URL,
  token: process.env.NEXT_PUBLIC_KV_REST_API_TOKEN,
});

export default function AdminPage() {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("matches");
  const [adminOnly, setAdminOnly] = useState(false);
  const [responseMessage, setResponseMessage] = useState("");
  const [totalNumberOfUsers, setTotalNumberOfUsers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [customTargetUrl, setCustomTargetUrl] = useState(""); // New state for custom target URL
  const [useCustomUrl, setUseCustomUrl] = useState(false); // Toggle for custom URL

  const categories = [
    { value: "matches", label: "Matches" },
    { value: "contests", label: "Contests" },
    { value: "rewards", label: "Rewards" },
    { value: "moneyGames", label: "Money Games" },
    { value: "forYou", label: "For You" },
    { value: "scoutPlayers", label: "Scout Players" },
    { value: "extraTime", label: "Extra Time" },
    { value: "settings", label: "Settings" },
  ];

  async function getTotalNumberOfUsers(): Promise<number> {
    const keys = await redis.keys("fc-footy:user:*");
    return keys.length;
  }

  const fetchTotalNumberOfUsers = async () => {
    const totalNumber = await getTotalNumberOfUsers();
    setTotalNumberOfUsers(totalNumber);
  };

  useEffect(() => {
    fetchTotalNumberOfUsers();
  }, []);

  const handleAuthenticate = () => {
    if (apiKeyInput === process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY) {
      setAuthenticated(true);
    } else {
      alert("Invalid Pass key");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponseMessage("");
    setLoading(true);
    
    // Determine which URL to use - custom or generated from category
    const targetURL = useCustomUrl && customTargetUrl 
      ? customTargetUrl 
      : `${process.env.NEXT_PUBLIC_URL}?tab=${category}`;
    
    try {
      const response = await fetch("/api/notify-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.NEXT_PUBLIC_NOTIFICATION_API_KEY || "",
        },
        body: JSON.stringify({ 
          title, 
          body,
          targetURL,
          adminOnly
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResponseMessage(`Notification sent successfully to ${data.sentTo}! (${data.totalSent} users)`);
        setTitle("");
        setBody("");
        setCategory("matches");
        setAdminOnly(false);
        setCustomTargetUrl(""); // Reset custom URL on success
        setUseCustomUrl(false); // Reset toggle
      } else {
        const errorData = await response.json();
        setResponseMessage(`Error: ${errorData.error || "Failed to send notification"}`);
      }
    } catch (error: any) {
      setResponseMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
            Admin Login
          </h2>
          <input
            type="password"
            placeholder="Enter Pass Key"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-deepPink transition-all duration-200"
          />
          <button
            onClick={handleAuthenticate}
            className="w-full mt-6 bg-deepPink text-white p-3 rounded-lg hover:bg-darkPurple transform transition-all duration-200 hover:scale-105"
          >
            Authenticate
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-8 transform transition-all duration-300">
        <div className="mb-6 p-4 bg-blue-50 rounded-lg shadow-inner">
          <h3 className="text-lg font-semibold text-gray-800">Dashboard Analytics</h3>
          <p className="mt-2 text-sm text-gray-600">
            Total Number of Users: <span className="font-medium">{totalNumberOfUsers}</span>
          </p>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 text-center mb-6">
          Send Notification
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Notification Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full p-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-deepPink focus:bg-gray-50 transition-all duration-200"
            />
          </div>
          <div>
            <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
              Notification Body
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={4}
              className="w-full p-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-deepPink focus:bg-gray-50 transition-all duration-200"
            />
          </div>
          
          {/* Custom URL Toggle */}
          <div className="flex items-center space-x-3">
            <label htmlFor="useCustomUrl" className="text-sm font-medium text-gray-700">
              Use Custom Target URL
            </label>
            <input
              id="useCustomUrl"
              type="checkbox"
              checked={useCustomUrl}
              onChange={(e) => setUseCustomUrl(e.target.checked)}
              className="h-5 w-5 text-deepPink focus:ring-deepPink border-gray-300 rounded"
            />
          </div>
          
          {/* Custom URL Input (shown only when toggle is on) */}
          {useCustomUrl && (
            <div>
              <label htmlFor="customTargetUrl" className="block text-sm font-medium text-gray-700 mb-1">
                Custom Target URL
              </label>
              <input
                id="customTargetUrl"
                type="url"
                value={customTargetUrl}
                onChange={(e) => setCustomTargetUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full p-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-deepPink focus:bg-gray-50 transition-all duration-200"
              />
            </div>
          )}
          
          {/* Category Selector (shown only when not using custom URL) */}
          {!useCustomUrl && (
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Target Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-deepPink bg-white transition-all duration-200"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="flex items-center space-x-3">
            <label htmlFor="adminOnly" className="text-sm font-medium text-gray-700">
              Send to Admins Only (FIDs: 4163, 420564)
            </label>
            <input
              id="adminOnly"
              type="checkbox"
              checked={adminOnly}
              onChange={(e) => setAdminOnly(e.target.checked)}
              className="h-5 w-5 text-deepPink focus:ring-deepPink border-gray-300 rounded"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-deepPink text-white p-3 rounded-lg hover:bg-darkPurple flex items-center justify-center transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              `Send to ${adminOnly ? "Admins" : "All Users"}`
            )}
          </button>
        </form>
        {responseMessage && (
          <div
            className={`mt-6 text-center p-3 rounded-lg transition-all duration-200 ${
              responseMessage.startsWith("Error")
                ? "bg-red-50 text-red-600"
                : "bg-green-50 text-green-600"
            }`}
          >
            {responseMessage}
          </div>
        )}
      </div>
    </div>
  );
}