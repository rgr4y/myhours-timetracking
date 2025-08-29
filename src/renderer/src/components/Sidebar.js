import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, FileText, Folder, BarChart, FileInput, Settings } from 'lucide-react';
import { Text } from './ui';
import styled from 'styled-components';

const SidebarContainer = styled.div`
  width: 240px;
  background: #2a2a2a;
  padding: 20px 0;
  border-right: 1px solid #404040;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
`;

const SidebarTitle = styled.div`
  padding: 0 20px 20px;
  font-size: 20px;
  font-weight: 600;
  color: #ffffff;
  border-bottom: 1px solid #404040;
  margin-bottom: 20px;
`;

const NavItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  color: ${props => props.$active ? '#007AFF' : '#cccccc'};
  background: ${props => props.$active ? 'rgba(0, 122, 255, 0.1)' : 'transparent'};
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const NavScroll = styled.div`
  overflow-y: auto;
  padding-bottom: 10px;
`;

const VersionFooter = styled.div`
  margin-top: auto;
  padding: 12px 20px;
  border-top: 1px solid #404040;
  color: #8a8a8a;
  font-size: 12px;
`;

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (window.electronAPI?.invoke) {
          const v = await window.electronAPI.invoke('app:getVersion');
          if (mounted) setAppVersion(v);
        }
      } catch (_) {}
    })();
    return () => { mounted = false; };
  }, []);

  const menuItems = [
    { path: '/', icon: Clock, label: 'Timer' },
    { path: '/entries', icon: FileText, label: 'Time Entries' },
    { path: '/projects', icon: Folder, label: 'Clients' },
    { path: '/reports', icon: BarChart, label: 'Reports' },
    { path: '/invoice', icon: FileInput, label: 'Invoice' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <SidebarContainer>
      <SidebarTitle>myHours</SidebarTitle>
      <NavScroll>
        <nav>
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <NavItem
                key={item.path}
                $active={location.pathname === item.path}
                onClick={() => navigate(item.path)}
              >
                <Icon size={20} />
                <Text>{item.label}</Text>
              </NavItem>
            );
          })}
        </nav>
      </NavScroll>
      <VersionFooter>
        v{appVersion || '—'}
      </VersionFooter>
    </SidebarContainer>
  );
};

export default Sidebar;
