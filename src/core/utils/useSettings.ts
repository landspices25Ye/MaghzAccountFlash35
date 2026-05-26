import { useState, useEffect, useCallback } from 'react';
import { getDbAdapter } from '@/core/database/adapters';

interface AppSettings {
  vatRate: number;
  vatAccountId?: string;
  defaultCurrency: string;
  baseCurrency: string;
  defaultBranchId?: string;
  defaultAccounts: Record<string, string>;
  dateFormat: string;
  decimalPlaces: number;
}

export function useSettings(companyId: string) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    
    try {
      const adapter = await getDbAdapter();
      
      // Load VAT settings
      const vatResult = await adapter.query(
        `SELECT * FROM vat_settings WHERE company_id = ? AND is_active = true LIMIT 1`,
        [companyId]
      );
      
      // Load currencies
      const currResult = await adapter.query(
        `SELECT * FROM currencies WHERE company_id = ? AND is_active = true`,
        [companyId]
      );
      
      // Load default accounts
      const defaultAccountsResult = await adapter.query(
        `SELECT function_key, account_id FROM default_accounts WHERE company_id = ?`,
        [companyId]
      );

      // Load default branch
      const branchResult = await adapter.query(
        `SELECT id FROM branches WHERE company_id = ? AND is_active = true ORDER BY created_at ASC LIMIT 1`,
        [companyId]
      );

      // Load company format settings
      const companyResult = await adapter.query(
        `SELECT date_format, decimal_places FROM companies WHERE id = ? LIMIT 1`,
        [companyId]
      );

      const vatRate = vatResult.success && vatResult.rows?.[0]
        ? Number(vatResult.rows[0].vat_rate)
        : 15;

      const baseCurrency = currResult.success && currResult.rows
        ? currResult.rows.find((c: any) => c.is_default)?.code || 'YER'
        : 'YER';

      const defaultAccounts: Record<string, string> = {};
      if (defaultAccountsResult.success && defaultAccountsResult.rows) {
        for (const row of defaultAccountsResult.rows) {
          if (row.function_key && row.account_id) {
            defaultAccounts[row.function_key] = row.account_id;
          }
        }
      }

      const defaultBranchId = branchResult.success && branchResult.rows?.[0]
        ? branchResult.rows[0].id
        : undefined;

      const dateFormat = companyResult.success && companyResult.rows?.[0]?.date_format
        ? String(companyResult.rows[0].date_format)
        : 'yyyy-MM-dd';

      const decimalPlaces = companyResult.success && companyResult.rows?.[0]?.decimal_places !== undefined
        ? Number(companyResult.rows[0].decimal_places)
        : 2;

      setSettings({
        vatRate,
        baseCurrency,
        defaultCurrency: baseCurrency,
        defaultAccounts,
        defaultBranchId,
        dateFormat,
        decimalPlaces,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return { settings, isLoading, reload: loadSettings };
}

export default useSettings;
