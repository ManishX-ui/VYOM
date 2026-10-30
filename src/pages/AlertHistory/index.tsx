import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertRecord } from '../../types';
import {
  Bell,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Info,
  Clock,
  ShieldAlert,
  Check,
  Eye,
  X,
  User,
  ArrowRight,
  Download,
} from 'lucide-react';

export const AlertHistoryPage: React.FC = () => {
  const { alerts, acknowledgeAlert, resolveAlert, showToast, user } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [componentFilter, setComponentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedAlertModal, setSelectedAlertModal] = useState<AlertRecord | null>(null);

  // Summary counts
  const totalCount = alerts.length;
  const activeCount = alerts.filter((a) => a.status === 'Active').length;
  const criticalCount = alerts.filter((a) => a.severity === 'Critical').length;
  const acknowledgedCount = alerts.filter((a) => a.status === 'Acknowledged').length;

  // Filter logic
  const filteredAlerts = alerts.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.relatedComponent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.parameter.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSev = severityFilter === 'All' || item.severity === severityFilter;
    const matchesComp = componentFilter === 'All' || item.relatedComponent === componentFilter;
    const matchesStat = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesSev && matchesComp && matchesStat;
  });

  const handleExportAlertsCSV = () => {
    const header = 'ID,Timestamp,Severity,Title,Component,Parameter,Value,ExpectedRange,Status\n';
    const rows = filteredAlerts
      .map(
        (a) =>
          `"${a.id}","${a.timestamp}","${a.severity}","${a.title}","${a.relatedComponent}","${a.parameter}","${a.currentValue}","${a.expectedRange}","${a.status}"`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vyom_alerts_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Alert Log Exported', 'Downloaded alerts summary as CSV', 'success');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Alert &amp; Incident History
          </h2>
        </div>

        <button
          onClick={handleExportAlertsCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Alert Log</span>
        </button>
      </div>

      {/* =========================================
          SUMMARY CARDS
          ========================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-stretch">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider block">Total Recorded</span>
          <p className="text-2xl font-extrabold font-mono text-slate-900">{totalCount}</p>
          <span className="text-[11px] text-slate-500 font-mono">Current Mission</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-red-200 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-red-700 text-[11px] uppercase tracking-wider block">Active Unresolved</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-red-600">{activeCount}</p>
          <span className="text-[11px] text-red-600 font-mono">Requires Attention</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-amber-700 text-[11px] uppercase tracking-wider block">Critical Alarms</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-amber-700">{criticalCount}</p>
          <span className="text-[11px] text-amber-700 font-mono">High Severity</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-blue-200 shadow-2xs flex flex-col justify-between h-full space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-blue-700 text-[11px] uppercase tracking-wider block">Acknowledged</span>
            <Check className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-extrabold font-mono text-blue-700">{acknowledgedCount}</p>
          <span className="text-[11px] text-blue-600 font-mono">Operator Logged</span>
        </div>
      </div>

      {/* =========================================
          FILTERS & SEARCH BAR
          ========================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, ID, component, or parameter..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <span className="text-slate-400 text-[11px]">Severity:</span>
          {['All', 'Critical', 'Warning', 'Info'].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                severityFilter === sev
                  ? 'bg-blue-600 text-white font-semibold shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 text-xs font-medium border-t lg:border-t-0 lg:border-l border-slate-200 pt-2 lg:pt-0 lg:pl-3">
          <span className="text-slate-400 text-[11px]">Status:</span>
          {['All', 'Active', 'Acknowledged', 'Resolved'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* =========================================
          ALERTS TABLE
          ========================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs divide-y divide-slate-200">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 font-semibold font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3.5 px-4 whitespace-nowrap w-[110px]">Alert ID</th>
                <th className="py-3.5 px-4 whitespace-nowrap w-[140px]">Timestamp</th>
                <th className="py-3.5 px-4 whitespace-nowrap w-[110px]">Severity</th>
                <th className="py-3.5 px-4 min-w-[220px]">Title &amp; Component</th>
                <th className="py-3.5 px-4 whitespace-nowrap w-[130px]">Parameter</th>
                <th className="py-3.5 px-4 whitespace-nowrap w-[160px]">Measured Value</th>
                <th className="py-3.5 px-4 whitespace-nowrap w-[120px]">Status</th>
                <th className="py-3.5 px-4 whitespace-nowrap text-right w-[190px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    No alerts match the selected search criteria.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap align-middle">
                      {alert.id}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap align-middle">
                      {alert.timestamp}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                      <span
                        className={`inline-flex items-center font-mono text-[10px] font-semibold px-2.5 py-0.5 rounded-md border ${
                          alert.severity === 'Critical'
                            ? 'bg-red-50 text-red-700 border-red-200/80'
                            : alert.severity === 'Warning'
                            ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                            : 'bg-blue-50 text-blue-700 border-blue-200/80'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 align-middle">
                      <p className="font-semibold text-slate-900 text-xs leading-snug">{alert.title}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">{alert.relatedComponent}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 whitespace-nowrap align-middle">
                      {alert.parameter}
                    </td>
                    <td className="py-3.5 px-4 font-mono whitespace-nowrap align-middle">
                      <span className="font-bold text-slate-900 text-xs block leading-tight">{alert.currentValue}</span>
                      <span className="text-[10px] font-normal text-slate-500 block mt-0.5">
                        Range: {alert.expectedRange}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap align-middle">
                      <span
                        className={`inline-flex items-center font-mono text-[10px] font-semibold px-2.5 py-0.5 rounded-md border ${
                          alert.status === 'Active'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : alert.status === 'Acknowledged'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap align-middle">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {/* Acknowledge Button */}
                        {alert.status === 'Active' && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        )}

                        {/* Resolve Button */}
                        {alert.status !== 'Resolved' && (
                          <button
                            onClick={() => resolveAlert(alert.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
                          >
                            Resolve
                          </button>
                        )}

                        {/* Details Modal Trigger */}
                        <button
                          onClick={() => setSelectedAlertModal(alert)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================
          ALERT DETAILS MODAL
          ========================================= */}
      {selectedAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                    selectedAlertModal.severity === 'Critical'
                      ? 'bg-red-600'
                      : selectedAlertModal.severity === 'Warning'
                      ? 'bg-amber-600'
                      : 'bg-blue-600'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{selectedAlertModal.title}</h3>
                  <p className="font-mono text-xs text-slate-400">{selectedAlertModal.id} · {selectedAlertModal.timestamp}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAlertModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <div className="space-y-1 text-xs">
              <span className="text-slate-400 font-mono text-[10px] uppercase">Incident Narrative</span>
              <p className="text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                {selectedAlertModal.description}
              </p>
            </div>

            {/* Sensor Readings Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-slate-400 font-mono text-[10px] uppercase">Measured Value</span>
                <p className="font-bold font-mono text-slate-900 text-base">{selectedAlertModal.currentValue}</p>
                <span className="text-[10px] font-mono text-slate-500">Parameter: {selectedAlertModal.parameter}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-0.5">
                <span className="text-slate-400 font-mono text-[10px] uppercase">Expected Range</span>
                <p className="font-bold font-mono text-slate-900 text-base">{selectedAlertModal.expectedRange}</p>
                <span className="text-[10px] font-mono text-slate-500">Component: {selectedAlertModal.relatedComponent}</span>
              </div>
            </div>

            {/* Audit & Acknowledgement Trail */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs space-y-1">
              <span className="font-semibold text-blue-900 block">Operator Audit Log</span>
              {selectedAlertModal.acknowledgedBy ? (
                <p className="text-blue-800">
                  Acknowledged by <span className="font-bold">{selectedAlertModal.acknowledgedBy}</span> at{' '}
                  <span className="font-mono">{selectedAlertModal.acknowledgedAt}</span>.
                </p>
              ) : (
                <p className="text-blue-700">Awaiting operator review and formal acknowledgement.</p>
              )}
              {selectedAlertModal.resolutionNotes && (
                <p className="text-emerald-800 font-medium pt-1 border-t border-blue-100">
                  Resolution: {selectedAlertModal.resolutionNotes}
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {selectedAlertModal.status === 'Active' && (
                <button
                  onClick={() => {
                    acknowledgeAlert(selectedAlertModal.id);
                    setSelectedAlertModal({
                      ...selectedAlertModal,
                      status: 'Acknowledged',
                      acknowledgedBy: `${user.name} (${user.callsign})`,
                      acknowledgedAt: new Date().toLocaleTimeString('en-GB', { hour12: false }),
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Acknowledge Alert
                </button>
              )}

              {selectedAlertModal.status !== 'Resolved' && (
                <button
                  onClick={() => {
                    resolveAlert(selectedAlertModal.id);
                    setSelectedAlertModal({
                      ...selectedAlertModal,
                      status: 'Resolved',
                      resolutionNotes: 'Verified within baseline limits during diagnostic review.',
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Mark as Resolved
                </button>
              )}

              <button
                onClick={() => setSelectedAlertModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
