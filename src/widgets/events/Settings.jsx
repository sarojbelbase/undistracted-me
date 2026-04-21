import { CalendarCheck } from 'react-bootstrap-icons';
import { IntegrationRow } from '../../components/ui/IntegrationRow';

export const Settings = () => (
  <IntegrationRow
    icon={<CalendarCheck size={12} />}
    label="Google Calendar"
    description="Reads upcoming event titles and times from your primary calendar."
    privacyLabel="Nothing stored on servers"
  />
);
