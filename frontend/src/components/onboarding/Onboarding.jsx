import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useTutorial } from "../../context/TutorialContext";

const tourSteps = [
  {
    element: "#main-sidebar",
    popover: {
      title: "Move around your business",
      description: "Use this menu to open each part of your business.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "#dashboard-kpi-cards",
    popover: {
      title: "See the big picture",
      description: "These cards show your sales, stock, and demand.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: "#dashboard-ai-banner",
    popover: {
      title: "Get a helpful tip",
      description: "This message tells you what to do next.",
      side: "top",
      align: "start",
    },
  },
  {
    element: "#restock-now-btn",
    popover: {
      title: "Plan a restock",
      description: "Tap here when you need to order more stock.",
      side: "top",
      align: "end",
    },
  },
];

function startDriver(markTutorialSeen) {
  const tour = driver({
    showProgress: true,
    allowClose: true,
    animate: true,
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    onPopoverRender: (popover) => {
      const skipButton = document.createElement("button");
      skipButton.type = "button";
      skipButton.className = "driver-skip-button";
      skipButton.textContent = "Skip";
      skipButton.addEventListener("click", () => {
        markTutorialSeen();
        tour.destroy();
      });
      popover.footerButtons.prepend(skipButton);
    },
    onDestroyed: markTutorialSeen,
    steps: tourSteps,
  });

  tour.drive();
}

export default function Onboarding() {
  const {
    user,
    hasSeenTutorial,
    welcomeOpen,
    showWelcome,
    closeWelcome,
    markTutorialSeen,
    replayRequested,
    clearReplayRequest,
  } = useTutorial();
  const startedForUser = useRef(null);

  useEffect(() => {
    if (!user?.user_id || startedForUser.current === user.user_id) return;
    if (!hasSeenTutorial && document.querySelector("#dashboard-kpi-cards")) {
      startedForUser.current = user.user_id;
      showWelcome();
    }
  }, [user, hasSeenTutorial, showWelcome]);

  useEffect(() => {
    if (!replayRequested || !document.querySelector("#dashboard-kpi-cards")) return;
    clearReplayRequest();
    const timeoutId = window.setTimeout(() => startDriver(markTutorialSeen), 150);
    return () => window.clearTimeout(timeoutId);
  }, [replayRequested, clearReplayRequest, markTutorialSeen]);

  const startTutorial = () => {
    closeWelcome();
    window.setTimeout(() => startDriver(markTutorialSeen), 150);
  };

  if (!welcomeOpen) return null;

  return (
    <div className="onboarding-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="welcome-video-title">
      <div className="onboarding-modal">
        <button className="onboarding-close" type="button" onClick={startTutorial} aria-label="Close welcome video">
          ×
        </button>
        <div className="welcome-video-placeholder">
          <div className="welcome-play-icon">▶</div>
          <p>Video coming soon</p>
        </div>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-mid">Welcome</p>
        <h2 id="welcome-video-title" className="text-xl font-bold text-gray-900 mt-1">How to use RuralDemand AI in 60 seconds</h2>
        <p className="text-sm text-gray-500 mt-2">Watch a quick guide to see your shop's next best step.</p>
        <button type="button" className="onboarding-primary-button" onClick={startTutorial}>Start Tutorial</button>
      </div>
    </div>
  );
}
