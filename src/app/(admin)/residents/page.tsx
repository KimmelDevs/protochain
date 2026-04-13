'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, User, Mail, Phone, FileText } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

/* ─────────────────────────── types ─────────────────────────────────────── */
interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  role: string | null;
  avatar_base64: string | null;
  totalRequests?: number;
}

/* ─────────────────────────── helpers ───────────────────────────────────── */
const getInitials = (first: string, last: string) =>
  `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';

const isThisMonth = (d: string) => {
  const dt = new Date(d), now = new Date();
  return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

/* ─────────────────────────── page ──────────────────────────────────────── */
export default function ResidentsPage() {
  const router = useRouter();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        const { data: pd, error } = await supabase
          .from('profiles')
          .select('id, firstName, lastName, email, role, avatar_base64, created_at')
          .eq('role', 'resident')
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (!pd?.length) { setResidents([]); return; }

        const ids = pd.map((p: any) => p.id);
        const { data: rd } = await supabase
          .from('requests').select('user_id').in('user_id', ids);

        const countMap: Record<string, number> = {};
        (rd ?? []).forEach((r: any) => { countMap[r.user_id] = (countMap[r.user_id] ?? 0) + 1; });

        const hydrated = await Promise.all(pd.map(async (p: any) => {
          try {
            const res = await fetch(`/api/profile?id=${p.id}`);
            if (res.ok) {
              const j = await res.json();
              return { ...p, phone: j.data?.phone ?? '', address: j.data?.address ?? '', totalRequests: countMap[p.id] ?? 0 };
            }
          } catch {}
          return { ...p, phone: '', address: '', totalRequests: countMap[p.id] ?? 0 };
        }));

        setResidents(hydrated);
      } catch (e) { console.error(e); }
      finally     { setLoading(false); }
    })();
  }, [router]);

  const filtered = residents.filter(r => {
    const q = search.toLowerCase();
    return (
      `${r.firstName ?? ''} ${r.lastName ?? ''}`.toLowerCase().includes(q) ||
      (r.email ?? '').toLowerCase().includes(q) ||
      (r.id    ?? '').toLowerCase().includes(q)
    );
  });

  const totalReqs = residents.reduce((s, r) => s + (r.totalRequests ?? 0), 0);
  const newThisMonth = residents.filter(r => isThisMonth(r.created_at)).length;
  const avgReqs = residents.length ? Math.round(totalReqs / residents.length) : 0;

  const stats = [
    { label: 'Total Residents', value: residents.length },
    { label: 'New This Month',  value: newThisMonth     },
    { label: 'Total Requests',  value: totalReqs        },
    { label: 'Avg. Requests',   value: avgReqs          },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5F3] dark:bg-[#111113]">
      <span className="mono text-[12px] tracking-[0.25em] text-[#6C6C74] dark:text-[#9090A0] uppercase animate-pulse">
        Loading…
      </span>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        .pjs { font-family: 'Plus Jakarta Sans', sans-serif; }
        
      `}</style>

      <div className="pjs min-h-screen bg-[#F6F5F3] dark:bg-[#111113] transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-6 pb-14">

          {/* ── MASTHEAD ───────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-b-2 border-[#1A1A1C] dark:border-[#EAEAEC] pb-5 mb-10"
          >
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] tracking-[0.2em] text-[#6C6C74] dark:text-[#9090A0] mb-2 uppercase">
                  Directory
                </p>
                <h1 className="mono text-[26px] font-bold leading-tight text-[#1A1A1C] dark:text-[#EAEAEC] tracking-tight leading-none">
                  RESIDENTS
                </h1>
              </div>
              <Link
                href="/admindashboard"
                className="text-[11px] font-500 tracking-[0.08em] uppercase text-orange-600 dark:text-orange-400 hover:text-orange-700 transition-colors"
              >
                ← Dashboard
              </Link>
            </div>
          </motion.div>

          {/* ── STAT STRIP ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.07 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mb-12"
          >
            {stats.map(({ label, value }) => (
              <div key={label} className="border-t-2 border-[#1A1A1C] dark:border-[#EAEAEC] pt-3 pb-4">
                <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#6C6C74] dark:text-[#9090A0] mb-2">
                  {label}
                </p>
                <p className="mono text-4xl font-bold tabular-nums text-[#1A1A1C] dark:text-[#EAEAEC] leading-none">
                  {value}
                </p>
              </div>
            ))}
          </motion.div>

          {/* ── SEARCH ─────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6C6C74] dark:text-[#9090A0]" />
              <input
                type="text"
                placeholder="Search by name, email, or ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-white dark:bg-[#1C1C1F] border border-[#E8E6E1] dark:border-[#2C2C32] rounded-xl text-[#1A1A1C] dark:text-[#EAEAEC] placeholder-[#B0B0B8] dark:placeholder-[#55555F] focus:outline-none focus:border-[#E8500A] transition-colors"
              />
            </div>
          </motion.div>

          {/* ── TABLE ──────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.13 }}
          >
            {/* col headers */}
            <div className="grid grid-cols-[1fr_180px_140px_80px_44px] py-2 border-b border-[#E8E6E1] dark:border-[#2C2C32]">
              {['Resident', 'Contact', 'Registered', 'Requests', ''].map(h => (
                <span key={h} className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#6C6C74] dark:text-[#9090A0]">
                  {h}
                </span>
              ))}
            </div>

            {residents.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <User className="w-6 h-6 text-[#c8c6c0] dark:text-[#3a3845]" />
                <p className="mono text-[12px] tracking-widest uppercase text-[#6C6C74] dark:text-[#9090A0]">
                  No residents yet
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 flex flex-col items-center gap-3">
                <Search className="w-6 h-6 text-[#c8c6c0] dark:text-[#3a3845]" />
                <p className="mono text-[12px] tracking-widest uppercase text-[#6C6C74] dark:text-[#9090A0]">
                  No results match
                </p>
              </div>
            ) : (
              <AnimatePresence>
                {filtered.map((res, i) => (
                  <motion.div
                    key={res.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.025 * i }}
                    className="group grid grid-cols-[1fr_180px_140px_80px_44px] items-center py-3.5 border-b border-[#E8E6E1] dark:border-[#2C2C32] last:border-0 hover:bg-[#F6F5F3] dark:hover:bg-[#1C1C1F] -mx-2 px-2 transition-colors duration-100"
                  >
                    {/* resident */}
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      {res.avatar_base64 ? (
                        <img
                          src={res.avatar_base64}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-[#E8E6E1] dark:border-[#2C2C32]"
                        />
                      ) : (
                        <div className="w-8 h-8 flex-shrink-0 bg-orange-500 flex items-center justify-center">
                          <span className="mono text-[10px] font-bold text-white leading-none">
                            {getInitials(res.firstName, res.lastName)}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[14px] font-medium text-[#1A1A1C] dark:text-[#EAEAEC] truncate leading-none">
                          {res.firstName} {res.lastName}
                        </p>
                        <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0] mt-1.5 truncate">
                          {res.id.slice(0, 8).toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {/* contact */}
                    <div className="pr-3 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Mail className="w-3 h-3 text-[#6C6C74] dark:text-[#9090A0] flex-shrink-0" />
                        <p className="text-[12px] text-[#3A3A3E] dark:text-[#BABABC] truncate">{res.email}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-[#6C6C74] dark:text-[#9090A0] flex-shrink-0" />
                        <p className="text-[12px] text-[#6C6C74] dark:text-[#9090A0] truncate">{res.phone || '—'}</p>
                      </div>
                    </div>

                    {/* registered */}
                    <span className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0]">
                      {fmt(res.created_at)}
                    </span>

                    {/* request count */}
                    <span className="mono text-[13px] font-bold tabular-nums text-[#1A1A1C] dark:text-[#EAEAEC]">
                      {res.totalRequests ?? 0}
                    </span>

                    {/* view */}
                    <Link href={`/residents/${res.id}`} className="flex justify-end">
                      <span className="flex items-center justify-center w-7 h-7 border border-[#E8E6E1] dark:border-[#2C2C32] hover:bg-orange-600 hover:border-orange-600 group/btn transition-colors duration-150">
                        <Eye className="w-3.5 h-3.5 text-[#6C6C74] dark:text-[#9090A0] group-hover/btn:text-white transition-colors" />
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {filtered.length > 0 && (
              <p className="mono text-[11px] text-[#6C6C74] dark:text-[#9090A0] mt-3">
                Showing {filtered.length} of {residents.length} resident{residents.length !== 1 ? 's' : ''}
              </p>
            )}
          </motion.div>

        </div>
      </div>
    </>
  );
}