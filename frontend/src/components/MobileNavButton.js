import React from 'react';
import { Link } from 'react-router-dom';
import './MobileNavButton.css';

const MobileNavButton = ({ location = 'desktop' }) => {
  const isMobile = location === 'mobile';
  
  return (
    <div className="mobile-nav-button">
      <Link to={isMobile ? '/' : '/mobile'}>
        <button className="switch-button">
          {isMobile ? '切换到桌面版' : '切换到移动版'}
        </button>
      </Link>
    </div>
  );
};

export default MobileNavButton; 