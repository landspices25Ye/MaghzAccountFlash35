import { mockAdapter } from './src/core/database/adapters/mockAdapter.ts';

async function test() {
  console.log('=== Testing Mock Adapter ===');
  const company = await mockAdapter.getCompany();
  console.log('Company:', JSON.stringify(company, null, 2));

  const custResult = await mockAdapter.query('SELECT * FROM customers WHERE company_id = $1 ORDER BY name', ['comp-1']);
  console.log('Customers count:', custResult.rows?.length);
  console.log('First customer:', custResult.rows?.[0]);

  const invResult = await mockAdapter.query('SELECT * FROM sales_invoices WHERE company_id = $1', ['comp-1']);
  console.log('Invoices count:', invResult.rows?.length);
  console.log('First invoice:', invResult.rows?.[0]);
}

test().catch(console.error);
