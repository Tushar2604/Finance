import React from 'react';
import { Table, flexRender } from '@tanstack/react-table';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ERPTableHeaderProps<TData> {
  table: Table<TData>;
  isLoading?: boolean;
}

export function ERPTableHeader<TData>({ table, isLoading }: ERPTableHeaderProps<TData>) {
  return (
    <>
      <thead className="bg-[#f8fafc] sticky top-0 z-10 shadow-[0_1px_0_0_#e2e8f0]">
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id} className="h-10">
            {headerGroup.headers.map((header) => {
              const meta = header.column.columnDef.meta as { isNumeric?: boolean; align?: 'left' | 'center' | 'right' } | undefined;
              const align = meta?.align || (meta?.isNumeric ? 'center' : 'left');
              
              const isSortable = header.column.getCanSort();
              const sortDirection = header.column.getIsSorted();

              return (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                  className={cn(
                    "px-3 py-2 text-[12px] md:text-[13px] font-bold text-slate-700 whitespace-nowrap border-b border-slate-200 select-none",
                    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left',
                    isSortable ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''
                  )}
                  style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className={cn("flex items-center gap-1", align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start')}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        
                    {/* Sorting UI */}
                    {isSortable && (
                      <span className="flex-shrink-0 text-slate-400">
                        {sortDirection === 'asc' ? (
                          <ChevronUp className="w-3 h-3 text-slate-700" />
                        ) : sortDirection === 'desc' ? (
                          <ChevronDown className="w-3 h-3 text-slate-700" />
                        ) : (
                          <ChevronsUpDown className="w-3 h-3 opacity-50 hover:opacity-100 transition-opacity" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      
      {/* Loading Skeleton */}
      {isLoading && (
        <tbody className="bg-white">
          {Array.from({ length: 5 }).map((_, index) => (
            <tr key={`skeleton-${index}`} className="border-b border-slate-100 h-10">
              {table.getVisibleLeafColumns().map((column) => {
                 const meta = column.columnDef.meta as { isNumeric?: boolean; align?: 'left' | 'center' | 'right' } | undefined;
                 const align = meta?.align || (meta?.isNumeric ? 'center' : 'left');
                 return (
                  <td key={`skeleton-cell-${column.id}`} className={cn("px-3 py-2", align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left')}>
                    <Skeleton className={cn("h-3.5", align === 'center' ? 'w-12 mx-auto' : 'w-full max-w-[120px]')} />
                  </td>
                 )
              })}
            </tr>
          ))}
        </tbody>
      )}
    </>
  );
}
