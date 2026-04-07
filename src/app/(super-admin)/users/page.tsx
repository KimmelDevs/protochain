'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase';
import { Search, Pencil, Trash2, X, Check, Filter, RefreshCw } from 'lucide-react';

const ROLES = ['resident', 'admin', 'super_admin'] as const;
type Role = typeof ROLES[number];

const POSITIONS = [
  '',
  'Barangay Captain',
  'Barangay Secretary',
  'Barangay Treasurer',
  'Kagawad',
  'SK Chairperson',
  'SK Kagawad',
  'Barangay Tanod Chief',
  'Barangay Tanod',
  'Lupon Member',
  'BCPC Chairperson',
  'Health Worker',
  'Day Care Worker',
];

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  admin:       'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  resident:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

interface Profile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  phone: string;
  address: string;
  role: Role;
  position: string;
  created_at: string;
}

interface EditState {
  role: Role;
  position: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
}

function Toast({ msg, type, onDone }: { msg: string; type: 'success' | 'error'; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg border text-[13px] max-w-xs shadow-lg
      ${type === 'success'
        ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'
        : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'
      }`}
      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
      {msg}
    </div>
  );
}

const inputCls = "w-full bg-white dark:bg-[#1a1a20] border border-[#dedad4] dark:border-[#2a2a32] rounded px-3 py-1.5 text-[13px] text-[#1a1917] dark:text-[#f0eee8] focus:outline-none focus:border-orange-400 dark:focus:border-orange-500 placeholder-[#a09e98]";
const selectCls = "bg-white dark:bg-[#1a1a20] border border-[#dedad4] dark:border-[#2a2a32] rounded px-2 py-1.5 text-[13px] text-[#1a1917] dark:text-[#f0eee8] focus:outline-none focus:border-orange-400 dark:focus:border-orange-500";

export default function UsersPage() {
  const [users,         setUsers]         = useState<Profile[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [roleFilter,    setRoleFilter]    = useState<'all' | Role>('all');
  const [editId,        setEditId]        = useState<string | null>(null);
  const [editForm,      setEditForm]      = useState<EditState | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<Profile | null>(null);
  const [saving,        setSaving]        = useState(false);
  const [toast,         setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [currentUserId, setCurrentUserId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id,email,firstName,lastName,username,phone,address,role,position,created_at')
      .order('created_at', { ascending: false });
    setUsers(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setCurrentUserId(session.user.id);
      await load();
    })();
  }, [load]);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q
      || (u.email     || '').toLowerCase().includes(q)
      || (u.firstName || '').toLowerCase().includes(q)
      || (u.lastName  || '').toLowerCase().includes(q)
      || (u.position  || '').toLowerCase().includes(q);
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const openEdit = (u: Profile) => {
    setEditId(u.id);
    setEditForm({
      role:      u.role,
      position:  u.position  || '',
      firstName: u.firstName || '',
      lastName:  u.lastName  || '',
      phone:     u.phone     || '',
      address:   u.address   || '',
    });
  };

  const handleSave = async () => {
    if (!editId || !editForm) return;
    setSaving(true);
    const old = users.find(u => u.id === editId)!;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role:      editForm.role,
          position:  editForm.position,
          firstName: editForm.firstName,
          lastName:  editForm.lastName,
          phone:     editForm.phone,
          address:   editForm.address,
        })
        .eq('id', editId);
      if (error) throw error;

      if (editForm.role !== old.role) {
        await supabase.from('audit_logs').insert({
          action: 'role_changed', performed_by: currentUserId,
          old_role: old.role, new_role: editForm.role,
          target_user: editId, notes: `Role changed from ${old.role} to ${editForm.role}`,
        });
      }
      if (editForm.position !== (old.position || '')) {
        await supabase.from('audit_logs').insert({
          action: 'position_changed', performed_by: currentUserId,
          old_position: old.position || '', new_position: editForm.position,
          target_user: editId, notes: 'Position updated by super_admin',
        });
      }

      setUsers(prev => prev.map(u => u.id === editId ? { ...u, ...editForm } : u));
      setToast({ msg: 'User updated successfully.', type: 'success' });
      setEditId(null);
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to update.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      await supabase.from('audit_logs').insert({
        action: 'user_deleted', performed_by: currentUserId,
        target_user: deleteTarget.id, notes: `Deleted profile: ${deleteTarget.email}`,
      });
      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      setToast({ msg: `${deleteTarget.email} removed.`, type: 'success' });
      setDeleteTarget(null);
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to delete.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    all:         users.length,
    super_admin: users.filter(u => u.role === 'super_admin').length,
    admin:       users.filter(u => u.role === 'admin').length,
    resident:    users.filter(u => u.role === 'resident').length,
  };

  return (
    <div className="p-8" style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Header */}
      <div className="mb-6">
        <p style={{ fontFamily: "'IBM Plex Mono', monospace" }}
           className="text-[10px] tracking-[0.18em] uppercase text-[#7a7870] dark:text-[#7e7b75] mb-1">
          Management
        </p>
        <h1 className="text-2xl font-semibold text-[#1a1917] dark:text-[#f0eee8]">Users</h1>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#a09e98]" />
          <input
            className={`${inputCls} pl-8`}
            placeholder="Search name, email, position…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#7a7870] dark:text-[#7e7b75]" />
          {(['all', ...ROLES] as const).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r as any)}
              className={`px-3 py-1.5 rounded text-[12px] border transition-colors
                ${roleFilter === r
                  ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400'
                  : 'bg-white dark:bg-[#1a1a20] border-[#dedad4] dark:border-[#2a2a32] text-[#5c5a54] dark:text-[#9e9b94] hover:bg-[#eeecea] dark:hover:bg-[#1e1e24]'
                }`}
            >
              {r === 'all' ? 'All' : r.replace('_', ' ')} ({counts[r === 'all' ? 'all' : r as Role]})
            </button>
          ))}
        </div>

        <button
          onClick={load}
          className="p-2 rounded border border-[#dedad4] dark:border-[#2a2a32] bg-white dark:bg-[#1a1a20]
            text-[#5c5a54] dark:text-[#9e9b94] hover:bg-[#eeecea] dark:hover:bg-[#1e1e24] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#dedad4] dark:border-[#2a2a32] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f3f0] dark:bg-[#1e1e24] border-b border-[#dedad4] dark:border-[#2a2a32]">
              {['Name', 'Email', 'Role', 'Position', 'Joined', 'Actions'].map(h => (
                <th key={h}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  className="text-left px-4 py-3 text-[10px] tracking-[0.15em] uppercase text-[#7a7870] dark:text-[#7e7b75] font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-[#1a1a20]">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-14 text-[#7a7870] dark:text-[#7e7b75] text-sm">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-14 text-[#7a7870] dark:text-[#7e7b75] text-sm">
                  No users found.
                </td>
              </tr>
            ) : filtered.map(u => (
              editId === u.id && editForm ? (
                /* ── Inline edit row ── */
                <tr key={u.id} className="bg-orange-50/50 dark:bg-orange-900/5 border-b border-orange-200 dark:border-orange-900/30">
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <input className={selectCls + ' w-24'} value={editForm.firstName}
                        onChange={e => setEditForm(f => f && ({ ...f, firstName: e.target.value }))} placeholder="First" />
                      <input className={selectCls + ' w-24'} value={editForm.lastName}
                        onChange={e => setEditForm(f => f && ({ ...f, lastName: e.target.value }))} placeholder="Last" />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#7a7870] dark:text-[#7e7b75] text-[12px]">{u.email}</td>
                  <td className="px-4 py-3">
                    <select className={selectCls} value={editForm.role}
                      onChange={e => setEditForm(f => f && ({ ...f, role: e.target.value as Role }))}>
                      {ROLES.map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select className={selectCls} value={editForm.position}
                      onChange={e => setEditForm(f => f && ({ ...f, position: e.target.value }))}>
                      {POSITIONS.map(p => <option key={p} value={p}>{p || '— none —'}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[#7a7870] dark:text-[#7e7b75] text-[12px]">
                    {new Date(u.created_at).toLocaleDateString('en-PH')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={handleSave} disabled={saving}
                        className="p-1.5 rounded border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 disabled:opacity-50 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditId(null)}
                        className="p-1.5 rounded border border-[#dedad4] dark:border-[#2a2a32] text-[#5c5a54] dark:text-[#9e9b94] hover:bg-[#eeecea] dark:hover:bg-[#1e1e24] transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                /* ── Normal row ── */
                <tr key={u.id} className="border-b border-[#f0ede8] dark:border-[#22222a] hover:bg-[#fafaf9] dark:hover:bg-[#1e1e24] transition-colors group">
                  <td className="px-4 py-3.5">
                    <p className="text-[13px] font-medium text-[#1a1917] dark:text-[#f0eee8]">
                      {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                    </p>
                    {u.username && (
                      <p style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                         className="text-[10px] text-[#a09e98] dark:text-[#5c5a54]">@{u.username}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-[#7a7870] dark:text-[#7e7b75]">{u.email || '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium tracking-[0.08em] uppercase ${ROLE_BADGE[u.role] || ROLE_BADGE.resident}`}>
                      {(u.role || 'resident').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-orange-600 dark:text-orange-400">
                    {u.position || <span className="text-[#a09e98] dark:text-[#5c5a54]">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-[#7a7870] dark:text-[#7e7b75]">
                    {new Date(u.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(u)} title="Edit"
                        className="p-1.5 rounded border border-[#dedad4] dark:border-[#2a2a32] text-[#5c5a54] dark:text-[#9e9b94]
                          hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 dark:hover:text-orange-400
                          hover:bg-orange-50 dark:hover:bg-orange-900/10 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteTarget(u)} disabled={u.id === currentUserId}
                        title={u.id === currentUserId ? "Can't delete yourself" : 'Delete'}
                        className="p-1.5 rounded border border-[#dedad4] dark:border-[#2a2a32] text-[#5c5a54] dark:text-[#9e9b94]
                          hover:border-red-300 dark:hover:border-red-800 hover:text-red-600 dark:hover:text-red-400
                          hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>

      <p style={{ fontFamily: "'IBM Plex Mono', monospace" }}
         className="text-[10px] text-[#a09e98] dark:text-[#5c5a54] mt-3">
        {filtered.length} of {users.length} users
      </p>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1a1a20] border border-red-200 dark:border-red-900/50 rounded-xl p-7 max-w-sm w-full mx-4 shadow-xl"
               style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
            <h3 className="text-[15px] font-semibold text-[#1a1917] dark:text-[#f0eee8] mb-2">Delete user?</h3>
            <p className="text-[13px] text-[#7a7870] dark:text-[#7e7b75] mb-6">
              This removes{' '}
              <span className="font-medium text-[#1a1917] dark:text-[#f0eee8]">{deleteTarget.email}</span>{' '}
              from profiles. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded border border-[#dedad4] dark:border-[#2a2a32] text-[13px]
                  text-[#5c5a54] dark:text-[#9e9b94] hover:bg-[#eeecea] dark:hover:bg-[#1e1e24] transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={saving}
                className="px-4 py-2 rounded border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20
                  text-[13px] text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50">
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
