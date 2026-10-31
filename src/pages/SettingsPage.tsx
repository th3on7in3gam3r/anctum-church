import React, { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Building, Palette, Shield, Sliders, Save, AlertTriangle, Check, CreditCard, Users, Video } from 'lucide-react';
import { cmsApi } from '../services/api/cmsApi';
import { slugify } from '../lib/utils';
import { useUnsavedChanges } from '../hooks/useUnsavedChanges';
import { ComingSoonBadge } from '../components/common/ComingSoonBadge';
import { RealtimeEngineStatus } from '../components/common/RealtimeEngineStatus';
import { TeamInvitePanel } from '../components/dashboard/TeamInvitePanel';
import { LogoUrlField } from '../components/common/LogoUrlField';
import { ApiClientError, sanctumApi } from '../services/api/sanctumApi';

interface SettingsPageProps {
  onNavigate: (path: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const { organization, updateOrganization, user, refreshAuth } = useAuth();
  const { addToast, confirmAction, setHasUnsavedChanges } = useApp();
  const showTeamTab = user?.role === 'OWNER';
  const showMediaTab = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const actor = { userId: user?.id, organizationId: organization.id };

  const [activeTab, setActiveTab] = useState<
    'GENERAL' | 'MEDIA' | 'BRANDING' | 'DEFAULTS' | 'SECURITY' | 'BILLING' | 'TEAM'
  >('GENERAL');

  const [name, setName] = useState(organization.name);
  const [slug, setSlug] = useState(organization.slug);
  const [country, setCountry] = useState(organization.country);
  const [timezone, setTimezone] = useState(organization.timezone);
  const [website, setWebsite] = useState(organization.website || '');

  const [joinPageMessage, setJoinPageMessage] = useState(organization.joinPageMessage || 'Join your church family in prayer.');
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl || '');
  const [primaryColor, setPrimaryColor] = useState(organization.primaryColor || '#203C32');
  const [accentColor, setAccentColor] = useState(organization.accentColor || '#C9A35A');

  const [defaultLowBandwidth, setDefaultLowBandwidth] = useState(true);
  const [autoMuteAllOnJoin, setAutoMuteAllOnJoin] = useState(true);
  const [allowPrayerRequests, setAllowPrayerRequests] = useState(true);
  const [confirmDeleteName, setConfirmDeleteName] = useState('');
  const [deletingSpace, setDeletingSpace] = useState(false);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [checkingYoutube, setCheckingYoutube] = useState(false);
  const [youtubeInput, setYoutubeInput] = useState(organization.youtubeChannelInput || '');
  const [sermonSpeaker, setSermonSpeaker] = useState(organization.defaultSermonSpeaker || '');
  const [speakerAliases, setSpeakerAliases] = useState((organization.speakerAliases || []).join('\n'));
  const [youtubeFound, setYoutubeFound] = useState('');

  const [savedDefaults, setSavedDefaults] = useState({
    defaultLowBandwidth: true,
    autoMuteAllOnJoin: true,
    allowPrayerRequests: true,
  });

  const isDirty = useMemo(() => {
    return (
      name !== organization.name ||
      slug !== organization.slug ||
      country !== organization.country ||
      timezone !== organization.timezone ||
      website !== (organization.website || '') ||
      joinPageMessage !== (organization.joinPageMessage || 'Join your church family in prayer.') ||
      logoUrl !== (organization.logoUrl || '') ||
      primaryColor !== (organization.primaryColor || '#203C32') ||
      accentColor !== (organization.accentColor || '#C9A35A') ||
      defaultLowBandwidth !== savedDefaults.defaultLowBandwidth ||
      autoMuteAllOnJoin !== savedDefaults.autoMuteAllOnJoin ||
      allowPrayerRequests !== savedDefaults.allowPrayerRequests
    );
  }, [
    name,
    slug,
    country,
    timezone,
    website,
    joinPageMessage,
    logoUrl,
    primaryColor,
    accentColor,
    defaultLowBandwidth,
    autoMuteAllOnJoin,
    allowPrayerRequests,
    organization,
    savedDefaults,
  ]);

  useUnsavedChanges(isDirty);

