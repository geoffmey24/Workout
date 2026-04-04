'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, TrendingUp, Scale, Ruler } from 'lucide-react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { getBodyStats, saveBodyStat, deleteBodyStat, BodyStat } from '@/lib/simple-storage';

export default function BodyStatsPage() {
  const [entries, setEntries] = useState<BodyStat[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [waist, setWaist] = useState('');
  const [chest, setChest] = useState('');
  const [arms, setArms] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setEntries(getBodyStats());
  }, []);

  const handleSave = () => {
    const measurements: Record<string, number> = {};
    if (waist) measurements.waist = parseFloat(waist);
    if (chest) measurements.chest = parseFloat(chest);
    if (arms) measurements.arms = parseFloat(arms);

    const entry: BodyStat = {
      date,
      weight: weight ? parseFloat(weight) : undefined,
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
      measurements: Object.keys(measurements).length > 0 ? measurements : undefined,
      notes: notes.trim() || undefined,
    };
    saveBodyStat(entry);
    setEntries(getBodyStats());
    setShowForm(false);
    setWeight(''); setBodyFat(''); setWaist(''); setChest(''); setArms(''); setNotes('');
  };

  const handleDelete = (d: string) => {
    deleteBodyStat(d);
    setEntries(getBodyStats());
  };

  // Simple weight chart — text-based sparkline
  const weightEntries = entries.filter(e => e.weight).slice(-10);
  const fatEntries = entries.filter(e => e.bodyFat).slice(-10);

  const latestWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight : null;
  const firstWeight = weightEntries.length > 1 ? weightEntries[0].weight : null;
  const weightChange = latestWeight && firstWeight ? latestWeight - firstWeight : null;

  return (
    <div className="min-h-screen pb-24 bg-[#f8f9fa]">
      <div className="flex items-center gap-3 border-b border-[#e5e7eb] bg-white px-4 py-3">
        <Link href="/settings" className="text-[#6b7280] hover:text-[#111827]"><ArrowLeft size={20} /></Link>
        <h1 className="font-bold text-sm text-[#111827]">Body Stats</h1>
        <button onClick={() => setShowForm(!showForm)} className="ml-auto p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
          <Plus size={16} />
        </button>
      </div>

      {/* Add Entry Form */}
      {showForm && (
        <div className="px-4 py-4 bg-white border-b border-[#e5e7eb]">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#6b7280] mb-1 block">Weight (lbs)</label>
                <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="185" className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-[#6b7280] mb-1 block">Body Fat %</label>
                <input type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)} placeholder="15" className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[#6b7280] mb-1 block">Waist (in)</label>
                <input type="number" step="0.1" value={waist} onChange={e => setWaist(e.target.value)} className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-[#6b7280] mb-1 block">Chest (in)</label>
                <input type="number" step="0.1" value={chest} onChange={e => setChest(e.target.value)} className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-[#6b7280] mb-1 block">Arms (in)</label>
                <input type="number" step="0.1" value={arms} onChange={e => setArms(e.target.value)} className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[#6b7280] mb-1 block">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Doctor visit, blood work results, how you're feeling..." rows={2} className="w-full rounded-lg border border-[#e5e7eb] px-3 py-2 text-sm resize-none" />
            </div>
            <button onClick={handleSave} className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              Save Entry
            </button>
          </div>
        </div>
      )}

      {/* Weight Chart */}
      {weightEntries.length > 1 && (
        <div className="px-4 pt-4">
          <div className="rounded-xl bg-white border border-[#e5e7eb] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-blue-600" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">Weight Trend</h2>
              {weightChange !== null && (
                <span className={`ml-auto text-xs font-semibold ${weightChange > 0 ? 'text-orange-600' : weightChange < 0 ? 'text-green-600' : 'text-[#6b7280]'}`}>
                  {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} lbs
                </span>
              )}
            </div>
            <div className="flex items-end gap-1 h-20">
              {(() => {
                const weights = weightEntries.map(e => e.weight!);
                const min = Math.min(...weights);
                const max = Math.max(...weights);
                const range = max - min || 1;
                return weightEntries.map((e, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-500 rounded-t-sm min-h-[4px]"
                      style={{ height: `${((e.weight! - min) / range) * 60 + 16}px` }}
                      title={`${e.date}: ${e.weight} lbs`}
                    />
                    <span className="text-[8px] text-[#9ca3af]">{new Date(e.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Body Fat Chart */}
      {fatEntries.length > 1 && (
        <div className="px-4 pt-3">
          <div className="rounded-xl bg-white border border-[#e5e7eb] p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Scale size={16} className="text-green-600" />
              <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">Body Fat %</h2>
            </div>
            <div className="flex items-end gap-1 h-16">
              {(() => {
                const fats = fatEntries.map(e => e.bodyFat!);
                const min = Math.min(...fats);
                const max = Math.max(...fats);
                const range = max - min || 1;
                return fatEntries.map((e, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-green-500 rounded-t-sm min-h-[4px]"
                      style={{ height: `${((e.bodyFat! - min) / range) * 48 + 12}px` }}
                      title={`${e.date}: ${e.bodyFat}%`}
                    />
                    <span className="text-[8px] text-[#9ca3af]">{new Date(e.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {entries.length > 0 && (
        <div className="px-4 pt-3 flex gap-3">
          {latestWeight && (
            <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
              <Scale size={14} className="mx-auto text-blue-500 mb-1" />
              <p className="text-lg font-bold text-[#111827]">{latestWeight}</p>
              <p className="text-[10px] text-[#6b7280] uppercase">Current lbs</p>
            </div>
          )}
          {fatEntries.length > 0 && (
            <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
              <Ruler size={14} className="mx-auto text-green-500 mb-1" />
              <p className="text-lg font-bold text-[#111827]">{fatEntries[fatEntries.length - 1].bodyFat}%</p>
              <p className="text-[10px] text-[#6b7280] uppercase">Body Fat</p>
            </div>
          )}
          <div className="flex-1 rounded-xl bg-white border border-[#e5e7eb] p-3 text-center shadow-sm">
            <TrendingUp size={14} className="mx-auto text-purple-500 mb-1" />
            <p className="text-lg font-bold text-[#111827]">{entries.length}</p>
            <p className="text-[10px] text-[#6b7280] uppercase">Entries</p>
          </div>
        </div>
      )}

      {/* Entries List */}
      <div className="px-4 pt-4 space-y-2">
        <h2 className="text-xs font-medium uppercase tracking-wider text-[#6b7280]">History</h2>
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <Scale size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-[#6b7280]">No entries yet</p>
            <p className="text-xs text-[#9ca3af] mt-1">Tap + to add your first body stats entry</p>
          </div>
        ) : [...entries].reverse().map((e) => (
          <div key={e.date} className="rounded-xl bg-white border border-[#e5e7eb] p-3 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[#111827]">{new Date(e.date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              <button onClick={() => handleDelete(e.date)} className="text-[#9ca3af] hover:text-red-500"><Trash2 size={12} /></button>
            </div>
            <div className="flex gap-4 text-xs text-[#6b7280]">
              {e.weight && <span>Weight: <strong className="text-[#111827]">{e.weight} lbs</strong></span>}
              {e.bodyFat && <span>BF: <strong className="text-[#111827]">{e.bodyFat}%</strong></span>}
              {e.measurements?.waist && <span>Waist: <strong className="text-[#111827]">{e.measurements.waist}"</strong></span>}
            </div>
            {e.notes && <p className="text-xs text-[#9ca3af] mt-1 italic">{e.notes}</p>}
          </div>
        ))}
      </div>

      <Navigation />
    </div>
  );
}
