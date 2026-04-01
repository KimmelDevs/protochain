'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase'; // ← shared client
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  FunnelIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

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

const ROLE_PILL: Record<string, string> = {
  super_admin: 'bg-violet-900/50 text-violet-300 border-violet-700/50',
  admin:       'bg-sky-900/50 text-sky-300 border-sky-700/50',
  resident:    'bg-emerald-900/30 text-emerald-400 border-emerald-800/40',
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
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border text-sm font-mono max-w-xs shadow-2xl
      ${type === 'success'
        ? 'bg-emerald-950 border-emerald-800 text-emerald-300'
        : 'bg-red-950 border-red-800 text-red-300'}`}>
      {msg}
    </div>
  );
}

export default function UsersPage() {
  const [users,        setUsers]        = useState<Profile[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState<'all' | Role>('all');
  const [editId,       setEditId]       = useState<string | null>(null);
  const [editForm,     setEditForm]     = useState<EditState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [saving,       setSaving]       = useState(false);
  const [toast,        setToast]        = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
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
      || (u.email      || '').toLowerCase().includes(q)
      || (u.firstName  || '').toLowerCase().includes(q)
      || (u.lastName   || '').toLowerCase().includes(q)
      || (u.position   || '').toLowerCase().includes(q);
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

      // Log role change
      if (editForm.role !== old.role) {
        await supabase.from('audit_logs').insert({
          action:          'role_changed',
          performed_by:    currentUserId,
          old_role:        old.role,
          new_role:        editForm.role,
          target_user:     editId,
          notes:           `Role changed from ${old.role} to ${editForm.role}`,
        });
      }

      // Log position change
      if (editForm.position !== (old.position || '')) {
        await supabase.from('audit_logs').insert({
          action:          'position_changed',
          performed_by:    currentUserId,
          old_position:    old.position || '',
          new_position:    editForm.position,
          target_user:     editId,
          notes:           'Position updated by super_admin',
        });
      }

      setUsers(prev => prev.map(u => u.id === editId ? { ...u, ...editForm } : u));
      setToast({ msg: 'User updated successfully.', type: 'success' });
      setEditId(null);
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to update user.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        action:       'user_deleted',
        performed_by: currentUserId,
        target_user:  deleteTarget.id,
        notes:        `Deleted profile: ${deleteTarget.email}`,
      });

      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      setToast({ msg: `${deleteTarget.email} removed.`, type: 'success' });
      setDeleteTarget(null);
    } catch (e: any) {
      setToast({ msg: e.message || 'Failed to delete user.', type: 'error' });
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
    <div className="p-8 font-mono">

      {/* Header */}
      <div className="mb-7">
        <p className="text-[10px] tracking-widest uppercase text-[#374151] mb-2">Management</p>
        <h1 className="text-2xl font-bold text-white">Users</h1>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="relative flex-1 min-w-52">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#374151]" />
          <input
            className="w-full bg-[#0D0D16] border border-[#13111F] rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#374151] focus:outline-none focus:border-violet-700/60 focus:ring-1 focus:ring-violet-700/30"
            placeholder="Search name, email, position…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <FunnelIcon className="w-4 h-4 text-[#374151]" />
          {(['all', ...ROLES] as const).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r as any)}
              className={`px-3 py-2 rounded-lg text-[11px] tracking-wide border transition-all
                ${roleFilter === r
                  ? 'bg-violet-600/20 text-violet-300 border-violet-700/50'
                  : 'bg-[#0D0D16] text-[#4B5563] border-[#13111F] hover:text-[#9CA3AF]'
                }`}
            >
              {r === 'all' ? 'All' : r.replace('_', ' ')} ({counts[r === 'all' ? 'all' : r as Role]})
            </button>
          ))}
        </div>

        <button
          onClick={load}
          className="p-2.5 rounded-lg bg-[#0D0D16] border border-[#13111F] text-[#4B5563] hover:text-white transition-all"
        >
          <ArrowPathIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#13111F] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#13111F] bg-[#0A0A12]">
              {['Name', 'Email', 'Role', 'Position', 'Joined', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] tracking-widest uppercase text-[#374151] font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-[#374151] text-sm">Loading…</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-[#374151] text-sm">No users found.</td>
              </tr>
            ) : filtered.map(u => (
              editId === u.id && editForm ? (
                /* Inline edit row */
                <tr key={u.id} className="bg-violet-950/10 border-b border-violet-800/20">
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <input
                        className="bg-[#0A0A12] border border-[#1E1B2E] rounded-lg px-2 py-1.5 text-white text-xs w-24 focus:outline-none focus:border-violet-600"
                        value={editForm.firstName}
                        onChange={e => setEditForm(f => f && ({ ...f, firstName: e.target.value }))}
                        placeholder="First"
                      />
                      <input
                        className="bg-[#0A0A12] border border-[#1E1B2E] rounded-lg px-2 py-1.5 text-white text-xs w-24 focus:outline-none focus:border-violet-600"
                        value={editForm.lastName}
                        onChange={e => setEditForm(f => f && ({ ...f, lastName: e.target.value }))}
                        placeholder="Last"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#4B5563] text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <select
                      className="bg-[#0A0A12] border border-[#1E1B2E] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-violet-600"
                      value={editForm.role}
                      onChange={e => setEditForm(f => f && ({ ...f, role: e.target.value as Role }))}
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="bg-[#0A0A12] border border-[#1E1B2E] rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-violet-600"
                      value={editForm.position}
                      onChange={e => setEditForm(f => f && ({ ...f, position: e.target.value }))}
                    >
                      {POSITIONS.map(p => (
                        <option key={p} value={p}>{p || '— none —'}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[#374151] text-xs">
                    {new Date(u.created_at).toLocaleDateString('en-PH')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="p-1.5 rounded-lg bg-violet-600/20 border border-violet-700/40 text-violet-300 hover:bg-violet-600/30 disabled:opacity-50 transition-all"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="p-1.5 rounded-lg bg-[#0D0D16] border border-[#13111F] text-[#4B5563] hover:text-white transition-all"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                /* Normal row */
                <tr key={u.id} className="border-b border-[#0D0D16] hover:bg-[#0D0D16] transition-colors group">
                  <td className="px-4 py-3.5">
                    <p className="text-white font-medium text-sm">
                      {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                    </p>
                    {u.username && (
                      <p className="text-[#374151] text-[11px]">@{u.username}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[#6B7280] text-xs">{u.email || '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-semibold tracking-widest uppercase ${ROLE_PILL[u.role] || ROLE_PILL.resident}`}>
                      {(u.role || 'resident').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-violet-400 text-xs">
                    {u.position || <span className="text-[#374151]">—</span>}
                  </td>
                  <td className="px-4 py-3.5 text-[#374151] text-xs">
                    {new Date(u.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 rounded-lg bg-[#111118] border border-[#1E1B2E] text-[#4B5563] hover:text-violet-300 hover:border-violet-700/40 transition-all"
                        title="Edit user"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(u)}
                        disabled={u.id === currentUserId}
                        className="p-1.5 rounded-lg bg-[#111118] border border-[#1E1B2E] text-[#4B5563] hover:text-red-400 hover:border-red-900/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title={u.id === currentUserId ? "Can't delete your own account" : 'Delete user'}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[#374151] text-xs mt-3">{filtered.length} of {users.length} users</p>

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#0D0D16] border border-red-900/50 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-white font-bold text-lg mb-2">Delete user?</h3>
            <p className="text-[#4B5563] text-sm mb-6">
              This removes{' '}
              <span className="text-white font-medium">{deleteTarget.email}</span>{' '}
              from profiles. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg bg-[#111118] border border-[#1E1B2E] text-[#4B5563] hover:text-white text-sm transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-950 border border-red-800 text-red-300 hover:bg-red-900 text-sm transition-all disabled:opacity-50"
              >
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
