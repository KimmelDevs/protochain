import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full ${className}`}>
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
    <thead className={`border-b border-white/10 ${className}`}>
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
        border-b border-white/5
        ${hover ? 'hover:bg-white/5 transition-colors' : ''}
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
        px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider
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
    <td className={`px-6 py-4 text-sm text-gray-300 ${className}`} {...props}>
      {children}
    </td>
  );
}