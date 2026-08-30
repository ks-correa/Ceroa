import React, { lazy, Suspense } from 'react';
import { useApp } from '../../context/AppContext';

const AddDebtModal = lazy(() => import('./AddDebtModal').then((module) => ({ default: module.AddDebtModal })));
const EditFinancialProfileModal = lazy(() => import('./EditFinancialProfileModal').then((module) => ({ default: module.EditFinancialProfileModal })));
const EditProfileModal = lazy(() => import('./EditProfileModal').then((module) => ({ default: module.EditProfileModal })));
const ExportReportModal = lazy(() => import('./ExportReportModal').then((module) => ({ default: module.ExportReportModal })));
const RecordPaymentModal = lazy(() => import('./RecordPaymentModal').then((module) => ({ default: module.RecordPaymentModal })));
const SubscriptionCheckoutModal = lazy(() => import('./SubscriptionCheckoutModal').then((module) => ({ default: module.SubscriptionCheckoutModal })));

export const AsyncModals: React.FC = () => {
  const {
    isAddDebtOpen,
    isEditFinancialOpen,
    isEditProfileOpen,
    isExportReportOpen,
    isRecordPaymentOpen,
    isSubscriptionModalOpen
  } = useApp();

  return (
    <Suspense fallback={null}>
      {isAddDebtOpen && <AddDebtModal />}
      {isEditFinancialOpen && <EditFinancialProfileModal />}
      {isEditProfileOpen && <EditProfileModal />}
      {isExportReportOpen && <ExportReportModal />}
      {isRecordPaymentOpen && <RecordPaymentModal />}
      {isSubscriptionModalOpen && <SubscriptionCheckoutModal />}
    </Suspense>
  );
};
