import { useCallback } from 'react';
import { getNextDocumentNumber } from '@/core/api';

export function useDocumentSequence() {
  const getNextNumber = useCallback(async (
    documentType: string,
    companyId: string
  ): Promise<{ success: boolean; number?: string; error?: string }> => {
    if (!companyId) {
      const fallbackNum = Math.floor(Math.random() * 900000) + 100000;
      return { success: true, number: `${documentType.toUpperCase().substring(0, 3)}-${fallbackNum}` };
    }
    return getNextDocumentNumber(companyId, documentType);
  }, []);

  return { getNextNumber };
}

export default useDocumentSequence;
