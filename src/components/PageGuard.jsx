import React from 'react';
import { useConfig } from '../context/ConfigContext';
import { useAuth } from '../context/AuthContext';
import Maintenance from '../pages/Maintenance';

const PageGuard = ({ pageId, children }) => {
  const { config, loading } = useConfig();
  const { isAdmin } = useAuth();

  if (loading) return null;

  const isUnderMaintenance = config?.maintenance?.[pageId] === true;

  if (isUnderMaintenance && !isAdmin) {
    return <Maintenance />;
  }

  return <>{children}</>;
};

export default PageGuard;
