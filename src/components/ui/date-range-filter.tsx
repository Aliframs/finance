'use client';

import { useState } from 'react';
import { Calendar, X } from 'lucide-react';

interface DateRangeFilterProps {
  onFilter: (startDate: string, endDate: string) => void;
  className?: string;
}

export function DateRangeFilter({ onFilter, className = "" }: DateRangeFilterProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleApply = () => {
    onFilter(startDate, endDate);
  };

  const handleClear = () => {
    setStartDate('');
    setEndDate('');
    onFilter('', '');
  };

  return (
    <div 
      className={`flex items-center gap-2 p-1.5 rounded-full ${className} print-hide`}
      style={{ background: 'rgba(15, 23, 42, 0.1)' }}
    >
      <Calendar className="w-4 h-4 text-slate-500 ml-3" />
      
      <div className="flex items-center gap-2">
        <input 
          type="date" 
          className="bg-transparent border-none text-sm outline-none text-slate-700 cursor-pointer" 
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          title="Tanggal Awal"
        />
        <span className="text-slate-400 text-sm">-</span>
        <input 
          type="date" 
          className="bg-transparent border-none text-sm outline-none text-slate-700 cursor-pointer"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          title="Tanggal Akhir"
        />
      </div>

      <div className="flex items-center gap-1 ml-1 border-l border-slate-300/50 pl-2 pr-1">
        <button 
          onClick={handleApply}
          className="btn btn-sm btn-primary !rounded-full !px-4"
        >
          Filter
        </button>
        {(startDate || endDate) && (
          <button 
            onClick={handleClear}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
            title="Hapus Filter"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
