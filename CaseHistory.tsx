import React, { useState, useMemo } from 'react';
import { PatientCase } from '../types';
import {
  X, Search, Clock, CheckCircle2, XCircle,
  Filter, Activity, Phone, MapPin, Ambulance,
  ShieldCheck, Calendar, ArrowUpDown
} from 'lucide-react';

interface CaseHistoryProps {
  cases: PatientCase[];
  filterByPatient?: string; // If set, only show this patient's cases
  onClose: () => void;
}

type StatusFilter = 'all' | 'completed' | 'canceled' | 'dispatched' | 'pending';

const CaseHistory: React.FC<CaseHistoryProps> = ({ cases, filterByPatient, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortNewest, setSortNewest] = useState(true);

  const filteredCases = useMemo(() => {
    let result = [...cases];

    // Filter by patient if specified
    if (filterByPatient) {
      result = result.filter(c => c.patientName === filterByPatient);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.patientName.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.emergencyType.toLowerCase().includes(q) ||
        (c.hospitalName || '').toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => sortNewest
      ? (b.completedAt || b.timestamp) - (a.completedAt || a.timestamp)
      : (a.completedAt || a.timestamp) - (b.completedAt || b.timestamp)
    );

    return result;
  }, [cases, filterByPatient, statusFilter, searchQuery, sortNewest]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-600';
      case 'canceled': return 'bg-red-600';
      case 'dispatched': return 'bg-blue-600';
      case 'pending': return 'bg-amber-600';
      case 'accepted': return 'bg-purple-600';
      default: return 'bg-slate-600';
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' • ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const filterTabs: { label: string; value: StatusFilter; count: number }[] = [
    { label: 'All', value: 'all', count: cases.length },
    { label: 'Completed', value: 'completed', count: cases.filter(c => c.status === 'completed').length },
    { label: 'Canceled', value: 'canceled', count: cases.filter(c => c.status === 'canceled').length },
    { label: 'Dispatched', value: 'dispatched', count: cases.filter(c => c.status === 'dispatched').length },
    { label: 'Pending', value: 'pending', count: cases.filter(c => c.status === 'pending').length },
  ];

  return (
    <div className="fixed inset-0 z-[9000] flex items-start justify-center bg-slate-950/90 backdrop-blur-xl overflow-y-auto p-4 md:p-8 animate-in fade-in duration-300">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4">
        {/* Header */}
        <div className="bg-slate-900 dark:bg-slate-950 px-8 py-6 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-600/20 rounded-2xl">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Mission Log</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
                {filteredCases.length} Records Found
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-white/10 rounded-2xl transition-all text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl px-5 py-3 border border-slate-200 dark:border-slate-700">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, case ID, or type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none"
            />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            {filterTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === tab.value
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
            <button
              onClick={() => setSortNewest(!sortNewest)}
              className="shrink-0 ml-auto p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              title={sortNewest ? 'Newest first' : 'Oldest first'}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Case List */}
        <div className="px-8 py-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {filteredCases.length === 0 ? (
            <div className="text-center py-20">
              <Clock className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 font-black text-xs uppercase tracking-widest italic">No Records Found</p>
            </div>
          ) : (
            filteredCases.map(c => (
              <div key={c.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`${getStatusColor(c.status)} text-white text-[9px] font-black uppercase px-3 py-0.5 rounded-full tracking-widest`}>
                        {c.status}
                      </span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{c.id}</span>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{c.patientName}</h4>
                    <p className="text-[11px] font-bold text-red-500 uppercase italic">{c.emergencyType}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {formatDate(c.timestamp)}
                    </div>
                    {c.completedAt && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 mt-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Closed: {formatDate(c.completedAt)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Phone className="w-3 h-3" />
                    <span className="font-bold">{c.phoneNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-3 h-3" />
                    <span className="font-bold">{c.location.lat.toFixed(4)}, {c.location.lng.toFixed(4)}</span>
                  </div>
                  {c.hospitalName && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Activity className="w-3 h-3" />
                      <span className="font-bold">{c.hospitalName}</span>
                    </div>
                  )}
                  {c.ambulanceDriver && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Ambulance className="w-3 h-3" />
                      <span className="font-bold">{c.ambulanceDriver}</span>
                    </div>
                  )}
                  {c.officerName && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <ShieldCheck className="w-3 h-3" />
                      <span className="font-bold">{c.officerName}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseHistory;
