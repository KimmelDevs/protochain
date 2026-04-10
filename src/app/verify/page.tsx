'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldX, Loader2, Search } from 'lucide-react';
import { verifyDocumentOnChain, type VerifyResult } from '@/app/lib/blockchain';

export default function VerifyPage() {
  const [hash,    setHash]    = useState('');
  const [result,  setResult]  = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleVerify = async () => {
    if (!hash.trim()) { setError('Please enter a document hash.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const r = await verifyDocumentOnChain(hash.trim());
      setResult(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 lg:p-8 bg-gray-50 dark:bg-[#0f0f23] transition-colors duration-300">
      <div className="max-w-xl mx-auto">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-orange-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Verify Document
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Paste the SHA-256 hash from your barangay document to confirm it was officially
            recorded on the blockchain.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-6 mb-4"
        >
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Document SHA-256 Hash
          </label>
          <textarea
            value={hash}
            onChange={e => setHash(e.target.value)}
            rows={3}
            placeholder="Paste your 64-character SHA-256 hash here…"
            className="w-full font-mono text-sm bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg p-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:border-orange-500 resize-none mb-4"
          />

          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}

          <button
            onClick={handleVerify}
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</>
              : <><Search  className="w-4 h-4" />Verify on Blockchain</>
            }
          </button>
        </motion.div>

        {/* Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-6 ${
              result.exists
                ? 'border-emerald-400/40 bg-emerald-50 dark:bg-emerald-950/20'
                : 'border-red-400/40 bg-red-50 dark:bg-red-950/20'
            }`}
          >
            {result.exists ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <p className="text-emerald-700 dark:text-emerald-400 font-semibold text-lg">
                    Authentic Document
                  </p>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">
                      Document Type
                    </p>
                    <p className="text-gray-900 dark:text-white font-medium capitalize">
                      {result.documentType.replace(/-/g, ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">
                      Recorded On
                    </p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {new Date(result.timestamp * 1000).toLocaleString('en-PH', {
                        year:   'numeric',
                        month:  'long',
                        day:    'numeric',
                        hour:   '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider mb-1">
                      Recorded By (Wallet)
                    </p>
                    <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-all">
                      {result.recordedBy}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <ShieldX className="w-6 h-6 text-red-500 shrink-0" />
                <div>
                  <p className="text-red-600 dark:text-red-400 font-semibold">
                    Not Found on Blockchain
                  </p>
                  <p className="text-red-500/80 dark:text-red-400/70 text-sm mt-1">
                    This hash has no record. The document may be unverified or the hash may be incorrect.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}

      </div>
    </div>
  );
}
