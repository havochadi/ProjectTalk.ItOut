import React, { useEffect, useState } from 'react';
import { Headphones, Palette, Shield, Timer, Moon, Sun } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { userAPI, privacyAPI } from '../api/client';
import { getUserPreferences, saveUserPreferences } from '../store/userPrefs';
import { isVoiceEnabled } from '../lib/voiceClient';
import { Card } from '../components/Card';
import { Toggle } from '../components/Toggle';
import { Slider } from '../components/Slider';
import { SectionHeader } from '../components/SectionHeader';
import { VoicePicker } from '../components/VoicePicker';

interface PomodoroSettings {
  focusDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  cyclesBeforeLongBreak: number;
}

const btnPrimary =
  'inline-flex items-center justify-center rounded-full bg-gradient-sunset px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 hover:saturate-110 focus-visible:ring-2 focus-visible:ring-wellness-sage-400';

const btnSecondary =
  'inline-flex items-center justify-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-text transition hover:bg-surface-alt focus-visible:ring-2 focus-visible:ring-wellness-sage-400';

export const SettingsPage: React.FC = () => {
  const { profile, refreshUser } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [pomodoro, setPomodoro] = useState<PomodoroSettings>(
    profile?.preferences?.pomodoro || { focusDuration: 25, breakDuration: 5, longBreakDuration: 15, cyclesBeforeLongBreak: 4 }
  );
  const [voicePrefs, setVoicePrefs] = useState(getUserPreferences());
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => {
    setVoiceEnabled(isVoiceEnabled());
  }, []);

  const handleUpdatePomodoro = async () => {
    try {
      await userAPI.updateProfile({ preferences: { pomodoro } });
      await refreshUser();
      toast.success('Focus settings saved.');
    } catch { toast.error('Failed to save settings'); }
  };

  const handleUpdateVoiceSettings = () => {
    try { saveUserPreferences(voicePrefs); toast.success('Voice settings saved.'); }
    catch { toast.error('Failed to save voice settings'); }
  };

  const handleExportData = async () => {
    try {
      const res = await privacyAPI.exportData();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `talkitout-data-${Date.now()}.json`;
      a.click();
      toast.success('Data exported!');
    } catch { toast.error('Failed to export data'); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="mt-1 text-sm text-muted">Personalise your Talk.ItOut experience.</p>
      </div>

      {/* Appearance */}
      <Card className="space-y-5 p-6">
        <SectionHeader icon={Palette} title="Appearance" description="Choose the theme that feels most comfortable." />
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface-alt px-4 py-3">
          <div className="flex items-center gap-2">
            {darkMode ? <Moon className="h-4 w-4 text-wellness-lavender-500" /> : <Sun className="h-4 w-4 text-wellness-peach-500" />}
            <span className="text-sm font-medium text-text">Dark mode</span>
          </div>
          <Toggle isOn={darkMode} onToggle={toggleDarkMode} label="" />
        </div>
      </Card>

      {/* Focus Timer */}
      <Card className="space-y-5 p-6">
        <SectionHeader icon={Timer} title="Focus timer" description="Adjust your Pomodoro session lengths." />
        <div className="grid gap-5 md:grid-cols-2">
          <Slider label={`Focus — ${pomodoro.focusDuration} min`} min={15} max={60} step={5} value={pomodoro.focusDuration}
            onChange={(e) => setPomodoro((p) => ({ ...p, focusDuration: +e.target.value }))} />
          <Slider label={`Short break — ${pomodoro.breakDuration} min`} min={3} max={20} step={1} value={pomodoro.breakDuration}
            onChange={(e) => setPomodoro((p) => ({ ...p, breakDuration: +e.target.value }))} />
          <Slider label={`Long break — ${pomodoro.longBreakDuration} min`} min={10} max={40} step={5} value={pomodoro.longBreakDuration}
            onChange={(e) => setPomodoro((p) => ({ ...p, longBreakDuration: +e.target.value }))} />
          <Slider label={`Cycles before long break — ${pomodoro.cyclesBeforeLongBreak}`} min={2} max={8} step={1} value={pomodoro.cyclesBeforeLongBreak}
            onChange={(e) => setPomodoro((p) => ({ ...p, cyclesBeforeLongBreak: +e.target.value }))} />
        </div>
        <button type="button" onClick={handleUpdatePomodoro} className={btnPrimary}>Save focus settings</button>
      </Card>

      {/* Voice */}
      <Card className="space-y-5 p-6">
        <SectionHeader icon={Headphones} title="Voice & playback"
          description={voiceEnabled
            ? 'Manage how the companion speaks to you.'
            : 'Voice is not configured — contact your admin to enable it.'} />
        <div className="rounded-xl border border-border bg-surface-alt px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text">Auto-play assistant replies</span>
            <Toggle isOn={voicePrefs.autoPlayVoice} onToggle={() => setVoicePrefs((p) => ({ ...p, autoPlayVoice: !p.autoPlayVoice }))}
              label="" disabled={!voiceEnabled} />
          </div>
        </div>
        {voiceEnabled && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Voice</span>
            <VoicePicker
              value={voicePrefs.voiceId}
              onChange={(voiceId) => setVoicePrefs((p) => ({ ...p, voiceId }))}
            />
          </div>
        )}
        <button type="button" onClick={handleUpdateVoiceSettings} className={btnPrimary} disabled={!voiceEnabled}>
          Save voice settings
        </button>
      </Card>

      {/* Privacy */}
      <Card className="space-y-5 p-6">
        <SectionHeader icon={Shield} title="Privacy & data" description="Download a full copy of your data (JSON format)." />
        <div className="rounded-xl border border-wellness-sage-100 bg-wellness-sage-50 px-4 py-3">
          <p className="text-xs text-wellness-sage-700">
            Your data is pseudonymized before leaving our systems. Export includes chat history, check-ins, tasks, and profile.
          </p>
        </div>
        <button type="button" onClick={handleExportData} className={btnSecondary}>Export my data</button>
      </Card>
    </div>
  );
};
