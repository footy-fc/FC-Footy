import React, { useState } from 'react';

interface NotificationsTabProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  responseMessage: string;
  setResponseMessage: (message: string) => void;
}

export default function NotificationsTab({ 
  loading, 
  setLoading, 
  responseMessage, 
  setResponseMessage 
}: NotificationsTabProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("matches");
  const [adminOnly, setAdminOnly] = useState(false);
  const [customTargetUrl, setCustomTargetUrl] = useState("");
  const [useCustomUrl, setUseCustomUrl] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponseMessage("");
    setLoading(true);
    
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
        setCustomTargetUrl("");
        setUseCustomUrl(false);
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

  return (
    <div>
      <h2 className="text-2xl font-bold text-lightPurple text-center mb-6">
        Send Notification
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-lightPurple mb-1">
            Notification Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full p-3 border border-limeGreenOpacity rounded-lg text-lightPurple bg-darkPurple focus:outline-none focus:ring-2 focus:ring-deepPink transition-all duration-200"
          />
        </div>
        <div>
          <label htmlFor="body" className="block text-sm font-medium text-lightPurple mb-1">
            Notification Body
          </label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={4}
            className="w-full p-3 border border-limeGreenOpacity rounded-lg text-lightPurple bg-darkPurple focus:outline-none focus:ring-2 focus:ring-deepPink transition-all duration-200"
          />
        </div>
        
        <div className="flex items-center space-x-3">
          <label htmlFor="useCustomUrl" className="text-sm font-medium text-lightPurple">
            Use Custom URL
          </label>
          <input
            id="useCustomUrl"
            type="checkbox"
            checked={useCustomUrl}
            onChange={(e) => setUseCustomUrl(e.target.checked)}
            className="h-5 w-5 text-deepPink focus:ring-deepPink border-limeGreenOpacity rounded bg-darkPurple"
          />
        </div>
        
        {useCustomUrl && (
          <div>
            <label htmlFor="customTargetUrl" className="block text-sm font-medium text-lightPurple mb-1">
              Custom Target URL
            </label>
            <input
              id="customTargetUrl"
              type="url"
              value={customTargetUrl}
              onChange={(e) => setCustomTargetUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full p-3 border border-limeGreenOpacity rounded-lg text-lightPurple bg-darkPurple focus:outline-none focus:ring-2 focus:ring-deepPink transition-all duration-200"
            />
          </div>
        )}
        
        {!useCustomUrl && (
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-lightPurple mb-1">
              Target Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-3 border border-limeGreenOpacity rounded-lg text-lightPurple bg-darkPurple focus:outline-none focus:ring-2 focus:ring-deepPink transition-all duration-200"
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
          <label htmlFor="adminOnly" className="text-sm font-medium text-lightPurple">
            Send to Admins Only (FIDs: 4163, 420564)
          </label>
          <input
            id="adminOnly"
            type="checkbox"
            checked={adminOnly}
            onChange={(e) => setAdminOnly(e.target.checked)}
            className="h-5 w-5 text-deepPink focus:ring-deepPink border-limeGreenOpacity rounded bg-darkPurple"
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-deepPink text-white p-3 rounded-lg hover:bg-fontRed flex items-center justify-center transform transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
} 