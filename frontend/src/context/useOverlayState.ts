import { useState } from 'react';
import { PaymentRecord } from '../types';

export const useOverlayState = () => {
  const [isAddDebtOpen, setIsAddDebtOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [targetPaymentDebtId, setTargetPaymentDebtId] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [suggestedPaymentAmount, setSuggestedPaymentAmount] = useState<number | null>(null);
  const [editingDebtId, setEditingDebtId] = useState<string | null>(null);
  const [isEditFinancialOpen, setIsEditFinancialOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isExportReportOpen, setIsExportReportOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  return {
    isAddDebtOpen, setIsAddDebtOpen,
    isRecordPaymentOpen, setIsRecordPaymentOpen,
    targetPaymentDebtId, setTargetPaymentDebtId,
    editingPayment, setEditingPayment,
    suggestedPaymentAmount, setSuggestedPaymentAmount,
    editingDebtId, setEditingDebtId,
    isEditFinancialOpen, setIsEditFinancialOpen,
    isEditProfileOpen, setIsEditProfileOpen,
    isSubscriptionModalOpen, setIsSubscriptionModalOpen,
    isExportReportOpen, setIsExportReportOpen,
    isNotificationsOpen, setIsNotificationsOpen
  };
};
