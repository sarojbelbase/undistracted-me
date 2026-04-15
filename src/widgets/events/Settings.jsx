import { CalendarCheck } from 'react-bootstrap-icons';
import { useGoogleCalendar, useGoogleProfile } from '../useEvents';
import { disconnectCalendar } from '../../utilities/googleCalendar';
import { IntegrationRow } from '../../components/ui/IntegrationRow';
import { useAgeLabel } from '../../hooks/useAgeLabel';

export const Settings = () => {
  const { connected, loading, error, refresh, connect, syncedAt } = useGoogleCalendar();
  const profile = useGoogleProfile();
  const syncedAtLabel = useAgeLabel(syncedAt);

  const handleDisconnect = async () => {
    await disconnectCalendar();
    window.location.reload();
  };

  return (
    <>
      <IntegrationRow
        icon={<CalendarCheck size={12} />}
        label="Google Calendar"
        connected={connected}
        loading={loading}
        profile={profile ? { name: profile.name, email: profile.email, picture: profile.picture } : null}
        syncedAtLabel={syncedAtLabel}
        description="Shows upcoming events from your primary calendar."
        privacyLabel="Read-only · nothing stored on servers"
        connectLabel="Sign in with Google"
        onConnect={connect}
        onSync={refresh}
        onDisconnect={handleDisconnect}
      />
      {!connected && error && (
        <p className="text-xs mt-1" style={{ color: 'var(--w-danger)' }}>{error}</p>
      )}
    </>
  );
};
