import React, { useState } from 'react';
import { X, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const EditProfileModal: React.FC = () => {
  const { 
    isEditProfileOpen, 
    setIsEditProfileOpen, 
    userProfile, 
    handleUpdateUserProfile 
  } = useApp();

  const [fullName, setFullName] = useState(userProfile.fullName);
  const [email, setEmail] = useState(userProfile.email);
  const [phone, setPhone] = useState(userProfile.phone || '');
  const [documentId, setDocumentId] = useState(userProfile.documentId || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  if (!isEditProfileOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setIsSaving(true);
      await handleUpdateUserProfile({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        documentId: documentId.trim()
      });
      setIsEditProfileOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible actualizar el perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-cyan-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 id="profile-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                Editar Datos Personales
              </h3>
              <p className="text-xs text-slate-500">Actualiza tu información de contacto</p>
            </div>
          </div>
          <button
            onClick={() => setIsEditProfileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Cerrar edición de perfil"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">{error}</div>}
          
          <div className="space-y-1">
            <label htmlFor="profile-full-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nombre Completo
            </label>
            <input
              id="profile-full-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="profile-email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Correo Electrónico
            </label>
            <input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="profile-phone" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Teléfono
              </label>
              <input
                id="profile-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="profile-document" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Documento
              </label>
              <input
                id="profile-document"
                type="text"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditProfileOpen(false)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 disabled:opacity-60 rounded-xl shadow-xs"
            >
              {isSaving ? 'Guardando...' : 'Guardar Perfil'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