  const requestTabChange = (nextTab: typeof activeTab) => {
    if (nextTab === activeTab) return;
    if (!isDirty) {
      setActiveTab(nextTab);
      return;
    }
    confirmAction({
      title: 'Discard unsaved changes?',
      description: 'Your changes have not been saved.',
      confirmText: 'Discard Changes',
      cancelText: 'Stay Here',
      isDestructive: true,
      onConfirm: () => setActiveTab(nextTab),
    });
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingGeneral) return;
    const nextSlug = slug || slugify(name);
    setSavingGeneral(true);
    try {
      const result = await sanctumApi.updateCurrentSpace(
        { name, slug: nextSlug, country, timezone, website },
        actor
      );
      updateOrganization({
        name,
        slug: nextSlug,
        country,
        timezone,
        website,
        ...(result.organization as Partial<typeof organization>),
      });
      addToast('Sanctum Space settings saved', 'success');
      setHasUnsavedChanges(false);
    } catch (error) {
      addToast(error instanceof ApiClientError ? error.message : 'Could not save settings.', 'error');
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingBranding) return;
    setSavingBranding(true);
    try {
      const result = await sanctumApi.updateCurrentSpace(
        { joinPageMessage, accentColor, logoUrl },
        actor
      );
      updateOrganization({
        joinPageMessage,
        primaryColor,
        accentColor,
        logoUrl: logoUrl.trim() || undefined,
        ...(result.organization as Partial<typeof organization>),
      });
      addToast('Branding saved', 'success');
      setHasUnsavedChanges(false);
    } catch (error) {
      addToast(error instanceof ApiClientError ? error.message : 'Could not save branding.', 'error');
    } finally {
      setSavingBranding(false);
    }
  };

  const canConfirmDelete =
    confirmDeleteName.trim().toLowerCase() === organization.name.trim().toLowerCase();

  const handleDeleteSpace = () => {
    if (!canConfirmDelete) {
      addToast('Type the exact church name to confirm.', 'warning');
      return;
    }
    confirmAction({
      title: 'Delete this Sanctum Space?',
      description: `This cannot be undone. Prayer rooms, team invites, and history for ${organization.name} will be removed. Join links for those rooms will stop working. Other churches are not affected.`,
      confirmText: 'Delete Space',
      cancelText: 'Keep Space',
      isDestructive: true,
      onConfirm: () => {
        void (async () => {
          setDeletingSpace(true);
          try {
            await sanctumApi.deleteCurrentSpace({ confirmName: organization.name }, actor);
            setHasUnsavedChanges(false);
            try {
              await refreshAuth();
            } catch {
              /* session is still signed in; /api/me will report onboarding */
            }
            addToast('Sanctum Space deleted. Create a new one when you are ready.', 'info');
            onNavigate('/onboarding');
          } catch (error) {
            addToast(
              error instanceof ApiClientError ? error.message : 'Could not delete this Sanctum Space.',
              'error'
            );
          } finally {
            setDeletingSpace(false);
          }
        })();
      },
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#16251F] dark:text-[#F8F7F3] tracking-tight">
          Sanctum Space settings
        </h1>
        <p className="text-xs sm:text-sm text-[#68736D] dark:text-[#96A39D] mt-1">
          Church name, logo, join-page welcome, and the Admins who help run this space.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E6E1] dark:border-[#26362F] pb-2 overflow-x-auto">
        {[
          { id: 'GENERAL', label: 'General Info', icon: Building },
          ...(showMediaTab ? [{ id: 'MEDIA' as const, label: 'Media', icon: Video }] : []),
          { id: 'BRANDING', label: 'Branding & Join Page', icon: Palette },
          ...(showTeamTab ? [{ id: 'TEAM' as const, label: 'Team', icon: Users }] : []),
          { id: 'DEFAULTS', label: 'Prayer Defaults', icon: Sliders },
          { id: 'SECURITY', label: 'Security & Privacy', icon: Shield },
          { id: 'BILLING', label: 'Billing', icon: CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => requestTabChange(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'bg-[#203C32] text-white dark:bg-[#C9A35A] dark:text-[#101814]'
                  : 'text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: General Info */}
      {activeTab === 'GENERAL' && (
        <form onSubmit={handleSaveGeneral} className="bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-8 border border-[#E5E6E1] dark:border-[#26362F] space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#16251F] dark:text-[#F8F7F3] mb-1.5">
                Church / Organization Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#16251F] dark:text-[#F8F7F3] mb-1.5">
                Permanent Church Slug
              </label>
              <div className="flex items-center px-4 py-3 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] text-xs font-mono text-[#68736D] dark:text-[#96A39D]">
                <span>https://sanctum.live/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="flex-1 bg-transparent font-bold text-[#16251F] dark:text-[#F8F7F3] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#16251F] dark:text-[#F8F7F3] mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#16251F] dark:text-[#F8F7F3] mb-1">
                  Timezone
                </label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#16251F] dark:text-[#F8F7F3] mb-1">
                Official Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourchurch.org"
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E6E1] dark:border-[#26362F] flex justify-end">
            <button
              type="submit"
              disabled={savingGeneral}
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{savingGeneral ? 'Saving…' : 'Save General Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Branding & Join Page */}
      {activeTab === 'MEDIA' && showMediaTab && (
        <form
          className="bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-8 border border-[#E5E6E1] dark:border-[#26362F] space-y-6"
          onSubmit={async (event) => {
            event.preventDefault();
            if (savingMedia) return;
            setSavingMedia(true);
            setYoutubeFound('');
            try {
              const aliases = speakerAliases.split(/[\n,]/).map((alias) => alias.trim()).filter(Boolean);
              const result = await cmsApi.saveYoutubeChannel(organization.id, {
                input: youtubeInput,
                defaultSermonSpeaker: sermonSpeaker,
                speakerAliases: aliases,
              });
              setYoutubeFound(result.channelTitle ? `Found: ${result.channelTitle}` : '');
              updateOrganization({
                youtubeChannelInput: youtubeInput.trim() || undefined,
                youtubeChannelId: typeof result.organization.youtubeChannelId === 'string' ? result.organization.youtubeChannelId : undefined,
                defaultSermonSpeaker: sermonSpeaker.trim() || organization.defaultSermonSpeaker || '',
                speakerAliases: aliases,
              });
              addToast(result.message, 'success');
            } catch (error) {
              addToast(error instanceof ApiClientError ? error.message : 'Could not save the YouTube channel.', 'error');
            } finally {
              setSavingMedia(false);
            }
          }}
        >
          <div>
            <h2 className="text-lg font-extrabold text-[#16251F] dark:text-[#F8F7F3]">YouTube</h2>
            <p className="mt-1 text-xs text-[#68736D] dark:text-[#96A39D]">Imports your most recent uploads.</p>
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-bold text-[#16251F] dark:text-[#F8F7F3]">YouTube channel</span>
            <input
              value={youtubeInput}
              onChange={(event) => setYoutubeInput(event.target.value)}
              placeholder="@handle, channel URL, or UC…"
              className="w-full rounded-2xl border border-[#E5E6E1] bg-transparent px-4 py-3 text-sm dark:border-[#26362F]"
            />
          </label>
          {youtubeFound ? <p className="text-sm font-semibold text-[#203C32] dark:text-[#C9A35A]">{youtubeFound}</p> : null}
          <label className="block space-y-2">
            <span className="text-xs font-bold text-[#16251F] dark:text-[#F8F7F3]">Default sermon speaker</span>
            <input
              value={sermonSpeaker}
              onChange={(event) => setSermonSpeaker(event.target.value)}
              className="w-full rounded-2xl border border-[#E5E6E1] bg-transparent px-4 py-3 text-sm dark:border-[#26362F]"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold text-[#16251F] dark:text-[#F8F7F3]">Speaker aliases</span>
            <textarea
              value={speakerAliases}
              onChange={(event) => setSpeakerAliases(event.target.value)}
              rows={3}
              placeholder={'Ps. John Doe\nPastor John'}
              className="w-full rounded-2xl border border-[#E5E6E1] bg-transparent px-4 py-3 text-sm dark:border-[#26362F]"
            />
            <span className="text-xs text-[#68736D] dark:text-[#96A39D]">One name per line. These map to the default sermon speaker.</span>
          </label>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={savingMedia} className="inline-flex items-center gap-2 rounded-full bg-[#203C32] px-5 py-3 text-xs font-bold text-white disabled:opacity-60 dark:bg-[#C9A35A] dark:text-[#101814]">
              <Save className="h-3.5 w-3.5" />
              <span>{savingMedia ? 'Checking channel…' : 'Save media'}</span>
            </button>
            <button
              type="button"
              disabled={checkingYoutube}
              className="rounded-full border border-[#E5E6E1] px-5 py-3 text-xs font-bold disabled:opacity-60 dark:border-[#26362F]"
              onClick={async () => {
                setCheckingYoutube(true);
                try {
                  const result = await cmsApi.importYoutube(organization.id);
                  addToast(result.created ? `Imported ${result.created} new ${result.created === 1 ? 'message' : 'messages'}.` : 'No new messages.', 'success');
                } catch (error) {
                  addToast(error instanceof ApiClientError ? error.message : 'Could not check YouTube.', 'error');
                } finally {
                  setCheckingYoutube(false);
                }
              }}
            >
              {checkingYoutube ? 'Checking…' : 'Check now'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'BRANDING' && (
        <form onSubmit={handleSaveBranding} className="bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-8 border border-[#E5E6E1] dark:border-[#26362F] space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#16251F] dark:text-[#F8F7F3] mb-1.5">
                Congregation Welcome Message on Join Page
              </label>
              <textarea
                value={joinPageMessage}
                onChange={(e) => setJoinPageMessage(e.target.value)}
                rows={3}
                placeholder="e.g. Join your church family in prayer."
                className="w-full p-3 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/70 dark:bg-[#101814] text-sm leading-relaxed"
              />
              <p className="text-[11px] text-[#68736D] dark:text-[#96A39D] mt-1">
                Displayed prominently to all congregants right above the Name field.
              </p>
            </div>

            <LogoUrlField value={logoUrl} onChange={setLogoUrl} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold uppercase text-[#16251F] dark:text-[#F8F7F3] mb-1">
                  Primary Sanctuary Theme Tone
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent"
                  />
                  <span className="text-xs font-mono">{primaryColor} (Deep Sanctuary Green)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#16251F] dark:text-[#F8F7F3] mb-1">
                  Secondary Accent Tone
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border-none bg-transparent"
                  />
                  <span className="text-xs font-mono">{accentColor} (Sacred Gold)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E6E1] dark:border-[#26362F] flex justify-end">
            <button
              type="submit"
              disabled={savingBranding}
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{savingBranding ? 'Saving…' : 'Save Branding'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Prayer Defaults */}
      {activeTab === 'DEFAULTS' && (
        <div className="bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-8 border border-[#E5E6E1] dark:border-[#26362F] space-y-6">
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F]">
              <div>
                <strong className="block text-sm text-[#16251F] dark:text-[#F8F7F3]">
                  Data Saver for Low-Bandwidth Attendees
                </strong>
                <p className="text-xs text-[#68736D] dark:text-[#96A39D] mt-0.5">
                  Reduces media bandwidth where possible to improve the prayer experience on slower connections.
                </p>
                <p className="text-[11px] text-[#68736D] dark:text-[#96A39D] mt-1.5">
                  Realtime media optimization activates when the Sanctum media engine is connected.
                </p>
              </div>
              <input
                type="checkbox"
                checked={defaultLowBandwidth}
                onChange={(e) => setDefaultLowBandwidth(e.target.checked)}
                className="w-5 h-5 accent-[#203C32] dark:accent-[#C9A35A] rounded mt-1"
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F]">
              <div>
                <strong className="block text-sm text-[#16251F] dark:text-[#F8F7F3]">
                  Listener Microphone Policy
                </strong>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#203C32] dark:text-[#C9A35A] mt-1">
                  Default: Locked
                </p>
                <p className="text-xs text-[#68736D] dark:text-[#96A39D] mt-0.5">
                  Listeners are configured to join without microphone or camera publishing permission. Server-enforced media permissions activate with the realtime media engine.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoMuteAllOnJoin}
                onChange={(e) => setAutoMuteAllOnJoin(e.target.checked)}
                className="w-5 h-5 accent-[#203C32] dark:accent-[#C9A35A] rounded mt-1"
              />
            </div>

            <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F]">
              <div>
                <strong className="block text-sm text-[#16251F] dark:text-[#F8F7F3]">
                  Allow In-Session Written Prayer Requests
                </strong>
                <p className="text-xs text-[#68736D] dark:text-[#96A39D] mt-0.5">
                  Enables attendees to submit confidential or public prayer requests into the prayer requests list.
                </p>
              </div>
              <input
                type="checkbox"
                checked={allowPrayerRequests}
                onChange={(e) => setAllowPrayerRequests(e.target.checked)}
                className="w-5 h-5 accent-[#203C32] dark:accent-[#C9A35A] rounded mt-1"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E6E1] dark:border-[#26362F] flex justify-end">
            <button
              type="button"
              onClick={() => {
                setSavedDefaults({
                  defaultLowBandwidth,
                  autoMuteAllOnJoin,
                  allowPrayerRequests,
                });
                setHasUnsavedChanges(false);
                addToast('Prayer defaults saved as configuration intent', 'success');
              }}
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Prayer Defaults</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Security & Danger Zone */}
      {activeTab === 'SECURITY' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-8 border border-[#E5E6E1] dark:border-[#26362F] space-y-4">
            <h3 className="text-base font-bold text-[#16251F] dark:text-[#F8F7F3]">
              Security & Audit Trail
            </h3>
            <p className="text-xs text-[#68736D] dark:text-[#96A39D] leading-relaxed">
              Sanctum Live records moderator actions in this prototype (speaker invites, mute commands, role changes, and session end) so church teams can review what happened. Server-side enforcement and durable audit storage activate with the production backend.
            </p>
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Audit logging: development preview (in-memory + local storage)</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F]">
              <RealtimeEngineStatus />
            </div>
          </div>

          <div className="bg-red-500/5 rounded-3xl p-6 sm:p-8 border border-red-500/20 space-y-4">
            <div className="flex items-center gap-2 text-[#B94A48] dark:text-red-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Danger Zone</span>
            </div>
            {showTeamTab ? (
              <>
                <p className="text-xs text-[#68736D] dark:text-[#96A39D] leading-relaxed">
                  Delete this Sanctum Space permanently. Prayer rooms, team invites, and history for this church are
                  removed. Your Sign in stays; you can create a new space. Other churches are not affected.
                </p>
                <label className="block text-xs font-bold uppercase text-[#16251F] dark:text-[#F8F7F3]">
                  Type {organization.name} to confirm
                </label>
                <input
                  type="text"
                  value={confirmDeleteName}
                  onChange={(e) => setConfirmDeleteName(e.target.value)}
                  placeholder={organization.name}
                  className="w-full px-4 py-3 rounded-xl border border-red-500/30 bg-white dark:bg-[#101814] text-sm font-semibold"
                />
                <button
                  type="button"
                  disabled={!canConfirmDelete || deletingSpace}
                  onClick={handleDeleteSpace}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#B94A48] text-white hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingSpace ? 'Deleting…' : 'Delete this Sanctum Space'}
                </button>
              </>
            ) : (
              <p className="text-xs text-[#68736D] dark:text-[#96A39D] leading-relaxed">
                Only the Owner can delete this Sanctum Space.
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'TEAM' && showTeamTab && <TeamInvitePanel />}

      {activeTab === 'BILLING' && (
        <div className="bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-8 border border-[#E5E6E1] dark:border-[#26362F] space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[#16251F] dark:text-[#F8F7F3]">Church billing</h3>
            <ComingSoonBadge />
          </div>
          <p className="text-xs text-[#68736D] dark:text-[#96A39D] leading-relaxed">
            Donations, plans, and invoices stay paused so Dawn Intercession can run on audio first. Membership
            access is not sold from this screen yet.
          </p>
        </div>
      )}
    </div>
  );
};
