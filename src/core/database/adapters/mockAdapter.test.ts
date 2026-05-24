import { describe, it, expect, beforeEach } from 'vitest';
import { mockAdapter } from './mockAdapter';

describe('Mock Database Adapter', () => {
  beforeEach(() => {
    // Reset storage by creating a new adapter call
  });

  describe('ping', () => {
    it('returns success', async () => {
      const result = await mockAdapter.ping();
      expect(result.success).toBe(true);
      expect(result.message).toBe('Mock DB active');
    });
  });

  describe('getCompany', () => {
    it('creates default company when empty', async () => {
      const result = await mockAdapter.getCompany();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.name).toContain('المغزى');
    });

    it('returns existing company', async () => {
      const first = await mockAdapter.getCompany();
      const second = await mockAdapter.getCompany();
      expect(second.data.id).toBe(first.data.id);
    });
  });

  describe('getAccounts', () => {
    it('returns seeded accounts for company', async () => {
      const company = await mockAdapter.getCompany();
      const result = await mockAdapter.getAccounts(company.data.id);
      expect(result.success).toBe(true);
      expect(result.data && result.data.length).toBeGreaterThan(0);
    });
  });

  describe('createAccount', () => {
    it('creates a new account', async () => {
      const result = await mockAdapter.createAccount({
        company_id: 'test-company',
        code: '999',
        name_ar: 'Test Account',
        name_en: 'Test',
        type: 'asset',
        nature: 'debit',
        is_group: false,
        parent_id: null,
        balance: 1000,
      });
      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });
  });

  describe('updateAccountBalance', () => {
    it('updates account balance', async () => {
      const createResult = await mockAdapter.createAccount({
        company_id: 'test',
        code: '888',
        name_ar: 'Cash',
        name_en: 'Cash',
        type: 'asset',
        nature: 'debit',
        is_group: false,
        parent_id: null,
        balance: 5000,
      });

      const updateResult = await mockAdapter.updateAccountBalance(createResult.id!, 1000);
      expect(updateResult.success).toBe(true);
    });

    it('fails for non-existent account', async () => {
      const result = await mockAdapter.updateAccountBalance('non-existent', 100);
      expect(result.success).toBe(false);
    });
  });

  describe('query', () => {
    it('handles SELECT queries', async () => {
      const result = await mockAdapter.query('SELECT * FROM accounts WHERE company_id = $1', ['test']);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.rows)).toBe(true);
    });

    it('handles INSERT queries', async () => {
      const result = await mockAdapter.query(
        `INSERT INTO products (company_id, name, sku) VALUES ($1, $2, $3) RETURNING id`,
        ['test', 'Product', 'SKU001']
      );
      expect(result.success).toBe(true);
    });
  });

  describe('getContacts', () => {
    it('filters by type', async () => {
      const company = await mockAdapter.getCompany();
      const customers = await mockAdapter.getContacts(company.data.id, 'customer');
      expect(customers.success).toBe(true);
      expect(customers.data && customers.data.every((c: any) => c.type === 'customer')).toBe(true);
    });
  });
});
