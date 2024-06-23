import './App.css';
import DigitalClock from './components/DigitalClock';

const App = () => {
  const [showSettings, setShowSettings] = useState(false);

  const [language, setLanguage] = useState(() => {
    const savedLanguage = localStorage.getItem('language');
    return savedLanguage ? savedLanguage : LANGUAGES.en;
  });

  const [showMitiInIcon, setShowMitiInIcon] = useState(() => {
    const showBadge = localStorage.getItem('showMitiInIcon');
    return showBadge ? showBadge : SHOW_MITI_IN_ICON["Hide"];
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const closeSettings = () => {
    setShowSettings(false);
  };

  return (
    <div id="fullscreen">
      <div className="setting-area">
        <div
          className="setting-icon"
          onClick={toggleSettings}
          title='Settings'
        >
        </div>
        {showSettings && (
          <Settings
            language={language}
            setLanguage={setLanguage}
            showMitiInIcon={showMitiInIcon}
            setShowMitiInIcon={setShowMitiInIcon}
            closeSettings={closeSettings}
          />
        )}
      </div>
      <DigitalClock language={language} showMitiInIcon={showMitiInIcon} />
    </div>
  );
};

export default App;
