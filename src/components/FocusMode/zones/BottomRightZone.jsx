// ─── Bottom-right zone ────────────────────────────────────────────────────────
//
// Hosts the Tasks panel pill in the bottom-right corner of Focus Mode.
// Owns the Google sign-in flow so the panel is fully self-contained.

import React, { useState, useCallback } from 'react';
import { useFocusTasks } from '../hooks';
import { TasksPanel } from '../panels/Tasks';
import { useSettingsStore } from '../../../store';
import { getGoogleAuthToken, isGoogleAuthAvailable, signOutGoogle } from '../../../utilities/googleAuth';

export const BottomRightZone = () => {
  const focusTasks = useSettingsStore(s => s.focusTasks ?? true);
  const { tasks, loading, gtasksConnected, setGtasksConnected, userProfile, setUserProfile, add, toggle, edit, remove, reload } = useFocusTasks();
  const [connecting, setConnecting] = useState(false);

  const onConnect = useCallback(async () => {
    if (!isGoogleAuthAvailable()) return;
    setConnecting(true);
    try {
      await getGoogleAuthToken(true);
      setGtasksConnected(true);
      await reload();
    } catch (err) {
      console.warn('Google Tasks auth failed:', err);
    } finally {
      setConnecting(false);
    }
  }, [reload, setGtasksConnected]);

  const onDisconnect = useCallback(async () => {
    try {
      await signOutGoogle(null);
    } catch { /* best-effort */ }
    setGtasksConnected(false);
    setUserProfile(null);
  }, [setGtasksConnected, setUserProfile]);

  if (!focusTasks) return null;

  return (
    <div
      className="pointer-events-auto"
      style={{ position: 'absolute', bottom: 24, right: 24, zIndex: 22 }}
      onClick={e => e.stopPropagation()}
      role="none"
    >
      <TasksPanel
        tasks={tasks}
        loading={loading}
        gtasksConnected={gtasksConnected}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
        connecting={connecting}
        userProfile={userProfile}
        add={add}
        toggle={toggle}
        edit={edit}
        remove={remove}
        reload={reload}
      />
    </div>
  );
};
