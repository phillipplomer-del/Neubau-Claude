/**
 * Sales Table Component
 * High-performance table with TanStack Table + Virtual for 5000+ rows
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { SalesEntry, CommentStatus } from '@/types/sales';
import { formatCurrency, formatNumber } from '@/lib/sales/kpiCalculator';
import CommentTooltip from './CommentTooltip';

interface SalesTableProps {
  data: SalesEntry[];
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  onRowClick?: (entry: SalesEntry) => void;
  statusMap?: Map<string, CommentStatus>;
}

/**
 * Format date to German format (DD.MM.YYYY)
 */
function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';

  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  return new Intl.DateTimeFormat('de-DE').format(d);
}

/**
 * Safely convert value to string
 */
function safeString(value: unknown): string {
  if (value === null || value === undefined) return '-';
  return String(value);
}

export default function SalesTable({ data, sorting, onSortingChange, onRowClick, statusMap }: SalesTableProps) {
  const navigate = useNavigate();
  const [hoveredRow, setHoveredRow] = useState<{ entryId: string; status: CommentStatus; x: number; y: number } | null>(null);

  /**
   * Get row background color based on comment status from Firebase
   */
  const getRowClassName = (entry: SalesEntry): string => {
    const baseClasses = "border-b border-gray-100 hover:opacity-90 transition-colors cursor-pointer";

    // Get status from Firebase statusMap
    const status = entry.id ? statusMap?.get(entry.id) : undefined;

    if (status === 'critical') {
      return `${baseClasses} bg-red-100`;
    }
    if (status === 'at-risk') {
      return `${baseClasses} bg-orange-100`;
    }
    if (status === 'watched') {
      return `${baseClasses} bg-purple-100`;
    }
    return `${baseClasses} hover:bg-primary-50`;
  };

  // Define columns based on sales_dashboard_spalten.md specification
  const columns = useMemo<ColumnDef<SalesEntry>[]>(
    () => [
      {
        id: 'orderNumber',
        accessorKey: 'deliveryNumber',
        header: 'Best.Nr.',
        cell: (info) => safeString(info.getValue()),
        size: 90,
      },
      {
        id: 'pnr',
        accessorKey: 'projektnummer',
        header: 'PNR',
        cell: (info) => safeString(info.getValue()),
        size: 90,
      },
      {
        id: 'bookingDate',
        accessorKey: 'importedAt',
        header: 'Buchung',
        cell: (info) => formatDate(info.getValue() as Date),
        size: 85,
      },
      {
        id: 'customerNumber',
        accessorKey: 'customerNumber',
        header: 'Kd.Nr.',
        cell: (info) => safeString(info.getValue()),
        size: 75,
      },
      {
        id: 'matchcode',
        accessorKey: 'customerName',
        header: 'Kunde',
        cell: (info) => safeString(info.getValue()),
        size: 130,
      },
      {
        id: 'country',
        accessorKey: 'country',
        header: 'Land',
        cell: (info) => safeString(info.getValue()),
        size: 50,
      },
      {
        id: 'productGroup',
        accessorKey: 'productGroup',
        header: 'Prod.Gr.',
        cell: (info) => safeString(info.getValue()),
        size: 85,
      },
      {
        id: 'productNumber',
        accessorKey: 'artikelnummer',
        header: 'Art.Nr.',
        cell: (info) => safeString(info.getValue()),
        size: 90,
      },
      {
        id: 'productName',
        accessorKey: 'productDescription',
        header: 'Produktname',
        cell: (info) => {
          const value = safeString(info.getValue());
          return (
            <span className="block truncate" title={value}>
              {value}
            </span>
          );
        },
        size: 120,
      },
      {
        id: 'wunschLiefertermin',
        accessorKey: 'requestedDeliveryDate',
        header: 'Wunsch',
        cell: (info) => formatDate(info.getValue() as Date),
        size: 85,
      },
      {
        id: 'ersteBestaetigterLiefertermin',
        accessorKey: 'confirmedDeliveryDate',
        header: 'Best.',
        cell: (info) => formatDate(info.getValue() as Date),
        size: 85,
      },
      {
        id: 'deliveryDate',
        accessorKey: 'deliveryDate',
        header: 'Liefer.',
        cell: (info) => formatDate(info.getValue() as Date),
        size: 85,
      },
      {
        id: 'unit',
        accessorKey: 'unit',
        header: 'Einh.',
        cell: (info) => safeString(info.getValue()),
        size: 50,
      },
      {
        id: 'quantity',
        accessorKey: 'quantity',
        header: 'Menge',
        cell: (info) => {
          const value = info.getValue();
          if (value === null || value === undefined) return '-';
          return <span className="font-mono">{formatNumber(Number(value))}</span>;
        },
        size: 70,
      },
      {
        id: 'projektVerantwortlich',
        accessorKey: 'projectManager',
        header: 'Proj.Verantw.',
        cell: (info) => safeString(info.getValue()),
        size: 100,
      },
      {
        id: 'userClearName',
        accessorKey: 'processor',
        header: 'Bearb.',
        cell: (info) => safeString(info.getValue()),
        size: 90,
      },
      {
        id: 'offenerUmsatz',
        accessorKey: 'openTurnover',
        header: 'Umsatz',
        cell: (info) => {
          const value = info.getValue();
          if (value === null || value === undefined) return '-';
          const num = typeof value === 'number' ? value : parseFloat(String(value));
          return (
            <span className="font-mono text-green-700 text-xs">
              {isNaN(num) ? '-' : formatCurrency(num)}
            </span>
          );
        },
        size: 95,
      },
      {
        id: 'lieferverzugTage',
        accessorKey: 'delayDays',
        header: 'Verzug',
        cell: (info) => {
          const value = info.getValue();
          if (value === null || value === undefined) return '-';
          const days = Number(value);

          if (isNaN(days)) return '-';
          if (days === 0) return <span className="text-green-600 text-xs">OK</span>;
          if (days > 0) {
            return (
              <span className="rounded bg-red-100 px-1 py-0.5 text-xs font-medium text-red-700">
                +{days}
              </span>
            );
          }
          return <span className="font-mono text-xs">{days}</span>;
        },
        size: 70,
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const { rows } = table.getRowModel();

  // Virtualization setup
  const parentRef = useMemo(() => ({ current: null as HTMLDivElement | null }), []);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 10,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div
          ref={parentRef as React.RefObject<HTMLDivElement>}
          className="h-[calc(100vh-220px)] overflow-auto"
          style={{ contain: 'strict' }}
        >
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-1.5 py-1.5 text-left font-semibold text-gray-700 text-xs"
                    style={{ width: header.column.columnDef.size }}
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={`flex items-center gap-0.5 ${
                          header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                        }`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: ' ↑',
                          desc: ' ↓',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td style={{ height: `${paddingTop}px` }} />
              </tr>
            )}
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) return null;

              const entry = row.original;
              const status = entry.id ? statusMap?.get(entry.id) : undefined;
              const hasComments = status && status !== 'none';

              const handleRowClick = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (onRowClick) {
                  onRowClick(entry);
                } else if (entry.id) {
                  navigate(`/sales/deliveries/${entry.id}`);
                }
              };

              const handleMouseEnter = (e: React.MouseEvent) => {
                if (hasComments && entry.id) {
                  setHoveredRow({
                    entryId: entry.id,
                    status: status!,
                    x: e.clientX,
                    y: e.clientY,
                  });
                }
              };

              const handleMouseLeave = () => {
                setHoveredRow(null);
              };

              return (
                <tr
                  key={row.id}
                  onClick={handleRowClick}
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                  className={getRowClassName(entry)}
                  style={{ height: `${virtualRow.size}px` }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-1.5 py-1.5 text-gray-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td style={{ height: `${paddingBottom}px` }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>

    {/* Comment Tooltip */}
    {hoveredRow && (
      <CommentTooltip
        entryId={hoveredRow.entryId}
        status={hoveredRow.status}
        mouseX={hoveredRow.x}
        mouseY={hoveredRow.y}
      />
    )}
    </>
  );
}
