import { useState, useEffect } from 'react';
import { SHOW_MITI_IN_ICON } from '../constants/settings';

const useShowMitiInIcon = () => {
  const [showMitiInIcon, setShowMitiInIcon] = useState(() => {
    const showBadge = localStorage.getItem('showMitiInIcon');
    return showBadge ? showBadge : SHOW_MITI_IN_ICON["Hide"];
  });

  useEffect(() => {
    localStorage.setItem('showMitiInIcon', showMitiInIcon);
  }, [showMitiInIcon]);

  return [showMitiInIcon, setShowMitiInIcon];
};

export default useShowMitiInIcon;
