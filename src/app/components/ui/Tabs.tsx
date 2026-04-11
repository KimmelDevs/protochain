'use client';

import React, { useState } from 'react';

interface Tab {
  label: string;
  value: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultValue?: string;
}

export default function Tabs({ tabs, defaultValue }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue || tabs[0]?.value);

  return (
    <div className="w-full">
      {/* Tab Headers — border uses #e0e1e6, active uses link cobalt #0d74ce */}
      <div className="flex gap-2 border-b border-[#e0e1e6] dark:border-white/10 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`
              px-4 py-2 font-medium text-[14px] transition-all duration-200
              border-b-2 -mb-px rounded-t-[4px]
              ${
                activeTab === tab.value
                  ? 'text-[#0d74ce] border-[#0d74ce] bg-[#0d74ce]/5'
                  : 'text-[#60646c] border-transparent hover:text-[#1c2024] dark:text-[#b0b4ba] dark:hover:text-white hover:bg-[#f0f0f3] dark:hover:bg-white/5'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {tabs.find((tab) => tab.value === activeTab)?.content}
      </div>
    </div>
  );
}
