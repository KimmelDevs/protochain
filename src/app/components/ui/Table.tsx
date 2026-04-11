import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border border-[#e0e1e6] dark:border-white/10 transition-colors duration-300 ${className}`}>
        {children}
      </table>
    </div>
  );
}

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function TableHeader({ children, className = '' }: TableHeaderProps) {
  return (
    <thead className={`border-b border-[#e0e1e6] dark:border-white/10 transition-colors duration-300 ${className}`}>
      {children}
    </thead>
  );
}

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function TableBody({ children, className = '' }: TableBodyProps) {
  return (
    <tbody className={className}>
      {children}
    </tbody>
  );
}

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function TableRow({ children, className = '', hover = true }: TableRowProps) {
  return (
    <tr
      className={`
        border-b border-[#e0e1e6] dark:border-white/10 transition-colors duration-300
        ${hover ? 'hover:bg-[#f0f0f3] dark:hover:bg-white/5 transition-colors duration-300' : ''}
        ${className}
      `}
    >
      {children}
    </tr>
  );
}

interface TableHeadProps {
  children: React.ReactNode;
  className?: string;
}

export function TableHead({ children, className = '' }: TableHeadProps) {
  return (
    <th
      className={`
        px-6 py-3 text-left text-[12px] font-semibold text-[#60646c] dark:text-[#b0b4ba] uppercase tracking-wider
        transition-colors duration-300
        ${className}
      `}
    >
      {children}
    </th>
  );
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
  className?: string;
}

export function TableCell({ children, className = '', ...props }: TableCellProps) {
  return (
    <td
      className={`px-6 py-4 text-[14px] text-[#1c2024] dark:text-[#b0b4ba] transition-colors duration-300 ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}
