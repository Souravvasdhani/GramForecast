import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";

const TutorialContext = createContext(null);

const getTutorialKey = (userId) => `ruraldemand_tutorial_seen_${userId}`;
const getVideoKey = (userId) => `ruraldemand_welcome_video_seen_${userId}`;

export function TutorialProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [replayRequested, setReplayRequested] = useState(false);

  const syncUser = (nextUser) => setUser(nextUser || null);

  const hasSeenTutorial = Boolean(
    user?.user_id && localStorage.getItem(getTutorialKey(user.user_id)),
  );

  const hasSeenWelcomeVideo = Boolean(
    user?.user_id && localStorage.getItem(getVideoKey(user.user_id)),
  );

  const markTutorialSeen = () => {
    if (user?.user_id) localStorage.setItem(getTutorialKey(user.user_id), "1");
  };

  const markWelcomeVideoSeen = () => {
    if (user?.user_id) localStorage.setItem(getVideoKey(user.user_id), "1");
  };

  const showWelcome = () => {
    markWelcomeVideoSeen();
    setWelcomeOpen(true);
  };

  const closeWelcome = () => setWelcomeOpen(false);

  const requestReplay = () => {
    setReplayRequested(true);
    navigate("/");
  };

  const clearReplayRequest = () => setReplayRequested(false);

  return (
    <TutorialContext.Provider
      value={{
        user,
        syncUser,
        hasSeenTutorial,
        hasSeenWelcomeVideo,
        welcomeOpen,
        showWelcome,
        closeWelcome,
        markTutorialSeen,
        requestReplay,
        replayRequested,
        clearReplayRequest,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export const useTutorial = () => useContext(TutorialContext);
