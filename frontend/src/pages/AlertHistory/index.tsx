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
  const {
    alerts,
    acknowledgeAlert,
    investigateAlert,
    resolveAlert,
    dismissAlert,
    showToast,
    user,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [componentFilter, setComponentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedAlertModal, setSelectedAlertModal] = useState<AlertRecord | null>(null);
  const [investigationNotesInput, setInvestigationNotesInput] = useState('');
  const [isInvestigatingOpen, setIsInvestigatingOpen] = useState(false);
  const [dismissReasonInput, setDismissReasonInput] = useState('');
  const [isDismissOpen, setIsDismissOpen] = useState(false);

  // Summary counts
  const totalCount = alerts.length;
  const activeCount = alerts.filter((a) => (a.status || '').toUpperCase() === 'ACTIVE').length;
  const criticalCount = alerts.filter(
    (a) => (a.severity || '').toUpperCase() === 'CRITICAL'
  ).length;
  const acknowledgedCount = alerts.filter(
    (a) =>
      (a.status || '').toUpperCase() === 'ACKNOWLEDGED' ||
      (a.status || '').toUpperCase() === 'INVESTIGATING'
  ).length;

  // Filter logic
  const filteredAlerts = alerts.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.relatedComponent && item.relatedComponent.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.parameter && item.parameter.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSev =
      severityFilter === 'All' ||
      item.severity.toUpperCase() === severityFilter.toUpperCase();
    const matchesComp = componentFilter === 'All' || item.relatedComponent === componentFilter;
    const matchesStat =
      statusFilter === 'All' ||
      item.status.toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesSev && matchesComp && matchesStat;
  });

  const getSeverityBadgeClass = (sev: string) => {
    const upper = (sev || '').toUpperCase();
    if (upper === 'CRITICAL') return 'bg-red-50 text-red-700 border border-red-200';
    if (upper === 'HIGH' || upper === 'WARNING') return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (upper === 'MEDIUM') return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
    if (upper === 'LOW') return 'bg-blue-50 text-blue-700 border border-blue-200';
    return 'bg-slate-50 text-slate-700 border border-slate-200';
  };

  const getStatusBadgeClass = (st: string) => {
    const upper = (st || '').toUpperCase();
    if (upper === 'ACTIVE') return 'bg-red-100 text-red-800';
    if (upper === 'ACKNOWLEDGED') return 'bg-blue-100 text-blue-800';
    if (upper === 'INVESTIGATING') return 'bg-purple-100 text-purple-800';
    if (upper === 'RESOLVED') return 'bg-emerald-100 text-emerald-800';
    if (upper === 'DISMISSED') return 'bg-slate-100 text-slate-500 line-through';
    return 'bg-slate-100 text-slate-600';
  };

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
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold font-mono text-[11px]">
                <th className="py-3 px-4">Alert ID</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Title &amp; Component</th>
                <th className="py-3 px-4">Parameter</th>
                <th className="py-3 px-4">Measured Value</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
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
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{alert.id}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{alert.timestamp}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded ${getSeverityBadgeClass(
                          alert.severity
                        )}`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800 leading-tight">{alert.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{alert.relatedComponent}</p>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{alert.parameter}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {alert.currentValue}
                      <span className="text-[10px] font-normal text-slate-400 block font-mono">
                        Range: {alert.expectedRange}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-mono text-[10px] font-semibold px-2 py-0.5 rounded ${getStatusBadgeClass(
                          alert.status
                        )}`}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Acknowledge Button */}
                        {(alert.status || '').toUpperCase() === 'ACTIVE' && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[11px] font-semibold transition-colors"
                          >
                            Acknowledge
                          </button>
                        )}

                        {/* Investigate Button */}
                        {((alert.status || '').toUpperCase() === 'ACTIVE' ||
                          (alert.status || '').toUpperCase() === 'ACKNOWLEDGED') && (
                          <button
                            onClick={() => investigateAlert(alert.id)}
                            className="px-2 py-1 rounded bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[11px] font-semibold transition-colors"
                          >
                            Investigate
                          </button>
                        )}

                        {/* Resolve Button */}
                        {(alert.status || '').toUpperCase() !== 'RESOLVED' &&
                          (alert.status || '').toUpperCase() !== 'DISMISSED' && (
                            <button
                              onClick={() => resolveAlert(alert.id)}
                              className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[11px] font-semibold transition-colors"
                            >
                              Resolve
                            </button>
                          )}

                        {/* Details Modal Trigger */}
                        <button
                          onClick={() => {
                            setSelectedAlertModal(alert);
                            setIsInvestigatingOpen(false);
                            setIsDismissOpen(false);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 transition-colors"
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

            {/* Diagnostic Cause & Recommended Action */}
            {(selectedAlertModal.possible_cause || selectedAlertModal.recommended_action) && (
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs space-y-1.5">
                {selectedAlertModal.possible_cause && (
                  <div>
                    <span className="font-semibold text-amber-900 block font-mono text-[10px] uppercase">
                      Diagnostic Root Cause:
                    </span>
                    <p className="text-amber-800">{selectedAlertModal.possible_cause}</p>
                  </div>
                )}
                {selectedAlertModal.recommended_action && (
                  <div className="pt-1 border-t border-amber-200/60">
                    <span className="font-semibold text-amber-900 block font-mono text-[10px] uppercase">
                      Standard Operating Action:
                    </span>
                    <p className="text-amber-900 font-medium">{selectedAlertModal.recommended_action}</p>
                  </div>
                )}
              </div>
            )}

            {/* Audit & Acknowledgement Trail */}
            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs space-y-1 max-h-40 overflow-y-auto">
              <span className="font-semibold text-blue-900 block">Operator Audit Log</span>
              {selectedAlertModal.audit_trail && selectedAlertModal.audit_trail.length > 0 ? (
                <div className="space-y-1 pt-1">
                  {selectedAlertModal.audit_trail.map((at, idx) => (
                    <div key={idx} className="text-[11px] text-blue-900 font-mono flex items-start gap-1.5">
                      <span className="text-slate-400">{at.timestamp}</span>
                      <span className="font-bold">[{at.action}]</span>
                      <span className="text-blue-700">{at.actor}</span>
                      {at.details && <span className="text-slate-600 italic">- {at.details}</span>}
                    </div>
                  ))}
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>

            {/* Inline Investigation Input */}
            {isInvestigatingOpen && (
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2">
                <span className="text-xs font-semibold text-purple-900 block">Telemetry Investigation Notes:</span>
                <input
                  type="text"
                  value={investigationNotesInput}
                  onChange={(e) => setInvestigationNotesInput(e.target.value)}
                  placeholder="e.g. Cross-checking cylinder head sensor against EGT trend..."
                  className="w-full text-xs p-2 rounded border border-purple-200 bg-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsInvestigatingOpen(false)}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await investigateAlert(selectedAlertModal.id, investigationNotesInput);
                      setSelectedAlertModal({
                        ...selectedAlertModal,
                        status: 'Investigating',
                        investigatedBy: `${user.name} (${user.callsign})`,
                      });
                      setIsInvestigatingOpen(false);
                      setInvestigationNotesInput('');
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-semibold"
                  >
                    Confirm Investigation
                  </button>
                </div>
              </div>
            )}

            {/* Inline Dismiss Input */}
            {isDismissOpen && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-2">
                <span className="text-xs font-semibold text-red-900 block">
                  Dismiss Alert (Notice: CRITICAL &amp; HIGH alerts cannot be dismissed):
                </span>
                <input
                  type="text"
                  value={dismissReasonInput}
                  onChange={(e) => setDismissReasonInput(e.target.value)}
                  placeholder="e.g. Known expected benign condition during ground calibration."
                  className="w-full text-xs p-2 rounded border border-red-200 bg-white"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsDismissOpen(false)}
                    className="px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await dismissAlert(selectedAlertModal.id, dismissReasonInput || 'Operator dismissed');
                        setSelectedAlertModal({
                          ...selectedAlertModal,
                          status: 'Dismissed',
                          dismissedBy: `${user.name} (${user.callsign})`,
                        });
                        setIsDismissOpen(false);
                        setDismissReasonInput('');
                      } catch {
                        // Toast shown by context
                      }
                    }}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold"
                  >
                    Confirm Dismissal
                  </button>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {(selectedAlertModal.status || '').toUpperCase() === 'ACTIVE' && (
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

              {((selectedAlertModal.status || '').toUpperCase() === 'ACTIVE' ||
                (selectedAlertModal.status || '').toUpperCase() === 'ACKNOWLEDGED') &&
                !isInvestigatingOpen && (
                  <button
                    onClick={() => setIsInvestigatingOpen(true)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    Investigate
                  </button>
                )}

              {(selectedAlertModal.status || '').toUpperCase() !== 'RESOLVED' &&
                (selectedAlertModal.status || '').toUpperCase() !== 'DISMISSED' && (
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

              {(selectedAlertModal.status || '').toUpperCase() !== 'DISMISSED' &&
                (selectedAlertModal.status || '').toUpperCase() !== 'RESOLVED' &&
                !isDismissOpen && (
                  <button
                    onClick={() => setIsDismissOpen(true)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                  >
                    Dismiss
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
