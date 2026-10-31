import { useEffect } from 'react';
import { useApp } from '../context/AppContext';

/**
 * Registers a form as dirty so dashboard navigation, browser back,
 * and tab close cannot silently discard unsaved work.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const { setHasUnsavedChanges } = useApp();

  useEffect(() => {
    setHasUnsavedChanges(isDirty);

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      setHasUnsavedChanges(false);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [isDirty, setHasUnsavedChanges]);
}
