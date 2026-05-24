function genId(): string {
  return crypto.randomUUID();
}

export function seedAllData(companyId: string) {
  return {
    accounts: seedAccounts(companyId),
    contacts: [...seedCustomers(companyId), ...seedSuppliers(companyId)],
    products: seedProducts(companyId),
    sales_invoices: seedInvoices(companyId),
    inventory_transactions: seedInventoryTransactions(companyId),
    stock_adjustments: seedStockAdjustments(companyId),
    sales_returns: seedSalesReturns(companyId),
    purchase_returns: seedPurchaseReturns(companyId),
    receipt_vouchers: seedReceiptVouchers(companyId),
    payment_vouchers: seedPaymentVouchers(companyId),
    purchase_invoices: seedPurchaseInvoices(companyId),
    employees: seedEmployees(companyId),
    attendance: seedAttendance(companyId),
    payroll: seedPayroll(companyId),
    leads: seedLeads(companyId),
    opportunities: seedOpportunities(companyId),
    tasks: seedTasks(companyId),
    work_orders: seedWorkOrders(companyId),
    boms: seedBoms(companyId),
    transactions: seedJournalEntries(companyId),
    document_sequences: seedDocumentSequences(companyId),
    product_types: seedProductTypes(companyId),
    units: seedUnits(companyId),
    cash_boxes: seedCashBoxes(companyId),
    banks: seedBanks(companyId),
    cost_centers: seedCostCenters(companyId),
    payroll_components: seedPayrollComponents(companyId),
    default_accounts: seedDefaultAccounts(companyId),
  };
}

