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
      {/* Tab Headers */}
      <div className="flex gap-2 border-b border-white/10 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`
              px-4 py-2 font-medium text-sm transition-all duration-200
              border-b-2 -mb-px rounded-t-md
              ${
                activeTab === tab.value
                  ? 'bg-orange-500 text-white border-orange-500 dark:bg-orange-600 dark:border-orange-600'
                  : 'bg-transparent text-black dark:text-white border-transparent hover:bg-orange-100 dark:hover:bg-orange-700 hover:text-black dark:hover:text-white'
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