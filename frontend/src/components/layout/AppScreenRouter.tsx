import React from 'react';
import { useApp } from '../../context/AppContext';
import { CalendarView } from '../calendar/CalendarView';
import { DashboardView } from '../dashboard/DashboardView';
import { DebtDetailView } from '../debts/DebtDetailView';
import { DebtsListView } from '../debts/DebtsListView';
import { StrategicPlanView } from '../plan/StrategicPlanView';
import { ProfileView } from '../profile/ProfileView';
import { SimulationView } from '../simulation/SimulationView';
import { SubscriptionView } from '../subscription/SubscriptionView';
import { MonthlyProgressView } from '../monthly/MonthlyProgressView';

export const AppScreenRouter: React.FC = () => {
  const { currentScreen } = useApp();

  switch (currentScreen) {
    case 'debts': return <DebtsListView />;
    case 'debt_detail': return <DebtDetailView />;
    case 'strategy': return <StrategicPlanView />;
    case 'simulation': return <SimulationView />;
    case 'calendar': return <CalendarView />;
    case 'profile': return <ProfileView />;
    case 'subscription': return <SubscriptionView />;
    case 'monthly_progress': return <MonthlyProgressView />;
    case 'dashboard':
    default: return <DashboardView />;
  }
};
