import React from "react";
import FPLAnalytics from "./FPLAnalytics";

const ToolsTab: React.FC = () => {
  return (
    <div className="mb-4">
      <h2 className="font-2xl text-notWhite font-bold mb-2">Fantasy Tools</h2>
      <p className="text-sm text-lightPurple mb-4">
        Value charts and manager analytics to help you make sharper weekly decisions.
      </p>

      <div className="rounded-[24px] bg-purplePanel text-lightPurple p-3 overflow-hidden">
        <FPLAnalytics />
      </div>
    </div>
  );
};

export default ToolsTab;
