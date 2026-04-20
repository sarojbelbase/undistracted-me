// --- Bottom-right zone ---
import React, { useState, useCallback } from "react";
import { TasksPanel } from "../panels/Tasks";
import { TasksDialog } from "../dialog/Tasks";
import { useSettingsStore } from "../../../store";

export const BottomRightZone = ({
  taskState,
  connecting,
  onConnect,
  onDisconnect,
  externalDialogOpen,
  onCloseExternalDialog,
}) => {
  const focusTasks = useSettingsStore(s => s.focusTasks ?? true);
  const { tasks, loading, gtasksConnected, userProfile, add, toggle, edit, remove, reload } = taskState;
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
          <TasksPanel tasks={tasks} loading={loading} gtasksConnected={gtasksConnected} connecting={connecting} add={add} toggle={toggle} edit={edit} remove={remove} reload={reload} onOpenDialog={() => setDialogOpen(true)} />
        </div>
      )}
      {isDialogOpen && (
        <TasksDialog onClose={closeDialog} connected={gtasksConnected} connecting={connecting} userProfile={userProfile} onConnect={onConnect} onDisconnect={onDisconnect} />
      )}
    </>
  );
};
