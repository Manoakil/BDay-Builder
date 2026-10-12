import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';

import BirthdayNavbar from './components/Birthday/BirthdayNavbar';
import PersonalMessage from './components/Birthday/PersonalMessage';
import WishesIntro from './components/Birthday/WishesIntro';
import WishWall from './components/Birthday/WishWall';
import VideoWishes from './components/Birthday/VideoWishes';
import MemoryTimeline from './components/Birthday/MemoryTimeline';
import SecretVault from './components/Birthday/SecretVault';
import FinalCelebration from './components/Birthday/FinalCelebration';
import WelcomeScreen from './components/Birthday/WelcomeScreen';
import BirthdayReveal from './components/Birthday/BirthdayReveal';
import VaultWishes from './pages/VaultWishes';

export default function OfflineApp({ data }) {
  const [step, setStep] = useState('welcome');

  React.useEffect(() => {
    document.title = "Wish Land";
    return () => {
      document.title = "Velora Studio";
    };
  }, []);
  
  const event = data.event;
  const birthdayName = event.birthday_person_name;
  
  const textWishes = data.wishes.filter(w => w.wish_type === 'text' || w.wish_type === 'image');
const videoWishes = data.wishes.filter(w => w.wish_type === 'video');
  const timeline = data.timeline;
  const [vault, setVault] = useState(data.vault);
  
  const dyn = vault?.dynamic_data || {};
  const enableWishes = dyn.enableWishes !== false;
  const enableVideos = dyn.enableVideos !== false;
  const enableTimeline = dyn.enableTimeline !== false;

  const handleReplay = () => {
    window.scrollTo({ top: 0 });
    setStep('welcome');
  };

  const handleUnlockVault = async (answer) => {
    // In offline mode, the vault is already present in the payload.
    // We can just unlock it to reveal the inline contents, or transition to the dedicated page.
    setVault({ ...vault, unlock_time: new Date().toISOString(), is_locked: false });
    setTimeout(() => setStep('vault-wishes'), 100);
  };

  return (
    <div className="birthday-experience">
      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <WelcomeScreen 
            key="welcome"
            birthdayName={birthdayName} 
            onEnter={() => setStep('reveal')} 
          />
        )}
        
        {step === 'reveal' && (
          <BirthdayReveal 
            key="reveal"
            birthdayName={birthdayName}
            onComplete={() => setStep('main')}
          />
        )}
      </AnimatePresence>

      {step === 'vault-wishes' && (
        <VaultWishes 
          isOffline={true} 
          offlineVaultData={vault} 
          offlineEventData={data.event} 
          onBack={() => {
            window.scrollTo({ top: 0 });
            setStep('main');
          }}
        />
      )}

      {step === 'main' && (
        <>
          <BirthdayNavbar birthdayName={birthdayName} hasVault={!!vault} enableWishes={enableWishes} enableVideos={enableVideos} enableTimeline={enableTimeline} />
          <PersonalMessage />
          {(enableWishes || enableVideos) && <WishesIntro totalWishes={data.wishes.length} />}
          
          {enableWishes && textWishes.length > 0 && <WishWall textWishes={textWishes} />}
          {enableVideos && videoWishes.length > 0 && <VideoWishes videoWishes={videoWishes} />}
          
          {enableTimeline && (
            timeline.length > 0 ? (
              <MemoryTimeline timelineEntries={timeline} />
            ) : (
              <section style={{ padding: '100px 20px', textAlign: 'center', color: 'var(--bb-text-muted)' }}>
                <p>Your Memory Line is waiting for its first chapter.</p>
              </section>
            )
          )}

          {vault && (
            <SecretVault vault={vault} onUnlock={handleUnlockVault} isOffline={true} />
          )}

          <FinalCelebration 
            birthdayName={birthdayName} 
            onReplay={handleReplay} 
            wishes={textWishes} 
            videoWishes={videoWishes}
            timeline={timeline}
            vault={vault}
            vaultUnlocked={true}
            isOffline={true}
          />
        </>
      )}
    </div>
  );
}
