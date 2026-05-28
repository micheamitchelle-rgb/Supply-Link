'use client';

import { useState } from 'react';
import type { PendingEvent } from '@/lib/types';
import { formatMultiSigError, isReplayError, isExpiredEventError } from '@/lib/utils/nonce';

interface Props {
  productId: string;
  pendingEvents: PendingEvent[];
  isOwner: boolean;
  onApprove?: (pendingEventId: number) => Promise<void>;
  onReject?: (pendingEventId: number, reason?: string) => Promise<void>;
}

export function PendingEventApprovalPanel({
  productId,
  pendingEvents,
  onApprove,
  onReject,
}: PendingEventApprovalPanelProps) {
  const walletAddress = useStore((s) => s.walletAddress);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function handleApprove(event: PendingEvent) {
    if (!walletAddress) { setError("Connect your wallet first."); return; }
    setPending(event.submitter);
    setError("");
    try {
      await onApprove?.(productId, event.submitter);
    } catch {
      setError("Transaction failed. Please try again.");
    } finally {
      setPending(null);
    }
  }

  async function handleReject(event: PendingEvent) {
    if (!walletAddress) { setError("Connect your wallet first."); return; }
    setPending(event.submitter);
    setError("");
    try {
      await onReject?.(productId, event.submitter);
    } catch {
      setError("Transaction failed. Please try again.");
    } finally {
      setPending(null);
    }
  }

  if (pendingEvents.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)] py-4 text-center">
        No pending events awaiting approval.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-xs text-red-500">{error}</p>}
      {pendingEvents.map((event) => {
        const expired = isExpired(event);
        const isApprover = walletAddress
          ? event.requiredApprovers.includes(walletAddress)
          : false;
        const alreadyApproved = walletAddress
          ? event.approvals.includes(walletAddress)
          : false;
        const isPending = pending === event.submitter;

        return (
          <div
            key={event.submitter}
            className={`border border-[var(--card-border)] rounded-xl p-4 flex flex-col gap-3 ${
              expired || event.rejected ? "opacity-50" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[var(--foreground)]">
                  {event.eventType} — {event.location}
                </span>
                <span className="text-xs text-[var(--muted)] font-mono">
                  Submitted by {event.submitter.slice(0, 8)}…{event.submitter.slice(-6)}
                </span>
                <span className="text-xs text-[var(--muted)]">
                  {new Date(event.submittedAt * 1000).toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col items-end gap-1">
                {event.rejected && (
                  <span className="text-xs text-red-500 font-medium">Rejected</span>
                )}
                {expired && !event.rejected && (
                  <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                    <Clock size={11} /> Expired
                  </span>
                )}
                {!expired && !event.rejected && (
                  <span className="text-xs text-[var(--muted)]">
                    Approvals: {approvalProgress(event)}
                  </span>
                )}
              </div>
            </div>

            {!expired && !event.rejected && isApprover && !alreadyApproved && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(event)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
                >
                  {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  Approve
                </button>
                <button
                  onClick={() => handleReject(event)}
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
                >
                  {isPending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                  Reject
                </button>
              </div>
            )}
            {alreadyApproved && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle size={11} /> You approved this event
              </span>
            )}
          </div>
        );
      })}
  isOwner,
  onApprove,
  onReject,
}: Props) {
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'replay' | 'expired' | 'generic' | null>(null);

  if (pendingEvents.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No pending events awaiting approval.</p>;
  }

  const handleApprove = async (pendingEventId: number) => {
    setLoadingId(pendingEventId);
    setError(null);
    setErrorType(null);
    try {
      if (onApprove) await onApprove(pendingEventId);
    } catch (err) {
      const msg = formatMultiSigError(err);
      setError(msg);
      setErrorType(
        isReplayError(err) ? 'replay' : isExpiredEventError(err) ? 'expired' : 'generic',
      );
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (pendingEventId: number) => {
    setLoadingId(pendingEventId);
    setError(null);
    setErrorType(null);
    try {
      if (onReject) await onReject(pendingEventId);
    } catch (err) {
      const msg = formatMultiSigError(err);
      setError(msg);
      setErrorType(
        isReplayError(err) ? 'replay' : isExpiredEventError(err) ? 'expired' : 'generic',
      );
    } finally {
      setLoadingId(null);
    }
  };

  const errorBg =
    errorType === 'replay'
      ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
      : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200';

  return (
    <div className="space-y-4">
      {error && (
        <div className={`p-3 rounded-lg text-sm ${errorBg}`}>
          {errorType === 'replay' && <span className="font-semibold mr-1">Replay detected:</span>}
          {errorType === 'expired' && <span className="font-semibold mr-1">Event expired:</span>}
          {error}
        </div>
      )}

      {pendingEvents.map((pending) => {
        const isExpired =
          pending.expiration !== undefined && Date.now() / 1000 > pending.expiration;

        return (
          <div
            key={pending.pendingEventId}
            className="border border-[var(--card-border)] rounded-lg p-4 bg-[var(--card-hover)]"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[var(--foreground)]">
                    {pending.event.eventType}
                  </p>
                  {isExpired && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300">
                      Expired
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--muted)] mt-1">
                  Location: {pending.event.location}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Submitted: {new Date(pending.createdAt * 1000).toLocaleString()}
                </p>
                <p className="text-xs font-mono text-[var(--muted)] mt-0.5">
                  Event #{pending.pendingEventId}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-medium text-[var(--foreground)]">
                  {pending.approvals.length}/{pending.requiredSignatures}
                </p>
                <p className="text-xs text-[var(--muted)]">approvals</p>
              </div>
            </div>

            <div className="w-full h-2 bg-[var(--card-border)] rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
                style={{
                  width: `${(pending.approvals.length / pending.requiredSignatures) * 100}%`,
                }}
              />
            </div>

            <div className="mb-3">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase mb-2">Approvals</p>
              <div className="space-y-1">
                {pending.approvals.map((approver, i) => (
                  <p key={i} className="text-xs font-mono text-[var(--foreground)] break-all">
                    ✓ {approver.slice(0, 8)}...{approver.slice(-8)}
                  </p>
                ))}
              </div>
            </div>

            {isOwner && !isExpired && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(pending.pendingEventId)}
                  disabled={loadingId === pending.pendingEventId}
                  className="flex-1 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingId === pending.pendingEventId ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={() => handleReject(pending.pendingEventId)}
                  disabled={loadingId === pending.pendingEventId}
                  className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loadingId === pending.pendingEventId ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