function seedAccounts(companyId: string) {
  const accounts = [
    // ASSETS
    { id: 'acc-1', code: '1', name_ar: 'الأصول', name_en: 'Assets', parent_id: null, type: 'asset', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-11', code: '11', name_ar: 'الأصول المتداولة', name_en: 'Current Assets', parent_id: 'acc-1', type: 'asset', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-111', code: '111', name_ar: 'النقدية', name_en: 'Cash', parent_id: 'acc-11', type: 'asset', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-11101', code: '11101', name_ar: 'الصندوق الرئيسي', name_en: 'Main Cash', parent_id: 'acc-111', type: 'asset', nature: 'debit', is_group: false, balance: 2500000 },
    { id: 'acc-11102', code: '11102', name_ar: 'البنك اليمني الدولي', name_en: 'Yemen International Bank', parent_id: 'acc-111', type: 'asset', nature: 'debit', is_group: false, balance: 5800000 },
    { id: 'acc-112', code: '112', name_ar: 'العملاء', name_en: 'Customers', parent_id: 'acc-11', type: 'asset', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-11201', code: '11201', name_ar: 'مدينون تجاريون', name_en: 'Trade Debtors', parent_id: 'acc-112', type: 'asset', nature: 'debit', is_group: false, balance: 3200000 },
    { id: 'acc-113', code: '113', name_ar: 'المخزون', name_en: 'Inventory', parent_id: 'acc-11', type: 'asset', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-11301', code: '11301', name_ar: 'بضاعة أول المدة', name_en: 'Opening Inventory', parent_id: 'acc-113', type: 'asset', nature: 'debit', is_group: false, balance: 4500000 },
    { id: 'acc-114', code: '114', name_ar: 'مصروفات مدفوعة مقدماً', name_en: 'Prepaid Expenses', parent_id: 'acc-11', type: 'asset', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-11401', code: '11401', name_ar: 'إيجار مدفوع مقدماً', name_en: 'Prepaid Rent', parent_id: 'acc-114', type: 'asset', nature: 'debit', is_group: false, balance: 600000 },

    // NON-CURRENT ASSETS
    { id: 'acc-12', code: '12', name_ar: 'الأصول غير المتداولة', name_en: 'Non-Current Assets', parent_id: 'acc-1', type: 'asset', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-121', code: '121', name_ar: 'المباني والأراضي', name_en: 'Property & Land', parent_id: 'acc-12', type: 'asset', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-12101', code: '12101', name_ar: 'المبنى الرئيسي', name_en: 'Main Building', parent_id: 'acc-121', type: 'asset', nature: 'debit', is_group: false, balance: 8500000 },
    { id: 'acc-122', code: '122', name_ar: 'الأجهزة والمعدات', name_en: 'Equipment', parent_id: 'acc-12', type: 'asset', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-12201', code: '12201', name_ar: 'أجهزة الحاسوب', name_en: 'Computers', parent_id: 'acc-122', type: 'asset', nature: 'debit', is_group: false, balance: 1200000 },
    { id: 'acc-12202', code: '12202', name_ar: 'معدات الإنتاج', name_en: 'Production Equipment', parent_id: 'acc-122', type: 'asset', nature: 'debit', is_group: false, balance: 2800000 },
    { id: 'acc-123', code: '123', name_ar: 'مركبات النقل', name_en: 'Vehicles', parent_id: 'acc-12', type: 'asset', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-12301', code: '12301', name_ar: 'سيارات النقل', name_en: 'Transport Vehicles', parent_id: 'acc-123', type: 'asset', nature: 'debit', is_group: false, balance: 2100000 },

    // LIABILITIES
    { id: 'acc-2', code: '2', name_ar: 'الالتزامات', name_en: 'Liabilities', parent_id: null, type: 'liability', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-21', code: '21', name_ar: 'الالتزامات المتداولة', name_en: 'Current Liabilities', parent_id: 'acc-2', type: 'liability', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-211', code: '211', name_ar: 'الموردون', name_en: 'Suppliers', parent_id: 'acc-21', type: 'liability', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-21101', code: '21101', name_ar: 'دائنون تجاريون', name_en: 'Trade Creditors', parent_id: 'acc-211', type: 'liability', nature: 'credit', is_group: false, balance: 1800000 },
    { id: 'acc-212', code: '212', name_ar: 'قروض قصيرة الأجل', name_en: 'Short-term Loans', parent_id: 'acc-21', type: 'liability', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-21201', code: '21201', name_ar: 'قرض بنكي قصير الأجل', name_en: 'Short-term Bank Loan', parent_id: 'acc-212', type: 'liability', nature: 'credit', is_group: false, balance: 1500000 },
    { id: 'acc-213', code: '213', name_ar: 'ضريبة القيمة المضافة', name_en: 'VAT Payable', parent_id: 'acc-21', type: 'liability', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-21301', code: '21301', name_ar: 'ضريبة القيمة المضافة مستحقة', name_en: 'VAT Payable', parent_id: 'acc-213', type: 'liability', nature: 'credit', is_group: false, balance: 450000 },
    { id: 'acc-22', code: '22', name_ar: 'الالتزامات طويلة الأجل', name_en: 'Long-term Liabilities', parent_id: 'acc-2', type: 'liability', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-221', code: '221', name_ar: 'قروض طويلة الأجل', name_en: 'Long-term Loans', parent_id: 'acc-22', type: 'liability', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-22101', code: '22101', name_ar: 'قرض بنكي طويل الأجل', name_en: 'Long-term Bank Loan', parent_id: 'acc-221', type: 'liability', nature: 'credit', is_group: false, balance: 3500000 },

    // EQUITY
    { id: 'acc-3', code: '3', name_ar: 'حقوق الملكية', name_en: 'Equity', parent_id: null, type: 'equity', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-31', code: '31', name_ar: 'رأس المال', name_en: 'Capital', parent_id: 'acc-3', type: 'equity', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-311', code: '311', name_ar: 'رأس المال المدفوع', name_en: 'Paid-in Capital', parent_id: 'acc-31', type: 'equity', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-31101', code: '31101', name_ar: 'رأس المال الأساسي', name_en: 'Base Capital', parent_id: 'acc-311', type: 'equity', nature: 'credit', is_group: false, balance: 10000000 },
    { id: 'acc-32', code: '32', name_ar: 'الأرباح المحتجزة', name_en: 'Retained Earnings', parent_id: 'acc-3', type: 'equity', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-321', code: '321', name_ar: 'أرباح السنة الحالية', name_en: 'Current Year Profit', parent_id: 'acc-32', type: 'equity', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-32101', code: '32101', name_ar: 'أرباح الربع الأول', name_en: 'Q1 Profit', parent_id: 'acc-321', type: 'equity', nature: 'credit', is_group: false, balance: 2450000 },

    // REVENUE
    { id: 'acc-4', code: '4', name_ar: 'الإيرادات', name_en: 'Revenue', parent_id: null, type: 'revenue', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-41', code: '41', name_ar: 'إيرادات التشغيل', name_en: 'Operating Revenue', parent_id: 'acc-4', type: 'revenue', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-411', code: '411', name_ar: 'مبيعات', name_en: 'Sales', parent_id: 'acc-41', type: 'revenue', nature: 'credit', is_group: true, balance: 0 },
    { id: 'acc-41101', code: '41101', name_ar: 'مبيعات المنتجات', name_en: 'Product Sales', parent_id: 'acc-411', type: 'revenue', nature: 'credit', is_group: false, balance: 8500000 },
    { id: 'acc-41102', code: '41102', name_ar: 'مبيعات الخدمات', name_en: 'Service Sales', parent_id: 'acc-411', type: 'revenue', nature: 'credit', is_group: false, balance: 1200000 },
    { id: 'acc-41103', code: '41103', name_ar: 'مردودات المبيعات', name_en: 'Sales Returns', parent_id: 'acc-411', type: 'revenue', nature: 'credit', is_group: false, balance: -250000 },

    // EXPENSES
    { id: 'acc-5', code: '5', name_ar: 'المصروفات', name_en: 'Expenses', parent_id: null, type: 'expense', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-51', code: '51', name_ar: 'مصروفات التكلفة', name_en: 'Cost of Sales', parent_id: 'acc-5', type: 'expense', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-511', code: '511', name_ar: 'تكلفة البضاعة المباعة', name_en: 'COGS', parent_id: 'acc-51', type: 'expense', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-51101', code: '51101', name_ar: 'تكلفة بضاعة مباعة', name_en: 'Cost of Goods Sold', parent_id: 'acc-511', type: 'expense', nature: 'debit', is_group: false, balance: 4800000 },
    { id: 'acc-52', code: '52', name_ar: 'مصروفات التشغيل', name_en: 'Operating Expenses', parent_id: 'acc-5', type: 'expense', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-521', code: '521', name_ar: 'الرواتب والأجور', name_en: 'Salaries & Wages', parent_id: 'acc-52', type: 'expense', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-52101', code: '52101', name_ar: 'رواتب الموظفين', name_en: 'Employee Salaries', parent_id: 'acc-521', type: 'expense', nature: 'debit', is_group: false, balance: 1800000 },
    { id: 'acc-52102', code: '52102', name_ar: 'بدلات وعلاوات', name_en: 'Allowances', parent_id: 'acc-521', type: 'expense', nature: 'debit', is_group: false, balance: 350000 },
    { id: 'acc-522', code: '522', name_ar: 'مصروفات الإيجار', name_en: 'Rent Expenses', parent_id: 'acc-52', type: 'expense', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-52201', code: '52201', name_ar: 'إيجار المستودعات', name_en: 'Warehouse Rent', parent_id: 'acc-522', type: 'expense', nature: 'debit', is_group: false, balance: 720000 },
    { id: 'acc-52202', code: '52202', name_ar: 'إيجار المكاتب', name_en: 'Office Rent', parent_id: 'acc-522', type: 'expense', nature: 'debit', is_group: false, balance: 480000 },
    { id: 'acc-523', code: '523', name_ar: 'مصروفات المرافق', name_en: 'Utilities', parent_id: 'acc-52', type: 'expense', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-52301', code: '52301', name_ar: 'كهرباء وماء', name_en: 'Electricity & Water', parent_id: 'acc-523', type: 'expense', nature: 'debit', is_group: false, balance: 320000 },
    { id: 'acc-524', code: '524', name_ar: 'مصروفات التسويق', name_en: 'Marketing', parent_id: 'acc-52', type: 'expense', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-52401', code: '52401', name_ar: 'إعلانات ودعاية', name_en: 'Advertising', parent_id: 'acc-524', type: 'expense', nature: 'debit', is_group: false, balance: 450000 },
    { id: 'acc-525', code: '525', name_ar: 'مصروفات الصيانة', name_en: 'Maintenance', parent_id: 'acc-52', type: 'expense', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-52501', code: '52501', name_ar: 'صيانة المعدات', name_en: 'Equipment Maintenance', parent_id: 'acc-525', type: 'expense', nature: 'debit', is_group: false, balance: 180000 },
    { id: 'acc-526', code: '526', name_ar: 'مصروفات النقل', name_en: 'Transportation', parent_id: 'acc-52', type: 'expense', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-52601', code: '52601', name_ar: 'نقل وشحن', name_en: 'Shipping', parent_id: 'acc-526', type: 'expense', nature: 'debit', is_group: false, balance: 290000 },
    { id: 'acc-527', code: '527', name_ar: 'مصروفات استهلاك', name_en: 'Depreciation', parent_id: 'acc-52', type: 'expense', nature: 'debit', is_group: true, balance: 0 },
    { id: 'acc-52701', code: '52701', name_ar: 'استهلاك المباني', name_en: 'Building Depreciation', parent_id: 'acc-527', type: 'expense', nature: 'debit', is_group: false, balance: 425000 },
    { id: 'acc-52702', code: '52702', name_ar: 'استهلاك المعدات', name_en: 'Equipment Depreciation', parent_id: 'acc-527', type: 'expense', nature: 'debit', is_group: false, balance: 380000 },
  ];

  // We'll seed these into the adapter's storage via a helper
  return accounts.map(a => ({ ...a, company_id: companyId, is_active: true, created_at: new Date().toISOString() }));
}

function seedCustomers(companyId: string) {
  return [
    { id: 'cust-1', company_id: companyId, name: 'شركة اليمن للتجارة', type: 'customer', phone: '+967123456789', email: 'info@yementrade.com', address: 'صنعاء - شارع الستين', balance: 850000, tax_number: '123456789', is_active: true },
    { id: 'cust-2', company_id: companyId, name: 'مؤسسة الأمل التجارية', type: 'customer', phone: '+967987654321', email: 'alamel@local.ye', address: 'عدن - المنصورة', balance: 420000, tax_number: '987654321', is_active: true },
    { id: 'cust-3', company_id: companyId, name: 'شركة الخليج للمواد الغذائية', type: 'customer', phone: '+967112233445', email: 'gulf.foods@ye.net', address: 'الحديدة - شارع صنعاء', balance: 1200000, tax_number: '112233445', is_active: true },
    { id: 'cust-4', company_id: companyId, name: 'مؤسسة النور للأدوات المنزلية', type: 'customer', phone: '+967556677889', email: 'noor@tools.ye', address: 'تعز - جولة النور', balance: 680000, tax_number: '556677889', is_active: true },
    { id: 'cust-5', company_id: companyId, name: 'شركة البحر الأحمر', type: 'customer', phone: '+967334455667', email: 'redsea@ye.com', address: 'الحديدة - كمران', balance: 950000, tax_number: '334455667', is_active: true },
    { id: 'cust-6', company_id: companyId, name: 'مؤسسة الصقر للتجهيزات', type: 'customer', phone: '+967778899001', email: 'saqr@equip.ye', address: 'صنعاء - حدة', balance: 310000, tax_number: '778899001', is_active: true },
    { id: 'cust-7', company_id: companyId, name: 'شركة الوادي للاستيراد', type: 'customer', phone: '+967223344556', email: 'wadi@import.ye', address: 'إب - القاضي', balance: 570000, tax_number: '223344556', is_active: true },
    { id: 'cust-8', company_id: companyId, name: 'مؤسسة السعيد للتجارة', type: 'customer', phone: '+967667788990', email: 'saeed@trade.ye', address: 'صنعاء - شارع تعز', balance: 210000, tax_number: '667788990', is_active: true },
  ];
}

function seedSuppliers(companyId: string) {
  return [
    { id: 'sup-1', company_id: companyId, name: 'مصنع الريان للبلاستيك', type: 'supplier', phone: '+967111222333', email: 'rayan@factory.ye', address: 'صنعاء - بئر أحمد', balance: 450000, tax_number: '111222333', is_active: true },
    { id: 'sup-2', company_id: companyId, name: 'شركة الإمارات للتصدير', type: 'supplier', phone: '+971444555666', email: 'uae@export.ae', address: 'دبي - جبل علي', balance: 1200000, tax_number: 'AE123456', is_active: true },
    { id: 'sup-3', company_id: companyId, name: 'مصنع الأمل للأدوات المنزلية', type: 'supplier', phone: '+967777888999', email: 'amel@factory.ye', address: 'تعز - الصالحية', balance: 680000, tax_number: '777888999', is_active: true },
    { id: 'sup-4', company_id: companyId, name: 'شركة الصين للتجارة الدولية', type: 'supplier', phone: '+8613800138000', email: 'china@trade.cn', address: 'إييوو - الصين', balance: 2500000, tax_number: 'CN987654', is_active: true },
    { id: 'sup-5', company_id: companyId, name: 'مؤسسة التقنية للإلكترونيات', type: 'supplier', phone: '+967333444555', email: 'tech@electronics.ye', address: 'صنعاء - جمرك البستان', balance: 380000, tax_number: '333444555', is_active: true },
    { id: 'sup-6', company_id: companyId, name: 'شركة السعودية للمواد الغذائية', type: 'supplier', phone: '+966555666777', email: 'ksa@food.sa', address: 'جدة - السعودية', balance: 890000, tax_number: 'SA112233', is_active: true },
    { id: 'sup-7', company_id: companyId, name: 'مصنع الوحدة للألبسة', type: 'supplier', phone: '+967444555666', email: 'wahda@textile.ye', address: 'الحديدة - الكثيب', balance: 520000, tax_number: '444555666', is_active: true },
    { id: 'sup-8', company_id: companyId, name: 'شركة مصر للأدوات الكهربائية', type: 'supplier', phone: '+202123456789', email: 'egypt@electric.eg', address: 'القاهرة - مصر', balance: 750000, tax_number: 'EG445566', is_active: true },
  ];
}

function seedProducts(companyId: string) {
  return [
    { id: 'prod-1', company_id: companyId, name_ar: 'براد ماء 20 لتر', name_en: 'Water Cooler 20L', sku: 'BRD-20L', category: 'أدوات منزلية', unit: 'قطعة', cost: 15000, price: 22000, stock: 120, min_stock: 20, is_active: true },
    { id: 'prod-2', company_id: companyId, name_ar: 'غسالة أوتوماتيك 7 كغ', name_en: 'Auto Washer 7kg', sku: 'GSL-7KG', category: 'أدوات منزلية', unit: 'قطعة', cost: 85000, price: 115000, stock: 45, min_stock: 10, is_active: true },
    { id: 'prod-3', company_id: companyId, name_ar: 'مكيف سبليت 18000 وحدة', name_en: 'Split AC 18000', sku: 'MCF-18K', category: 'تكييف', unit: 'قطعة', cost: 95000, price: 135000, stock: 30, min_stock: 8, is_active: true },
    { id: 'prod-4', company_id: companyId, name_ar: 'ثلاجة 16 قدم', name_en: 'Fridge 16ft', sku: 'TLG-16F', category: 'أدوات منزلية', unit: 'قطعة', cost: 120000, price: 165000, stock: 25, min_stock: 5, is_active: true },
    { id: 'prod-5', company_id: companyId, name_ar: 'شاشة LED 55 بوصة', name_en: 'LED TV 55"', sku: 'LED-55', category: 'إلكترونيات', unit: 'قطعة', cost: 145000, price: 195000, stock: 18, min_stock: 5, is_active: true },
    { id: 'prod-6', company_id: companyId, name_ar: 'لابتوب Dell i5', name_en: 'Dell Laptop i5', sku: 'DELL-I5', category: 'إلكترونيات', unit: 'قطعة', cost: 180000, price: 245000, stock: 35, min_stock: 8, is_active: true },
    { id: 'prod-7', company_id: companyId, name_ar: 'خلاط كهربائي 500 واط', name_en: 'Electric Mixer 500W', sku: 'KHB-500', category: 'أدوات مطبخ', unit: 'قطعة', cost: 12000, price: 18000, stock: 200, min_stock: 30, is_active: true },
    { id: 'prod-8', company_id: companyId, name_ar: 'مكنسة كهربائية', name_en: 'Vacuum Cleaner', sku: 'MKN-ELEC', category: 'أدوات منزلية', unit: 'قطعة', cost: 35000, price: 48000, stock: 60, min_stock: 12, is_active: true },
    { id: 'prod-9', company_id: companyId, name_ar: 'سخان ماء 50 لتر', name_en: 'Water Heater 50L', sku: 'SKH-50L', category: 'أدوات منزلية', unit: 'قطعة', cost: 28000, price: 39000, stock: 80, min_stock: 15, is_active: true },
    { id: 'prod-10', company_id: companyId, name_ar: 'مجفف شعر 2000 واط', name_en: 'Hair Dryer 2000W', sku: 'MGF-2000', category: 'عناية شخصية', unit: 'قطعة', cost: 8500, price: 12500, stock: 150, min_stock: 25, is_active: true },
    { id: 'prod-11', company_id: companyId, name_ar: 'مروحة سقفية', name_en: 'Ceiling Fan', sku: 'MRF-SQF', category: 'تبريد', unit: 'قطعة', cost: 22000, price: 31000, stock: 90, min_stock: 15, is_active: true },
    { id: 'prod-12', company_id: companyId, name_ar: 'فرن غاز 4 عيون', name_en: 'Gas Oven 4 Burner', sku: 'FRN-4AY', category: 'أدوات مطبخ', unit: 'قطعة', cost: 45000, price: 62000, stock: 40, min_stock: 8, is_active: true },
    { id: 'prod-13', company_id: companyId, name_ar: 'مكواة بخار', name_en: 'Steam Iron', sku: 'MKW-BKH', category: 'أدوات منزلية', unit: 'قطعة', cost: 9500, price: 14000, stock: 110, min_stock: 20, is_active: true },
    { id: 'prod-14', company_id: companyId, name_ar: 'مكبر صوت بلوتوث', name_en: 'Bluetooth Speaker', sku: 'SPK-BT', category: 'إلكترونيات', unit: 'قطعة', cost: 18000, price: 26000, stock: 75, min_stock: 15, is_active: true },
    { id: 'prod-15', company_id: companyId, name_ar: 'كاميرا مراقبة', name_en: 'Security Camera', sku: 'CMR-WCH', category: 'إلكترونيات', unit: 'قطعة', cost: 32000, price: 45000, stock: 50, min_stock: 10, is_active: true },
  ];
}

function seedInvoices(companyId: string) {
  const customers = ['cust-1', 'cust-2', 'cust-3', 'cust-4', 'cust-5', 'cust-6', 'cust-7', 'cust-8'];
  const invoices = [];
  
  for (let i = 1; i <= 25; i++) {
    const date = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const subtotal = Math.floor(Math.random() * 500000) + 50000;
    const tax = Math.floor(subtotal * 0.05);
    const total = subtotal + tax;
    
    invoices.push({
      id: `inv-${i}`,
      company_id: companyId,
      invoice_number: `INV-2024-${String(i).padStart(4, '0')}`,
      customer_id: customers[Math.floor(Math.random() * customers.length)],
      date: date.toISOString().split('T')[0],
      due_date: new Date(date.getTime() + 30 * 86400000).toISOString().split('T')[0],
      subtotal,
      tax_amount: tax,
      total,
      status: ['draft', 'sent', 'paid', 'overdue'][Math.floor(Math.random() * 4)],
      lines: Array.from({ length: Math.floor(Math.random() * 4) + 1 }, () => ({
        product_id: `prod-${Math.floor(Math.random() * 15) + 1}`,
        quantity: Math.floor(Math.random() * 10) + 1,
        unit_price: Math.floor(Math.random() * 50000) + 5000,
        total: Math.floor(Math.random() * 200000) + 10000,
      })),
    });
  }
  
  return invoices;
}

function seedPurchaseInvoices(companyId: string) {
  const suppliers = ['sup-1', 'sup-2', 'sup-3', 'sup-4', 'sup-5', 'sup-6', 'sup-7', 'sup-8'];
  const invoices = [];
  
  for (let i = 1; i <= 20; i++) {
    const date = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const subtotal = Math.floor(Math.random() * 800000) + 100000;
    const tax = Math.floor(subtotal * 0.05);
    const total = subtotal + tax;
    
    invoices.push({
      id: `pinv-${i}`,
      company_id: companyId,
      invoice_number: `PINV-2024-${String(i).padStart(4, '0')}`,
      supplier_id: suppliers[Math.floor(Math.random() * suppliers.length)],
      date: date.toISOString().split('T')[0],
      due_date: new Date(date.getTime() + 45 * 86400000).toISOString().split('T')[0],
      subtotal,
      tax_amount: tax,
      total,
      status: ['draft', 'sent', 'paid', 'overdue'][Math.floor(Math.random() * 4)],
      lines: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, () => ({
        product_id: `prod-${Math.floor(Math.random() * 15) + 1}`,
        quantity: Math.floor(Math.random() * 20) + 5,
        unit_price: Math.floor(Math.random() * 40000) + 4000,
        total: Math.floor(Math.random() * 300000) + 15000,
      })),
    });
  }
  
  return invoices;
}

function seedEmployees(companyId: string) {
  return [
    { id: 'emp-1', company_id: companyId, full_name: 'أحمد علي محمد', employee_number: 'EMP001', department: 'المبيعات', position: 'مدير مبيعات', hire_date: '2020-03-15', base_salary: 250000, status: 'active', phone: '+967111222333', is_active: true },
    { id: 'emp-2', company_id: companyId, full_name: 'خالد سالم عبدالله', employee_number: 'EMP002', department: 'المحاسبة', position: 'محاسب أول', hire_date: '2019-07-01', base_salary: 220000, status: 'active', phone: '+967444555666', is_active: true },
    { id: 'emp-3', company_id: companyId, full_name: 'فاطمة حسن صالح', employee_number: 'EMP003', department: 'الموارد البشرية', position: 'مدير HR', hire_date: '2018-01-10', base_salary: 280000, status: 'active', phone: '+967777888999', is_active: true },
    { id: 'emp-4', company_id: companyId, full_name: 'محمد سعيد القاضي', employee_number: 'EMP004', department: 'المشتريات', position: 'مدير مشتريات', hire_date: '2021-05-20', base_salary: 240000, status: 'active', phone: '+967222333444', is_active: true },
    { id: 'emp-5', company_id: companyId, full_name: 'عائشة محمود اليافعي', employee_number: 'EMP005', department: 'المبيعات', position: 'مندوب مبيعات', hire_date: '2022-09-01', base_salary: 180000, status: 'active', phone: '+967555666777', is_active: true },
    { id: 'emp-6', company_id: companyId, full_name: 'علي عبدالرحمن الحديدي', employee_number: 'EMP006', department: 'المستودعات', position: 'مدير مخازن', hire_date: '2017-11-15', base_salary: 200000, status: 'active', phone: '+967888999000', is_active: true },
    { id: 'emp-7', company_id: companyId, full_name: 'سميرة أحمد الجبري', employee_number: 'EMP007', department: 'المالية', position: 'مراجع مالي', hire_date: '2020-06-01', base_salary: 260000, status: 'active', phone: '+967333444555', is_active: true },
    { id: 'emp-8', company_id: companyId, full_name: 'عبدالله محمد القحطاني', employee_number: 'EMP008', department: 'التصنيع', position: 'مهندس إنتاج', hire_date: '2021-02-10', base_salary: 230000, status: 'active', phone: '+967666777888', is_active: true },
    { id: 'emp-9', company_id: companyId, full_name: 'ليلى سعيد الأكحلي', employee_number: 'EMP009', department: 'خدمة العملاء', position: 'مشرفة', hire_date: '2022-04-15', base_salary: 170000, status: 'active', phone: '+967999000111', is_active: true },
    { id: 'emp-10', company_id: companyId, full_name: 'ياسر علي الكبسي', employee_number: 'EMP010', department: 'IT', position: 'مطور برمجيات', hire_date: '2023-01-05', base_salary: 210000, status: 'active', phone: '+967123456789', is_active: true },
  ];
}

function seedAttendance(companyId: string) {
  const records = [];
  const employees = ['emp-1', 'emp-2', 'emp-3', 'emp-4', 'emp-5', 'emp-6', 'emp-7', 'emp-8', 'emp-9', 'emp-10'];
  
  for (const empId of employees) {
    for (let day = 1; day <= 25; day++) {
      const status = Math.random() > 0.15 ? 'present' : (Math.random() > 0.5 ? 'absent' : 'late');
      records.push({
        id: genId(),
        company_id: companyId,
        employee_id: empId,
        date: `2024-05-${String(day).padStart(2, '0')}`,
        check_in: status === 'absent' ? null : `${8 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        check_out: status === 'absent' ? null : `${16 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        status,
      });
    }
  }
  
  return records;
}

function seedPayroll(companyId: string) {
  const records = [];
  const employees = ['emp-1', 'emp-2', 'emp-3', 'emp-4', 'emp-5', 'emp-6', 'emp-7', 'emp-8', 'emp-9', 'emp-10'];
  const salaries = [250000, 220000, 280000, 240000, 180000, 200000, 260000, 230000, 170000, 210000];
  
  for (let i = 0; i < employees.length; i++) {
    const base = salaries[i];
    const allowances = Math.floor(base * 0.15);
    const deductions = Math.floor(base * 0.08);
    const tax = Math.floor(base * 0.05);
    const net = base + allowances - deductions - tax;
    
    records.push({
      id: genId(),
      company_id: companyId,
      employee_id: employees[i],
      month: '2024-05',
      base_salary: base,
      allowances,
      deductions,
      tax,
      net_salary: net,
      status: 'processed',
    });
  }
  
  return records;
}

function seedLeads(companyId: string) {
  return [
    { id: 'lead-1', company_id: companyId, name: 'شركة البناء الحديث', phone: '+967111000111', email: 'build@new.ye', source: 'معرض تجاري', status: 'new', created_at: '2024-05-01' },
    { id: 'lead-2', company_id: companyId, name: 'مؤسسة التطوير العقاري', phone: '+967222000222', email: 'dev@realestate.ye', source: 'موقع إلكتروني', status: 'contacted', created_at: '2024-05-03' },
    { id: 'lead-3', company_id: companyId, name: 'شركة النقل السريع', phone: '+967333000333', email: 'fast@transport.ye', source: 'إحالة', status: 'qualified', created_at: '2024-05-05' },
    { id: 'lead-4', company_id: companyId, name: 'مؤسسة الإعمار المتكامل', phone: '+967444000444', email: 'emar@build.ye', source: 'اتصال هاتفي', status: 'lost', created_at: '2024-05-07' },
    { id: 'lead-5', company_id: companyId, name: 'شركة الضيافة الفاخرة', phone: '+967555000555', email: 'lux@hotel.ye', source: 'معرض تجاري', status: 'new', created_at: '2024-05-10' },
    { id: 'lead-6', company_id: companyId, name: 'مؤسسة الصحة الأولى', phone: '+967666000666', email: 'health@first.ye', source: 'موقع إلكتروني', status: 'contacted', created_at: '2024-05-12' },
    { id: 'lead-7', company_id: companyId, name: 'شركة التعليم الذكي', phone: '+967777000777', email: 'smart@edu.ye', source: 'إحالة', status: 'qualified', created_at: '2024-05-15' },
    { id: 'lead-8', company_id: companyId, name: 'مؤسسة الطاقة المتجددة', phone: '+967888000888', email: 'green@energy.ye', source: 'اتصال هاتفي', status: 'new', created_at: '2024-05-18' },
  ];
}

function seedOpportunities(companyId: string) {
  return [
    { id: 'opp-1', company_id: companyId, title: 'تجهيز فندق الجزيرة', customer: 'شركة الضيافة الفاخرة', stage: 'proposal', value: 4500000, probability: 60, expected_close: '2024-07-15', priority: 'high' },
    { id: 'opp-2', company_id: companyId, title: 'معدات مستشفى الصحة', customer: 'مؤسسة الصحة الأولى', stage: 'negotiation', value: 3200000, probability: 75, expected_close: '2024-06-30', priority: 'high' },
    { id: 'opp-3', company_id: companyId, title: 'أجهزة مدارس الذكية', customer: 'شركة التعليم الذكي', stage: 'discovery', value: 1800000, probability: 30, expected_close: '2024-08-20', priority: 'medium' },
    { id: 'opp-4', company_id: companyId, title: 'طاقة شمسية لمبنى', customer: 'مؤسسة الطاقة المتجددة', stage: 'proposal', value: 5500000, probability: 50, expected_close: '2024-09-10', priority: 'high' },
    { id: 'opp-5', company_id: companyId, title: 'تجهيزات شقق سكنية', customer: 'مؤسسة التطوير العقاري', stage: 'closed_won', value: 2100000, probability: 100, expected_close: '2024-05-25', priority: 'medium' },
    { id: 'opp-6', company_id: companyId, title: 'أدوات مطبخ مركزي', customer: 'شركة البناء الحديث', stage: 'closed_lost', value: 1200000, probability: 0, expected_close: '2024-04-15', priority: 'low' },
    { id: 'opp-7', company_id: companyId, title: 'صيانة أسطول نقل', customer: 'شركة النقل السريع', stage: 'negotiation', value: 890000, probability: 80, expected_close: '2024-06-15', priority: 'medium' },
  ];
}

function seedTasks(companyId: string) {
  return [
    { id: 'task-1', company_id: companyId, title: 'متابعة عرض فندق الجزيرة', assigned_to: 'emp-1', due_date: '2024-06-01', priority: 'high', status: 'pending' },
    { id: 'task-2', company_id: companyId, title: 'إعداد عرض أسعار لمستشفى الصحة', assigned_to: 'emp-5', due_date: '2024-05-28', priority: 'high', status: 'completed' },
    { id: 'task-3', company_id: companyId, title: 'زيارة موقع طاقة شمسية', assigned_to: 'emp-4', due_date: '2024-06-10', priority: 'medium', status: 'pending' },
    { id: 'task-4', company_id: companyId, title: 'تحديث بيانات العملاء', assigned_to: 'emp-9', due_date: '2024-05-25', priority: 'low', status: 'completed' },
    { id: 'task-5', company_id: companyId, title: 'مراجعة عقود الموردين', assigned_to: 'emp-2', due_date: '2024-06-05', priority: 'medium', status: 'pending' },
    { id: 'task-6', company_id: companyId, title: 'تدريب موظفي المبيعات الجدد', assigned_to: 'emp-3', due_date: '2024-06-15', priority: 'high', status: 'pending' },
    { id: 'task-7', company_id: companyId, title: 'صيانة دورية لأجهزة العرض', assigned_to: 'emp-10', due_date: '2024-05-30', priority: 'low', status: 'completed' },
    { id: 'task-8', company_id: companyId, title: 'جرد المخزون الشهري', assigned_to: 'emp-6', due_date: '2024-06-01', priority: 'high', status: 'pending' },
  ];
}

function seedWorkOrders(companyId: string) {
  return [
    { id: 'wo-1', company_id: companyId, order_number: 'WO-2024-001', product: 'خلاط كهربائي مخصص', quantity: 50, status: 'in_progress', start_date: '2024-05-01', end_date: '2024-05-15', cost: 950000 },
    { id: 'wo-2', company_id: companyId, order_number: 'WO-2024-002', product: 'سخان ماء مطور', quantity: 30, status: 'completed', start_date: '2024-04-10', end_date: '2024-04-25', cost: 720000 },
    { id: 'wo-3', company_id: companyId, order_number: 'WO-2024-003', product: 'مروحة سقفية صامتة', quantity: 100, status: 'planned', start_date: '2024-06-01', end_date: '2024-06-20', cost: 1200000 },
    { id: 'wo-4', company_id: companyId, order_number: 'WO-2024-004', product: 'مجفف شعر احترافي', quantity: 80, status: 'in_progress', start_date: '2024-05-10', end_date: '2024-05-30', cost: 680000 },
    { id: 'wo-5', company_id: companyId, order_number: 'WO-2024-005', product: 'كابلات توصيل', quantity: 500, status: 'completed', start_date: '2024-03-15', end_date: '2024-04-05', cost: 450000 },
    { id: 'wo-6', company_id: companyId, order_number: 'WO-2024-006', product: 'لوحات إلكترونية', quantity: 200, status: 'cancelled', start_date: '2024-05-05', end_date: '2024-05-20', cost: 850000 },
  ];
}

function seedBoms(companyId: string) {
  return [
    { 
      id: 'bom-1', 
      company_id: companyId, 
      name: 'خلاط كهربائي 500 واط',
      product_id: 'prod-7',
      lines: [
        { material: 'موتور كهربائي 500W', quantity: 1, unit_cost: 6000, total_cost: 6000 },
        { material: 'وعاء بلاستيك 2 لتر', quantity: 1, unit_cost: 2500, total_cost: 2500 },
        { material: 'أسلاك توصيل', quantity: 2, unit_cost: 800, total_cost: 1600 },
        { material: 'مفتاح تشغيل', quantity: 1, unit_cost: 1200, total_cost: 1200 },
      ]
    },
    { 
      id: 'bom-2', 
      company_id: companyId, 
      name: 'سخان ماء 50 لتر',
      product_id: 'prod-9',
      lines: [
        { material: 'خزان ماء 50L', quantity: 1, unit_cost: 12000, total_cost: 12000 },
        { material: 'ملف تسخين 2000W', quantity: 1, unit_cost: 8000, total_cost: 8000 },
        { material: 'مؤقت حراري', quantity: 1, unit_cost: 3500, total_cost: 3500 },
        { material: 'عازل حراري', quantity: 2, unit_cost: 1800, total_cost: 3600 },
      ]
    },
    { 
      id: 'bom-3', 
      company_id: companyId, 
      name: 'مروحة سقفية',
      product_id: 'prod-11',
      lines: [
        { material: 'موتور مروحة', quantity: 1, unit_cost: 9000, total_cost: 9000 },
        { material: 'ريش مروحة', quantity: 3, unit_cost: 2000, total_cost: 6000 },
        { material: 'قاعدة تثبيت', quantity: 1, unit_cost: 3500, total_cost: 3500 },
        { material: 'سلك توصيل 3م', quantity: 1, unit_cost: 1500, total_cost: 1500 },
      ]
    },
  ];
}

function seedJournalEntries(companyId: string) {
  const entries = [];
  const descriptions = [
    'قيود افتتاحية',
    'شراء بضاعة من الموردين',
    'مبيعات نقدية',
    'مبيعات آجلة',
    'صرف رواتب',
    'دفع إيجار',
    'تحصيل من العملاء',
    'سداد للموردين',
    'مصروفات كهرباء',
    'مصروفات صيانة',
  ];
  
  for (let i = 1; i <= 30; i++) {
    const date = new Date(2024, Math.floor(Math.random() * 5), Math.floor(Math.random() * 28) + 1);
    const amount = Math.floor(Math.random() * 500000) + 50000;
    
    entries.push({
      id: `je-${i}`,
      company_id: companyId,
      date: date.toISOString().split('T')[0],
      reference: `JV-2024-${String(i).padStart(4, '0')}`,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      total_amount: amount,
      status: 'posted',
      entries: [
        { account_id: `acc-${Math.floor(Math.random() * 50) + 1}`, debit: amount, credit: 0 },
        { account_id: `acc-${Math.floor(Math.random() * 50) + 1}`, debit: 0, credit: amount },
      ],
    });
  }
  
  return entries;
}

function seedInventoryTransactions(companyId: string) {
  return [
    { id: 'invtx-1', company_id: companyId, date: '2024-06-01', type: 'in', product: 'غسالة أوتوماتيك 7 كغ', warehouse: 'المستودع الرئيسي - صنعاء', quantity: 20, reference: 'PINV-2024-0001', notes: 'استلام بضاعة من المورد' },
    { id: 'invtx-2', company_id: companyId, date: '2024-06-02', type: 'out', product: 'براد ماء 20 لتر', warehouse: 'المستودع الرئيسي - صنعاء', quantity: -5, reference: 'INV-2024-0001', notes: 'صرف بضاعة لفاتورة مبيعات' },
    { id: 'invtx-3', company_id: companyId, date: '2024-06-03', type: 'adjustment', product: 'مكيف سبليت 18000 وحدة', warehouse: 'مستودع عدن', quantity: -2, reference: 'ADJ-2024-0001', notes: 'تسوية بعد الجرد' },
    { id: 'invtx-4', company_id: companyId, date: '2024-06-04', type: 'transfer', product: 'ثلاجة 16 قدم', warehouse: 'المستودع الرئيسي ← مستودع الحديدة', quantity: -8, reference: 'TRF-2024-0001', notes: 'تحويل بين المستودعات' },
    { id: 'invtx-5', company_id: companyId, date: '2024-06-05', type: 'in', product: 'شاشة LED 55 بوصة', warehouse: 'مستودع عدن', quantity: 12, reference: 'PINV-2024-0002', notes: 'استلام بضاعة من المورد' },
    { id: 'invtx-6', company_id: companyId, date: '2024-06-06', type: 'out', product: 'خلاط كهربائي 500 واط', warehouse: 'المستودع الرئيسي - صنعاء', quantity: -30, reference: 'INV-2024-0002', notes: 'صرف بضاعة لفاتورة مبيعات' },
    { id: 'invtx-7', company_id: companyId, date: '2024-06-07', type: 'in', product: 'مكنسة كهربائية', warehouse: 'مستودع الحديدة', quantity: 15, reference: 'PINV-2024-0003', notes: 'استلام بضاعة' },
    { id: 'invtx-8', company_id: companyId, date: '2024-06-08', type: 'out', product: 'سخان ماء 50 لتر', warehouse: 'المستودع الرئيسي - صنعاء', quantity: -10, reference: 'INV-2024-0003', notes: 'صرف بضاعة' },
  ];
}

function seedStockAdjustments(companyId: string) {
  return [
    { id: 'adj-1', company_id: companyId, date: '2024-06-10', product: 'براد ماء 20 لتر', warehouse: 'المستودع الرئيسي - صنعاء', systemQty: 120, actualQty: 118, difference: -2, reason: 'كسر أثناء النقل', status: 'posted' },
    { id: 'adj-2', company_id: companyId, date: '2024-06-12', product: 'غسالة أوتوماتيك 7 كغ', warehouse: 'مستودع عدن', systemQty: 45, actualQty: 45, difference: 0, reason: 'جرد دوري', status: 'posted' },
    { id: 'adj-3', company_id: companyId, date: '2024-06-15', product: 'مكيف سبليت 18000 وحدة', warehouse: 'مستودع الحديدة', systemQty: 30, actualQty: 28, difference: -2, reason: 'عيب مصنعي - إرجاع', status: 'posted' },
    { id: 'adj-4', company_id: companyId, date: '2024-06-18', product: 'لابتوب Dell i5', warehouse: 'المستودع الرئيسي - صنعاء', systemQty: 35, actualQty: 36, difference: 1, reason: 'عثور على قطعة مفقودة', status: 'draft' },
  ];
}

function seedSalesReturns(companyId: string) {
  return [
    { id: 'sr-1', company_id: companyId, return_number: 'SR-2024-001', invoice_number: 'INV-2024-0015', customer: 'شركة اليمن للتجارة', date: '2024-06-10', product: 'غسالة أوتوماتيك 7 كغ', quantity: 1, amount: 115000, reason: 'عيب مصنعي', status: 'posted' },
    { id: 'sr-2', company_id: companyId, return_number: 'SR-2024-002', invoice_number: 'INV-2024-0018', customer: 'مؤسسة الأمل التجارية', date: '2024-06-12', product: 'مكيف سبليت 18000 وحدة', quantity: 1, amount: 135000, reason: 'تلف أثناء النقل', status: 'posted' },
    { id: 'sr-3', company_id: companyId, return_number: 'SR-2024-003', invoice_number: 'INV-2024-0020', customer: 'شركة الخليج للمواد الغذائية', date: '2024-06-15', product: 'براد ماء 20 لتر', quantity: 2, amount: 44000, reason: 'العميل غير راضٍ', status: 'draft' },
  ];
}

function seedPurchaseReturns(companyId: string) {
  return [
    { id: 'pr-1', company_id: companyId, return_number: 'PR-2024-001', invoice_number: 'PINV-2024-0012', supplier: 'مصنع الريان للبلاستيك', date: '2024-06-08', product: 'خلاط كهربائي 500 واط', quantity: 5, amount: 75000, reason: 'عيب مصنعي', status: 'posted' },
    { id: 'pr-2', company_id: companyId, return_number: 'PR-2024-002', invoice_number: 'PINV-2024-0015', supplier: 'شركة الصين للتجارة الدولية', date: '2024-06-14', product: 'مكيف سبليت 18000 وحدة', quantity: 2, amount: 190000, reason: 'تلف أثناء الشحن', status: 'draft' },
  ];
}

function seedReceiptVouchers(companyId: string) {
  return [
    { id: 'rv-1', company_id: companyId, voucher_number: 'RV-2024-001', date: '2024-06-05', customer: 'شركة اليمن للتجارة', amount: 500000, payment_method: 'bank', bank_account: 'البنك اليمني الدولي', check_number: null, check_date: null, notes: 'تحصيل دفعة من العميل', status: 'posted' },
    { id: 'rv-2', company_id: companyId, voucher_number: 'RV-2024-002', date: '2024-06-08', customer: 'مؤسسة الأمل التجارية', amount: 200000, payment_method: 'cash', bank_account: null, check_number: null, check_date: null, notes: 'تحصيل نقدي من العميل', status: 'posted' },
    { id: 'rv-3', company_id: companyId, voucher_number: 'RV-2024-003', date: '2024-06-12', customer: 'شركة الخليج للمواد الغذائية', amount: 750000, payment_method: 'check', bank_account: null, check_number: 'CH-445566', check_date: '2024-06-20', notes: 'شيك بنكي مؤجل', status: 'draft' },
    { id: 'rv-4', company_id: companyId, voucher_number: 'RV-2024-004', date: '2024-06-15', customer: 'مؤسسة النور للأدوات المنزلية', amount: 300000, payment_method: 'bank', bank_account: 'البنك اليمني الدولي', check_number: null, check_date: null, notes: 'تحويل بنكي', status: 'posted' },
  ];
}

function seedPaymentVouchers(companyId: string) {
  return [
    { id: 'pv-1', company_id: companyId, voucher_number: 'PV-2024-001', date: '2024-06-03', supplier: 'مصنع الريان للبلاستيك', amount: 300000, payment_method: 'bank', bank_account: 'البنك اليمني الدولي', check_number: null, check_date: null, expense_account: null, notes: 'دفعة للمورد', status: 'posted' },
    { id: 'pv-2', company_id: companyId, voucher_number: 'PV-2024-002', date: '2024-06-07', supplier: 'شركة الإمارات للتصدير', amount: 500000, payment_method: 'cash', bank_account: null, check_number: null, check_date: null, expense_account: null, notes: 'دفعة نقدية للمورد', status: 'posted' },
    { id: 'pv-3', company_id: companyId, voucher_number: 'PV-2024-003', date: '2024-06-10', supplier: 'مصنع الأمل للأدوات المنزلية', amount: 150000, payment_method: 'check', bank_account: null, check_number: 'CH-778899', check_date: '2024-06-25', expense_account: null, notes: 'شيك مؤجل للمورد', status: 'draft' },
    { id: 'pv-4', company_id: companyId, voucher_number: 'PV-2024-004', date: '2024-06-15', supplier: 'شركة مصر للأدوات الكهربائية', amount: 250000, payment_method: 'bank', bank_account: 'البنك اليمني الدولي', check_number: null, check_date: null, expense_account: null, notes: 'تحويل بنكي للمورد', status: 'posted' },
    { id: 'pv-5', company_id: companyId, voucher_number: 'PV-2024-005', date: '2024-06-18', supplier: 'مصروفات', amount: 50000, payment_method: 'cash', bank_account: null, check_number: null, check_date: null, expense_account: 'مصروفات الكهرباء', notes: 'دفع فاتورة كهرباء', status: 'posted' },
  ];
}

// ─── NEW: Document Sequences ──────────────────────────────────────────────────
function seedDocumentSequences(companyId: string) {
  const docs = [
    { document_type: 'sales_invoice', prefix: 'INV-', suffix: '', starting_number: 1, current_number: 26, padding_length: 4, year_reset: false },
    { document_type: 'purchase_invoice', prefix: 'PINV-', suffix: '', starting_number: 1, current_number: 21, padding_length: 4, year_reset: false },
    { document_type: 'sales_return', prefix: 'SR-', suffix: '', starting_number: 1, current_number: 4, padding_length: 4, year_reset: false },
    { document_type: 'purchase_return', prefix: 'PR-', suffix: '', starting_number: 1, current_number: 3, padding_length: 4, year_reset: false },
    { document_type: 'receipt_voucher', prefix: 'RV-', suffix: '', starting_number: 1, current_number: 5, padding_length: 4, year_reset: false },
    { document_type: 'payment_voucher', prefix: 'PV-', suffix: '', starting_number: 1, current_number: 6, padding_length: 4, year_reset: false },
    { document_type: 'journal_voucher', prefix: 'JV-', suffix: '', starting_number: 1, current_number: 31, padding_length: 4, year_reset: false },
    { document_type: 'purchase_order', prefix: 'PO-', suffix: '', starting_number: 1, current_number: 1, padding_length: 4, year_reset: false },
    { document_type: 'quotation', prefix: 'QUO-', suffix: '', starting_number: 1, current_number: 1, padding_length: 4, year_reset: false },
    { document_type: 'work_order', prefix: 'WO-', suffix: '', starting_number: 1, current_number: 7, padding_length: 4, year_reset: false },
    { document_type: 'stock_adjustment', prefix: 'ADJ-', suffix: '', starting_number: 1, current_number: 5, padding_length: 4, year_reset: false },
    { document_type: 'inventory_transfer', prefix: 'TRF-', suffix: '', starting_number: 1, current_number: 2, padding_length: 4, year_reset: false },
    { document_type: 'payroll_run', prefix: 'PAY-', suffix: '', starting_number: 1, current_number: 2, padding_length: 4, year_reset: false },
  ];
  return docs.map((d, i) => ({
    id: `seq-${i + 1}`,
    company_id: companyId,
    ...d,
    increment_step: 1,
    is_active: true,
  }));
}

// ─── NEW: Product Types ───────────────────────────────────────────────────────
function seedProductTypes(companyId: string) {
  return [
    { id: 'pt-1', company_id: companyId, name_ar: 'سلعة تجارية', name_en: 'Trading Goods', code: 'TRADE', appears_in_sales: true, appears_in_purchases: true, appears_in_inventory: true, appears_in_manufacturing: false, has_stock_tracking: true, has_bom: false, default_sales_account_id: 'acc-41101', default_cogs_account_id: 'acc-51101', default_inventory_account_id: 'acc-11301' },
    { id: 'pt-2', company_id: companyId, name_ar: 'خدمة', name_en: 'Service', code: 'SRV', appears_in_sales: true, appears_in_purchases: false, appears_in_inventory: false, appears_in_manufacturing: false, has_stock_tracking: false, has_bom: false, default_sales_account_id: 'acc-41102', default_cogs_account_id: null, default_inventory_account_id: null },
    { id: 'pt-3', company_id: companyId, name_ar: 'مواد أولية', name_en: 'Raw Materials', code: 'RAW', appears_in_sales: false, appears_in_purchases: true, appears_in_inventory: true, appears_in_manufacturing: true, has_stock_tracking: true, has_bom: true, default_sales_account_id: null, default_cogs_account_id: 'acc-51101', default_inventory_account_id: 'acc-11301' },
    { id: 'pt-4', company_id: companyId, name_ar: 'سلع تامة الإنتاج', name_en: 'Finished Goods', code: 'FG', appears_in_sales: true, appears_in_purchases: false, appears_in_inventory: true, appears_in_manufacturing: true, has_stock_tracking: true, has_bom: true, default_sales_account_id: 'acc-41101', default_cogs_account_id: 'acc-51101', default_inventory_account_id: 'acc-11301' },
    { id: 'pt-5', company_id: companyId, name_ar: 'سلع للاستخدام الداخلي', name_en: 'Internal Use', code: 'INT', appears_in_sales: false, appears_in_purchases: true, appears_in_inventory: true, appears_in_manufacturing: false, has_stock_tracking: true, has_bom: false, default_sales_account_id: null, default_cogs_account_id: null, default_inventory_account_id: 'acc-11301' },
    { id: 'pt-6', company_id: companyId, name_ar: 'منتج وسيط', name_en: 'Semi-Finished', code: 'WIP', appears_in_sales: false, appears_in_purchases: false, appears_in_inventory: true, appears_in_manufacturing: true, has_stock_tracking: true, has_bom: true, default_sales_account_id: null, default_cogs_account_id: 'acc-51101', default_inventory_account_id: 'acc-11301' },
    { id: 'pt-7', company_id: companyId, name_ar: 'مستهلك', name_en: 'Consumable', code: 'CON', appears_in_sales: false, appears_in_purchases: true, appears_in_inventory: true, appears_in_manufacturing: false, has_stock_tracking: true, has_bom: false, default_sales_account_id: null, default_cogs_account_id: null, default_inventory_account_id: 'acc-11301' },
    { id: 'pt-8', company_id: companyId, name_ar: 'أصل ثابت', name_en: 'Fixed Asset', code: 'FA', appears_in_sales: false, appears_in_purchases: true, appears_in_inventory: false, appears_in_manufacturing: false, has_stock_tracking: false, has_bom: false, default_sales_account_id: null, default_cogs_account_id: null, default_inventory_account_id: null },
  ];
}

// ─── NEW: Units ───────────────────────────────────────────────────────────────
function seedUnits(companyId: string) {
  return [
    { id: 'u-1', company_id: companyId, name_ar: 'قطعة', name_en: 'Piece', code: 'PC', conversion_factor: '1', base_unit_id: null },
    { id: 'u-2', company_id: companyId, name_ar: 'كرتونة', name_en: 'Carton', code: 'CTN', conversion_factor: '12', base_unit_id: 'u-1' },
    { id: 'u-3', company_id: companyId, name_ar: 'طن', name_en: 'Ton', code: 'TON', conversion_factor: '1000', base_unit_id: null },
    { id: 'u-4', company_id: companyId, name_ar: 'كيلوغرام', name_en: 'Kilogram', code: 'KG', conversion_factor: '1', base_unit_id: null },
    { id: 'u-5', company_id: companyId, name_ar: 'لتر', name_en: 'Liter', code: 'LTR', conversion_factor: '1', base_unit_id: null },
    { id: 'u-6', company_id: companyId, name_ar: 'متر', name_en: 'Meter', code: 'MTR', conversion_factor: '1', base_unit_id: null },
    { id: 'u-7', company_id: companyId, name_ar: 'ساعة', name_en: 'Hour', code: 'HR', conversion_factor: '1', base_unit_id: null },
  ];
}

// ─── NEW: Cash Boxes ──────────────────────────────────────────────────────────
function seedCashBoxes(companyId: string) {
  return [
    { id: 'cb-1', company_id: companyId, name: 'صندوق فرع صنعاء', code: 'CB-SAN', account_id: 'acc-11101', branch_id: null, responsible_user_id: null, is_active: true, current_balance: 1500000 },
    { id: 'cb-2', company_id: companyId, name: 'صندوق فرع عدن', code: 'CB-ADN', account_id: 'acc-11101', branch_id: null, responsible_user_id: null, is_active: true, current_balance: 800000 },
    { id: 'cb-3', company_id: companyId, name: 'صندوق فرع الحديدة', code: 'CB-HOD', account_id: 'acc-11101', branch_id: null, responsible_user_id: null, is_active: true, current_balance: 200000 },
  ];
}

// ─── NEW: Banks ───────────────────────────────────────────────────────────────
function seedBanks(companyId: string) {
  return [
    { id: 'bnk-1', company_id: companyId, name: 'حساب البنك اليمني الدولي', bank_name: 'البنك اليمني الدولي', account_number: '1234567890', iban: 'YE123456789012345678', account_id: 'acc-11102', branch_id: null, is_active: true, current_balance: 5800000 },
    { id: 'bnk-2', company_id: companyId, name: 'حساب بنك الكريمي', bank_name: 'بنك الكريمي', account_number: '0987654321', iban: 'YE987654321098765432', account_id: 'acc-11102', branch_id: null, is_active: true, current_balance: 2500000 },
  ];
}

// ─── NEW: Cost Centers ────────────────────────────────────────────────────────
function seedCostCenters(companyId: string) {
  return [
    { id: 'cc-1', company_id: companyId, name_ar: 'فرع صنعاء', name_en: 'Sanaa Branch', code: 'CC-SAN', parent_id: null, type: 'branch', budget_amount: 5000000 },
    { id: 'cc-2', company_id: companyId, name_ar: 'فرع عدن', name_en: 'Aden Branch', code: 'CC-ADN', parent_id: null, type: 'branch', budget_amount: 3000000 },
    { id: 'cc-3', company_id: companyId, name_ar: 'فرع الحديدة', name_en: 'Hodeidah Branch', code: 'CC-HOD', parent_id: null, type: 'branch', budget_amount: 2000000 },
    { id: 'cc-4', company_id: companyId, name_ar: 'قسم المبيعات', name_en: 'Sales Dept', code: 'CC-SAL', parent_id: 'cc-1', type: 'department', budget_amount: 1500000 },
    { id: 'cc-5', company_id: companyId, name_ar: 'قسم الإنتاج', name_en: 'Production Dept', code: 'CC-PRD', parent_id: 'cc-1', type: 'department', budget_amount: 2500000 },
    { id: 'cc-6', company_id: companyId, name_ar: 'مشروع التوسع', name_en: 'Expansion Project', code: 'CC-EXP', parent_id: null, type: 'project', budget_amount: 8000000 },
  ];
}

// ─── NEW: Payroll Components ──────────────────────────────────────────────────
function seedPayrollComponents(companyId: string) {
  return [
    { id: 'pc-1', company_id: companyId, name_ar: 'الراتب الأساسي', name_en: 'Base Salary', code: 'BAS', type: 'earning', calculation_method: 'fixed', default_amount: '0', affects_gross_salary: true, affects_tax: true, affects_social_insurance: true, default_account_id: 'acc-52101' },
    { id: 'pc-2', company_id: companyId, name_ar: 'بدل سكن', name_en: 'Housing Allowance', code: 'HOU', type: 'earning', calculation_method: 'fixed', default_amount: '150000', affects_gross_salary: true, affects_tax: false, affects_social_insurance: false, default_account_id: 'acc-52102' },
    { id: 'pc-3', company_id: companyId, name_ar: 'بدل نقل', name_en: 'Transport Allowance', code: 'TRN', type: 'earning', calculation_method: 'fixed', default_amount: '50000', affects_gross_salary: true, affects_tax: false, affects_social_insurance: false, default_account_id: 'acc-52102' },
    { id: 'pc-4', company_id: companyId, name_ar: 'بدل طعام', name_en: 'Food Allowance', code: 'FOD', type: 'earning', calculation_method: 'fixed', default_amount: '30000', affects_gross_salary: true, affects_tax: false, affects_social_insurance: false, default_account_id: 'acc-52102' },
    { id: 'pc-5', company_id: companyId, name_ar: 'ساعات إضافية', name_en: 'Overtime', code: 'OVT', type: 'earning', calculation_method: 'formula', default_amount: '0', affects_gross_salary: true, affects_tax: true, affects_social_insurance: false, default_account_id: 'acc-52101' },
    { id: 'pc-6', company_id: companyId, name_ar: 'خصم تأمينات', name_en: 'Social Insurance Deduction', code: 'INS', type: 'deduction', calculation_method: 'percentage', default_amount: '9', affects_gross_salary: false, affects_tax: false, affects_social_insurance: true, default_account_id: null },
    { id: 'pc-7', company_id: companyId, name_ar: 'ضريبة دخل', name_en: 'Income Tax', code: 'TAX', type: 'tax', calculation_method: 'formula', default_amount: '0', affects_gross_salary: false, affects_tax: true, affects_social_insurance: false, default_account_id: null },
    { id: 'pc-8', company_id: companyId, name_ar: 'صافي الراتب', name_en: 'Net Salary', code: 'NET', type: 'net', calculation_method: 'formula', default_amount: '0', affects_gross_salary: false, affects_tax: false, affects_social_insurance: false, default_account_id: 'acc-52101' },
  ];
}

// ─── NEW: Default Accounts ────────────────────────────────────────────────────
function seedDefaultAccounts(companyId: string) {
  return [
    { id: 'da-1', company_id: companyId, function_key: 'default_cash', account_id: 'acc-11101', is_required: true, description: 'الحساب الافتراضي للصناديق النقدية' },
    { id: 'da-2', company_id: companyId, function_key: 'default_bank', account_id: 'acc-11102', is_required: true, description: 'الحساب الافتراضي للبنوك' },
    { id: 'da-3', company_id: companyId, function_key: 'default_sales', account_id: 'acc-41101', is_required: true, description: 'حساب المبيعات الافتراضي' },
    { id: 'da-4', company_id: companyId, function_key: 'default_cogs', account_id: 'acc-51101', is_required: true, description: 'حساب تكلفة البضاعة المباعة' },
    { id: 'da-5', company_id: companyId, function_key: 'default_inventory', account_id: 'acc-11301', is_required: true, description: 'حساب المخزون الافتراضي' },
    { id: 'da-6', company_id: companyId, function_key: 'default_debtors', account_id: 'acc-11201', is_required: true, description: 'حساب العملاء (مدينون تجاريون)' },
    { id: 'da-7', company_id: companyId, function_key: 'default_creditors', account_id: 'acc-21101', is_required: true, description: 'حساب الموردين (دائنون تجاريون)' },
    { id: 'da-8', company_id: companyId, function_key: 'default_vat_output', account_id: 'acc-21301', is_required: true, description: 'ضريبة القيمة المضافة على المبيعات' },
    { id: 'da-9', company_id: companyId, function_key: 'default_vat_input', account_id: 'acc-21301', is_required: true, description: 'ضريبة القيمة المضافة على المشتريات' },
    { id: 'da-10', company_id: companyId, function_key: 'default_salaries', account_id: 'acc-52101', is_required: true, description: 'حساب الرواتب والأجور' },
    { id: 'da-11', company_id: companyId, function_key: 'default_discount_allowed', account_id: 'acc-41101', is_required: false, description: 'خصم مسموح به على المبيعات' },
    { id: 'da-12', company_id: companyId, function_key: 'default_discount_received', account_id: 'acc-21101', is_required: false, description: 'خصم مقبوض على المشتريات' },
    { id: 'da-13', company_id: companyId, function_key: 'default_sales_returns', account_id: 'acc-41103', is_required: true, description: 'حساب مردودات المبيعات' },
    { id: 'da-14', company_id: companyId, function_key: 'default_purchase_returns', account_id: 'acc-21101', is_required: true, description: 'حساب مردودات المشتريات' },
  ];
}
