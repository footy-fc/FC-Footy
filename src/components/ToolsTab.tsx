import React from "react";
import FPLAnalytics from "./FPLAnalytics";

const ToolsTab: React.FC = () => {
  return (
    <div className="mb-4">
      <div className="app-eyebrow mb-2">Tools</div>
      <h2 className="app-title mb-2">Analytics for weekly edges</h2>
      <p className="app-copy mb-4">
        Value charts and manager analytics to help you make sharper weekly decisions.
      </p>

      <div className="rounded-[24px] bg-purplePanel text-lightPurple p-3 overflow-hidden">
        <FPLAnalytics />
      </div>
    </div>
  );
};

export default ToolsTab;
