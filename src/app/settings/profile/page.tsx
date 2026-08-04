'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { toast } from 'sonner';
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Calendar,
  LogOut,
  LogIn,
  Save,
  Loader2,
  Check,
  RotateCcw,
  Download,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SettingsNav } from '@/components/settings/SettingsNav';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  provider: string;
  memberSince: string | null;
}

const PROVIDER_LABELS: Record<string, string> = {
  github: 'GitHub',
  google: 'Google',
};

function initialsOf(name?: string | null, email?: string | null) {
  return (name || email || 'U').charAt(0).toUpperCase();
}

export default function ProfileSettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [imageDraft, setImageDraft] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Data Export & Danger Zone states
  const [exporting, setExporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setProfile(data.profile);
            setNameDraft(data.profile?.name ?? '');
            setImageDraft(data.profile?.image ?? '');
          }
        }
      } catch {
        // DB unreachable fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayProfile: Profile | null =
    profile ??
    (session?.user
      ? {
          id: session.user.id,
          name: session.user.name ?? '',
          email: session.user.email ?? '',
          image: session.user.image ?? '',
          provider: 'unknown',
          memberSince: null,
        }
      : null);

  const avatarUrl = imageDraft.trim();
  const displayImage = avatarUrl && !avatarFailed ? avatarUrl : session?.user?.image || null;

  const handleSave = async () => {
    if (!nameDraft.trim()) {
      toast.error('Display name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameDraft, image: imageDraft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile.');
      }
      setProfile(data.profile);
      setNameDraft(data.profile?.name ?? '');
      setImageDraft(data.profile?.image ?? '');
      try {
        await update();
      } catch {
        // session fallback
      }
      toast.success('Profile updated successfully.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetAvatar = async () => {
    setImageDraft('');
    setAvatarFailed(false);
    setSaving(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameDraft, image: '' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setProfile(data.profile);
        try {
          await update();
        } catch {
          // fallback
        }
        toast.success('Avatar reset to provider image.');
      }
    } catch {
      toast.error('Failed to reset avatar.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/user/export');
      if (!res.ok) throw new Error('Failed to generate export');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `eraser-user-data-${displayProfile?.id || 'export'}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Your data backup has been downloaded.');
    } catch {
      toast.error('Failed to export account data.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type DELETE to confirm.');
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }
      toast.success('Account permanently deleted.');
      await signOut({ redirect: false, callbackUrl: '/' });
      router.push('/');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete account');
      setDeleting(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut({ redirect: false, callbackUrl: '/' });
    setSigningOut(false);
    toast.success('Signed out successfully.');
    router.push('/');
  };

  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'unauthenticated' || !displayProfile) {
    return (
      <div className="flex h-full w-full flex-col bg-background">
        <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b px-4">
          <div className="flex items-center gap-3">
            <Link href="/settings">
              <span className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </span>
            </Link>
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm font-bold text-xs">
              A
            </div>
            <span className="text-sm font-semibold text-foreground">Profile Settings</span>
          </div>
          <SettingsNav active="profile" />
        </header>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-xl border bg-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <User className="h-6 w-6" />
            </div>
            <h2 className="text-base font-bold text-foreground">Sign in to manage your profile</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Your profile is stored in the cloud. Sign in to edit your display name and avatar.
            </p>
            <Link href="/login" className="mt-5 inline-flex">
              <Button className="gap-1.5">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const providerLabel =
    PROVIDER_LABELS[displayProfile.provider] ??
    displayProfile.provider.charAt(0).toUpperCase() + displayProfile.provider.slice(1);
  const memberSince = displayProfile.memberSince
    ? new Date(displayProfile.memberSince).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
      })
    : null;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b px-4">
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <span className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </span>
          </Link>
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-sm font-bold text-xs">
            A
          </div>
          <span className="text-sm font-semibold text-foreground">Profile Settings</span>
        </div>
        <SettingsNav active="profile" />
      </header>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">
          {/* Identity summary */}
          <section className="mb-8">
            <div className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {displayImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={displayImage}
                      alt={displayProfile.name || 'User avatar'}
                      className="h-16 w-16 rounded-full border object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-xl font-bold text-white shadow-sm">
                      {initialsOf(displayProfile.name, displayProfile.email)}
                    </div>
                  )}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-emerald-500 text-white"
                    title="Cloud synced account"
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-lg font-bold text-foreground">
                    {displayProfile.name || 'User'}
                  </h1>
                  <p className="truncate text-sm text-muted-foreground">
                    {displayProfile.email || 'No email provided'}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-50/50 px-2 py-0.5 text-[10px] font-semibold text-foreground dark:bg-blue-950/40">
                      <Shield className="h-3 w-3 text-blue-500" />
                      {providerLabel}
                    </span>
                    {memberSince && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Since {memberSince}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Personal information */}
          <section className="mb-8">
            <div className="mb-3 flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
            </div>
            <div className="space-y-5 rounded-xl border bg-card p-5">
              <div>
                <label htmlFor="profile-name" className="mb-1.5 block text-xs font-semibold text-foreground">
                  Display name
                </label>
                <Input
                  id="profile-name"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={80}
                  placeholder="Your name"
                  autoComplete="name"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Shown in the header and on documents you share.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="profile-avatar" className="text-xs font-semibold text-foreground">
                    Avatar Image URL
                  </label>
                  <button
                    type="button"
                    onClick={handleResetAvatar}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reset to Provider Avatar
                  </button>
                </div>
                <Input
                  id="profile-avatar"
                  value={imageDraft}
                  onChange={(e) => {
                    setImageDraft(e.target.value);
                    setAvatarFailed(false);
                  }}
                  type="url"
                  placeholder="https://example.com/avatar.png"
                  autoComplete="off"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Enter a direct image URL or reset to use your sign-in provider ({providerLabel}) avatar.
                </p>
              </div>

              <div>
                <span className="mb-1.5 block text-xs font-semibold text-foreground">Email address</span>
                <div className="flex h-9 items-center gap-2 rounded-3xl border border-transparent bg-input/50 px-3 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{displayProfile.email || 'Not provided'}</span>
                  <span className="ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                    Read only
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Your email is managed by your sign-in provider ({providerLabel}).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 border-t pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving || !nameDraft.trim()}
                  className="gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </div>
          </section>

          {/* Account Data Export */}
          <section className="mb-8">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Download className="h-4 w-4 text-blue-500" />
                    Download Account Data
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Export a backup of your personal documents, diagrams, and profile settings in JSON format.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportData}
                  disabled={exporting}
                  className="gap-1.5 shrink-0"
                >
                  {exporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Export Data
                </Button>
              </div>
            </div>
          </section>

          {/* Session & Danger Zone */}
          <section className="space-y-4">
            <div className="rounded-xl border border-muted bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">Sign out</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    End this session and return to local guest mode.
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="shrink-0 gap-1.5"
                >
                  {signingOut ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                  Sign Out
                </Button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-destructive flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Danger Zone
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Permanently delete your cloud account and remove all associated whiteboards and diagrams.
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="shrink-0 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Account
                </Button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Account Deletion Modal */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete Account Permanently
            </DialogTitle>
            <DialogDescription className="mt-2 text-xs">
              This action cannot be undone. All your saved documents, whiteboards, diagrams, and personal preferences will be permanently wiped from Neon Postgres.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 space-y-2">
            <label className="text-xs font-semibold text-foreground">
              Type <span className="font-bold text-destructive">DELETE</span> to confirm:
            </label>
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              className="h-9 text-xs"
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'DELETE' || deleting}
              className="gap-1.5"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleting ? 'Deleting…' : 'Permanently Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
