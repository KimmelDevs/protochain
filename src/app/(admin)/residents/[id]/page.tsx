'use client';

import { use, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/Card';
import Badge from '@/app/components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/Table';
import Button from '@/app/components/ui/Button';
import {
  ArrowLeft, User, Mail, Phone, MapPin, Calendar,
  FileText, Clock, CheckCircle, XCircle, Loader2, Eye,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/app/lib/supabase';

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  birthday: string | null;
  civilStatus: string | null;
  username: string | null;
  role: string | null;
  avatar_base64: string | null;
  created_at: string;
}

interface Request {
  id: string;
  type: string;
  document_type: string;
  status: string;
  purpose: string;
  custom_purpose: string | null;
  created_at: string;
  file_url: string | null;
}

export default function ResidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        // ✅ Fetch profile via API route — decrypts phone, address, birthday
        const profileRes = await fetch(`/api/profile?id=${id}`);
        if (!profileRes.ok) { setNotFound(true); return; }
        const profileJson = await profileRes.json();
        if (!profileJson.data) { setNotFound(true); return; }

        // Also fetch non-encrypted fields not in the API response (avatar, username, role, created_at)
        const { data: extraData } = await supabase
          .from('profiles')
          .select('id, username, role, avatar_base64, created_at')
          .eq('id', id)
          .single();

        setProfile({
          ...profileJson.data,
          id,
          username: extraData?.username ?? null,
          role: extraData?.role ?? null,
          avatar_base64: extraData?.avatar_base64 ?? null,
          created_at: extraData?.created_at ?? '',
        });

        // Requests don't need decryption for the list view (no sensitive fields displayed here)
        const { data: requestsData } = await supabase
          .from('requests')
          .select('id, type, document_type, status, purpose, custom_purpose, created_at, file_url')
          .eq('user_id', id)
          .order('created_at', { ascending: false });

        setRequests(requestsData ?? []);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
    </div>
  );

  if (notFound || !profile) return (
    <div className="min-h-screen p-4 lg:p-8 flex items-center justify-center">
      <Card><CardContent className="p-8 text-center">
        <p className="text-gray-400 mb-4">Resident not found</p>
        <Link href="/residents"><Button>Back to Residents</Button></Link>
      </CardContent></Card>
    </div>
  );

  const getInitials = (first: string, last: string) =>
    `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase() || '?';

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '—';

  const stats = {
    total: requests.length,
    approved: requests.filter(r => r.status === 'approved').length,
    pending: requests.filter(r => r.status === 'pending').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const displayPurpose = (r: Request) =>
    r.purpose === 'others' && r.custom_purpose ? r.custom_purpose : r.purpose ?? '—';

  const statusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === 'rejected') return <XCircle className="w-4 h-4 text-red-400" />;
    return <Clock className="w-4 h-4 text-yellow-400" />;
  };

  const requestLink = (r: Request) => {
    if (r.status === 'approved') return `/approved-documents/${r.id}`;
    if (r.status === 'rejected') return `/rejected-requests/${r.id}`;
    return `/pending-requests/${r.id}`;
  };

  return (
  <div className="min-h-screen p-4 lg:p-8 bg-gray-50 dark:bg-[#0f0f23] transition-colors">
    <div className="max-w-5xl mx-auto">

      <Link href="/residents">
        <Button variant="ghost" className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" />Back to Residents
        </Button>
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
          {profile.firstName} {profile.lastName}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 font-mono text-sm">ID: {id.toUpperCase()}</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left sidebar */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 text-center">
              {profile.avatar_base64 ? (
                <img src={profile.avatar_base64} alt="Profile"
                  className="w-28 h-28 rounded-full object-cover border-4 border-gray-200/20 dark:border-white/10 mx-auto mb-4" />
              ) : (
                <div className="w-28 h-28 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4">
                  {getInitials(profile.firstName, profile.lastName)}
                </div>
              )}
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{profile.firstName} {profile.lastName}</h2>
              {profile.username && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">@{profile.username}</p>}
              <div className="mt-3"><Badge variant="approved">resident</Badge></div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">Member since {memberSince}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Request Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Total', value: stats.total, color: 'text-gray-900 dark:text-white' },
                { label: 'Approved', value: stats.approved, color: 'text-green-600 dark:text-green-400' },
                { label: 'Pending', value: stats.pending, color: 'text-yellow-600 dark:text-yellow-400' },
                { label: 'Rejected', value: stats.rejected, color: 'text-red-600 dark:text-red-400' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-400">{s.label}</span>
                  <span className={`font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Personal Info */}
          <Card>
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <IconRow icon={<Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />} label="Email" value={profile.email} />
                <IconRow icon={<Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />} label="Phone" value={profile.phone || '—'} />
                <IconRow icon={<MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400" />} label="Address" value={profile.address || '—'} />
                <IconRow icon={<Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />} label="Birthday"
                  value={profile.birthday ? new Date(profile.birthday).toLocaleDateString() : '—'} />
              </div>
              {profile.civilStatus && <DetailRow label="Civil Status" value={profile.civilStatus} />}
            </CardContent>
          </Card>

          {/* Request History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Request History ({requests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center py-10">
                  <FileText className="w-10 h-10 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm">No requests submitted yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-900 dark:text-white">Document</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Purpose</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Date</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Status</TableHead>
                      <TableHead className="text-gray-900 dark:text-white">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((req) => (
                      <TableRow key={req.id} className="hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                            <span className="text-gray-900 dark:text-white text-sm">{req.type ?? req.document_type ?? '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700 dark:text-gray-300 capitalize">{displayPurpose(req)}</TableCell>
                        <TableCell className="text-sm text-gray-700 dark:text-gray-300">{new Date(req.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {statusIcon(req.status)}
                            <Badge variant={req.status as any}>{req.status}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={requestLink(req)}>
                            <Button variant="ghost" size="sm" className="gap-1">
                              <Eye className="w-4 h-4" />View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-gray-700 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-gray-900 dark:text-white font-medium">{value}</p>
    </div>
  );
}

function IconRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-gray-700 dark:text-gray-400">{label}</p>
        <p className="text-gray-900 dark:text-white text-sm">{value}</p>
      </div>
    </div>
  );
}