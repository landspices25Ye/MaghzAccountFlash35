import { mockAdapter } from './mockAdapter';

async function testMock() {
  console.log('=== Testing Mock Adapter ===');
  
  // Test getCompany
  const company = await mockAdapter.getCompany();
  console.log('Company:', company);
  
  const companyId = company.success ? company.data.id : 'comp-1';
  console.log('Using companyId:', companyId);
  
  // Test getAccounts
  const accounts = await mockAdapter.getAccounts(companyId);
  console.log('Accounts count:', accounts.data?.length);
  
  // Test getProducts
  const products = await mockAdapter.getProducts(companyId);
  console.log('Products count:', products.data?.length);
  
  // Test getContacts
  const contacts = await mockAdapter.getContacts(companyId);
  console.log('Contacts count:', contacts.data?.length);
  
  // Test direct query for customers
  const customers = await mockAdapter.query('SELECT * FROM customers WHERE company_id = $1', [companyId]);
  console.log('Customers via query:', customers.rows?.length);
  
  // Test direct query for invoices
  const invoices = await mockAdapter.query('SELECT * FROM sales_invoices WHERE company_id = $1', [companyId]);
  console.log('Invoices via query:', invoices.rows?.length);
  
  console.log('=== Done ===');
}

testMock();
