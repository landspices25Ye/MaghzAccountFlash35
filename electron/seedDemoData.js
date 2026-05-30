/**
 * Comprehensive demo data seeder for PostgreSQL
 * Called from renderer via IPC after onboarding
 */

export async function seedComprehensiveDemoData(client, companyId) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const todayStr = now.toISOString().split('T')[0];

  // ─── 1. Branches ───────────────────────────────────────────────────────────
  const branches = [
    { name: 'الفرع الرئيسي - صنعاء', code: 'HQ', address: 'صنعاء - شارع الستين' },
    { name: 'فرع الحديدة', code: 'HD', address: 'الحديدة - شارع صنعاء' },
    { name: 'فرع عدن', code: 'AD', address: 'عدن - المنصورة' },
  ];
  for (const b of branches) {
    await client.query(
      `INSERT INTO branches (company_id, name, code, address, is_active) VALUES ($1, $2, $3, $4, TRUE) ON CONFLICT DO NOTHING;`,
      [companyId, b.name, b.code, b.address]
    );
  }

  // ─── 2. Product Types ──────────────────────────────────────────────────────
  const productTypes = [
    { code: 'TRADE', nameAr: 'سلعة تجارية', nameEn: 'Trading Goods' },
    { code: 'SRV', nameAr: 'خدمة', nameEn: 'Service' },
    { code: 'RAW', nameAr: 'مواد أولية', nameEn: 'Raw Materials' },
    { code: 'FG', nameAr: 'سلع تامة الإنتاج', nameEn: 'Finished Goods' },
    { code: 'CON', nameAr: 'مستهلك', nameEn: 'Consumable' },
  ];
  for (const pt of productTypes) {
    await client.query(
      `INSERT INTO product_types (company_id, code, name_ar, name_en, appears_in_sales, appears_in_purchases, appears_in_inventory, is_active)
       VALUES ($1, $2, $3, $4, TRUE, TRUE, TRUE, TRUE) ON CONFLICT DO NOTHING;`,
      [companyId, pt.code, pt.nameAr, pt.nameEn]
    );
  }

  // ─── 3. Units ─────────────────────────────────────────────────────────────
  const units = [
    { code: 'PC', nameAr: 'قطعة', nameEn: 'Piece', conv: 1 },
    { code: 'CTN', nameAr: 'كرتونة', nameEn: 'Carton', conv: 12 },
    { code: 'KG', nameAr: 'كيلوغرام', nameEn: 'Kilogram', conv: 1 },
    { code: 'LTR', nameAr: 'لتر', nameEn: 'Liter', conv: 1 },
    { code: 'MTR', nameAr: 'متر', nameEn: 'Meter', conv: 1 },
  ];
  for (const u of units) {
    await client.query(
      `INSERT INTO units (company_id, code, name_ar, name_en, conversion_factor, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE) ON CONFLICT DO NOTHING;`,
      [companyId, u.code, u.nameAr, u.nameEn, u.conv]
    );
  }

  // ─── 4. Cost Centers ──────────────────────────────────────────────────────
  const costCenters = [
    { code: 'CC-SAL', nameAr: 'قسم المبيعات', nameEn: 'Sales Department', type: 'department', budget: 1500000 },
    { code: 'CC-PRD', nameAr: 'قسم الإنتاج', nameEn: 'Production Department', type: 'department', budget: 2500000 },
    { code: 'CC-EXP', nameAr: 'مشروع التوسع', nameEn: 'Expansion Project', type: 'project', budget: 8000000 },
  ];
  for (const cc of costCenters) {
    await client.query(
      `INSERT INTO cost_centers (company_id, code, name_ar, name_en, type, budget_amount, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE) ON CONFLICT DO NOTHING;`,
      [companyId, cc.code, cc.nameAr, cc.nameEn, cc.type, cc.budget]
    );
  }

  // ─── 5. Banks ─────────────────────────────────────────────────────────────
  const banks = [
    { name: 'حساب البنك اليمني الدولي', bankName: 'البنك اليمني الدولي', accountNumber: '1234567890', iban: 'YE12345678901234', balance: 5800000 },
    { name: 'حساب بنك الكريمي', bankName: 'بنك الكريمي', accountNumber: '0987654321', iban: 'YE09876543210987', balance: 2500000 },
  ];
  for (const b of banks) {
    await client.query(
      `INSERT INTO banks (company_id, name, bank_name, account_number, iban, is_active, current_balance)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6) ON CONFLICT DO NOTHING;`,
      [companyId, b.name, b.bankName, b.accountNumber, b.iban, b.balance]
    );
  }

  // ─── 6. Default Accounts ──────────────────────────────────────────────────
  const defaultAccounts = [
    { key: 'default_discount_allowed', code: '41101', required: false },
    { key: 'default_discount_received', code: '21101', required: false },
    { key: 'default_purchase_returns', code: '21101', required: true },
  ];
  for (const da of defaultAccounts) {
    await client.query(
      `INSERT INTO default_accounts (company_id, function_key, account_id, is_required)
       SELECT $1, $2, (SELECT id FROM accounts WHERE company_id = $1 AND code = $3 LIMIT 1), $4
       WHERE NOT EXISTS (SELECT 1 FROM default_accounts WHERE company_id = $1 AND function_key = $2);`,
      [companyId, da.key, da.code, da.required]
    );
  }

  // ─── 7. Currencies ─────────────────────────────────────────────────────────
  const currencies = [
    { code: 'YER', name: 'الريال اليمني', symbol: 'ر.ي', rate: 1, is_default: true },
    { code: 'USD', name: 'دولار أمريكي', symbol: '$', rate: 1500, is_default: false },
    { code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س', rate: 400, is_default: false },
  ];
  for (const c of currencies) {
    await client.query(
      `INSERT INTO currencies (company_id, code, name, symbol, exchange_rate, is_default, is_active) VALUES ($1, $2, $3, $4, $5, $6, TRUE) ON CONFLICT DO NOTHING;`,
      [companyId, c.code, c.name, c.symbol, c.rate, c.is_default]
    );
  }

  // ─── 8. VAT Settings ───────────────────────────────────────────────────────
  await client.query(
    `INSERT INTO vat_settings (company_id, vat_rate, vat_number, is_inclusive, is_active) VALUES ($1, 15, '123456789', false, true) ON CONFLICT DO NOTHING;`,
    [companyId]
  );

  // ─── 9. Document Sequences ─────────────────────────────────────────────────
  const sequences = [
    { type: 'sales_invoice', prefix: 'INV-', start: 1, current: 6 },
    { type: 'quotation', prefix: 'QOT-', start: 1, current: 2 },
    { type: 'purchase_order', prefix: 'PO-', start: 1, current: 4 },
    { type: 'purchase_invoice', prefix: 'PINV-', start: 1, current: 4 },
  ];
  for (const s of sequences) {
    await client.query(
      `INSERT INTO document_sequences (company_id, document_type, prefix, suffix, starting_number, current_number, increment_step, padding_length, year_reset, is_active) VALUES ($1, $2, $3, '', $4, $5, 1, 4, false, true) ON CONFLICT DO NOTHING;`,
      [companyId, s.type, s.prefix, s.start, s.current]
    );
  }

  // ─── 10. Customers ─────────────────────────────────────────────────────────
  const customers = [
    { code: 'CUST-001', name: 'شركة البحر الأحمر للتجارة', phone: '+967334455667', email: 'redsea@ye.com', address: 'الحديدة - كمران', balance: 950000 },
    { code: 'CUST-002', name: 'مؤسسة الجود للصناعات الغذائية', phone: '+967112233445', email: 'aljawd@ye.com', address: 'صنعاء - شارع الستين', balance: 1200000 },
    { code: 'CUST-003', name: 'مؤسسة الصافي للمواد الغذائية', phone: '+967778899001', email: 'alsafi@ye.com', address: 'صنعاء - شارع الستين', balance: 650000 },
    { code: 'CUST-004', name: 'شركة اليمن الدولية للاستيراد', phone: '+967223344556', email: 'yemenintl@ye.com', address: 'صنعاء - شارع تعز', balance: 1800000 },
    { code: 'CUST-005', name: 'مؤسسة الحديدة التجارية', phone: '+967556677889', email: 'hodeidah@ye.com', address: 'الحديدة - شارع صنعاء', balance: 320000 },
    { code: 'CUST-006', name: 'مؤسسة عدن التجارية', phone: '+967667788990', email: 'aden@ye.com', address: 'عدن - المنصورة', balance: 450000 },
    { code: 'CUST-007', name: 'مؤسسة إب للصناعات', phone: '+967778899112', email: 'ibb@ye.com', address: 'إب - الجمهورية', balance: 280000 },
    { code: 'CUST-008', name: 'مؤسسة تعز التجارية', phone: '+967889900223', email: 'taiz@ye.com', address: 'تعز - المطار القديم', balance: 510000 },
  ];
  for (const c of customers) {
    await client.query(
      `INSERT INTO customers (company_id, code, name, phone, email, address, balance, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) ON CONFLICT DO NOTHING;`,
      [companyId, c.code, c.name, c.phone, c.email, c.address, c.balance]
    );
  }

  // ─── 11. Suppliers ─────────────────────────────────────────────────────────
  const suppliers = [
    { code: 'SUP-001', name: 'شركة الخليج للاستيراد', phone: '+967998877665', email: 'gulf@ye.com', address: 'جدة - السعودية', balance: 0 },
    { code: 'SUP-002', name: 'مؤسسة الوفاق التجارية', phone: '+967112233990', email: 'wefaq@ye.com', address: 'صنعاء - شارع الستين', balance: 0 },
    { code: 'SUP-003', name: 'شركة الإمارات للتجارة', phone: '+97144223311', email: 'uae@em.com', address: 'دبي - الإمارات', balance: 0 },
    { code: 'SUP-004', name: 'مؤسسة السعيد للتجارة', phone: '+967334455112', email: 'alsaeed@ye.com', address: 'صنعاء - شارع تعز', balance: 0 },
    { code: 'SUP-005', name: 'شركة البركة للاستيراد', phone: '+967556677334', email: 'baraka@ye.com', address: 'الحديدة - شارع صنعاء', balance: 0 },
    { code: 'SUP-006', name: 'مؤسسة الرشيد التجارية', phone: '+967778899445', email: 'rashid@ye.com', address: 'عدن - المنصورة', balance: 0 },
    { code: 'SUP-007', name: 'شركة الصقر الدولية', phone: '+967889900556', email: 'saqr@ye.com', address: 'إب - الجمهورية', balance: 0 },
    { code: 'SUP-008', name: 'مؤسسة النجاح للتجارة', phone: '+967990011667', email: 'najah@ye.com', address: 'تعز - المطار القديم', balance: 0 },
  ];
  for (const s of suppliers) {
    await client.query(
      `INSERT INTO suppliers (company_id, code, name, phone, email, address, balance, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) ON CONFLICT DO NOTHING;`,
      [companyId, s.code, s.name, s.phone, s.email, s.address, s.balance]
    );
  }

  // ─── 12. Product Category ──────────────────────────────────────────────────
  await client.query(
    `INSERT INTO product_categories (company_id, name) VALUES ($1, 'المواد الغذائية') ON CONFLICT DO NOTHING;`,
    [companyId]
  );
  const catRes = await client.query(`SELECT id FROM product_categories WHERE company_id = $1 AND name = 'المواد الغذائية'`, [companyId]);
  const categoryId = catRes.rows[0]?.id;

  // ─── 13. Products ──────────────────────────────────────────────────────────
  const products = [
    { code: 'PRD-001', name_ar: 'أرز بسمتي فاخر', name_en: 'Premium Basmati Rice', barcode: '6223000123456', sku: 'RICE-BAS-5KG', unit: 'كيس', cost_price: 2800, sale_price: 3200 },
    { code: 'PRD-002', name_ar: 'زيت نباتي 3 لتر', name_en: 'Vegetable Oil 3L', barcode: '6223000123457', sku: 'OIL-VEG-3L', unit: 'علبة', cost_price: 4200, sale_price: 4800 },
    { code: 'PRD-003', name_ar: 'سكر أبيض 50 كغ', name_en: 'White Sugar 50kg', barcode: '6223000123458', sku: 'SUG-WHT-50KG', unit: 'كيس', cost_price: 15000, sale_price: 16500 },
    { code: 'PRD-004', name_ar: 'دقيق فاخر 50 كغ', name_en: 'Premium Flour 50kg', barcode: '6223000123459', sku: 'FLR-PRM-50KG', unit: 'كيس', cost_price: 9500, sale_price: 10500 },
    { code: 'PRD-005', name_ar: 'معجون طماطم 400غ', name_en: 'Tomato Paste 400g', barcode: '6223000123460', sku: 'TOM-PST-400G', unit: 'علبة', cost_price: 380, sale_price: 450 },
    { code: 'PRD-006', name_ar: 'شاي ليبتون 200غ', name_en: 'Lipton Tea 200g', barcode: '6223000123461', sku: 'TEA-LIP-200G', unit: 'علبة', cost_price: 1200, sale_price: 1400 },
    { code: 'PRD-007', name_ar: 'حليب مجفف 2.5 كغ', name_en: 'Milk Powder 2.5kg', barcode: '6223000123462', sku: 'MLK-PWD-2.5K', unit: 'علبة', cost_price: 8500, sale_price: 9500 },
    { code: 'PRD-008', name_ar: 'تونة معلبة 185غ', name_en: 'Canned Tuna 185g', barcode: '6223000123463', sku: 'TUN-CAN-185G', unit: 'علبة', cost_price: 650, sale_price: 750 },
    { code: 'PRD-009', name_ar: 'صابون لوكس 125غ', name_en: 'Lux Soap 125g', barcode: '6223000123464', sku: 'SOAP-LUX-125G', unit: 'قطعة', cost_price: 280, sale_price: 330 },
    { code: 'PRD-010', name_ar: 'شامبو هيد آند شولدرز 400مل', name_en: 'Head & Shoulders 400ml', barcode: '6223000123465', sku: 'SHP-HNS-400M', unit: 'علبة', cost_price: 1800, sale_price: 2100 },
    { code: 'PRD-011', name_ar: 'معجون أسنان كولجيت 100مل', name_en: 'Colgate Toothpaste 100ml', barcode: '6223000123466', sku: 'PAS-COL-100M', unit: 'علبة', cost_price: 420, sale_price: 500 },
    { code: 'PRD-012', name_ar: 'منظف جليكسون 1 لتر', name_en: 'Gleason Cleaner 1L', barcode: '6223000123467', sku: 'CLN-GLX-1L', unit: 'علبة', cost_price: 1100, sale_price: 1300 },
    { code: 'PRD-013', name_ar: 'مناديل فاين 200 منديل', name_en: 'Fine Tissues 200', barcode: '6223000123468', sku: 'TIS-FIN-200', unit: 'علبة', cost_price: 350, sale_price: 420 },
    { code: 'PRD-014', name_ar: 'قهوة العربية 250غ', name_en: 'Arabian Coffee 250g', barcode: '6223000123469', sku: 'COF-ARA-250G', unit: 'علبة', cost_price: 2200, sale_price: 2600 },
    { code: 'PRD-015', name_ar: 'بسكويت أوريو 154غ', name_en: 'Oreo Biscuits 154g', barcode: '6223000123470', sku: 'BIS-ORE-154G', unit: 'علبة', cost_price: 550, sale_price: 650 },
  ];
  for (const p of products) {
    await client.query(
      `INSERT INTO products (company_id, code, name_ar, name_en, barcode, sku, unit, category_id, cost_price, sale_price, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE) ON CONFLICT DO NOTHING;`,
      [companyId, p.code, p.name_ar, p.name_en, p.barcode, p.sku, p.unit, categoryId, p.cost_price, p.sale_price]
    );
  }

  // ─── 14. Warehouses ────────────────────────────────────────────────────────
  const warehouses = [
    { name: 'المستودع الرئيسي - صنعاء', code: 'WH-MAIN' },
    { name: 'مستودع الحديدة', code: 'WH-HD' },
    { name: 'مستودع عدن', code: 'WH-AD' },
  ];
  for (const w of warehouses) {
    await client.query(
      `INSERT INTO warehouses (company_id, name, code, is_active) VALUES ($1, $2, $3, TRUE) ON CONFLICT DO NOTHING;`,
      [companyId, w.name, w.code]
    );
  }

  // ─── 15. Stock & Stock Movements ───────────────────────────────────────────
  const prodRes = await client.query(`SELECT id FROM products WHERE company_id = $1 ORDER BY code`, [companyId]);
  const whRes = await client.query(`SELECT id FROM warehouses WHERE company_id = $1 ORDER BY code`, [companyId]);
  const prodIds = prodRes.rows.map(r => r.id);
  const whIds = whRes.rows.map(r => r.id);

  if (prodIds.length > 0 && whIds.length > 0) {
    const stockQtys = [500, 300, 200, 350, 1000, 600, 150, 800, 1200, 250, 900, 400, 700, 180, 500];
    for (let i = 0; i < prodIds.length; i++) {
      const qty = stockQtys[i] !== undefined ? stockQtys[i] : 0;
      const minAlert = stockQtys[i] !== undefined ? Math.max(10, Math.round(stockQtys[i] * 0.1)) : 10;
      await client.query(
        `INSERT INTO stock (company_id, product_id, warehouse_id, quantity, min_stock_alert) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;`,
        [companyId, prodIds[i], whIds[0], qty, minAlert]
      );
    }
    for (let i = 0; i < Math.min(5, prodIds.length); i++) {
      const qty = stockQtys[i] !== undefined ? Math.round(stockQtys[i] * 0.2) : 0;
      const minAlert = stockQtys[i] !== undefined ? Math.max(5, Math.round(stockQtys[i] * 0.05)) : 5;
      await client.query(
        `INSERT INTO stock (company_id, product_id, warehouse_id, quantity, min_stock_alert) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;`,
        [companyId, prodIds[i], whIds[1], qty, minAlert]
      );
    }
    for (let i = 0; i < Math.min(3, prodIds.length); i++) {
      await client.query(
        `INSERT INTO stock_movements (company_id, product_id, warehouse_id, type, quantity, reference, notes) VALUES ($1, $2, $3, 'inbound', $4, $5, $6) ON CONFLICT DO NOTHING;`,
        [companyId, prodIds[i], whIds[0], 100 + i * 50, `GRN-2024-${1001 + i}`, 'إضافة مخزون أولي']
      );
    }
  }

  // ─── 16. Sales Invoices ────────────────────────────────────────────────────
  const custRes = await client.query(`SELECT id FROM customers WHERE company_id = $1 ORDER BY code`, [companyId]);
  const custIds = custRes.rows.map(r => r.id);

  if (custIds.length > 0 && prodIds.length > 0) {
    const salesInvoices = [
      { number: 'INV-2024-0001', customerIdx: 0, date: '2024-06-15', total: 233174 },
      { number: 'INV-2024-0002', customerIdx: 1, date: '2024-06-18', total: 156800 },
      { number: 'INV-2024-0003', customerIdx: 2, date: '2024-06-20', total: 89200 },
      { number: 'INV-2024-0004', customerIdx: 3, date: '2024-06-22', total: 342100 },
      { number: 'INV-2024-0005', customerIdx: 0, date: '2024-06-25', total: 124500 },
    ];
    for (let i = 0; i < salesInvoices.length; i++) {
      const inv = salesInvoices[i];
      const lineCount = 2 + (i % 2);
      let subtotal = 0;
      const lines = [];
      for (let j = 0; j < lineCount && j < prodIds.length; j++) {
        const qty = 2 + j * 3;
        const price = Math.round(inv.total / lineCount / qty);
        const lineTotal = qty * price;
        lines.push({ productId: prodIds[(i + j) % prodIds.length], qty, price, lineTotal });
        subtotal += lineTotal;
      }
      const vatAmount = Math.round(subtotal * 0.15);
      const totalAmount = subtotal + vatAmount;

      const invRes = await client.query(
        `INSERT INTO sales_invoices (company_id, invoice_number, customer_id, date, due_date, subtotal, vat_amount, total_amount, paid_amount, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT DO NOTHING RETURNING id;`,
        [companyId, inv.number, custIds[inv.customerIdx], inv.date, inv.date, subtotal, vatAmount, totalAmount, totalAmount, 'posted', `فاتورة مبيعات ${inv.number}`]
      );
      const invoiceId = invRes.rows[0]?.id;
      if (invoiceId) {
        for (const line of lines) {
          await client.query(
            `INSERT INTO sales_invoice_lines (invoice_id, product_id, quantity, unit_price, discount_percent, vat_percent, line_total) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING;`,
            [invoiceId, line.productId, line.qty, line.price, 0, 15, line.lineTotal]
          );
        }
      }
    }
  }

  // ─── 17. Quotations ────────────────────────────────────────────────────────
  if (custIds.length > 0 && prodIds.length > 0) {
    const quotations = [
      { number: 'QOT-2024-0001', customerIdx: 2, date: '2024-06-10', total: 45000 },
      { number: 'QOT-2024-0002', customerIdx: 4, date: '2024-06-12', total: 78000 },
    ];
    for (const q of quotations) {
      await client.query(
        `INSERT INTO quotations (company_id, quotation_number, customer_id, date, expiry_date, total_amount, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING;`,
        [companyId, q.number, custIds[q.customerIdx], q.date, '2024-07-10', q.total, 'open', 'عرض سعر تجريبي']
      );
    }
  }

  // ─── 18. Purchase Orders ───────────────────────────────────────────────────
  const supRes = await client.query(`SELECT id FROM suppliers WHERE company_id = $1 ORDER BY code`, [companyId]);
  const supIds = supRes.rows.map(r => r.id);

  if (supIds.length > 0 && prodIds.length > 0) {
    const purchaseOrders = [
      { number: 'PO-2024-0001', supplierIdx: 0, date: '2024-06-01', total: 850000 },
      { number: 'PO-2024-0002', supplierIdx: 1, date: '2024-06-05', total: 420000 },
      { number: 'PO-2024-0003', supplierIdx: 2, date: '2024-06-08', total: 650000 },
    ];
    for (let i = 0; i < purchaseOrders.length; i++) {
      const po = purchaseOrders[i];
      const poRes = await client.query(
        `INSERT INTO purchase_orders (company_id, order_number, supplier_id, date, expected_date, total_amount, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING RETURNING id;`,
        [companyId, po.number, supIds[po.supplierIdx], po.date, '2024-07-15', po.total, 'approved', 'أمر شراء تجريبي']
      );
      const orderId = poRes.rows[0]?.id;
      if (orderId) {
        const lineCount = 2 + (i % 2);
        for (let j = 0; j < lineCount && j < prodIds.length; j++) {
          const qty = 10 + j * 5;
          const price = Math.round(po.total / lineCount / qty);
          const lineTotal = qty * price;
          await client.query(
            `INSERT INTO purchase_order_lines (order_id, product_id, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;`,
            [orderId, prodIds[(i + j) % prodIds.length], qty, price, lineTotal]
          );
        }
      }
    }
  }

  // ─── 19. Purchase Invoices ─────────────────────────────────────────────────
  if (supIds.length > 0 && prodIds.length > 0) {
    const purchaseInvoices = [
      { number: 'PINV-2024-0001', supplierIdx: 0, date: '2024-06-10', total: 420000 },
      { number: 'PINV-2024-0002', supplierIdx: 1, date: '2024-06-12', total: 280000 },
      { number: 'PINV-2024-0003', supplierIdx: 3, date: '2024-06-15', total: 510000 },
    ];
    for (let i = 0; i < purchaseInvoices.length; i++) {
      const inv = purchaseInvoices[i];
      const lineCount = 2 + (i % 2);
      let subtotal = 0;
      const lines = [];
      for (let j = 0; j < lineCount && j < prodIds.length; j++) {
        const qty = 8 + j * 4;
        const price = Math.round(inv.total / lineCount / qty);
        const lineTotal = qty * price;
        lines.push({ productId: prodIds[(i + j) % prodIds.length], qty, price, lineTotal });
        subtotal += lineTotal;
      }
      const vatAmount = Math.round(subtotal * 0.15);
      const totalAmount = subtotal + vatAmount;

      const invRes = await client.query(
        `INSERT INTO purchase_invoices (company_id, invoice_number, supplier_id, date, due_date, subtotal, vat_amount, total_amount, paid_amount, status, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT DO NOTHING RETURNING id;`,
        [companyId, inv.number, supIds[inv.supplierIdx], inv.date, '2024-07-10', subtotal, vatAmount, totalAmount, 0, 'posted', `فاتورة شراء ${inv.number}`]
      );
      const invoiceId = invRes.rows[0]?.id;
      if (invoiceId) {
        for (const line of lines) {
          await client.query(
            `INSERT INTO purchase_invoice_lines (invoice_id, product_id, description, quantity, unit_price, line_total) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING;`,
            [invoiceId, line.productId, 'شراء بضاعة', line.qty, line.price, line.lineTotal]
          );
        }
      }
    }
  }

  // ─── 20. Departments ───────────────────────────────────────────────────────
  const deptNames = ['الإدارة', 'المبيعات', 'المخازن', 'المحاسبة'];
  for (const name of deptNames) {
    await client.query(
      `INSERT INTO departments (company_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING;`,
      [companyId, name]
    );
  }
  const deptRes = await client.query(`SELECT id, name FROM departments WHERE company_id = $1 ORDER BY name`, [companyId]);
  const deptMap = {};
  for (const row of deptRes.rows) {
    deptMap[row.name] = row.id;
  }

  // ─── 21. Employees ─────────────────────────────────────────────────────────
  const employees = [
    { number: 'EMP-001', name: 'أحمد علي عبدالله', phone: '+967111222333', email: 'ahmed@demo.ye', dept: 'الإدارة', position: 'مدير عام', grade: 'A', hire_date: '2020-01-15', salary: 450000 },
    { number: 'EMP-002', name: 'خالد سعيد الحسني', phone: '+967222333444', email: 'khaled@demo.ye', dept: 'المبيعات', position: 'مدير مبيعات', grade: 'A', hire_date: '2020-03-10', salary: 350000 },
    { number: 'EMP-003', name: 'محمد صالح القاضي', phone: '+967333444555', email: 'mohammed@demo.ye', dept: 'المخازن', position: 'مدير مخازن', grade: 'B', hire_date: '2021-02-01', salary: 280000 },
    { number: 'EMP-004', name: 'فاطمة عبدالرحمن', phone: '+967444555666', email: 'fatima@demo.ye', dept: 'المحاسبة', position: 'رئيسة محاسبين', grade: 'A', hire_date: '2020-06-20', salary: 320000 },
    { number: 'EMP-005', name: 'عبدالله يحيى المخلافي', phone: '+967555666777', email: 'abdullah@demo.ye', dept: 'المبيعات', position: 'مندوب مبيعات', grade: 'C', hire_date: '2022-01-10', salary: 180000 },
    { number: 'EMP-006', name: 'سميرة علي الأحمدي', phone: '+967666777888', email: 'samira@demo.ye', dept: 'المحاسبة', position: 'محاسبة', grade: 'C', hire_date: '2022-04-15', salary: 170000 },
    { number: 'EMP-007', name: 'ياسر محمود الكبسي', phone: '+967777888999', email: 'yaser@demo.ye', dept: 'المخازن', position: 'أمين مخزن', grade: 'C', hire_date: '2023-01-05', salary: 150000 },
    { number: 'EMP-008', name: 'هند صالح البركاني', phone: '+967888999000', email: 'hind@demo.ye', dept: 'الإدارة', position: 'سكرتيرة', grade: 'C', hire_date: '2023-03-12', salary: 140000 },
  ];
  for (const emp of employees) {
    await client.query(
      `INSERT INTO employees (company_id, employee_number, full_name, phone, email, department_id, position, grade, hire_date, base_salary, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE) ON CONFLICT DO NOTHING;`,
      [companyId, emp.number, emp.name, emp.phone, emp.email, deptMap[emp.dept], emp.position, emp.grade, emp.hire_date, emp.salary]
    );
  }
  const empRes = await client.query(`SELECT id, employee_number FROM employees WHERE company_id = $1 ORDER BY employee_number`, [companyId]);
  const empIds = empRes.rows.map(r => r.id);

  // ─── 22. Attendance ────────────────────────────────────────────────────────
  if (empIds.length > 0) {
    for (let i = 0; i < Math.min(5, empIds.length); i++) {
      for (let d = 1; d <= 5; d++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        await client.query(
          `INSERT INTO attendance (company_id, employee_id, date, check_in, check_out, overtime_hours, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING;`,
          [companyId, empIds[i], dateStr, `${dateStr} 08:00:00`, `${dateStr} 17:00:00`, i === 0 ? 2 : 0, 'حضور عادي']
        );
      }
    }
  }

  // ─── 23. Payroll Run & Lines ───────────────────────────────────────────────
  const payrollRunRes = await client.query(
    `INSERT INTO payroll_runs (company_id, month, year, total_amount, status) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING RETURNING id;`,
    [companyId, currentMonth, currentYear, 2040000, 'posted']
  );
  const payrollRunId = payrollRunRes.rows[0]?.id;

  if (payrollRunId && empIds.length > 0) {
    const allowances = [50000, 40000, 30000, 35000, 20000, 18000, 15000, 14000];
    const deductions = [10000, 8000, 6000, 7000, 5000, 4500, 3000, 2500];
    // Build map from employee_number to id for safe lookup
    const empIdMap = new Map(empRes.rows.map((r) => [r.employee_number, r.id]));
    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const empId = empIdMap.get(emp.number);
      if (!empId) continue; // skip if employee wasn't inserted
      const baseSalary = emp.salary;
      const allow = allowances[i] || 0;
      const deduct = deductions[i] || 0;
      const overtime = i === 0 ? 30000 : 0;
      const net = baseSalary + allow + overtime - deduct;
      await client.query(
        `INSERT INTO payroll_lines (payroll_run_id, employee_id, base_salary, allowances, deductions, overtime, net_salary) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING;`,
        [payrollRunId, empId, baseSalary, allow, deduct, overtime, net]
      );
    }
  }

  // ─── 24. Leaves ────────────────────────────────────────────────────────────
  if (empIds.length > 0) {
    const leaves = [
      { empIdx: 0, type: 'annual', start: '2024-07-01', end: '2024-07-05', days: 5 },
      { empIdx: 1, type: 'sick', start: '2024-06-10', end: '2024-06-12', days: 3 },
      { empIdx: 3, type: 'annual', start: '2024-08-15', end: '2024-08-20', days: 6 },
      { empIdx: 4, type: 'emergency', start: '2024-06-18', end: '2024-06-18', days: 1 },
    ];
    for (const l of leaves) {
      await client.query(
        `INSERT INTO leaves (company_id, employee_id, type, start_date, end_date, days, status) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING;`,
        [companyId, empIds[l.empIdx], l.type, l.start, l.end, l.days, l.type === 'emergency' ? 'approved' : 'pending']
      );
    }
  }

  // ─── 25. Leads ─────────────────────────────────────────────────────────────
  const leadsData = [
    { name: 'محمد عبدالله السقاف', phone: '+967111000111', email: 'm.saqaf@example.com', company: 'شركة السقاف التجارية', source: 'معرض', status: 'new', value: 500000 },
    { name: 'سمير علي الحميري', phone: '+967222000222', email: 's.alhamiri@example.com', company: 'مؤسسة الحميري', source: 'موقع إلكتروني', status: 'contacted', value: 350000 },
    { name: 'ليلى محمود الأصبحي', phone: '+967333000333', email: 'l.ashbah@example.com', company: 'شركة الأصبحي', source: 'توصية', status: 'qualified', value: 800000 },
    { name: 'عمر فاروق بامطرف', phone: '+967444000444', email: 'o.bamtraf@example.com', company: 'مؤسسة بامطرف', source: 'إعلان', status: 'new', value: 200000 },
    { name: 'نادية صالح الكحلاني', phone: '+967555000555', email: 'n.kahlan@example.com', company: 'شركة الكحلاني', source: 'معرض', status: 'contacted', value: 600000 },
    { name: 'هشام أحمد الجندي', phone: '+967666000666', email: 'h.aljundi@example.com', company: 'مؤسسة الجندي', source: 'اتصال وارد', status: 'qualified', value: 450000 },
  ];
  for (const l of leadsData) {
    await client.query(
      `INSERT INTO leads (company_id, name, phone, email, company, source, status, estimated_value, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT DO NOTHING;`,
      [companyId, l.name, l.phone, l.email, l.company, l.source, l.status, l.value, 'عميل محتمل']
    );
  }
  const leadsRes = await client.query(`SELECT id FROM leads WHERE company_id = $1 ORDER BY name`, [companyId]);
  const leadIds = leadsRes.rows.map(r => r.id);

  // ─── 26. Opportunities ─────────────────────────────────────────────────────
  if (leadIds.length > 0) {
    const opportunities = [
      { leadIdx: 2, name: 'صفقة توزيع أرز بسمتي', value: 800000, stage: 'negotiation', prob: 70, close: '2024-09-30' },
      { leadIdx: 0, name: 'عقد توريد زيوت نباتية', value: 500000, stage: 'prospecting', prob: 40, close: '2024-10-15' },
      { leadIdx: 4, name: 'مشروع توريد مواد تنظيف', value: 600000, stage: 'proposal', prob: 55, close: '2024-08-20' },
      { leadIdx: 5, name: 'اتفاقية بيع سكر بالجملة', value: 450000, stage: 'prospecting', prob: 30, close: '2024-11-01' },
    ];
    for (const o of opportunities) {
      if (o.leadIdx < leadIds.length) {
        await client.query(
          `INSERT INTO opportunities (company_id, lead_id, name, value, stage, probability, expected_close_date) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING;`,
          [companyId, leadIds[o.leadIdx], o.name, o.value, o.stage, o.prob, o.close]
        );
      }
    }
  }
  const oppRes = await client.query(`SELECT id FROM opportunities WHERE company_id = $1 ORDER BY name`, [companyId]);
  const oppIds = oppRes.rows.map(r => r.id);

  // ─── 27. CRM Activities ────────────────────────────────────────────────────
  if (oppIds.length > 0 || leadIds.length > 0) {
    const activities = [
      { title: 'متابعة عرض السعر', due: '2024-07-05', priority: 'high', status: 'pending', leadIdx: 0, oppIdx: null },
      { title: 'إرسال العينة', due: '2024-07-10', priority: 'medium', status: 'in_progress', leadIdx: null, oppIdx: 0 },
      { title: 'اجتماع تفاوضي', due: '2024-07-15', priority: 'high', status: 'pending', leadIdx: null, oppIdx: 1 },
      { title: 'اتصال تأكيدي', due: '2024-07-08', priority: 'low', status: 'completed', leadIdx: 1, oppIdx: null },
      { title: 'تحديث عرض', due: '2024-07-20', priority: 'medium', status: 'pending', leadIdx: null, oppIdx: 2 },
    ];
    for (const a of activities) {
      const leadId = a.leadIdx !== null && a.leadIdx < leadIds.length ? leadIds[a.leadIdx] : null;
      const oppId = a.oppIdx !== null && a.oppIdx < oppIds.length ? oppIds[a.oppIdx] : null;
      await client.query(
        `INSERT INTO crm_activities (company_id, lead_id, opportunity_id, title, description, due_date, priority, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING;`,
        [companyId, leadId, oppId, a.title, a.title, a.due, a.priority, a.status]
      );
    }
  }

  // ─── 28. Calls ─────────────────────────────────────────────────────────────
  if (leadIds.length > 0 || oppIds.length > 0) {
    const calls = [
      { leadIdx: 0, type: 'outbound', duration: 300, notes: 'تقديم الشركة' },
      { leadIdx: 1, type: 'inbound', duration: 180, notes: 'استفسار عن منتج' },
      { oppIdx: 0, type: 'outbound', duration: 420, notes: 'مناقشة الشروط' },
    ];
    for (const c of calls) {
      const leadId = c.leadIdx !== null && c.leadIdx < leadIds.length ? leadIds[c.leadIdx] : null;
      const oppId = c.oppIdx !== null && c.oppIdx < oppIds.length ? oppIds[c.oppIdx] : null;
      await client.query(
        `INSERT INTO calls (company_id, lead_id, opportunity_id, type, duration, notes) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING;`,
        [companyId, leadId, oppId, c.type, c.duration, c.notes]
      );
    }
  }

  // ─── 29. BOMs ──────────────────────────────────────────────────────────────
  if (prodIds.length >= 4) {
    const bom1Res = await client.query(
      `INSERT INTO boms (company_id, product_id, version, is_active) VALUES ($1, $2, '1.0', true) ON CONFLICT DO NOTHING RETURNING id;`,
      [companyId, prodIds[0]]
    );
    const bom1Id = bom1Res.rows[0]?.id;
    if (bom1Id) {
      await client.query(
        `INSERT INTO bom_lines (bom_id, material_id, quantity, unit_cost) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING;`,
        [bom1Id, prodIds[4], 2, 380]
      );
      await client.query(
        `INSERT INTO bom_lines (bom_id, material_id, quantity, unit_cost) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING;`,
        [bom1Id, prodIds[5], 1, 1200]
      );
    }

    const bom2Res = await client.query(
      `INSERT INTO boms (company_id, product_id, version, is_active) VALUES ($1, $2, '1.0', true) ON CONFLICT DO NOTHING RETURNING id;`,
      [companyId, prodIds[1]]
    );
    const bom2Id = bom2Res.rows[0]?.id;
    if (bom2Id) {
      await client.query(
        `INSERT INTO bom_lines (bom_id, material_id, quantity, unit_cost) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING;`,
        [bom2Id, prodIds[6], 1, 8500]
      );
      await client.query(
        `INSERT INTO bom_lines (bom_id, material_id, quantity, unit_cost) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING;`,
        [bom2Id, prodIds[7], 2, 650]
      );
    }
  }

  // ─── 30. Work Orders ───────────────────────────────────────────────────────
  if (prodIds.length >= 2) {
    const bomsRes = await client.query(`SELECT id, product_id FROM boms WHERE company_id = $1`, [companyId]);
    const bomMap = {};
    for (const row of bomsRes.rows) {
      bomMap[row.product_id] = row.id;
    }

    const workOrders = [
      { number: 'WO-2024-0001', productIdx: 0, qty: 100, status: 'in_progress', start: '2024-06-01', end: '2024-06-30' },
      { number: 'WO-2024-0002', productIdx: 1, qty: 200, status: 'pending', start: '2024-07-01', end: '2024-07-31' },
      { number: 'WO-2024-0003', productIdx: 0, qty: 150, status: 'completed', start: '2024-05-01', end: '2024-05-31' },
    ];
    for (const wo of workOrders) {
      const bomId = bomMap[prodIds[wo.productIdx]] || null;
      const woRes = await client.query(
        `INSERT INTO work_orders (company_id, order_number, product_id, bom_id, quantity, produced_quantity, status, planned_start_date, planned_end_date, actual_start_date, actual_end_date, total_cost, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT DO NOTHING RETURNING id;`,
        [companyId, wo.number, prodIds[wo.productIdx], bomId, wo.qty, wo.status === 'completed' ? wo.qty : 0, wo.status, wo.start, wo.end, wo.status !== 'pending' ? wo.start : null, wo.status === 'completed' ? wo.end : null, wo.qty * 5000, 'أمر تشغيل تجريبي']
      );
      const woId = woRes.rows[0]?.id;
      if (woId && bomId) {
        const bomLinesRes = await client.query(`SELECT material_id, quantity, unit_cost FROM bom_lines WHERE bom_id = $1`, [bomId]);
        for (const line of bomLinesRes.rows) {
          await client.query(
            `INSERT INTO work_order_consumptions (work_order_id, material_id, planned_quantity, actual_quantity, unit_cost) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;`,
            [woId, line.material_id, line.quantity * wo.qty, wo.status === 'completed' ? line.quantity * wo.qty : 0, line.unit_cost || 0]
          );
        }
      }
    }
  }

  // ─── 31. General Accounting Transactions ───────────────────────────────────
  const cashAccountRes = await client.query(`SELECT id FROM accounts WHERE company_id = $1 AND code = '111001'`, [companyId]);
  const salesAccountRes = await client.query(`SELECT id FROM accounts WHERE company_id = $1 AND code = '411001'`, [companyId]);
  const expenseAccountRes = await client.query(`SELECT id FROM accounts WHERE company_id = $1 AND code = '511001'`, [companyId]);

  if (cashAccountRes.rows.length > 0 && salesAccountRes.rows.length > 0) {
    const txRes = await client.query(
      `INSERT INTO transactions (company_id, date, reference, description, total_amount, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING RETURNING id;`,
      [companyId, '2024-06-01', 'TXN-001', 'إيرادات شهر يونيو', 500000, 'posted']
    );
    const txId = txRes.rows[0]?.id;
    if (txId) {
      await client.query(
        `INSERT INTO journal_entries (transaction_id, account_id, debit, credit, memo) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;`,
        [txId, cashAccountRes.rows[0].id, 500000, 0, 'تحصيل نقدي']
      );
      await client.query(
        `INSERT INTO journal_entries (transaction_id, account_id, debit, credit, memo) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;`,
        [txId, salesAccountRes.rows[0].id, 0, 500000, 'إيرادات المبيعات']
      );
    }
  }

  if (cashAccountRes.rows.length > 0 && expenseAccountRes.rows.length > 0) {
    const txRes = await client.query(
      `INSERT INTO transactions (company_id, date, reference, description, total_amount, status) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING RETURNING id;`,
      [companyId, '2024-06-05', 'TXN-002', 'مصاريف تشغيل', 120000, 'posted']
    );
    const txId = txRes.rows[0]?.id;
    if (txId) {
      await client.query(
        `INSERT INTO journal_entries (transaction_id, account_id, debit, credit, memo) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;`,
        [txId, expenseAccountRes.rows[0].id, 120000, 0, 'مصاريف تشغيل']
      );
      await client.query(
        `INSERT INTO journal_entries (transaction_id, account_id, debit, credit, memo) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;`,
        [txId, cashAccountRes.rows[0].id, 0, 120000, 'دفع نقدي']
      );
    }
  }

  // ─── 32. Receipt & Payment Vouchers ───────────────────────────────────────
  const firstCustomer = await client.query(`SELECT id FROM customers WHERE company_id = $1 ORDER BY code LIMIT 1`, [companyId]);
  const firstSupplier = await client.query(`SELECT id FROM suppliers WHERE company_id = $1 ORDER BY code LIMIT 1`, [companyId]);

  if (firstCustomer.rows.length > 0) {
    await client.query(
      `INSERT INTO receipt_vouchers (company_id, voucher_number, date, customer_id, amount, payment_method, notes, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING;`,
      [companyId, 'RV-2024-0001', '2024-06-01', firstCustomer.rows[0].id, 150000, 'cash', 'تحصيل من عميل', 'posted']
    );
    await client.query(
      `INSERT INTO receipt_vouchers (company_id, voucher_number, date, customer_id, amount, payment_method, notes, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING;`,
      [companyId, 'RV-2024-0002', '2024-06-15', firstCustomer.rows[0].id, 200000, 'bank', 'تحصيل بنكي', 'posted']
    );
  }

  if (firstSupplier.rows.length > 0) {
    await client.query(
      `INSERT INTO payment_vouchers (company_id, voucher_number, date, supplier_id, amount, payment_method, notes, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING;`,
      [companyId, 'PV-2024-0001', '2024-06-05', firstSupplier.rows[0].id, 100000, 'cash', 'دفع لمورد', 'posted']
    );
    await client.query(
      `INSERT INTO payment_vouchers (company_id, voucher_number, date, supplier_id, amount, payment_method, notes, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT DO NOTHING;`,
      [companyId, 'PV-2024-0002', '2024-06-20', firstSupplier.rows[0].id, 175000, 'bank', 'دفع بنكي', 'posted']
    );
  }

  // ─── 33. Activity Log (defensive: skip if table doesn't exist) ────────────
  try {
    await client.query(
      `INSERT INTO activity_logs (company_id, user_id, user_name, action, module, details) VALUES ($1, NULL, 'النظام', $2, $3, $4);`,
      [companyId, 'بذر البيانات الوهمية', 'الأساس (Core)', 'تم إدخال بيانات وهمية شاملة لجميع وحدات النظام: العملاء والموردين والمنتجات والمستودعات والمخزون والفواتير وأوامر الشراء والموظفين والرواتب والحضور والإجازات والعملاء المحتملين والفرص والأنشطة وقوائم المواد وأوامر التشغيل والفروع والعملات وضريبة القيمة المضافة والترقيم والقيود المحاسبية']
    );
  } catch (logErr) {
    console.warn('[DB] Could not write demo activity log:', logErr.message);
  }

  return { success: true, companyId };
}
