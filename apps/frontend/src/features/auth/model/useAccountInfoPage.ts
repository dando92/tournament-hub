import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/features/auth/model/AuthContext";
import { updateAccountProfile } from "@/features/auth/api/account.api";
import { usePageNotices } from "@/shared/context/PageNoticeContext";

export function useAccountInfoPage() {
  const { state, actions } = useAuthContext();
  const { report, dismiss } = usePageNotices();
  const { account } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [playerName, setPlayerName] = useState(account?.player?.playerName ?? "");
  const [nationality, setNationality] = useState(account?.player?.nationality ?? "");
  const [grooveStatsApi, setGrooveStatsApi] = useState(account?.grooveStatsApi ?? "");
  const [profilePicture, setProfilePicture] = useState(account?.profilePicture ?? "");
  const [saving, setSaving] = useState(false);
  const [savingPicture, setSavingPicture] = useState(false);

  useEffect(() => {
    if (editingProfile) return;
    setPlayerName(account?.player?.playerName ?? "");
    setNationality(account?.player?.nationality ?? "");
    setGrooveStatsApi(account?.grooveStatsApi ?? "");
    setProfilePicture(account?.profilePicture ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  async function savePicture(base64: string) {
    if (!account) return;
    setSavingPicture(true);
    try {
      setProfilePicture(base64);
      await updateAccountProfile(account.id, { profilePicture: base64 });
      await actions.loadCurrentUser();
      dismiss("Failed to update profile picture.");
    } catch {
      report("Failed to update profile picture.");
    } finally {
      setSavingPicture(false);
    }
  }

  async function saveProfile() {
    if (!account) return;
    setSaving(true);
    try {
      await updateAccountProfile(account.id, { playerName, nationality, grooveStatsApi });
      await actions.loadCurrentUser();
      setEditingProfile(false);
      dismiss("Failed to update profile.");
    } catch {
      report("Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditingProfile(false);
    setPlayerName(account?.player?.playerName ?? "");
    setNationality(account?.player?.nationality ?? "");
    setGrooveStatsApi(account?.grooveStatsApi ?? "");
  }

  return {
    account,
    fileInputRef,
    editingProfile,
    playerName,
    nationality,
    grooveStatsApi,
    profilePicture,
    saving,
    savingPicture,
    setEditingProfile,
    setPlayerName,
    setNationality,
    setGrooveStatsApi,
    savePicture,
    saveProfile,
    cancelEdit,
  };
}
