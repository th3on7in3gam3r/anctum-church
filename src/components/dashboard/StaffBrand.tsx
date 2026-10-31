import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChurchBadge } from '../common/ChurchBadge';

/** Staff app header: the church's app name (or church name) and logo from Church setup. */
export const StaffBrand: React.FC<{ size?: 'sm' | 'md' | 'lg'; variant?: 'full' | 'mark' }> = ({ size = 'sm', variant = 'full' }) => {
  const { organization, isAuthenticated } = useAuth();
  const name = isAuthenticated ? organization.appName || organization.name : 'Church staff';
  const subline = isAuthenticated && organization.appName && organization.appName !== organization.name ? organization.name : null;
  return <ChurchBadge name={name} subline={subline} logoUrl={isAuthenticated ? organization.logoUrl : null} size={size} variant={variant} />;
};
