import { useState } from 'react';
import { UserProfile } from '../../types';
import { userService } from '../../services/userService';
import { validateProfileUpdate, ProfileFieldErrors } from './profile.validation';

export interface UseEditProfileFormReturn {
  fullName: string;
  setFullName: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  birthDate: string;
  setBirthDate: (v: string) => void;
  errors: ProfileFieldErrors;
  isSaving: boolean;
  generalError: string | null;
  submit: (onSuccess: (updated: UserProfile) => void) => Promise<void>;
  reset: (profile: UserProfile) => void;
}

/**
 * Manages profile edit state for the inline edit form in PersonalInfoSection.
 * Initializes from the given userProfile and validates before submitting.
 * On error, preserves field values (CA-06).
 */
export function useEditProfileForm(userProfile: UserProfile): UseEditProfileFormReturn {
  const [fullName, setFullName] = useState(userProfile.fullName);
  const [phone, setPhone] = useState(userProfile.phone ?? '');
  const [birthDate, setBirthDate] = useState(userProfile.birthDate ?? '');
  const [errors, setErrors] = useState<ProfileFieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const reset = (profile: UserProfile) => {
    setFullName(profile.fullName);
    setPhone(profile.phone ?? '');
    setBirthDate(profile.birthDate ?? '');
    setErrors({});
    setGeneralError(null);
  };

  const submit = async (onSuccess: (updated: UserProfile) => void) => {
    setGeneralError(null);

    // Validate first
    const validationErrors = validateProfileUpdate({ fullName, phone, birthDate });
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});

    try {
      setIsSaving(true);
      const updated = await userService.updateUserProfile({
        fullName: fullName.trim(),
        phone: phone.trim(),
        birthDate: birthDate.trim()
      });
      onSuccess(updated);
    } catch (cause) {
      // Preserve field values on error (CA-06)
      setGeneralError(cause instanceof Error ? cause.message : 'No fue posible actualizar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return {
    fullName,
    setFullName,
    phone,
    setPhone,
    birthDate,
    setBirthDate,
    errors,
    isSaving,
    generalError,
    submit,
    reset
  };
}
