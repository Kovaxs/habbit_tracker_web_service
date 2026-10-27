"use client";

import { useState } from "react";
import { UserRoundPlus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import type { Profile } from "@/lib/types";

export function ProfileSwitcher({ profiles, activeProfile, busy, onSwitch, onCreate }: {
  profiles: Profile[];
  activeProfile: Profile;
  busy: boolean;
  onSwitch: (id: string) => Promise<unknown>;
  onCreate: (name: string) => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const nextError = await onCreate(name);
    if (nextError) setError(nextError);
    else {
      setName("");
      setOpen(false);
    }
  }

  return (
    <>
      <div className="profile-controls">
        <label className="sr-only" htmlFor="active-profile">Active profile</label>
        <select id="active-profile" className="profile-select" value={activeProfile.id} disabled={busy} onChange={event => { if (event.target.value !== activeProfile.id) void onSwitch(event.target.value); }}>
          {profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
        </select>
        <button className="icon-button secondary" aria-label="Add profile" title="Add profile" disabled={busy} onClick={() => { setError(""); setOpen(true); }}><UserRoundPlus size={19} /></button>
      </div>
      <Dialog open={open} onOpenChange={setOpen} title="Create a profile" description="Add a separate workspace. No password is needed." busy={busy}>
        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="profile-name">Profile name</label>
            <input id="profile-name" value={name} onChange={event => setName(event.target.value)} maxLength={40} autoComplete="off" autoFocus required disabled={busy} placeholder="For example, Alex" />
          </div>
          <p className="hint mt-3">Profiles organize data. They are not private accounts.</p>
          {error && <p className="error-box mt-4" role="alert">{error}</p>}
          <div className="dialog-actions">
            <button type="button" className="button secondary" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="button primary" disabled={busy || !name.trim()}>Create profile</button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
