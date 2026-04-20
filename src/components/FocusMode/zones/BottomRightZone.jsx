// --- Bottom-right zone ---
import React, { useState, useCallback, Suspense, lazy } from "react";
import { TasksDialog } from "../dialog/Tasks";
import { useSettingsStore } from "../../../store";

const TasksPanel = lazy(() =>
  import("../panels/Tasks").then(m => ({ default: m.TasksPanel }))
);

const TasksPillSkeleton = () => (
  <div
    aria-hidden="true"
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '7px 13px',
      borderRadius: 999,
      background: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.13)',
      boxShadow: '0 2px 18px rgba(0,0,0,0.40)',
      whiteSpace: 'nowrap',
    }}
  >
    {/* circle icon placeholder */}
    <div style={{ width: 13, height: 13, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
    {/* text placeholder */}
    <div style={{ width: 52, height: 10, borderRadius: 5, background: 'rgba(255,255,255,0.10)' }} />
    {/* chevron placeholder */}
    <div style={{ width: 9, height: 9, borderRadius: 2, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
  </div>
);

export const BottomRightZone = ({
  taskState,
  connecting,
  onConnect,
  onDisconnect,
  externalDialogOpen,
  onCloseExternalDialog,
}) => {
  const focusTasks = useSettingsStore(s => s.focusTasks ?? true);
  const { tasks, loading, gtasksConnected, userProfile, hasAttempted, add, toggle, edit, remove, reload } = taskState;
  const [dialogOpen, setDialogOpen] = useState(false);

  const isDialogOpen = dialogOpen || !!externalDialogOpen;
  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    onCloseExternalDialog?.();
  }, [onCloseExternalDialog]);

  return (
    <>
      {focusTasks && (
        <div className="pointer-events-auto" style={{ position: "absolute", bottom: 24, right: 24, zIndex: 22 }} onClick={e => e.stopPropagation()} role="none">
          <Suspense fallback={<TasksPillSkeleton />}>
            <TasksPanel tasks={tasks} loading={loading} gtasksConnected={gtasksConnected} hasAttempted={hasAttempted} connecting={connecting} add={add} toggle={toggle} edit={edit} remove={remove} reload={reload} onOpenDialog={() => setDialogOpen(true)} />
          </Suspense>
        </div>
      )}
      {isDialogOpen && (
        <TasksDialog onClose={closeDialog} connected={gtasksConnected} connecting={connecting} userProfile={userProfile} onConnect={onConnect} onDisconnect={onDisconnect} />
      )}
    </>
  );
};
