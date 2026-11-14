/**
 * SupportNudge — connected wrapper for the support dialog.
 * Mount this once at the app root (App.jsx). It reads the support store and
 * drives `<SupportDialog />`; components never render the dialog themselves —
 * they call `triggerSupportNudge(reason)` instead.
 */

import { useSupportStore } from "../store/useSupportStore";
import { SupportDialog } from "./SupportDialog";
import { MOMO_URL, GITHUB_URL } from "../constants/urls";

export function SupportNudge() {
  const open = useSupportStore((s) => s.open);
  const dismiss = useSupportStore((s) => s.dismiss);
  return (
    <SupportDialog
      open={open}
      onClose={dismiss}
      appName="Undistracted Me"
      momoUrl={MOMO_URL}
      githubUrl={GITHUB_URL}
    />
  );
}

export default SupportNudge;
