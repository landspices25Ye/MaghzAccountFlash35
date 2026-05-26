import { useCallback } from 'react';
import { getDbAdapter } from '@/core/database/adapters';

interface DocumentSequence {
  id: string;
  documentType: string;
  prefix: string;
  currentNumber: number;
  paddingLength: number;
  yearReset: boolean;
  isActive: boolean;
}

export function useDocumentSequence() {
  const getNextNumber = useCallback(async (
    documentType: string,
    companyId: string
  ): Promise<{ success: boolean; number?: string; error?: string }> => {
    try {
      const adapter = await getDbAdapter();
      
      // Query document sequence from DB
      const result = await adapter.query(
        `SELECT * FROM document_sequences WHERE document_type = ? AND company_id = ? AND is_active = true`,
        [documentType, companyId]
      );
      
      if (!result.success || !result.rows || result.rows.length === 0) {
        // Fallback: generate simple sequential number
        const fallbackNum = Math.floor(Math.random() * 900000) + 100000;
        return { success: true, number: `${documentType.toUpperCase().substring(0, 3)}-${fallbackNum}` };
      }
      
      const seq: DocumentSequence = result.rows[0];
      const nextNum = seq.currentNumber + 1;
      
      // Check year reset
      let prefix = seq.prefix;
      if (seq.yearReset) {
        const currentYear = new Date().getFullYear();
        prefix = prefix.replace(/YYYY|YY/g, (match) => 
          match === 'YYYY' ? String(currentYear) : String(currentYear).slice(-2)
        );
      }
      
      const paddedNum = String(nextNum).padStart(seq.paddingLength, '0');
      const fullNumber = `${prefix}-${paddedNum}`;
      
      // Update sequence in DB
      await adapter.query(
        `UPDATE document_sequences SET current_number = ? WHERE id = ?`,
        [nextNum, seq.id]
      );
      
      return { success: true, number: fullNumber };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }, []);

  return { getNextNumber };
}

export default useDocumentSequence;
