import React, { useState, useEffect } from 'react';

interface FooterProps {
  lastLog: string | null;
}

const Footer: React.FC<FooterProps> = ({ lastLog }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    // Only run the timer if we are in "User Ready" mode (no log)
    // or we can keep it running in background, but we only display it if !lastLog
    const timer = setInterval(() => {
      setTime(new Date());
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Format time as HH:MM:SS mmm
  const formatTime = (date: Date) => {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${h}:${m}:${s} ${ms}`;
  };

  return (
    <div className="h-8 bg-gradient-to-t from-[#0d1620] to-[#253646] text-white flex items-center px-2 text-sm font-sans shadow-[0_-1px_2px_rgba(0,0,0,0.5)] border-t border-gray-700">
      <span className="font-medium tracking-wide">
        {lastLog ? (
          // Display the specific log message
          lastLog
        ) : (
          // Display default User Ready with live clock
          <>
            {formatTime(time)} <span className="ml-2">User Ready!</span>
          </>
        )}
      </span>
    </div>
  );
};

export default Footer;
