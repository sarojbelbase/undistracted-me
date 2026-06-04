import { Modal } from '../components/ui/Modal';

/**
 * When `noHeader` is true, renders children directly without a default header —
 * the caller provides the full modal layout including its own header.
 */
export const BaseSettingsModal = ({ title = 'Settings', onClose, children, width = 'w-80', noHeader = false }) => {
  if (noHeader) {
    return (
      <Modal onClose={onClose} className={`${width} flex flex-col overflow-hidden`} ariaLabel={title}>
        {children}
      </Modal>
    );
  }
  return (
    <Modal title={title} onClose={onClose} className={width}>
      {children}
    </Modal>
  );
};
