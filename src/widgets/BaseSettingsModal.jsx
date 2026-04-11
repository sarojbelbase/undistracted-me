import { Modal } from '../components/ui/Modal';

export const BaseSettingsModal = ({ title = 'Settings', onClose, children, width = 'w-80' }) => (
  <Modal title={title} onClose={onClose} className={width}>
    {children}
  </Modal>
);
