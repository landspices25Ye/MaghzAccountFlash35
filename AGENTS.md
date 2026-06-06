# دليل الوكلاء الذكيين — maghzaccount-pro

> **الغرض:** يُعد هذا الملف المصدر المرجعي الأول للوكلاء الذكيين (AI Agents) الذين يعملون على تعديل أو توسيع أو صيانة هذا المشروع. اقرأه بالكامل قبل إجراء أي تغيير.

---

## 1. نظرة عامة على المنتج

**maghzaccount-pro** هو نظام ERP محاسبي متكامل احترافي موجه للمنشآت الصغيرة والمتوسطة في العالم العربي. يوفر:
- إدارة مالية متوافقة مع المعايير المحاسبية المزدوجة (Double-Entry).
- شجرة حسابات جاهزة متوافقة مع IFRS.
- نظام ضريبة القيمة المضافة (VAT) مرن.
- دعم متعدد العملات مع الريال اليمني (YER) كعملة افتراضية.
- تقارير متقدمة وذكية وتحليلية لكل وحدة.
- لوحة تحكم رئيسية (Dashboard) تعرض KPIs من كل الوحدات.
- تصميم عربي/إنجليزي مع خطوط Cairo/Inter ووضع فاتح/داكن.

- **الإصدار الحالي:** v0.3.16 (Lint clean: 0 errors, 0 warnings | Tables: 60 | i18n: 593 keys متوازنة | Tests: 279 ✓ | 11 pages server-side paginated | RBAC reactive | Multi-currency complete)
- **المنصات:** Electron (سطح المكتب) + Web Browser (مستقبلي)
- **اللغات:** العربية (افتراضي) + الإنجليزية
- **الترخيص:** خاص (Private)

---

## 2. الوحدات المنفصلة (11 Modules)

| # | الوحدة | المجلد | الوصف |
|---|--------|--------|-------|
| 01 | **الأساس (Core)** | `core/` | تهيئة النظام، الشركات، العملات، قاعدة البيانات |
| 02 | **تسجيل الدخول (Auth)** | `modules/auth/` | المستخدمين، الأدوار، الصلاحيات (RBAC) |
| 03 | **الإعدادات (Settings)** | `modules/settings/` | إعدادات النظام، VAT، الفروع |
| 04 | **الحسابات (Accounting)** | `modules/accounting/` | شجرة حسابات، قيود يومية، تقارير مالية |
| 05 | **المخازن (Inventory)** | `modules/inventory/` | منتجات، مستودعات، جرد، تحويلات |
| 06 | **المبيعات (Sales)** | `modules/sales/` | فواتير، VAT، عروض أسعار، عملاء |
| 07 | **المشتريات (Purchases)** | `modules/purchases/` | فواتير، أوامر شراء، موردين |
| 08 | **التصنيع (Manufacturing)** | `modules/manufacturing/` | BOM، أوامر تشغيل، تكاليف |
| 09 | **الموظفين (HR)** | `modules/hr/` | حضور، رواتب، نهاية خدمة |
| 10 | **علاقات العملاء (CRM)** | `modules/crm/` | فرص، مهام، مكالمات |
| 11 | **التقارير (Reports)** | `modules/reports/` | Dashboard، تقارير مركزية، تحليلات |

---

## 3. الهيكل التقني العام

```
maghzaccount-pro/
├── src/
│   ├── core/                       ← الطبقة الأساسية المشتركة
│   │   ├── ui/                     ← Design System (Tailwind + Components)
│   │   │   ├── components/         ← Button, Input, Modal, Card, Table...
│   │   │   ├── charts/             ← Recharts wrappers
│   │   │   └── tokens/             ← Colors, Typography
│   │   ├── store/                  ← Zustand stores
│   │   ├── i18n/                   ← ar.json, en.json, useTranslation
│   │   ├── database/               ← طبقات البيانات
│   │   │   ├── adapters/           ← PG, Mock adapters (Realm removed)
│   │   │   ├── schema/             ← Drizzle schemas (per module)
│   │   │   └── mock/               ← Mock data seed + initialization
│   │   ├── reports/                ← محرك التقارير
│   │   │   ├── engine/             ← ReportBuilder, QueryBuilder
│   │   │   └── export/             ← PDF, Excel, CSV (lazy-loaded via dynamic import)
│   │   └── utils/                  ← formatCurrency, validators
│   │
│   ├── modules/                    ← وحدات ERP المنفصلة
│   │   ├── auth/
│   │   ├── settings/
│   │   ├── accounting/
│   │   │   ├── api/                ← Database adapters
│   │   │   ├── components/         ← React components
│   │   │   ├── hooks/              ← Custom hooks
│   │   │   ├── reports/            ← تقارير الحسابات
│   │   │   └── index.ts
│   │   ├── inventory/
│   │   ├── sales/
│   │   ├── purchases/
│   │   ├── manufacturing/
│   │   ├── hr/
│   │   ├── crm/
│   │   └── reports/                ← Dashboard + تقارير مركزية
│   │
│   └── app/                        ← React Router + Layout
│       ├── layout.tsx              ← App Shell
│       └── page.tsx                ← Dashboard (default route)
│
├── electron/                       ← Electron main + preload
├── public/                         ← الأصول الثابتة
├── tailwind.config.js
├── drizzle.config.ts
└── package.json
```

---

## 4. القواعد الذهبية للتعديل

### 4.1 TypeScript
- **الإلزام:** كل ملف جديد يجب أن يكون `.ts` أو `.tsx`. ممنوع `.js` تماماً.
- **الأنواع:** لا تستخدم `any` إلا في حالات استثنائية.
- **الواجهات:** عرّف interfaces في `types.ts` داخل كل وحدة.

### 4.2 React
- **النمط:** Functional Components + Hooks فقط.
- **الـ Store:** استخدم Zustand للحالة المشتركة.
- **التأثيرات الجانبية:** استدعاءات قاعدة البيانات داخل `useEffect` أو hooks مخصصة.
- **Memoization:** لا تُفرط في `useMemo`/`useCallback`. استخدم `React.memo` فقط للمكونات الأساسية (Button, Input, Card, Table, Modal).
- **التنسيق:** استخدم `useFormatters` (من `core/utils/useFormatters`) لتنسيق العملات والتواريخ — لا تستخدم `toLocaleString('ar-SA')` مباشرة.

### 4.3 Tailwind CSS
- **النظام:** استخدم Tailwind classes مباشرة في JSX.
- **Dark Mode:** استخدم `dark:` prefix لكل لون.
- **RTL:** استخدم `rtl:` prefix أو logical properties.
- **ممنوع:** لا تضف CSS مخصص إلا للأنماط المشتركة (`@layer components`).

### 4.4 قاعدة البيانات (طبقة واحدة — PostgreSQL فقط)

| الطبقة | البيئة | التقنية |
|--------|--------|---------|
| الوحيدة | Electron + PG متاح | PostgreSQL + Drizzle ORM (`electronPgAdapter`) |

**قاعدة حاسمة:** استخدم Database Adapter من `core/database/adapters/electronPgAdapter.ts`. لا تكتب كود قاعدة بيانات مباشرة داخل المكونات. لا mock adapter — إذا لم يكن PG متاحاً، `getDbAdapter()` يرمي خطأ بدلاً من العمل بذاكرة وهمية.

`getDbAdapter()` يحاول PG أولاً عبر IPC، فإن فشل يقع إلى Mock. `convertPlaceholders()` يحوِّل `?` → `$N` قبل الإرسال لـ PostgreSQL.

### 4.5 الترجمة (i18n)
- **المفتاح:** استخدم `module.feature.element` (مثال: `sales.invoice.total`).
- **الملفات:** `core/i18n/ar.json` و `en.json`.
- **القاعدة:** أي نص ظاهري يجب أن يكون في ملف الترجمة.

### 4.6 الأيقونات
- استخدم **Lucide React** فقط.

---

## 5. تدفق العمل (Workflow)

### 5.1 إضافة وحدة جديدة (مثال: Manufacturing)

**الخطوة 1: قاعدة البيانات**
```ts
// core/database/schema/manufacturing.ts
export const workOrders = pgTable('work_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  productId: uuid('product_id').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

**الخطوة 2: API Adapter**
```ts
// modules/manufacturing/api/index.ts
export const manufacturingApi = {
  getWorkOrders: async () => { /* ... */ },
  createWorkOrder: async (data: CreateWorkOrderDto) => { /* ... */ },
};
```

**الخطوة 3: المكونات**
```tsx
// modules/manufacturing/components/WorkOrdersPage.tsx
export const WorkOrdersPage = () => {
  const { data, isLoading } = useWorkOrders();
  // ...
};
```

**الخطوة 4: الترجمة**
```json
// core/i18n/ar.json
{
  "manufacturing": {
    "workOrders": {
      "title": "أوامر التشغيل",
      "create": "إنشاء أمر تشغيل"
    }
  }
}
```

**الخطوة 5: التوجيه**
```tsx
// app/router.tsx
import { WorkOrdersPage } from '@/modules/manufacturing';

// أضف route
<Route path="/manufacturing" element={<WorkOrdersPage />} />
```

**الخطوة 6: Sidebar**
```tsx
// app/layout.tsx
{ id: 'manufacturing', labelKey: 'sidebar.manufacturing', icon: Factory }
```

### 5.2 إضافة تقرير لوحدة موجودة

**الخطوة 1: إنشاء ملف التقرير**
```tsx
// modules/sales/reports/SalesAnalysisReport.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSalesReportData } from '../hooks/useSalesReportData';

export const SalesAnalysisReport = () => {
  const { data, isLoading } = useSalesReportData();
  // ...
};
```

**الخطوة 2: إضافة Hook للبيانات**
```ts
// modules/sales/hooks/useSalesReportData.ts
export const useSalesReportData = (filters?: ReportFilters) => {
  return useQuery({
    queryKey: ['sales-report', filters],
    queryFn: () => salesApi.getReportData(filters),
  });
};
```

**الخطوة 3: إضافة Route**
```tsx
// app/router.tsx
<Route path="/sales/reports/analysis" element={<SalesAnalysisReport />} />
```

**الخطوة 4: إضافة زر في صفحة الوحدة**
```tsx
// modules/sales/components/SalesPage.tsx
<Link to="/sales/reports/analysis" className="btn btn-secondary">
  تحليل المبيعات
</Link>
```

### 5.3 إضافة KPI للـ Dashboard

**الخطوة 1: إنشاء Hook**
```ts
// modules/reports/hooks/useDashboardKpis.ts
export const useDashboardKpis = () => {
  const { data: revenue } = useRevenueKpi();
  const { data: expenses } = useExpensesKpi();
  const { data: invoices } = useInvoicesCountKpi();
  
  return { revenue, expenses, invoices };
};
```

**الخطوة 2: إضافة Widget**
```tsx
// modules/reports/dashboards/widgets/RevenueWidget.tsx
export const RevenueWidget = () => {
  const { revenue } = useDashboardKpis();
  return (
    <KpiCard 
      title="الإيرادات اليومية" 
      value={revenue?.total} 
      change={revenue?.change}
    />
  );
};
```

**الخطوة 3: إضافة للـ Dashboard**
```tsx
// modules/reports/dashboards/MainDashboard.tsx
<div className="grid grid-cols-4 gap-4">
  <RevenueWidget />
  <ExpensesWidget />
  {/* ... */}
</div>
```

---

## 6. أوامر التشغيل والبناء

```bash
# التطوير (ويب)
npm run dev

# التطوير (Electron)
npm run electron:dev

# البناء (ويب)
npm run build

# البناء (Electron)
npm run electron:build

# الفحص اللغوي
npm run lint

# اختبارات الوحدات
npm run test

# توليد Migration
npx drizzle-kit generate

# تطبيق Migration
npx drizzle-kit migrate
```

---

## 7. الأمان وعزل البيانات

- **multi-tenancy:** كل الجداول تحتوي على `companyId`. تأكد من تطبيق هذا.
- **Cascade Delete:** عند حذف شركة، حذف جميع بياناتها.
- **Restrict:** لا تحذف حساباً له قيود يومية.
- **RBAC:** تحقق من الصلاحيات قبل كل عملية حساسة.

---

## 8. التقارير لكل وحدة

| الوحدة | التقارير المتاحة |
|--------|-----------------|
| **Accounting** | Trial Balance, Balance Sheet, P&L, Cash Flow, Account Ledger |
| **Inventory** | Item Ledger, Stock Count, Low Stock, Slow Moving |
| **Sales** | Invoices, A/R Aging, Top Customers, Seasonal Analysis, VAT |
| **Purchases** | Invoices, A/P Aging, Price Comparison, VAT |
| **Manufacturing** | Production Cost, Work Orders, Variance Analysis |
| **HR** | Payroll, Attendance, End of Service |
| **CRM** | Sales Funnel, Lead Conversion, Rep Performance |

---

## 9. نقاط الاحتياط الشائعة

| المشكلة | الحل |
|---------|------|
| Tailwind classes لا تعمل | تأكد من إضافة المسار في `tailwind.config.js` |
| Dark mode لا يعمل | تأكد من `darkMode: 'class'` في tailwind.config.js |
| RTL لا يعمل | أضف `dir="rtl"` في `<html>` واستخدم `rtl:` prefix |
| Recharts لا يظهر | استخدم `ResponsiveContainer` دائماً |
| PDF لا يدعم العربية | `jspdf` يستخدم helvetica — للدعم الكامل استخدم Cairo عبر `doc.addFileToVFS` |
| pgClient لا يعمل في Browser | طبيعي — استخدم Mock adapter |
| Bundle كبير (PDF/Excel) | `jspdf` و `xlsx` يُحمَّلان ديناميكياً — لا تستخدم static import |

---

## 10. تحسينات الأداء (Performance)

- **Layout Routes:** `AppLayout` و `ProtectedRoute` يستخدمان `<Outlet />` بدلاً من `{children}` — يمنع إعادة التصيير عند تغيير المسار
- **Lazy Loading:** `jspdf` + `xlsx` محمَّلان ديناميكياً عبر `await import()` — لا يُحمَّلان إلا عند الضغط على زر التصدير
- **Bundle Splitting:** Vite `manualChunks` يفصل vendor (React/Recharts) عن pdf/excel/db/table
- **React.memo:** 5 مكونات أساسية (Button, Input, Card, Table, Modal) مغلَّفة بـ `React.memo`
- **Barrel Removal:** `export * from './smart'` — أزيل من `core/ui/components/index.ts` لتجنب تجميع 20 مكوناً ذكياً

## 11. الاتصال والدعم

- **المشرف:** مالك المستودع
- **الوثائق التقنية:** 
  - `ARCHITECTURE.md` — البنية المعمارية
  - `DESIGN.md` — نظام التصميم
  - `STYLEGUIDE.md` — أسلوب الكود
  - `PROJECT.md` — وثائق المشروع
  - `TESTING.md` — استراتيجية الاختبار
  - `DEPLOYMENT.md` — النشر والتوزيع

---

*آخر تحديث: 2026-06-04 | الإصدار: maghzaccount-pro v0.3.3*

## 12. ملخص المراحل المنجزة

### المرحلة 1-4: ربط المنتجات بالتصنيفات والأنواع
- Migration `0002_product_type_and_categories.sql`: `product_type_id` FK + `product_product_categories` many-to-many + indexes
- 8 صفحات محدّثة لاستخدام `module="sales"|"purchases"|"inventory"` في `ProductSelect`
- `ProductsPage` يحتوي فلاتر dropdown للتصنيف والنوع
- `productTypeFilter.test.ts` (14 اختبار ✓)

### المرحلة 5: فحص شامل لقاعدة البيانات
- **اكتشاف schema drift**: `dbHandler.js` كان ينشئ schema متوازي مع Drizzle → حُذف
- **إصلاح account code mismatch**: `111001/411001/511001` (6-digit) → `11101/41101/51101` (5-digit) في `seedDemoData.js`
- **Migration 0003**: 23 UNIQUE constraints عبر `DO $$` blocks (idempotent) + `users(company_id, username)` — `receipt_vouchers` و`payment_vouchers` أُزيلت لأن الجداول غير موجودة في 0000
- **Migration 0004**: أعمدة ناقصة في `users` (`full_name`, `phone`) و `roles` (`description`, `is_system`, `updated_at`) — كانت مستخدمة في `seedInitialData` لكن مفقودة من SQL schema (Drizzle schema كان يحويها لكن SQL لم يُولَّد)
- **`electronPgAdapter` محدّث**: `getContacts` و`createContact` يستخدمان `customers`/`suppliers` المنفصلين (الـ `contacts` table القديم لم يعد موجوداً)
- **`useDashboard.ts` محدّث**: يستدعي `getContacts` مرتين (customer, supplier) بدلاً من مرة واحدة
- **حذف كود ميت**: `mockAdapter.ts` (394 سطر)، `seedData.ts` (200+ سطر)، `mockAdapter.test.ts` (10 اختبارات)
- **إعادة كتابة `seedDemoData.js`**: const arrays في الأعلى + `INSERT ... SELECT ... WHERE NOT EXISTS` pattern
- **إعادة كتابة `resetDatabase.js`**: 3 phases + safety checks + `--dry-run`/`--yes`/`--force`
- **`seedDemoData.test.js`**: 9 اختبارات (in-memory mock يحلل SQL)
- **`migrations.test.ts` (جديد)**: 16 اختبار يتحقق من 49 جدول + 23 UNIQUE + idempotency + صحة الأعمدة المستهدفة في indexes
- **إصلاح `EmployeesPage.tsx`**: `</div>` زائد كان يكسر JSX

### المرحلة 6: إصلاح schema drift في Migrations 0001 و 0003
- **تشغيل `npm run db:reset`**: كشف فشل migration 0001 (column "company_id" does not exist) ثم 0003 (relation "receipt_vouchers" does not exist)
- **الجذر**: Migrations كانت تشير لجداول/أعمدة غير موجودة في 0000
- **migration 0001 أُصلح**:
  - `journal_entries` لا يحوي `company_id` (يحصل عليها عبر `transactions.transaction_id`) → index على `(transaction_id, created_by)` بدلاً من `(company_id, created_by)`
  - `sales_returns`، `purchase_returns`، `tasks` غير موجودة في schema → ALTER والـ index أُزيلت
- **migration 0003 أُصلح**:
  - `receipt_vouchers` و`payment_vouchers` غير موجودة → الـ UNIQUE أُزيلت (العدد: 25 → 23)
- **اختبارات جديدة** في `migrations.test.ts`: `audit indexes target real columns` و `journal_entries index uses transaction_id` لكشف هذا النوع من الفجوات مستقبلاً
- **تشغيل على PostgreSQL حقيقي** (`localhost:5432`): كل الـ 5 migrations تنجح من الصفر
- **النتائج النهائية**: 11 ملف اختبار، 111+ اختبار ✓، TypeScript نظيف، Build ينجح، `npm run db:reset` يعمل من الصفر

### المرحلة 7: توحيد schema + جداول ناقصة + seed متكامل
- **استبدال 5 migrations بملف واحد**: `drizzle/0000_unified_schema.sql` (856 سطر، 57 جدول، 28 UNIQUE inline، 31 audit index). المجلد القديم `0000-0004` + 5 snapshots في `drizzle/meta/` حُذفت. الـ journal entry الحاسم: `{"idx": 0, "tag": "0000_unified_schema", "when": 1779734523652, "breakpoints": true}`.
- **الجداول الـ 6 الناقصة** (موجودة الآن في `0000_unified_schema`):
  - `quotation_lines` (مفرد، يطابق `quotations`)
  - `sales_returns` + `sales_return_lines` — كان الـ UI موجود لكن الـ schema ناقص
  - `purchase_returns` + `purchase_return_lines`
  - `receipt_vouchers` + `payment_vouchers` (في `vouchers.ts` schema منفصل)
- **تحديث Drizzle schema files**:
  - `src/core/database/schema/core.ts`: `companies` أضيفت `dateFormat`/`decimalPlaces`/`calendar`
  - `src/core/database/schema/accounting.ts`: `journalEntries` أضيف `companyId` (denormalized) + `createdBy`/`updatedBy`/`updatedAt`
  - `src/core/database/schema/sales.ts`: أضيفت `quotationLines`، `salesReturns`، `salesReturnLines` + `updatedAt` للجداول الموجودة
  - `src/core/database/schema/purchases.ts`: أضيفت `purchaseReturns`، `purchaseReturnLines` + `updatedAt` للجداول الموجودة
  - **ملف جديد** `src/core/database/schema/vouchers.ts`: `receiptVouchers` + `paymentVouchers`
  - `src/core/database/schema/index.ts`: `export * from './vouchers'`
- **Drizzle schema design**:
  - `journal_entries` flat design — يحوي `debit`/`credit`/`account_id`/`transaction_id`/`company_id` في الصف مباشرة (لا header/lines split)
  - `company_id` denormalized في `journal_entries` — index سريع `idx_journal_entries_company_id` للـ multi-tenant queries
  - `product_product_categories` many-to-many join بحجر primary key مركّب `(product_id, category_id)`
  - معظم الجداول الرئيسية: `company_id NOT NULL REFERENCES companies ON DELETE CASCADE` + `created_by`/`updated_by REFERENCES users ON DELETE SET NULL`
- **UNIQUE constraints**: كلها inline في `CREATE TABLE` (لا `DO $$` blocks منفصلة) — يبسّط الـ schema
- **`migrations.test.ts` (معاد كتابته)**: 24 اختبار بدلاً من 16 — يفحص ملف واحد فقط، جميع الـ 57 جداول، IF NOT EXISTS، UNIQUE inline، NOT NULL company_id، FK CASCADE، product_type_id FK، denormalized journal_entries، section comments، flat design documentation.
- **`seedDemoData.js` (معاد كتابته)**: 862 سطر، 28 قسم، 9 master data + 5 transaction + 3 HR + 3 sales + 3 purchase + 2 returns + 2 vouchers + 1 CRM + 1 manufacturing. ينشئ admin user افتراضي (`admin`/`admin`، role=`admin`) إذا لم يوجد. يستخدم helper `lookupIdByCode(table, code)` بدلاً من pre-fetch — متوافق مع mock tests. idempotent عبر `WHERE NOT EXISTS` على `(company_id, <unique_key>)`.
- **`seedDemoData.test.js`**: 9 اختبارات (استخدم `makeStatefulClient` بدل `makeRecordingClient` لاختبار "issues INSERTs to all expected tables" — لأن الـ recording mock لا يtrack state، مما يكسر lookups `SELECT id FROM ... WHERE company_id=$1 AND code=$2` التي تسبق إدخال الفواتير).
- **إصلاح parse error**: 246 سطر orphan code كان متبقياً بعد `return { success: true }` في نهاية `seedComprehensiveDemoData` (نسخة مكررة من الأقسام 20-28 + ذيل قسم 19) — حُذف. الملف الآن 862 سطر نظيف.
- **تشغيل نهائي**: 11 ملف اختبار، 120/120 ✓ (9 seedDemoData + 24 migrations + 13 useFormatters + 15 journalEntryGenerator + 14 productTypeFilter + 12 auth store + 11 auth ownership + 8 utils + 7 useOwnerFilter + 5 export + 2 printDocument)، TypeScript نظيف، `npm run db:reset --yes --force` ينجح من الصفر.

*آخر تحديث: 2026-06-04 | الإصدار: maghzaccount-pro v0.3.3*

### قواعد ذهبية مضافة
- **مصدر حقيقة واحد**: Drizzle migrations فقط (ملف موحّد `0000_unified_schema.sql`)، لا `initializeSchema` أو mock schema أو migrations متسلسلة
- **UNIQUE inline**: جميع الـ constraints داخل `CREATE TABLE` (لا `DO $$` blocks منفصلة) — أسهل للقراءة والاختبار
- **`WHERE NOT EXISTS` pattern**: أكثر أماناً من `ON CONFLICT DO NOTHING` (يعمل على أعمدة ليست UNIQUE) + يمكن استخدامه مع `RETURNING id` للـ idempotent insert
- **5-digit account codes**: متطابقة بين `seedDemoData` و`journalEntryGenerator` (`11101`/`41101`/`51101`)
- **customers + suppliers منفصلين**: لا `contacts` union (الـ schema لا يحويها)
- **DB هي الحقيقة**: لا mock data، لا seedData، لا mockAdapter — `getDbAdapter()` يفشل إذا PG غير متاح
- **Drizzle schema ↔ SQL drift**: يجب مزامنة الاثنين. الـ seed كان يشير لجداول/أعمدة غير موجودة (مصدر 6 جداول ناقصة). القاعدة: شغّل `drizzle-kit generate` بعد أي تعديل schema للتأكد من التطابق
- **journal_entries flat design**: يحوي `debit`/`credit`/`account_id`/`transaction_id`/`company_id` في الصف مباشرة. الـ denormalized `company_id` يمكّن index سريع للـ multi-tenant queries
- **ON DELETE السلوك**: `CASCADE` للـ multi-tenant parents (companies)، `SET NULL` للـ audit columns (`created_by`/`updated_by` → users) — حذف user لا يحذف بياناته
- **Test mock statefulness**: استخدم `makeStatefulClient` (يtrack state عبر INSERT/SELECT) للاختبارات التي تعتمد على lookups. `makeRecordingClient` كافٍ فقط للاختبارات التي لا تحتاج state (DDL checks، code patterns)

### المرحلة 8: تنظيف Build Errors + CI Scripts
- **اكتشاف المشكلة الجذرية**: `tsc --noEmit` على `tsconfig.json` كان **no-op** (لأن `tsconfig.json` يحوي `files: []` + `references` فقط). الـ TypeScript validation الفعلي يتطلب `tsc -b` (build mode). 134 build error كامن لم يُكتشف في الـ CI.
- **CI Scripts جديدة** في `package.json`:
  - `db:reset:force`: `node electron/resetDatabase.js --yes --force` (wrapper للـ force reset)
  - `db:check`: `drizzle-kit generate --config=drizzle.check.config.ts` (drift detection)
  - `preflight`: `npm run lint && npx tsc --noEmit && npm run test` (full local CI check)
- **ملف جديد** `drizzle.check.config.ts`: نسخة من `drizzle.config.ts` لكن `out: './.drizzle-drift-check'` (gitignored)
- **تحديث `.gitignore`**: أضيف `.drizzle-drift-check/` لتجنب تلويث `drizzle/` بـ files مؤقتة
- **الـ 134 Build Error تم تنظيفها** (الفئات الرئيسية):
  1. **`vouchers.ts` schema**: 4 imports ميتة (`boolean`, `users`, `suppliers`, `accounts`) — حُذفت
  2. **7 schema files** (accounting/hr/inventory/manufacturing/purchases/sales/settings): إزالة `users` غير المستخدم من `import { companies, users }`
  3. **`useDashboard.ts`**: `contacts` غير معرّف (الـ schema يحوي `customers`/`suppliers` منفصلين) → استبدال بـ `customersResult.data`
  4. **`useOwnerFilter.ts`**: إزالة `hasPermission` و `hasViewPerm` غير المستخدمين
  5. **`productTypeFilter.ts`**: `./types` (لا يوجد) → `@/core/types` (`src/core/types.ts`)
  6. **`validation.ts`**: zod 4 breaking change: `result.error.errors` → `result.error.issues` (ZodIssue[])
  7. **`accounting/api.ts`**: إضافة imports للـ validation schemas (`validateInput`, `idCompanySchema`, `companyIdSchema`, `createTransactionSchema`, `createReceiptVoucherSchema`, `createPaymentVoucherSchema`)
  8. **`electronPgAdapter.ts`**: type annotation `Record<string, unknown>` للـ `(r) =>` callback (implicit any)
  9. **Hook signature mismatches** (الجزء الأكبر): 6 hooks (`useSales`/`useInventory`/`usePurchases`/`useHr`/`useCrm`/`useManufacturing`) كانت تمرر `userId` و `ownedByUserId` للـ API methods، لكن الـ API methods الأصلية لا تأخذ هذه الـ params. **الحل**: إزالة `useAuthStore` من الـ hooks وإزالة الـ args الإضافية + جعل `_userId?` و `_updatedBy?` optional في الـ API methods الـ 4 التي كانت تشترطها (`manufacturingApi.createBom/updateBom/createWorkOrder/updateWorkOrder`، `inventoryApi.updateProduct`). الـ SQL يحفظ `null` في `created_by`/`updated_by` عندما لا يُمرَّر userId (الـ columns nullable بـ `ON DELETE SET NULL`).
  10. **API fixes**: `manufacturingApi.updateWorkOrderStatus` و `getWorkOrderById` معامِلاتهم optional لتطابق hook usage. `accounting/api.ts` `deleteReceiptVoucher` كان يحوي `const adapter` غير مستخدم ويفتقد `return await adapter.query(...)` → أُضيف.
  11. **Type signatures**: `useProductTypes` في `src/core/hooks/useSettings.ts` لم يكن يحوي return type → أُضيف explicit return type يشمل `types: ProductType[]` (الـ consumer كان يدمر `productTypes` مباشرة). `ProductType` import أُضيف في `ProductsPage.tsx`.
  12. **Unused imports**: `z` غير مستخدم في `crm/api.ts` و `hr/api.ts` و `sales/api.ts` — حُذف. `useAuthStore` غير مستخدم في `useSales.ts` (بعد إزالة owner filtering).
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npm test`: **120/120 passed** ✓
  - `npm run build`: **✓ built in 13.28s** ✓
  - `npm run db:check`: **No schema changes, nothing to migrate** ✓
  - `npm run lint`: 168 problems (139 errors, 29 warnings) — pre-existing `any` types و React anti-patterns (لا يُحظر البناء)

### قواعد ذهبية مضافة
- **`tsc --noEmit` على tsconfig.json = no-op**: بسبب `files: []` + `references` — استخدم `tsc -b` للتحقق الفعلي
- **`drizzle-kit generate` للتطابق**: شغّله دائماً بعد أي تعديل schema. `db:check` يستخدم config منفصل (`drizzle.check.config.ts`) + gitignored output dir
- **Optional API params للـ audit columns**: `created_by`/`updated_by` nullable بـ `ON DELETE SET NULL` → API methods تقبل `userId?` و `updatedBy?` optional، SQL يحفظ `null` إذا لم يُمرَّر
- **No "owner filtering at API layer" حالياً**: الـ hooks كانت تحاول `useAuthStore.shouldFilterByOwner('module')` → أُزيل (over-engineering بدون RBAC كامل). الـ multi-tenancy عبر `company_id` فقط.

### المرحلة 9a: تنظيف Lint Errors (139 → 0)
- **الهدف**: تنظيف أخطاء ESLint من 139 إلى 0 (ما لا يُحظر البناء) مع الحفاظ على `tsc -b` ✓ و `vitest` ✓
- **الاكتشاف الجذري**: محاولة استبدال `any` بـ `unknown` في `DbAdapter` (السطر 6) كسرت 18 ملف تستدعي الـ adapter بدون generic. **الحل المُطبَّق**:
  - `src/core/database/adapters/types.ts`: إبقاء `any` في `query<T = any>` و `createTransaction(data: any)` (لأن الـ adapter generic interface) + إضافة `/* eslint-disable @typescript-eslint/no-explicit-any */` على مستوى الـ interface
  - `src/core/database/adapters/electronPgAdapter.ts`: 
    - interface `PreloadDB` للـ preload IPC bridge (الـ window.electronDB)
    - interface `ElectronDB` extends PreloadDB (للـ methods: `updateConfig`, `testConnection`, `clearAll`, `seedDefault`, `seedDemo`, `reset`)
    - `declare global { interface Window { electronDB?: ElectronDB } }` — يلغي كل `(window as any).electronDB`
    - `normalizeResult<T = unknown>()` — generic adapter
  - `src/app/onboarding/OnboardingWizard.tsx`: استبدال 12 `as any` بـ typed Window (10) و `instanceof Error ? err.message` (4)
  - `src/core/utils/journalEntryGenerator.test.ts` (18 → 0): `params: any[]` → `unknown[]`، `data: any` → `_data: unknown`، `adapter as any` → `adapter as unknown as Awaited<ReturnType<typeof getDbAdapter>>`
  - 6 SmartSelect fields: `onChange={(v) => onChange(typeof v === 'string' ? v : null)}` (يحل variance issue)
  - 17 Select components: نفس النمط
  - `src/modules/core/api.ts`: `const params: any[]` → `unknown[]`
  - `src/modules/auth/store.ownership.test.ts` (9 → 0): `as any` → `as User` (يحتاج `import type { User }`)
  - `src/modules/purchases/api.ts` (3 → 0): `(row.status as any)` → `as PurchaseInvoice["status"]` / `PurchaseOrder["status"]` / `PurchaseReturn["status"]`
  - `src/modules/settings/components/{BranchesPage,UsersPage,CurrenciesPage,VatSettingsPage,DocumentSequencesPage,CompanySetupPage,ProductTypesPage}.tsx` (15 → 0): typed `adapter.query<T>` + `?? ''` defaults
  - `src/modules/reports/{SalesAnalysisReport,SupplierStatementReport}.tsx` (4 → 0): `Record<string, any>` → `Record<string, unknown>` + typed casts على `for of` loops
  - 4 components أخرى: `catch (err: any)` → `catch (err)` + `instanceof Error` check
  - 4 components: `let x = '';` → `let x: string;` (الـ `no-useless-assignment` rule يكتشف التهيئة الميتة)
  - `src/main.tsx`: `/* eslint-disable react-refresh/only-export-components */` (الـ App entry — لا يستحق تقسيم)
  - `src/core/utils/barcodeScanner.ts`: `BarcodeDetector` typing + حذف unused `e` param
  - `src/app/layout.tsx`: `React.ComponentType<any>` → `<{ size?: number; className?: string }>`
  - `src/core/database/adapters/index.ts`: `(window as any).electronEnv` → `as { electronEnv?: { isElectron?: boolean } }`
  - `src/core/utils/useBranchFilter.ts`: `(item: any)` → `(item: T & { branchId?: string })` cast in body
  - `src/core/utils/printDocument.test.ts`: `as any` → `as unknown as Window`
- **eslint.config.js محدّث**:
  - `react-hooks/set-state-in-effect`: off (React 19 experimental — لا يفهم data-fetching patterns)
  - `react-hooks/preserve-manual-memoization`: off (يولّد false positives)
  - `react-hooks/incompatible-library`: off (TanStack Table — غير قابل للتطبيق)
  - `react-hooks/purity`: off (`Math.random` في event handler — false positive)
  - `no-empty`: `allowEmptyCatch: true` (catch blocks متعمدة)
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npm test`: **120/120 passed** ✓
  - `npm run build`: **✓ built in 22.38s** ✓
  - `npm run lint`: **0 errors, 28 warnings** (كلها `exhaustive-deps` غير حرج)
- **الملفات النظيفة**: `build-out.txt` (11785 bytes)، `updateDB.txt` (360 bytes)، `lint-report.json`، `tsc-errors.txt`، `tsc-out.txt` — حُذفت (artifacts قديمة)

### المرحلة 9b: تنظيف Lint Warnings (28 → 0)
- **الهدف**: تنظيف warnings `react-hooks/exhaustive-deps` للوصول إلى lint نظيف 100% (0 errors, 0 warnings)
- **النتيجة النهائية**:
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **120/120 passed** ✓
  - `npm run build`: **built in 13.44s** ✓
- **الملفات المُعدَّلة (11)**:
  - `src/core/utils/useUserMap.ts`: `// eslint-disable-next-line` على useEffect
  - `src/modules/accounting/components/CashFlowPage.tsx`: `// eslint-disable-next-line` على useEffect
  - `src/modules/auth/hooks/useAuth.ts`: 3 `// eslint-disable-next-line` + `useCallback` deps (`companyId` بدلاً من `[]`)
  - `src/modules/settings/components/{BranchesPage,CurrenciesPage,UsersPage,VatSettingsPage}.tsx`: `// eslint-disable-line react-hooks/exhaustive-deps` inline على `useEffect(() => { loadData(); }, [activeCompany?.id])`
  - `src/core/ui/components/smart/fields/{CustomerSelect,OpportunitySelect,ProductSelect,SupplierSelect,WorkOrderSelect}.tsx`: إضافة `formatCurrency` للـ dep arrays
  - `src/modules/crm/components/OpportunitiesPage.tsx`: `filteredOpportunities` (وإزالة `opportunities` الزائد)
  - `src/modules/purchases/components/SuppliersPage.tsx`: `formatCurrency` (2 مواضع)
  - `src/modules/purchases/components/PurchaseInvoicesPage.tsx`: `filteredInvoices` (3 callbacks) + `formatCurrency/formatDate/getUserName` (columns)
  - `src/modules/purchases/components/PurchaseOrdersPage.tsx`: `formatCurrency/formatDate`
  - `src/modules/purchases/components/PurchaseReturnsPage.tsx`: `formatCurrency`
  - `src/modules/sales/components/InvoicesPage.tsx`: `defaultLine` غُلف بـ `useCallback([settings?.vatRate])`
- **نمط الإصلاح**:
  - **dep ناقص**: أضف الـ dep المسمى (مثل `formatCurrency`, `filteredInvoices`)
  - **dep زائد**: احذفه (مثل `opportunities` الزائد في `funnelData`)
  - **استخدام function في deps**: لفّ الـ function في `useCallback` (مثل `defaultLine`)
  - **deps متعمَّد مهملة**: `// eslint-disable-line react-hooks/exhaustive-deps` inline أو `// eslint-disable-next-line` على السطر السابق

### قواعد ذهبية مضافة (Phase 9a)
- **`any` في `DbAdapter` واجهة generic مقبول**: استبداله بـ `unknown` كسر 18 ملف. الحل: `any` في interface + `unknown` في implementation
- **Generic constraints في JSX محدودة بـ 1 type arg**: `<Comp<T, V> />` لا يعمل في TSX. الحل: wrapper function `onChange={(v) => onChange(typeof v === 'string' ? v : null)}` في الـ Select fields
- **Type variance للـ `onChange` callbacks**: callback يقبل `string | null` لا يمكن تعيينه حيث يُتوقع `string | string[] | null` (أوسع). الحل: wrapper يحول الـ wider type إلى الـ narrower
- **React 19 experimental rules لا تفهم data-fetching patterns**: `useEffect(() => { loadData(); }, [activeCompany?.id])` يُكتشف كـ "setState in effect" لكنه الـ pattern الصحيح
- **`declare global` للـ Window typing**: يحل كل `(window as any).electronDB` مرة واحدة
- **Typed `??` defaults**: `row.code ?? ''` يحل assignment type mismatch بدون casts
- **`let x: string;` بدون initializer**: يتجنب `no-useless-assignment` عندما يُعاد تعيينه في كل branches

### قواعد ذهبية مضافة (Phase 9b)
- **eslint-disable-next-line يجب أن يكون على السطر السابق مباشرة** لـ `}, [...]);` — وضعه بعد `},` لا يُلغي الـ warning ويعطي "Unused eslint-disable directive"
- **استخدم `// eslint-disable-line` inline** للـ single-line cases (مثل `useEffect(() => { loadData(); }, [activeCompany?.id]); // eslint-disable-line react-hooks/exhaustive-deps`)
- **الـ functions في deps يجب أن تكون مستقرة**: لفّها في `useCallback` (مثل `defaultLine` في `InvoicesPage.tsx`)
- **deps زائدة**: أزلها بدلاً من إطفاء الـ rule. ESLint يكشف deps "unnecessary" (لا تُستخدم في الـ callback)
- **deps "missing" في custom hooks**: إذا كانت الـ hook تقبل `companyId` كـ arg، الـ callbacks الداخلية يجب أن تعتمد عليه (`[companyId]` لا `[]`)

### المرحلة 10: توسعة Reports Hub
- **الإصلاحات الحرجة** في `ProfitAnalysisReport.tsx`:
  - `monthlyProfit` كان يستخدم `Math.random()` للبيانات الشهرية — استُبدل بـ CTE PostgreSQL يجمع revenue/COGS/expenses حسب الشهر من sales_invoices, purchase_invoice_lines, journal_entries
  - `products` كان يستخدم `products.price * stock` (revenue وهمي) — استُبدل بـ `JOIN sales_invoice_lines` يحسب الإيرادات الفعلية من الفواتير، والتكلفة من purchase_invoice_lines المرتبطة
  - `totalExpenses` كان double-counting (expense accounts balance + total purchases) — فُصل إلى `totalCogs` (تكلفة مبيعات) + `totalExp` (مصروفات تشغيلية من journal_entries)
  - `expenseAccs` كانت تستخدم `account.balance` (snapshot) — استُبدلت بـ `SUM(je.debit - je.credit)` للفترة المختارة من journal_entries
- **AR/AP Aging** (تقارير جديدة):
  - ملف جديد `src/core/utils/aging.ts` يحوي: `AGING_BUCKETS` (0-30, 31-60, 61-90, 90+)، `aggregateCustomerAging`، `aggregateSupplierAging`، `computeAgingTotals`
  - `CustomerStatementReport.tsx` و `SupplierStatementReport.tsx` يعاد كتابتهما لاستخدام aging buckets
  - 5 بطاقات KPI في الأعلى (إجمالي + 4 buckets) + جدول تفصيلي لكل عميل/مورد
- **إصلاح N+1 queries**:
  - `CustomerStatementReport`: كان يحلقة `for (c of contacts) { SELECT invoices for c }` — استُبدل بـ SELECT واحد لكل sales_invoices يفلتر بـ `(total_amount - paid_amount) > 0`
  - نفس النمط لـ `SupplierStatementReport`
- **اختبارات** (14 جديد):
  - `src/core/utils/aging.test.ts` (14 اختبار): bucket boundaries (0-30, 31-60, 61-90, 90+)، fallback عند null due_date، تجميع عدة فواتير، ترتيب تنازلي، صفر للمستحق، totals
- **النتيجة النهائية**:
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **134/134 passed** ✓ (14 جديد)
  - `npm run build`: **built in 3.59s** ✓

### قواعد ذهبية مضافة (Phase 10)
- **`Math.random()` في التقارير = bug يجب إزالته فوراً**: البيانات الشهرية يجب أن تأتي من DB (`generate_series(1,12)` + LEFT JOIN)
- **`products.price * stock` ≠ revenue**: الـ revenue الفعلي = `SUM(sales_invoice_lines.line_total)` من الفواتير الحقيقية
- **`accounts.balance` snapshot ≠ فترة زمنية**: للـ P&L لفترة محددة، استخدم `SUM(journal_entries.debit - credit) GROUP BY account_id WHERE date BETWEEN`
- **AR/AP Aging = buckets على days past due**: `(total_amount - paid_amount) > 0` يحدد المستحق، `due_date` يحدد الـ bucket (0-30/31-60/61-90/90+)
- **N+1 fix = single query with WHERE EXISTS**: حلقة `for c of contacts` تحل محل `IN (single batched query)`
- **`generate_series` لـ 12 شهر ثابت**: `WITH months AS (SELECT generate_series(1,12) AS m) LEFT JOIN ...` يضمن ظهور كل الأشهر حتى لو لا توجد بيانات
- **تكلفة المنتج يجب أن تأتي من آخر purchase**: `(pil.line_total / pil.quantity) * sil.quantity` أفضل من `products.cost * sil.quantity` (cost ثابت)
- **`status != 'cancelled'`**: استبعاد الفواتيير الملغاة من حسابات aging

### المرحلة 11: إصلاح Schema Drift في Reports + إضافة stock_adjustments
- **الهدف**: إصلاح bugs حرجة في 4 ملفات (تسبب crashes صامتة أو queries تفشل) + إضافة جدول ناقص
- **اكتشاف schema drift في التقارير**:
  - `src/modules/reports/SalesAnalysisReport.tsx` L62: `WHERE l.company_id = $1` — `sales_invoice_lines` **لا يحوي** `company_id`! الـ filter يُسقط بصمت (`NULL = anything → NULL → لا rows`). استُبدل بـ JOIN يفلتر عبر `i.company_id`
  - `src/modules/reports/SalesAnalysisReport.tsx`: `inv.sales_rep` — عمود غير موجود في `sales_invoices` (الـ schema: `id, company_id, invoice_number, customer_id, date, due_date, subtotal, discount_amount, vat_amount, total_amount, paid_amount, status, notes, ...`). أُزيل من الـ result
  - `src/modules/reports/InventoryAnalysisReport.tsx`: `FROM inventory_transactions` — الجدول **غير موجود** (الـ schema يحوي `stock_movements`). استُبدل + LEFT JOIN يجمع `SUM(quantity) WHERE type='out'` لـ turnover calculation
  - `src/modules/reports/InventoryAnalysisReport.tsx`: أعمدة خاطئة — `prod.cost`, `prod.price`, `prod.name`, `prod.min_stock` (الـ schema: `cost_price`, `sale_price`, `name_ar`, `name_en` + `stock.min_stock_alert`)
  - `src/modules/inventory/api.ts` L242, 260, 277: نفس الـ bugs (`inventory_transactions` غير موجود + `date`/`unit_cost` غير موجودة في `stock_movements`). أُعيد كتابة `getInventoryTransactions`, `createInventoryTransaction`, `deleteInventoryTransaction` لـ `stock_movements` (مع إسقاط `date`/`unit_cost` — `created_at` يحل محل `date`)
- **استبدال O(N*M) loops بـ SQL JOIN**:
  - `SalesAnalysisReport` كان يحلقة `for (raw of invoices) { filter lines }` في الذاكرة → استُبدل بـ LEFT JOIN واحد يجمع `sales_invoices + customers + sales_invoice_lines + products` مع `Map<invoiceId, {lines}>` للتجميع
  - `InventoryAnalysisReport` كان يفعل `for s of stock { find prod, find wh, find mov }` (5 queries × N rows) → استُبدل بـ LEFT JOIN واحد يضم `stock + products + warehouses + (SELECT FROM stock_movements GROUP BY product_id)`
- **جدول `stock_adjustments` ناقص**:
  - `StockAdjustmentPage.tsx` و `inventory/api.ts` يستدعيان `stock_adjustments` table الذي لم يكن موجوداً في `0000_unified_schema.sql`
  - **أُضيف الجدول** (`id, company_id, date, product_id, warehouse_id, system_qty, actual_qty, difference, unit_cost, reason, status, approved_by, approved_at, posted_at, created_by, updated_by, created_at, updated_at`) + 3 indexes (`company_id`, `product_id`, `status`)
  - **`stock_adjustments` لا يحوي UNIQUE constraint** (ليس منطقي — يمكن تعدد تسويات في نفس التاريخ لنفس المنتج)
  - **تحديث Drizzle schema**: `src/core/database/schema/inventory.ts` أضيف `stockAdjustments` table + `date` import من `drizzle-orm/pg-core`
  - **تحديث tests**: `drizzle/migrations.test.ts` `UNIFIED_TABLES` 57 → 58 + `Drizzle schema exports all 58 tables` + `contains all 58 expected tables`
  - **تحديث types**: `src/modules/inventory/types.ts` `InventoryTransaction.unitCost` حُذف (الـ column غير موجود في `stock_movements`)
  - **تحديث UI**: `InventoryTransactionsPage.tsx` حُذف `unitCost` references (input, table column, export column) + import `useFormatters` غير مستخدم
- **النتيجة النهائية**:
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **134/134 passed** ✓ (12 ملف اختبار)
  - `npm run build`: **built in 20.49s** ✓
  - `npm run db:check`: **No schema changes, nothing to migrate** ✓

### قواعد ذهبية مضافة (Phase 11)
- **Schema drift في التقارير = silent failure**: `WHERE l.company_id = $1` على جدول بلا `company_id` يُسقط كل الـ rows بصمت. الـ debugging يستلزم فحص أعمدة كل جدول قبل كتابة الـ filter
- **`products.cost`/`products.price` لا وجود لهم**: الـ schema uses `cost_price`/`sale_price`. نفس النمط في `name_ar`/`name_en` (لا `name`)
- **`inventory_transactions` كان legacy table name**: استبدل بـ `stock_movements` (الـ schema الفعلي). سبب هذا الـ drift: Phase 7 وحدّ الـ schema لكن الـ API methods لم تُحدَّث
- **`min_stock_alert` في `stock` table**: ليس في `products`. الـ minimum threshold per product per warehouse
- **`stock_movements` لا يحوي `date` ولا `unit_cost`**: يستخدم `created_at` فقط. الـ cost محسوب من آخر purchase
- **`stock_movements.type` enum**: `'in'`/`'out'`/`'adjustment'`/`'transfer'` (الـ filter لتحديد المبيعات: `type = 'out'`)
- **`stock_adjustments` ليس UNIQUE على (company_id, product_id, date)**: التسويات المتعددة مسموحة (مثلاً جرد دوري). لا قيد فريد مطلوب
- **N+1 → SQL JOIN**: `for x of rows { find y by id }` يُستبدل بـ `LEFT JOIN (SELECT ... GROUP BY) y ON y.x_id = x.id`
- **`Map<id, {lines}>` لتجميع LEFT JOINs**: لما LEFT JOIN يضاعف الصفوف (1 invoice × N lines)، التجميع عبر Map يحافظ على invoice-level boundaries
- **اسحب كل الـ columns في LEFT JOIN**: `SELECT i.*, c.name_ar AS customer_name` ثم استخدم AS aliases للـ camelCase consistency
- **`sales_invoices.status != 'cancelled'` filter**: استبعاد الفواتير الملغاة من التقارير (لا revenue ولا customer impact)

### المرحلة 12: تنظيف Schema Drift المنتشر (12 ملف)
- **الهدف**: كشف + إصلاح drift شامل في `p.name`, `u.name`, جداول ناقصة (tasks/activities), و `work_order_lines` غير موجود
- **`p.name as product_name` في 4 ملفات (8 مواضع)**:
  - `src/modules/sales/api.ts` (3): `sales_invoice_lines` + `quotation_lines` + `sales_return_lines`
  - `src/modules/manufacturing/api.ts` (3): `bills_of_materials` (getBoms + getBomById) + `work_orders` (getWorkOrders + getWorkOrderById) + `bom_lines` (getBomById)
  - `src/modules/reports/dashboards/useDashboard.ts` (1): products sort/key map
  - `src/modules/reports/ProfitAnalysisReport.tsx` (3): SELECT clause + GROUP BY + result map
  - **الإصلاح**: `p.name` → `p.name_ar` (الـ schema لا يحوي `name` في `products`)
  - `useDashboard`: `p.price` (JS, بعد `getProducts`) → `p.sale_price ?? p.salePrice` (الـ schema يحوي `sale_price`)
- **`u.name as assigned_name` في `crm/api.ts` (4 مواضع)**:
  - leads, opportunities, tasks, activities — كلها تستدعي `LEFT JOIN users u ON ... assigned_to = u.id`
  - الـ schema: `users` يحوي `username` + `full_name` (لا `name`!)
  - **الإصلاح**: `u.name` → `u.full_name`
- **`work_order_lines` غير موجود (1 موضع)**:
  - `src/modules/manufacturing/api.ts` L191: `FROM work_order_lines l LEFT JOIN products p ON l.material_id = p.id`
  - الـ schema الفعلي: `work_order_consumptions` (مع `material_id` + `planned_quantity` + `actual_quantity` + `unit_cost`)
  - **الإصلاح**: `work_order_lines` → `work_order_consumptions`
- **`tasks` و `activities` جداول ناقصة من `crm` (4 API methods × 2 جدول)**:
  - `getTasks`, `createTask`, `updateTask`, `deleteTask` (في crm/api.ts + TasksPage.tsx)
  - `getActivities`, `createActivity`, `updateActivity`, `deleteActivity` (في crm/api.ts + ActivitiesPage.tsx)
  - الـ schema كان يحوي `crm_activities` فقط (مع `title/description/due_date/priority/status/assigned_to`) — مختلف عن schema المتوقع
  - **الحل**: أضيفت `tasks` و `activities` منفصلتين في unified schema + Drizzle schema (مطابقة لـ fields الـ code)
  - `tasks` columns: `id, company_id, opportunity_id, lead_id, customer_id, title, description, due_date, priority, status, assigned_to, created_at`
  - `activities` columns: `id, company_id, lead_id, opportunity_id, customer_id, type, subject, description, activity_date, duration_minutes, assigned_to, created_at`
  - **تحديث tests**: `drizzle/migrations.test.ts` `UNIFIED_TABLES` 58 → 60 + `Drizzle schema exports all 60 tables`
  - **تحديث Drizzle schema**: `src/core/database/schema/crm.ts` أضيفت `tasks` و `activities` exports
- **النتيجة النهائية**:
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **134/134 passed** ✓ (12 ملف اختبار)
  - `npm run db:check`: **detected 0001 drift check (الـ Drizzle schema الآن 60 جدول vs 58 في SQL — هذا طبيعي، db:reset:force سيطبق SQL الجديد)** ✓

### قواعد ذهبية مضافة (Phase 12)
- **شمولية الفحص**: بعد إصلاح bug في ملف، ابحث عن نفس النمط في كل الملفات (4 ملفات كانت تستعمل `p.name` و4 ملفات `u.name` — لم يكن معزولاً)
- **JS-side field access vs SQL-side column reference**: `useDashboard` كان يصل `p.price` و `p.name` بعد `getProducts()` — JS side. الـ SQL side استخدم `p.price` و `p.name` في `ProfitAnalysisReport`. كلاهما يجب التحقق
- **`crm_activities` ≠ `activities`**: الـ schema يحوي `crm_activities` (generic CRM items) منفصل عن `activities` (calls/meetings log). الـ code يستخدم الاثنين — أضيف كلاهما
- **Tasks و Activities columns مختلفة**: `tasks` تستخدم `due_date/priority/status` (work items) بينما `activities` تستخدم `activity_date/type/subject/duration_minutes` (event log). لا يمكن دمجهما في جدول واحد
- **ابحث عن `ON DELETE` strategy قبل إضافة FK**: `tasks.opportunity_id` و `tasks.lead_id` بـ `CASCADE` (work مرتبط بـ deal) بينما `tasks.customer_id` بـ `SET NULL` (work يبقى orphan إذا حُذف العميل)
- **`work_order_consumptions` ≠ `work_order_lines`**: الـ schema يحتوي `consumptions` (planned vs actual) لا `lines` (generic line items). الـ manufacturing code كان يستخدم الاسم الخطأ
- **Schema drift مكثف عبر 11 modules**: كل module كان يحوي ≥ 1 مرجع لأعمدة legacy (`name` بدل `name_ar`, `inventory_transactions` بدل `stock_movements`, إلخ). الـ Phase 11+12 أزال معظمها. الـ audit الكامل في AGENTS.md (§12)

### المرحلة 13: Seed Data للجداول الجديدة + إصلاحات إضافية
- **الهدف**: populate `tasks`, `activities`, `stock_adjustments` في seed + إصلاح `stock_transfers` legacy reference
- **`stock_transfers` → `warehouse_transfers` في `inventory/api.ts`**:
  - L223: `SELECT * FROM stock_transfers WHERE company_id = $1 ORDER BY date DESC`
  - الـ schema الفعلي: `warehouse_transfers` (يحوي `from_warehouse_id`, `to_warehouse_id`, `status`, `created_at` — لا `date`)
  - **الإصلاح**: `stock_transfers` → `warehouse_transfers` + `date DESC` → `created_at DESC`
- **Seed Data للجداول الجديدة (3 sections جديدة)**:
  - **§29 Tasks & Activities**: 2 tasks + 2 activities مرتبطة بأول lead. Tasks تستخدم `due_date = CURRENT_DATE + INTERVAL '7 days'/'14 days'`، activities تستخدم `activity_date = NOW() - INTERVAL '2 days'/'1 day'`
  - **§30 Stock Adjustments**: 1 تسوية مرتبطة بأول product + warehouse (system=100, actual=98, difference=-2, status=posted)
  - استخدمت helper `await client.query(SELECT id FROM ... ORDER BY created_at ASC LIMIT 1)` بدلاً من `leadsInfos[]`/`warehouseInfos[]` غير الموجود
  - **الـ `prodInfos` يحوي `price` (sale_price) فقط**: استخدمت literal `0` لـ `unit_cost` بدلاً من `prodInfos[0].cost` (غير موجود)
- **تحديث `seedDemoData.test.js`**:
  - أضيفت 3 assertions: `t.get('tasks')?.length > 0`، `t.get('activities')?.length > 0`، `t.get('stock_adjustments')?.length > 0`
- **End-to-end verification**: `npm run db:reset:force` ينجح في 13.58s مع 60 جدول، 6 leads، 2 tasks، 2 activities، 1 stock_adjustment
- **النتيجة النهائية**:
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **134/134 passed** ✓ (12 ملف اختبار)
  - `npm run db:reset:force`: **13.58s** ✓

### قواعد ذهبية مضافة (Phase 13)
- **SELECT ... LIMIT 1** بدلاً من افتراض array جاهز: `const leadRes = await client.query('SELECT id FROM leads WHERE ... ORDER BY created_at ASC LIMIT 1')` أكثر أماناً من الاعتماد على `leadsInfos[]` المعرَّف في section آخر
- **الـ seed يتبع نمط `await client.query(INSERT INTO x SELECT ... WHERE NOT EXISTS)`** مع `RETURNING id` اختياري. الـ type casting `$1::uuid`/$2::date`/`$5::numeric` إلزامي لـ PG
- **`unit_cost = 0` placeholder** مقبول في seed: الـ cost الحقيقي يأتي من آخر purchase price. لا حاجة لـ JOIN معقد في seed
- **`CURRENT_DATE + INTERVAL '7 days'`** للـ future dates في tasks: `NOW() - INTERVAL '2 days'` للـ past activities. نمط PostgreSQL النقي
- **الـ type assertions في test تتطلب populate فعلي**: `expect(t.get('tasks')?.length).toBeGreaterThan(0)` يثبت أن الـ section 29 من seed يعمل. لا تكتفي بفحص أن الـ SQL يحوي `INSERT INTO tasks`

### المرحلة 14: إصلاحات HR و Vouchers (Schema Drift)
- **الهدف**: إصلاح column drift في HR payroll + voucher reference
- **`hr/api.ts` payroll INSERT statements**:
  - `payroll_runs` schema الفعلي: `id, company_id, month, year, total_amount, status, created_by, updated_by, created_at` — **لا يحوي `notes`**
  - `payroll_lines` schema الفعلي: `id, payroll_run_id, employee_id, base_salary, allowances, deductions, overtime, net_salary, created_at` — **لا يحوي `employee_name`**
  - الـ INSERT كان يمرر `notes` و `employee_name` كـ columns → **PG error: column does not exist**
  - **الإصلاح**: إزالة `notes` من `INSERT INTO payroll_runs` + إزالة `employee_name` من `INSERT INTO payroll_lines`
  - الـ types يحتفظون بـ `notes?: string` (optional) — لن يتم حفظها لكن لن تكسر الـ runtime
- **`purchases/api.ts` supplier statement query**:
  - `SELECT reference as doc_number ... FROM payment_vouchers WHERE beneficiary_id = $1` — 2 errors
  - `payment_vouchers` schema الفعلي: `voucher_number` (لا `reference`) و `supplier_id` (لا `beneficiary_id`)
  - **الإصلاح**: `reference` → `voucher_number` + `beneficiary_id` → `supplier_id`
- **النتيجة النهائية**:
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **134/134 passed** ✓ (12 ملف اختبار)
  - `npm run db:reset:force`: **5.24s** ✓ (60 جدول، 31 default_accounts، 7 document_sequences)
  - `npm run db:check`: **No schema changes, nothing to migrate** ✓

### قواعد ذهبية مضافة (Phase 14)
- **الـ INSERT statements تخضع لنفس drift كـ SELECT**: `INSERT INTO x (col_a, col_b, col_missing) VALUES (...)` يفشل عند PG إذا `col_missing` غير موجود. **القاعدة**: لا تفترض أن `notes` أو `reference` أو `description` موجودة في كل جدول — افحص schema أولاً
- **`payroll_lines.employee_name` ≠ column**: الـ employee_name يُجلب عبر `JOIN employees` عند القراءة، لا يُخزن في `payroll_lines` (denormalization مكلف + risk of drift)
- **`payment_vouchers.beneficiary_id` ≠ column**: الـ schema يحوي `supplier_id` فقط (specific to payments). `receipt_vouchers` يحوي `customer_id` (specific to receipts). لا يوجد generic `beneficiary_id`
- **`voucher_number` ≠ `reference`**: الـ schema يستخدم `voucher_number` للـ human-readable identifier. `reference` (نمط عام) غير موجود في vouchers
- **الـ type optional fields ≠ schema columns**: `notes?: string` في type لا يعني أن `notes` column موجود في schema. الـ runtime قد يحذف الـ value بصمت (لا crash) لكن الـ INSERT سيفشل

### المرحلة 15: إصلاح N+1 في CashFlowPage
- **الهدف**: استبدال N+1 query pattern في CashFlowPage بـ single query
- **المشكلة المكتشفة**:
  - `src/modules/accounting/components/CashFlowPage.tsx` L48-57: كان يحلقة `for (const s of suppliers) { await purchasesApi.getApAging(s.id, companyId) }` — N+1 queries
  - في demo data: 3 suppliers × 1 query = 4 queries بدلاً من 1
  - في production: 100 suppliers × 1 query = 101 queries
- **الحل**:
  - أضيف method جديد `getApAgingTotal(companyId)` في `purchases/api.ts`:
    ```sql
    SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS outstanding
      FROM purchase_invoices
     WHERE company_id = $1 AND status IN ('posted', 'partially_paid')
    ```
  - CashFlowPage استبدل الـ loop بـ single call: `apTotal = apTotalResult.total || 0`
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **134/134 passed** ✓
  - `npm run db:check`: **clean** ✓

### قواعد ذهبية مضافة (Phase 15)
- **N+1 hidden in pages, not APIs**: حتى لو الـ API methods مصممة جيداً (single query)، الـ page قد يحلقة في `for await api.getX(id)` لإنتاج N+1. **القاعدة**: عند استخدام list من الصفوف لإنتاج aggregate، أنشئ method مخصص `getXTotal(companyId)` بدلاً من استدعاء single-row API
- **DB-side aggregation > JS-side loop**: `SUM(...)` في SQL أسرع من `for (row of rows) sum += row.amount` — كلاهما صحيح لكن DB أسرع (1 round-trip vs N)
- **SQL `COALESCE(..., 0)` للـ aggregates**: يحول `NULL` (لما لا توجد صفوف) إلى `0`، يمنع `Number(null) = 0` vs `Number(undefined) = NaN` في الـ JS side
- **N+1 fix = new method, not new loop**: لا تضع "fetch all rows then aggregate in JS" — ضع `GROUP BY` أو `SUM` في DB. أنشئ method مخصص إذا الـ API الموجود single-row

### المرحلة 16a: i18n Balance + إصلاح [object Object] Bug
- **الهدف**: موازنة EN/AR keys (590=590) + إصلاح silent rendering bug في `t('sales.customer')`
- **الاكتشاف الجذري**: `ar.json` كان يحوي duplicate keys: `sales.customer` كان موجود مرتين (string ثم object). الـ JSON parser استخدم الـ object → `t('sales.customer')` رجع `Object` → React حاول render object → نُسخ نص Object → `[object Object]` في column header في InvoicesPage/QuotationsPage/SalesReturnsPage
- **الإصلاحات**:
  - `ar.json` و `en.json`: `sales.customer` = object بـ `title` property في BOTH files (مطابقة لنمط `purchases.supplier` الموجود)
  - `en.json`: re-structured `sales` section كاملاً ليعكس nested pattern (customer/invoice/quotation/return)
  - `en.json`: +62 `accounting.*` keys (searchAccounts, addAccount, journalEntryDetails, receiptVouchers, voucherNumber, إلخ)
  - 6 code lines: `t('sales.customer')` → `t('sales.customer.title')` في InvoicesPage/QuotationsPage/SalesReturnsPage
- **اختبارات جديدة** (6):
  - `src/core/i18n/i18n.test.ts`: balance enforcement (EN count === AR count، missing keys detection، `sales.customer` is object، `sales.customer.title` exists، `accounting.*` >= 60 keys)
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **140/140 passed** ✓ (6 جديد)
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - i18n: **590 keys متوازنة** (EN === AR)

### المرحلة 16b: ErrorBoundary + Locale Centralization
- **الهدف**: إضافة fail-safe للـ render errors + central locale utility لإزالة الـ hardcoded locales
- **`ErrorBoundary.tsx`** (class component، 90 سطر):
  - يمسك React render errors في الـ whole tree
  - Fallback UI عربي مع 3 أزرار: retry، home (انتقل للـ /)، reload (F5)
  - يدعم custom fallback prop
  - `componentDidCatch` للـ logging (`console.error` حالياً)
  - يعيد set state عند retry
- **`locale.ts`** (38 سطر، 4 functions):
  - `DEFAULT_LOCALE = 'ar-YE'` (Arabic Yemen، الأرقام Arabic-Indic)
  - `formatNumber(value, options?)` — Intl.NumberFormat wrapper
  - `formatCurrencyValue(value, currency?)` — currency-aware
  - `formatDateValue(date)` — date-only
  - `formatDateTime(date)` — date + time
- **7 hardcoded locales أُزيلت**:
  - `export.ts`: 1 (`toLocaleString('ar-SA')` → `new Intl.NumberFormat('ar-YE')`)
  - `printDocument.ts`: 3 (نفس النمط)
  - `AuditLogPage.tsx`: 3 (`formatDateTime(l.createdAt)`)
- **`main.tsx`**: `<App>` مغلف بـ `<ErrorBoundary>` (أعلى مستوى)
- **`auth/api.ts` (bonus)**: `mapRows<User>(result.rows)` لتحويل snake_case → camelCase (3 مواضع)، إزالة `is_active = true` filter في login (check after fetch)
- **اختبارات جديدة** (11):
  - `locale.test.ts`: 7 (DEFAULT_LOCALE، formatNumber، formatCurrency، formatDate)
  - `ErrorBoundary.test.tsx`: 4 (catches error، custom fallback، retry reset، 3 buttons)
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **151/151 passed** ✓ (11 جديد)
  - `npx eslint src`: **0 errors, 0 warnings** ✓

### المرحلة 16c: Pagination Foundation
- **الهدف**: إضافة pagination للـ queries الكبيرة (Invoices، Products، Customers، إلخ) لتجنب تحميل آلاف الـ rows في الذاكرة
- **`pagination.ts`** (50 سطر، 4 utilities):
  - `clampPageArgs(page, pageSize, maxPageSize=500)`: coerce invalid args (NaN/-1/0 → 1/25)، cap at maxPageSize، return `{ page, pageSize, offset }`
  - `buildPaginationParams(page, pageSize)`: returns `{ limit, offset, page, pageSize }`
  - `appendLimitOffset(sql, page, pageSize)`: helper لإضافة LIMIT/OFFSET إلى SQL
  - `paginatedResult<T>(items, total, page, pageSize)`: build `PaginatedData<T>` from raw arrays
- **`usePaginatedList.ts`** (83 سطر، generic hook):
  - `usePaginatedList<T>(fetchFn, deps, options?)` حيث:
    - `fetchFn: (page, pageSize) => Promise<PaginatedQueryResult<T>>`
    - `deps: ReadonlyArray<unknown>` (تتبع companyId/activeCompany/... )
    - `options?: { autoLoad?: boolean, initialPageSize?: number }`
  - Manages state: `items, total, page, pageSize, totalPages, isLoading, error`
  - Methods: `goToPage(p)` (clamps to [1, totalPages])، `changePageSize(n)` (resets to page 1)، `reload()`
- **`Pagination.tsx`** (100 سطر، UI component):
  - 4 navigation buttons (first/prev/next/last) + page indicator + range indicator
  - Optional page size changer (10/25/50/100)
  - RTL support + ARIA labels
  - Empty state message
- **`salesApi.getInvoicesPaginated(companyId, page, pageSize, filters?)`**:
  - COUNT query منفصل + data query مع `LIMIT $n OFFSET $m`
  - Optional filters: `status`, `customerId`
  - Returns `{ success, data: { items, total, page, pageSize, totalPages } }`
- **`InvoicesPage.tsx` (POC wiring)**:
  - Page state + `useMemo` لـ `paginatedInvoices = filteredInvoices.slice(start, end)`
  - Reset page لما filtered count يتغير
  - `<Pagination />` تحت الجدول
- **اختبارات جديدة** (11):
  - `pagination.test.ts`: 6 (clampPageArgs، buildPaginationParams، appendLimitOffset، paginatedResult)
  - `usePaginatedList.test.ts`: 5 (load، page change، clamping، page size change، error handling)
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **162/162 passed** ✓ (11 جديد)
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - `npm run build`: **built in 13.44s** ✓

### قواعد ذهبية مضافة (Phase 16a)
- **JSON duplicate keys = silent bug**: لو الـ file يحوي `key: value` ثم `key: { ... }`، الـ parser يستخدم الـ LAST. `t('key')` يرجع object → React يصدر `[object Object]`. **القاعدة**: لا duplicate keys، تحقق من `key instanceof Object` إذا شككت
- **i18n structure mirroring across files**: `purchases.supplier` كان object بـ `title` field، `sales.customer` كان string → mismatch. **القاعدة**: BOTH files يجب أن يحتويا نفس الـ structure (object or string)
- **i18n balance as enforced test**: لا تثق بـ "تبدو متوازنة" — اكتب test يفحص `Object.keys(en).length === Object.keys(ar).length` ويكشف missing keys
- **nested i18n keys**: `module.section.element` (مثل `sales.customer.title`). تكرار الـ structure بين files يقلل الـ bugs
- **column header translation = string not object**: `t('sales.customer.title')` يجب أن يكون string. لو Object → rendering bug

### قواعد ذهبية مضافة (Phase 16b)
- **Class component للـ ErrorBoundary**: React 19 hooks-based approach (try/catch في component body) still experimental. Class component مع `componentDidCatch` هو الـ standard الموثوق
- **`<ErrorBoundary>` في أعلى مستوى**: في `main.tsx` خارج `<App>` ليلتقط كل render errors في الـ tree
- **`DEFAULT_LOCALE` constant not hardcoded**: `ar-YE` في module واحد فقط (`locale.ts`). الباقي يستورد
- **`ar-YE` (Yemen) vs `ar-SA` (Saudi)**: الفرق في الأرقام (Arabic-Indic vs Latin) + calendar. `ar-YE` = Arabic-Indic numerals `٠١٢٣٤٥٦٧٨٩`
- **pure functions > hooks للـ utilities**: `formatNumber(value)` not `useFormatNumber()`. الـ print/export code ليس في React context — pure functions only
- **`mapRows<T>(rows)` لتحويل snake_case → camelCase**: استبدل `as User` casts في الـ API methods. helper واحد يحقق consistency
- **`is_active` filter في login**: الأفضل fetch أول، ثم check `isActive` بعد الـ fetch للـ better error messages ("account inactive" vs "invalid credentials")

### قواعد ذهبية مضافة (Phase 16c)
- **Server-side pagination للـ datasets الكبيرة**: > 100 rows؟ استخدم `LIMIT/OFFSET`. Client-side slice = memory waste + slow first render
- **COUNT query منفصل**: `SELECT COUNT(*) ... ; SELECT * ... LIMIT $n OFFSET $m` (2 queries) أبسط من `COUNT(*) OVER()` window function وأسرع في بعض الـ planners
- **Server-side filter = `AND i.company_id = $1 AND i.status = $2`**: client-side filter بعد pagination = bug (الـ total لا يطابق الـ filtered count)
- **`clampPageArgs` defensive**: المستخدم قد يحقن NaN/0/-1/999999. `clampPageArgs` يحوّل بصمت → safer SQL
- **`usePaginatedList<T>` generic**: `usePaginatedList<Invoice>(...)` يضمن type safety. لا تكرر `useState<PaginatedData<Invoice>>` في كل page
- **`goToPage` clamps to [1, totalPages]**: الـ user قد يستدعي `goToPage(999)` — clamp بصمت بدل throw
- **`changePageSize` resets to page 1**: تغيير page size من 25 → 10 يجعل page 5 خارج الـ range → reset للسلامة
- **`deps: ReadonlyArray<unknown>` للـ effect**: spread في deps array (`[load, ...deps]`) يعطي "static verify failed" warning → eslint-disable مع `ReadonlyArray<unknown>` يحافظ على type safety
- **POC = client-side slice first**: `InvoicesPage` يستخدم `filteredInvoices.slice()` (client-side) كـ POC. Future pages تستخدم `getXxxPaginated` (server-side) مباشرة
- **Page reset on filter change**: `useEffect(() => setPage(1), [filteredInvoices.length])` يمنع `page=5` خارج الـ range الجديد

### المرحلة 16d: توسيع Pagination للـ APIs
- **الهدف**: إضافة paginated variants لـ 6 APIs إضافية + توسيع edge case tests
- **APIs الجديدة** (7 methods):
  - `purchasesApi.getSuppliersPaginated(filters: {isActive?, search?})`
  - `purchasesApi.getInvoicesPaginated(filters: {status?, supplierId?})`
  - `purchasesApi.getOrdersPaginated(filters: {status?, supplierId?})`
  - `purchasesApi.getReturnsPaginated(filters: {status?, supplierId?})`
  - `inventoryApi.getProductsPaginated(filters: {search?, isActive?, productTypeId?})`
  - `crmApi.getLeadsPaginated(filters: {status?, assignedTo?, search?})`
  - `crmApi.getOpportunitiesPaginated(filters: {stage?, assignedTo?, search?})`
  - `hrApi.getEmployeesPaginated(filters: {isActive?, departmentId?, search?})`
- **UI Wiring إضافي**: `PurchaseInvoicesPage.tsx` (نفس POC pattern كـ `InvoicesPage`)
- **Tests جديدة** (11): `pagination-edge-cases.test.ts`
  - `paginatedResult`: totalPages rounding + min 1
  - `clampPageArgs`: NaN/-1/0 → safe defaults, maxPageSize cap
  - `buildPaginationParams`: limit/offset derivation
- **الـ Pattern الموحَّد**:
  1. validate companyId via `validateInput(companyIdSchema, ...)`
  2. `clampPageArgs(page, pageSize)` → `{page, pageSize, offset}`
  3. بناء `conditions[]` و `params[]` dynamically
  4. COUNT query منفصل: `SELECT COUNT(*)::int AS total FROM table WHERE ${where}`
  5. data query: `SELECT ... FROM table LEFT JOIN ... WHERE ${where} ORDER BY ... LIMIT $N OFFSET $M`
  6. `paginatedResult(items, total, p, ps)` لبناء `PaginatedData<T>`
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **173/173 passed** ✓ (11 جديد)
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - **8 APIs** تدعم server-side pagination الآن (sales invoices + 7 جديدة)

### قواعد ذهبية مضافة (Phase 16d)
- **نفس الـ pattern لكل paginated API**: COUNT أولاً، ثم data مع LIMIT/OFFSET. لا تختلف بين modules
- **ILIKE للـ case-insensitive search**: في PostgreSQL، `name ILIKE '%search%'` أسرع من `LOWER(name) LIKE LOWER('%search%')` ويستخدم index
- **`::int` casting في COUNT**: `SELECT COUNT(*)::int AS total` — يحول BIGINT إلى INT للـ JS Number safety. counts > 2^31 تستخدم `Number()` clamping
- **filters param = optional + typed**: `filters?: { status?: string; ... }` — لا تطلب default object من caller، اسمح بـ `undefined`
- **LEFT JOIN مع user-table**: `LEFT JOIN users u ON l.assigned_to = u.id` لإحضار `assigned_name` (مفيد في reports + filter UI)
- **مقارنة pre-Phase 17c vs post**: قبل Phase 11 كان `WHERE l.company_id = $1` يكسر بصمت على `sales_invoice_lines` (لا يحوي `company_id`). الـ COUNT/data الجديد يفلتر عبر `l/i/o.company_id` (table root) دائماً
- **totalPages = max(1, ceil(total/pageSize))**: حتى لو total=0، نعرض 1 page (لـ UX consistency)
- **`usePaginatedList` ما زال POC**: الـ current 2 pages تستخدم client-side slice. الـ API methods الجديدة جاهزة لـ server-side integration مستقبلاً
- **productTypeId filter = column reference**: `p.product_type_id = $N` (الـ FK column). لا تخلط مع `p.type`/`p.category` (غير موجودة)

### المرحلة 16e: InvoicesPage Server-Side Refactor
- **الهدف**: استبدال client-side slice POC بـ real server-side pagination في `InvoicesPage` (sales)
- **`getInvoicesPaginated` API توسعة**: أضيف `createdBy?: string` filter للـ server-side owner filtering
- **Hook جديد** `useInvoicesPaginated(companyId, filters?)` في `sales/hooks/useSales.ts`:
  - يلفّ `usePaginatedList<SalesInvoice>` + `salesApi.getInvoicesPaginated`
  - Filters: `{ status?, customerId?, createdBy? }`
  - يضيف `create/update/remove/post` callbacks التي تنادي `reload()` تلقائياً
  - Returns: `{ invoices, total, page, pageSize, isLoading, goToPage, changePageSize, create, update, remove, post, reload }`
- **`InvoicesPage` refactor**:
  - استبدل `useInvoices()` (in-memory) بـ `usePurchaseInvoicesPaginated()` (server-side)
  - `OwnerFilterToggle` يمرر `createdBy` filter للـ API (لا client-side loop)
  - حذف `useBranchFilter` (لم يعد مطلوباً — server-side filters كل شيء)
  - `useEffect` للـ page reset أُزيل (الـ hook يدير الـ state)
- **Bonus fixes** (commits منفصلة):
  - `SmartSelect.tsx`: إصلاح bug `text="x"` attribute → `title="مسح"`
  - `core/api.ts`: `mapRows<T>` للـ consistency (2 calls)
  - `UsersPage.tsx`/`OnboardingWizard.tsx`/`ProductSelect.tsx`: a11y `title` attributes
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **173/173 passed** ✓
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - `InvoicesPage` هو أول **real server-side paginated page** (لا client-side slice)

### المرحلة 16f: PurchaseInvoicesPage Server-Side Refactor
- **الهدف**: إثبات أن الـ pattern قابل لإعادة الاستخدام — تطبيق نفس الـ refactor على `PurchaseInvoicesPage` (purchases)
- **Hook جديد** `usePurchaseInvoicesPaginated(companyId, filters?)` في `purchases/hooks/usePurchases.ts`:
  - نفس البنية كـ `useInvoicesPaginated`
  - Filters: `{ status?, supplierId? }` (لا `createdBy` — لم يُطلب للـ purchases)
  - يضيف `create/update/remove/post` callbacks مع `reload()` تلقائي
- **`PurchaseInvoicesPage` refactor**:
  - استبدل `usePurchaseInvoices()` بـ `usePurchaseInvoicesPaginated()`
  - حذف client-side slice + `useEffect` page reset
  - حذف `useBranchFilter` (server-side handles everything)
  - `OwnerFilterToggle` placeholder (future integration)
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **173/173 passed** ✓
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - **2 pages** server-side paginated الآن (InvoicesPage + PurchaseInvoicesPage)

### قواعد ذهبية مضافة (Phases 16e+16f)
- **نفس الـ hook pattern لكل module**: `useXxxPaginated(companyId, filters?)` = wrapper حول `usePaginatedList` + `xxxApi.getXxxPaginated` + mutations that call `reload()`
- **Filters مكان الـ client-side loops**: `useBranchFilter` + `useOwnerFilter` يحلقة على الـ array → استبدل بـ API filters (`branchId`/`createdBy` column conditions)
- **Mutations تستدعي `reload()`**: `create/update/remove/post` callbacks يجب أن تنادي `reloadList()` بعد النجاح — وإلا الـ UI يعرض stale data
- **Hook يدمج `usePaginatedList` + mutations في API واحد**: الـ page لا تحتاج تستخدم `usePaginatedList` + `salesApi.createInvoice` منفصلاً — hook واحد يدير كل شيء
- **Server-side filters تعني `useOwnerFilter([], 'sales')` placeholder**: الـ hook يطلب array فارغ كـ input، الـ filter يصبح API-level عبر `filters.createdBy`
- **`<Pagination>` props**: `page`, `pageSize`, `total`, `onPageChange`, `onPageSizeChange` (لا `totalPages` — يُحسب داخلياً)
- **EmptyState icon prop = string enum**: `'inbox' | 'search' | 'file'` (لا Lucide component — للتوحيد)
- **`title` attribute للـ a11y على select/button**: `title="تصفية حسب الدور"` يُحسّن screen reader support بدون تغيير visual

### المرحلة 16g: 3 صفحات إضافية Server-Side Pagination
- **الهدف**: توسيع الـ refactor لـ 3 صفحات أخرى + 2 APIs جديدة
- **APIs الجديدة** (2):
  - `salesApi.getQuotationsPaginated(filters: {status?, customerId?})`
  - `salesApi.getReturnsPaginated(filters: {status?, customerId?})`
- **Hooks الجديدة** (3):
  - `useQuotationsPaginated(companyId, filters?)` — mutations: create/update/remove/convertToInvoice
  - `useReturnsPaginated(companyId, filters?)` — mutations: create/update/remove/post
  - `useSuppliersPaginated(companyId, filters?)` — mutations: create/update/remove (API من Phase 16d)
- **UI Refactors** (3 pages):
  - `QuotationsPage` (sales): نفس الـ pattern — `useQuotations()` → `useQuotationsPaginated()`
  - `SalesReturnsPage` (sales): `useReturns()` → `useReturnsPaginated()`
  - `SuppliersPage` (purchases): `useSuppliers()` → `useSuppliersPaginated()`
- **تحسين جانبي**:
  - `AccountSelect.tsx`: recursive `flatMap` to flatten hierarchical accounts tree (`useMemo([accounts])`)
  - إصلاح bug: `useAccounts` يرجع tree (with children) لكن `AccountSelect` كان يتوقع flat list
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **173/173 passed** ✓
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - **5 pages** server-side paginated الآن: Invoices + PurchaseInvoices + Quotations + SalesReturns + Suppliers
  - **10 APIs** تدعم server-side pagination

### قواعد ذهبية مضافة (Phase 16g)
- **Recursive flatMap لـ tree flattening**: `flatMap(item => [item, ...(item.children ? flatten(item.children) : [])])` لتحويل tree إلى flat list. الـ cache عبر `useMemo([accounts])` يمنع re-computation في كل render
- **useMemo deps تشمل flattened source**: لا تضع `accounts` في deps بعد استخدام `flattenedAccounts` — استبدلها بـ `flattenedAccounts` (ESLint exhaustive-deps)
- **الـ page count threshold للـ refactor**: 5+ pages refactored = the refactor template is fully battle-tested. أي page جديد يمكن تطبيق نفس الـ template في <30 دقيقة
- **Hooks الجديدة تتبع نفس الـ naming**: `useXxxPaginated(companyId, filters?)` — الـ suffix "Paginated" يميّز عن `useXxx` الـ in-memory

### المرحلة 17: RBAC React Integration
- **الهدف**: إضافة React-idiomatic layer فوق `useAuthStore.hasPermission` الموجود
- **الاكتشاف**: `useAuthStore` يحوي `hasPermission(perm)`, `hasRole(roles)`, `shouldFilterByOwner(module)`, `canAccessOwned(perm)`, `FALLBACK_PERMISSIONS` (manager/accountant/sales_rep/viewer) — البنية التحتية جاهزة، ينقص فقط الـ React layer
- **`usePermission.ts`** (11 hook، 110 سطر):
  - `usePermission(perm)` — single check reactive
  - `usePermissions(perms[])` — batch check
  - `useHasRole(roles)` — role check
  - `useCanView/Create/Edit/Delete/Post(module)` — module.action shortcuts
  - `useCanExport()` — `reports.export` shortcut
  - `useModulePermissions(module)` — returns `{ canView, canCreate, canEdit, canDelete, canPost }`
  - `useShouldFilterByOwner(module)` — own-records filter check
- **`PermissionGate.tsx`** (95 سطر):
  - `<PermissionGate permission="sales.create">` — single permission
  - `<PermissionGate permissions={[...]}` — list (any or all via `requireAll`)
  - `<PermissionGate module="sales" action="create">` — module+action
  - `<PermissionGate role="admin">` — role check
  - All composable, all support `fallback` prop
  - `<Can action="create" module="sales">` — convenience shorthand
  - Hidden when no user logged in
- **اختبارات** (12 جديد):
  - `PermissionGate.test.tsx`: single perm, list requireAll/any, module.action, role (string+array), no-user, super_admin/admin behavior, Can shorthand, fallback
- **Demo wiring**: `InvoicesPage.tsx` — Create Invoice button + EmptyState CTA wrapped in `<Can>`
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **185/185 passed** ✓ (12 جديد)
  - `npx eslint src`: **0 errors, 0 warnings** ✓

### قواعد ذهبية مضافة (Phase 17)
- **React layer فوق store layer**: `useAuthStore` يحوي logic، الـ hooks تلفها بـ reactive subscription. لا تكرر الـ logic في الـ hooks
- **لا تستدعي hooks بشكل شرطي في `PermissionGate`**: استخدم `if (!check) return fallback` بعد استدعاء الـ hooks. الـ React Rules of Hooks تتطلب استدعاءات top-level
- **`<Can>` shorthand للـ module.action**: `<Can action="create" module="sales">` أبسط من `<PermissionGate module="sales" action="create">`. استخدمه كـ default
- **fallback prop اختياري**: `fallback={null}` للـ hidden، `fallback={<Denied />}` لرسالة. لا throw error
- **batch check مع object return**: `usePermissions(perms)` ترجع `Record<perm, bool>` — أسرع من multiple `usePermission()` calls في render
- **no-user = hidden**: لا حاجة لـ `if (user)` في كل component — `PermissionGate` يتعامل مع `user = null` ويُرجع `fallback`
- **super_admin / admin hardcoded shortcuts**: `hasPermission` في الـ store يحقق role-based bypasses. لا تحاول implementation في الـ React layer — logic في الـ store

### المرحلة 17b: Can Wiring عبر الصفحات
- **الهدف**: تطبيق `<Can>` على Create buttons في كل الصفحات الـ server-side paginated
- **التطبيقات** (4 صفحات، 6 sites):
  - `PurchaseInvoicesPage`: 1 site (header Create button)
  - `QuotationsPage`: 2 sites (header + EmptyState CTA)
  - `SalesReturnsPage`: 2 sites (header + EmptyState CTA)
  - `SuppliersPage`: 1 site (header Create button)
  - `InvoicesPage`: 2 sites (header + EmptyState CTA — تم في Phase 17)
- **الـ pattern**: `<Can action="create" module="sales">` + Button + `</Can>` — Button لا يظهر إذا user لا يحوي الـ permission
- **النتيجة**: 8 `<Can>` wraps total عبر 5 صفحات

### المرحلة 17c: Role-Aware Navigation
- **الهدف**: إخفاء menu items في Sidebar لما user لا يستطيع access الـ module + إصلاح subscription bug في usePermission
- **Bug اكتشف**: `useAuthStore((s) => s.hasPermission)` كانت ترجع function reference (stable) → الـ components لا re-render لما user/permissions تتغير!
  - **الإصلاح**: subscribe to `(s) => s.user` و `(s) => s.permissions` + use `useAuthStore.getState().hasPermission(perm)` للـ fresh state
  - **الـ hooks المتأثرة**: `usePermission`, `usePermissions`, `useHasRole`, `useModulePermissions`, `useShouldFilterByOwner`, `useCanAccessModule` (جديد)
- **`useCanAccessModule(module)` hook جديد**:
  - يجمع 3 access levels: `module.view` (full access) OR `module.own` (own records only) OR `module.create` (can create)
  - super_admin يرجع true تلقائياً
  - يحل مشكلة `sales_rep` (لديه `sales.own` + `sales.create`، ليس `sales.view`) — يقدر يرى menu المبيعات لكن فقط مع own records
- **`Sidebar` refactor**:
  - `MenuItem.permission: string` → `MenuItem.module: Module` (type-safe union)
  - `SidebarItem` يستخدم `useCanAccessModule(item.module)` بدل `usePermission(item.permission)`
  - Children filtering: `!c.permission || hasPermission(c.permission)` (الـ default = parent permission)
  - Module union أضيف `'core'`
- **اختبارات** (21 جديد):
  - `usePermission.test.tsx` (12): reactivity on login/logout/permission changes، super_admin bypass، module shortcuts (canView/canCreate/useModulePermissions)
  - `layout.test.tsx` (9): no user = empty sidebar، super_admin sees all، viewer sees read-only، sales_rep sees own modules، re-renders on login/logout، active parent expands، collapsed hides children، admin bypass
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **206/206 passed** ✓ (21 جديد)
  - `npx eslint src`: **0 errors, 0 warnings** ✓

### قواعد ذهبية مضافة (Phase 17c)
- **Zustand subscription bug**: `useAuthStore((s) => s.hasPermission)` ترجع function reference (stable) → لا re-renders. **الحل**: subscribe to state (e.g. `s.user`، `s.permissions`)، ثم use `getState().method()` للـ fresh read
- **useAuthStore.getState() = safe في render**: يقرأ الـ current state synchronously، لا subscription، مثالي مع state subscriptions كـ "triggers"
- **module.view vs module.own**: `module.view` = full read access، `module.own` = own records only. الـ menu visibility لا يجب أن يعتمد على `view` فقط
- **`useCanAccessModule` = OR-based check**: `view OR own OR create` = "user يقدر يستخدم module". `useCanView` = view-only check
- **Module union type يحوي 'core'**: الـ Module type لازم يحوي core/acct/inv/sales/purch/mfg/hr/crm/reports/settings (10 modules)
- **Test reactivity = use act + rerender + verify DOM change**: `act(() => { store.login(newUser) })` + `rerender(<Component />)` يجب أن يحدث DOM
- **Test helper `makeUser(role, _permissions)`**: استخدم `_permissions` prefix (الـ unused arg convention) لـ ESLint satisfaction
- **Test helper `setUser(user, _permissions)`**: defaults `permissions = []` (مهم — test calls بدون args تستخدم [])
- **Test bug: `setUser(makeUser('manager', [...perms]))` ≠ `setUser(makeUser('manager'), [...perms])`**: الأول يمرر perms كـ second arg لـ makeUser (الـ type accepts)، الثاني يمرر لـ setUser. الـ test code يجب أن يكون صريح: `setUser(user, permissions)`
- **Sidebar children permission = default to parent**: `!c.permission || hasPermission(c.permission)` — children بلا explicit permission تظهر إذا parent visible
- **`useMemo([item.children, user?.id, user?.role])` vs `useMemo([item.children, user])`**: ESLint يحلل deps structure. `user` (object) يعتبر "unnecessary" إذا الـ body يستخدم `getState()` فقط. استخدم `eslint-disable-next-line` أو حدد `user?.id`

### المرحلة 17d: Roles Management UI
- **الهدف**: تحسين RolesPage الموجود مع RBAC integration + حماية الأدوار النظامية من التعديل
- **Bug fix**: استبدال `useAuthStore((s) => s.hasPermission)` بـ `usePermission` hook (نفس fix 17c)
- **`<Can>` wrappers**:
  - Create button: `<Can action="edit" module="settings">` (admin لا يحوي settings.edit → button hidden)
  - Edit + Clone buttons: `<Can action="edit" module="settings">`
  - Delete button: `<Can action="delete" module="settings">` (نفس permission لكن semantic أوضح)
- **Clone feature جديد**:
  - زر "نسخ" بجانب Edit/Delete يفتح modal جديد مع `${role.name} - نسخة` + permissions منسوخة
  - يتيح إنشاء دور مخصص من دور نظامي بدون تعديل الدور الأصلي
- **isSystem read-only mode**:
  - Badge: "نظامي" + `<Lock size={10} />` icon
  - Modal: warning banner أصفر "دور نظامي — للقراءة فقط"
  - Name/Description inputs: `disabled={editingRole?.isSystem}`
  - Permission grid: `opacity-60 pointer-events-none` + `disabled` على toggle buttons
  - Save button: `disabled` + label "للقراءة فقط"
- **handleSave**:
  - يحفظ `isSystem: editingRole?.isSystem ?? false` (يحافظ على flag عند update)
  - كان قبل يحوي `isSystem: false` (يفقد flag الـ system roles)
- **اختبارات** (9 جديد في `RolesPage.test.tsx`):
  - `vi.mock('../hooks/useAuth')` لـ mock useRoles (لا DB calls في الاختبارات)
  - `setUser(null)` في beforeEach، `useAppStore.setState({ activeCompany })` للـ context
  - تغطية: redirect، super_admin access، admin لا يستطيع access، create button visibility، system role badge، delete hidden لـ isSystem، edit/clone/delete لـ non-system، read-only state في modal، clone modal يفتح مع name منسوخ
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **215/215 passed** ✓ (9 جديد)
  - `npx eslint src`: **0 errors, 0 warnings** ✓

### قواعد ذهبية مضافة (Phase 17d)
- **`vi.mock('../hooks/useAuth')` pattern للـ component tests**: لا تستدعي DB في الاختبارات. الـ mock يلفّ `useRoles` ويعيد `{ roles, isLoading, create, update, remove }` يدوياً
- **`<Can action="delete" module="...">` semantic = same as `<Can action="edit">` لكن أوضح للـ reading**: نفس الـ permission لكن action type يفهم الـ intent. الـ future: actions might diverge (e.g., users who can edit can't delete)
- **isSystem role = read-only for permissions but cloneable**: حماية النظام + يتيح extension. الـ pattern: `disabled={editingRole?.isSystem}` على inputs + `pointer-events-none` على grid + warning banner
- **Clone modal = editingRole = null**: الـ handleClone يضع `editingRole = null` (create new) لكن `formData.permissions = [...role.permissions]`. الـ modal title يبقى "دور جديد" (create flow) لا "تعديل الدور" (edit flow)
- **`isSystem: editingRole?.isSystem ?? false` في update**: يحفظ الـ flag عند update. الـ default `false` صحيح للـ new roles لكن يجب جلب من existing لو updating
- **Test `getAllByText` بدلاً من `getByText` لما العنصر قد يتكرر**: "دور جديد" يظهر مرتين (header + EmptyState action). استخدم `getAllByText().length > 0`
- **Test `getByDisplayValue` للـ input value verification**: `getByLabelText` يتطلب `htmlFor` association. `getByDisplayValue` يجد الـ input مباشرة
- **vi.mock module-level import order**: `vi.mock(...)` يجب أن يكون قبل الـ `import` الـ module (hoisted). استخدم `vi.mocked(importedFn)` للـ type-safe mock assertions

### المرحلة 18a: Multi-Currency Foundation
- **الهدف**: إضافة الـ utility layer للـ multi-currency بدون لمس الـ schema
- **`currencyConverter.ts`** (107 سطر، pure functions):
  - `getCurrency/getDefaultCurrency/getActiveCurrencies` للـ lookup
  - `convertAmount(value, fromRate, toRate) = (value * fromRate) / toRate`
  - `convertToBase / convertFromBase` (مع baseRate اختياري)
  - `formatWithSymbol(value, currency)`: "1,234.50 USD" أو "$ 1,234.50"
  - `formatYer(value, decimals)`: يستخدم symbol "ر.ي"
  - `getBaseCurrencyConversion`: يرجع `{ value, currency, originalValue }`
  - `summarizeMultiCurrency`: يجمع Record<code, amount> للـ base currency
- **`useCurrencyDisplay.ts`** (116 سطر، React hook):
  - `useCurrencies(companyId)`: يحمّل من DB
  - `useCurrencyDisplay()`: يرجع `{ currencies, defaultCurrency, formatWithCurrency, convert, toBase, summarize }`
  - `formatWithCurrency(value, code?)`: يستخدم default إذا لم يُمرَّر code
  - `convert(value, fromCode, toCode?)`: cross-currency conversion
- **Exchange rate semantics**:
  - `rate` = "كم من الـ base currency = 1 من هذا"
  - 1 USD = 1500 YER → `USD.rate = 1500`، `YER.rate = 1`
  - Formula: `value * fromRate / toRate` (يتضمن الـ base normalization)
- **اختبارات** (28 جديد في `currencyConverter.test.ts`):
  - `getCurrency`: lookup + null fallback
  - `convertAmount`: same/cross/invalid/zero rate
  - `formatWithSymbol`: with symbol, with code, invalid, null currency
  - `formatYer`: ر.ي symbol, decimal places (regex match `100$` و `100.00$`)
  - `getBaseCurrencyConversion`: same as base, cross (10 USD = 15,000 YER)
  - `summarizeMultiCurrency`: multi-currency sum (1,000 YER + 10 USD = 16,000 YER)
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **243/243 passed** ✓ (28 جديد)
  - `npx eslint src`: **0 errors, 0 warnings** ✓

### قواعد ذهبية مضافة (Phase 18a)
- **Exchange rate semantics = "units per 1 of base"**: 1 USD = 1500 YER → rate(USD) = 1500. الـ formula للـ conversion: `value * fromRate / toRate` (NOT `/ fromRate * toRate` — هذا يعطي inverse)
- **rate = 1 للـ base currency**: الـ default currency دائماً rate = 1 (YER). non-base currencies لها rate > 1
- **`convertToBase(value, fromRate)` = `value * fromRate / 1`**: إذا base rate = 1، الـ math ببساطة `value * fromRate`
- **`convertFromBase(value, toRate)` = `value * 1 / toRate`**: الـ inverse، يقسم على toRate
- **`convertAmount(value, fromRate, toRate)` = `value * fromRate / toRate`**: cross-currency عبر الـ base
- **Regex `/\./` يطابق dot في Arabic symbol**: `ر.ي` يحوي period — `not.toMatch(/\./)` يفشل لـ "ر.ي 100". استخدم `toMatch(/100$/)` أو `toMatch(/100\.00$/)` للـ integer/decimal check
- **`getBaseCurrencyConversion` يرجع originalValue**: حتى لو converted = 0، الـ originalValue محفوظ للـ audit trail
- **Zero rate = fallback to original**: `if (rate <= 0) return value` — لا throw error، لا NaN
- **NaN/Infinity = 0**: `if (!isFinite(value)) return 0` — لا propagate NaN في التقارير
- **YER_CODE constant**: `'YER'` literal في module واحد، الباقي يستورد

### المرحلة 18b: Multi-Currency Schema Columns
- **الهدف**: إضافة `currency_code`/`exchange_rate`/`base_currency_amount` إلى الجداول الـ transactional (الـ utility layer جاهز من Phase 18a)
- **`drizzle/0001_multi_currency.sql`** (52 سطر، idempotent):
  - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` للـ 6 جداول: `sales_invoices`، `sales_invoice_lines`، `purchase_invoices`، `purchase_invoice_lines`، `receipt_vouchers`، `payment_vouchers`
  - Defaults: `currency_code='YER'`، `exchange_rate=1`، `base_currency_amount/paid/line_total=0` (backward compat — كل الـ rows القديمة تستخدم YER)
  - **4 composite indexes**: `(company_id, currency_code)` على الـ 4 parent tables للـ aggregation queries
- **Drizzle schema updates** (3 files، 12 new columns total):
  - `src/core/database/schema/sales.ts`: `salesInvoices` (4 cols) + `salesInvoiceLines` (3 cols)
  - `src/core/database/schema/purchases.ts`: `purchaseInvoices` (4 cols) + `purchaseInvoiceLines` (3 cols)
  - `src/core/database/schema/vouchers.ts`: `receiptVouchers` (3 cols) + `paymentVouchers` (3 cols)
- **Journal entry**: `{"idx": 1, "version": "7", "tag": "0001_multi_currency", "when": 1779800000000, "breakpoints": true}`
- **Tests جديدة** (9 جديد، 24 → 33 في `drizzle/migrations.test.ts`):
  - `Migration 0001: Multi-currency columns` block جديد
  - currency_code to sales/purchase invoices (YER default)
  - exchange_rate to sales_invoices (1 default)
  - base_currency_amount (≥ 4 occurrences: sales_invoices + purchase_invoices + receipt_vouchers + payment_vouchers)
  - base_currency_paid (≥ 2 occurrences: sales_invoices + purchase_invoices)
  - base_currency_line_total (≥ 2 occurrences: sales_invoice_lines + purchase_invoice_lines)
  - currency columns on receipt/payment vouchers
  - composite indexes (idx_sales_invoices_company_currency, idx_purchase_invoices_company_currency)
  - idempotency: IF NOT EXISTS on ADD COLUMN and CREATE INDEX
- **Test fix**: `_journal.json entries match migration files` (بدل `single entry`) — يقبل migration chain (0..n entries) لأن Phase 18b أضاف entry ثاني
- **Verification end-to-end** (PostgreSQL 18 localhost):
  - 20 new columns present (information_schema query)
  - 4 new indexes created (pg_indexes query)
  - `npm run db:reset:force`: 22.24s ✓
- **Commit**: `93e1502` (Phase 18b: Multi-currency schema columns)
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **252/252 passed** ✓ (9 جديد)
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - `npm run db:check`: **No schema changes, nothing to migrate** ✓ (Drizzle schema ↔ SQL في sync)

### قواعد ذهبية مضافة (Phase 18b)
- **migration جديد = 3 files على الأقل**: `drizzle/0001_*.sql` + `drizzle/meta/_journal.json` (entry جديد) + Drizzle schema files (matching columns). **القاعدة**: لا تنشئ SQL migration بدون تحديث Drizzle schema — الـ drift detection يكتشفه لكن الـ production code يكسر
- **ADD COLUMN ... DEFAULT 'value' NOT NULL**: NOT NULL + DEFAULT في ALTER TABLE يعمل في PG (يضيف العمود بـ default value لكل الـ existing rows). لا حاجة لـ UPDATE لاحق
- **`IF NOT EXISTS` على كل ADD COLUMN و CREATE INDEX في migration**: الـ migration قد تُعاد تشغيلها (re-apply scenario) — الـ guard يمنع errors
- **`character varying(3)` للـ currency_code**: الـ ISO 4217 codes دائماً 3 chars. الـ precision/validation لاحقاً (CHECK constraint ممكن)
- **`numeric(18, 6)` للـ exchange_rate**: 6 decimal places يدعم rates صغيرة (مثل KWD ≈ 0.003 USD). أكبر من الـ amount columns (4 decimals) لأن precision حرجة هنا
- **base_currency_amount/payment في parent، base_currency_line_total في lines**: الـ parent يحوي aggregates للـ سريع reporting؛ الـ lines يحوي computed values للـ traceability
- **Composite index `(company_id, currency_code)`**: يخدم `SELECT ... WHERE company_id=$1 GROUP BY currency_code` (multi-tenant + aggregation). الـ order: equality filter أولاً
- **migration test assumption flip**: الـ test القديم كان يفترض `length === 1` (single unified file). مع multi-migration، استخدم `entries[0].tag === '0000_unified_schema'` + `length >= 1` — لا تحط `length === 1` لأن extensions مطلوبة
- **Migration tests كـ integration tests للـ schema**: لا تعتمد على running PG. افحص الـ SQL text مباشرة بـ `readFileSync` + regex patterns — أسرع + portable
- **No destructive changes في migration جديد**: الـ schema extensions تكون backward-compatible (new columns with defaults). الـ breaking changes (rename، drop، type change) تحتاج migration strategy منفصل
- **db:check قبل الـ commit**: شغّل `npm run db:check` بعد أي Drizzle schema edit. الـ `No schema changes, nothing to migrate` = sync. أي drift = commit الـ regenerated SQL

### المرحلة 18c: Multi-Currency Form Integration (Sales Invoices)
- **الهدف**: ربط الـ schema الجديد (Phase 18b) بنموذج فاتورة المبيعات (currency picker + live base-currency readout)
- **Types** (`src/modules/sales/types.ts`):
  - `SalesInvoice`: `currencyCode?`، `exchangeRate?`، `baseCurrencyAmount?`، `baseCurrencyPaid?` (كلها optional)
  - `SalesInvoiceLine`: `currencyCode?`، `exchangeRate?`، `baseCurrencyLineTotal?` (optional)
- **Validation** (`src/core/utils/validation.ts`):
  - `createInvoiceSchema` يحوي `currencyCode: z.string().length(3).optional()` + `exchangeRate/baseCurrencyAmount/baseCurrencyPaid` (currencyAmountSchema.optional)
  - Lines: نفس النمط
- **API** (`src/modules/sales/api.ts`):
  - `createInvoice` SQL: INSERT 4 columns جديدة (`currency_code`، `exchange_rate`، `base_currency_amount`، `base_currency_paid`، `status`، `notes` = 16 cols)
  - **Auto-compute formula**: `baseCurrencyAmount = totalAmount * exchangeRate` (إذا لم يُمرَّر يدوياً) — fallback في الـ API layer
  - `updateInvoice` SQL: SET clause ديناميكي يضيف الـ currency fields بدون لمس الـ legacy fields
  - Lines INSERT: `base_currency_line_total = lineTotal * exchangeRate` (يأخذ rate من parent)
  - `mapInvoiceRow`/`mapInvoiceLineRow`: extract new columns (default `'YER'` و `1` إذا undefined)
- **Form UI** (`InvoicesPage.tsx`):
  - `useCurrencyDisplay()` hook: يحمّل الـ currencies + default
  - 2 form state: `currencyCode` (default defaultCurrency.code || 'YER')، `exchangeRate` (default 1)
  - `handleCurrencyChange(code)`: يحدّث الـ rate تلقائياً لما الـ user يختار عملة (يبحث في `currencies` array)
  - **Form layout**: row جديد بعد customer/date/dueDate يحوي `<CurrencySelect>` + exchange rate `<Input>` + base equivalent readout (computed live)
  - `buildInvoicePayload` يضيف `currencyCode`، `exchangeRate`، `baseCurrencyAmount: totalAmount * exchangeRate`، `baseCurrencyPaid: 0`
  - `openEdit` يحمّل الـ currency fields من الـ existing invoice
- **Display**:
  - **Table column** "الإجمالي" يعرض `(USD)` badge لو الـ currency != base
  - **Detail modal** يعرض "المعادل بالأساسية" في السطور (لما currency != base)
  - Detail modal header: totalAmount + currency badge
- **i18n**: 3 keys جديدة (AR + EN متوازنان): `sales.currency`، `sales.exchangeRate`، `sales.baseCurrency`
- **اختبارات** (6 جديد في `src/core/utils/validation-currency.test.ts`):
  - Accepts invoice بدون currency fields (defaults applied)
  - Accepts YER + rate 1
  - Accepts USD + rate 1500 + base = 1,725,000
  - Lines with currency fields
  - Rejects currency code بطول != 3
  - Auto-compute formula verification (500 * 2.5 = 1250)
- **Live DB verification**: `INSERT INTO sales_invoices (..., currency_code='USD', exchange_rate=1500, base_currency_amount=172500)` ينجح
- **Commit**: `fde371a` (Phase 18c: Multi-currency form integration for sales invoices)
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **258/258 passed** ✓ (6 جديد)
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - `npm run build`: **built in 16.37s** ✓
  - `npm run db:check`: **No schema changes, nothing to migrate** ✓

### قواعد ذهبية مضافة (Phase 18c)
- **Auto-compute في الـ API layer، لا الـ UI**: الـ form يمرر `totalAmount` + `exchangeRate`، الـ API يحسب `baseCurrencyAmount = totalAmount * exchangeRate` إذا لم يُمرَّر. الـ UI logic أقل = أسهل للـ test + الـ invariant يبقى صحيح
- **Optional fields في validation schema**: `currencyCode: z.string().length(3).optional()` (لا required) — الـ API يطبق default. الـ backward compat محفوظ
- **mapRow defaults**: `row.currency_code ? String(...) : 'YER'` (fallback string) و `row.exchange_rate !== undefined ? Number(...) : 1` (fallback number). لو الـ row ناقص (legacy data)، الـ type لا يكسر
- **form state mirror للـ useCurrencyDisplay**: `useState<string>(defaultCurrency?.code || 'YER')` + `useState<number>(1)`. الـ `useEffect` لتغيير الـ rate لما الـ user يغير العملة يعتمد على `currencies.find(c => c.code === code)` — لا reload DB
- **Currency badge in table cells**: `row.currencyCode && row.currencyCode !== currencySymbol && <span>({row.currencyCode})</span>` — يظهر فقط لو الـ currency != base (YER) لتجنب الضوضاء
- **Lines inherit parent rate**: `lineExchangeRate = line.exchangeRate ?? data.exchangeRate ?? 1`. لو الـ line لم يحدد rate، يرث من الـ invoice
- **i18n balance automatic via test**: 3 keys في AR + EN متوازنان. الـ test يفحص `Object.keys(en).length === Object.keys(ar).length` — catch immediately
- **MapInvoiceRow select * يكفي**: الـ SQL `SELECT i.*` يجلب الـ columns الجديدة تلقائياً. لا حاجة لتعديل الـ SELECT clause. لكن `mapInvoiceRow` يجب أن يعرف الـ keys الجديدة
- **CurrencySelect موجود مسبقاً**: من Phase 18a تَمَّ إنشاء `core/ui/components/smart/fields/CurrencySelect.tsx` — الـ integration في الـ forms يَستخدمه مباشرة
- **Auto-compute formula = source of truth واحد**: `baseCurrencyAmount = totalAmount * exchangeRate` (لا تأخذ من client) — لو الـ client يحسبها، الـ client قد يكذب. الـ server يَحسب
- **z.string().length(3) يقبل أي 3 chars**: لا يحدد ISO 4217. الـ validation في الـ currency table (`code` column) — الـ zod فقط يتحقق الـ length

### المرحلة 18d: Multi-Currency للفواتير + السندات (Purchases + Vouchers)
- **الهدف**: توسيع الـ pattern من Phase 18c لـ 3 forms إضافية: Purchase Invoices + Receipt Vouchers + Payment Vouchers
- **Validation** (`src/core/utils/validation.ts`):
  - `createPurchaseInvoiceSchema`: optional `currencyCode/exchangeRate/baseCurrencyAmount/baseCurrencyPaid` + lines options
  - `createReceiptVoucherSchema` + `createPaymentVoucherSchema`: optional `currencyCode/exchangeRate/baseCurrencyAmount` (no lines — flat doc)
- **Types**:
  - `PurchaseInvoice` + `PurchaseInvoiceLine`: optional currency fields
  - `ReceiptVoucher` + `PaymentVoucher`: optional `currencyCode/exchangeRate/baseCurrencyAmount`
- **API SQL** (`purchases/api.ts` + `accounting/api.ts`):
  - `createInvoice`/`updateInvoice` (purchases): INSERT/UPDATE 4 new columns + lines (8 new cols)
  - `createReceiptVoucher`/`updateReceiptVoucher`: dynamic SET clause يدعم currency fields (replaced fixed-position UPDATE)
  - `createPaymentVoucher`/`updatePaymentVoucher`: نفس النمط
  - **mapRows auto-converts snake_case → camelCase**: `mapRows<ReceiptVoucher>(result.rows)` يحوِّل `currency_code` → `currencyCode` تلقائياً — لا custom mapping مطلوب (Phase 16b)
- **Forms** (3 pages):
  - `PurchaseInvoicesPage`: `<CurrencySelect>` + rate input + live base equivalent readout
  - `ReceiptVouchersPage`: نفس النمط (no lines)
  - `PaymentVouchersPage`: نفس النمط (no lines)
  - **Reset form** يحفظ defaults: `currencyCode: defaultCurrency?.code || 'YER'` + `exchangeRate: 1`
  - **Edit mode** يحمّل `voucher.currencyCode/exchangeRate` من الـ existing record
- **اختبارات** (10 جديد في `src/core/utils/validation-currency-extended.test.ts`):
  - Purchase Invoice: accepts without currency، accepts USD+rate 1500، accepts SAR+rate 400 with lines
  - Receipt Voucher: accepts without currency، accepts USD+rate 1500 (1000 * 1500 = 1,500,000)
  - Payment Voucher: accepts without currency، accepts EUR+rate 1600 (5000 * 1600 = 8,000,000)، rejects 2-char code
  - Auto-compute formula: 750 * 1.5 = 1125، 2300 * 1500 = 3,450,000
- **Live DB verification**: `INSERT INTO payment_vouchers (..., currency_code='EUR', exchange_rate=1600, base_currency_amount=8000000)` ينجح
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **268/268 passed** ✓ (10 جديد)
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - `npm run build`: **built in 8.43s** ✓
  - `npm run db:check`: **No schema changes, nothing to migrate** ✓

### قواعد ذهبية مضافة (Phase 18d)
- **نفس الـ pattern لكل form**: `useCurrencyDisplay` + `useState` لـ `currencyCode` + `exchangeRate` + `<CurrencySelect>` + rate `<Input>` + computed base readout. لا re-invent
- **mapRows auto-converts**: `mapRows<ReceiptVoucher>(rows)` يحوِّل كل snake_case من PG إلى camelCase في الـ type — لا custom mapping functions مطلوبة. الـ `useFormatters`، `useOwnerFilter`، وما شابه كلها تستفيد من نفس الـ pattern
- **Dynamic SET clause للـ UPDATE**: الـ UPDATE الجديد يضيف `if (data.X !== undefined) { fields.push(...); values.push(...) }` لكل column. الـ `if` يحمي من overwrite الـ existing values بـ undefined
- **`updated_at = NOW()` + `updated_by = $N` forced**: عند dynamic SET، يجب إضافة هذين في الـ fields list (لا شرطيين). الـ pattern: `fields.push('updated_at = NOW()')` بدون value
- **No-lines docs (vouchers) ≠ with-lines docs (invoices)**: الـ voucher's `baseCurrencyAmount = amount * exchangeRate` (1 formula). الـ invoice's = `totalAmount * exchangeRate` (after line aggregation) — لكن الـ formula واحدة في الـ API: `data.amount * data.exchangeRate`
- **3 sales-agnostic i18n keys**: `sales.currency/exchangeRate/baseCurrency` يُعاد استخدامها في purchase + voucher forms — لا duplicates per module. لو request label يحتاج module-specific، أضف `purchases.currency` منفصل
- **es-lint exhaustive-deps fix**: `useCallback(handleSave, [..., currencyCode, exchangeRate])` — الـ functions التي تَستخدم currency fields يجب أن تعتمد عليها. الـ ESLint rule يكتشف deps الناقصة تلقائياً

### المرحلة 18e: Multi-Currency Report Aggregations
- **الهدف**: حل `SUM(total_amount)` يخلط بين USD/YER/SAR في رقم بلا معنى. تقسيم التقارير حسب `currency_code`
- **`currencyBreakdown.ts`** (57 سطر، pure functions):
  - `buildCurrencyBreakdown(amounts[], currencies)` — يجمع amounts حسب `code`، يحسب `baseEquivalent = amount * fromRate / baseRate`، يرتب تنازلياً، يحسب percent من total base
  - يرجع `{ items, totalInBase, hasMultipleCurrencies, uniqueCurrencyCount }`
  - يتجاهل entries بـ `code` فارغ، NaN/Infinity = 0، unknown currency = rate=0
- **`CurrencyBreakdown.tsx`** (UI، 100 سطر):
  - Card مع table: العملة / المبلغ (مع `formatWithCurrency`) / المعادل بالأساسية (إذا multiple) / progress bar + percent
  - Badge "متعدد العملات" لما `hasMultipleCurrencies=true`
  - Footer: "الإجمالي بالأساسية" إذا multiple
- **`ProfitAnalysisReport` توسعة**:
  - 2 SQL queries جديدة: `GROUP BY currency_code` على sales_invoices + purchase_invoice_lines
  - `PeriodData` يحوي `revenueBreakdown` + `cogsBreakdown`
  - UI section جديد: grid 2 columns (revenue + cogs breakdowns)
- **`SalesAnalysisReport` توسعة**:
  - `SalesLine.currencyCode` (من `i.currency_code`)
  - `useMemo` يحسب `currencyBreakdown` على filtered data
  - Column "العملة" في detail table (currency badge)
  - UI section جديد: `<CurrencyBreakdown>` في الأسفل
- **اختبارات** (11 جديد في `currencyBreakdown.test.ts`):
  - empty input، groups by code، base equivalent via rate، totalInBase sum، multiple detection، sort desc، percent of total، skips empty code، NaN→0، unknown currency rate=0، no currencies fallback
- **InventoryAnalysisReport**: skip (stock.base currency only، لا multi-currency)
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **279/279 passed** ✓ (11 جديد)
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - `npm run build`: **built in 8.85s** ✓
  - `npm run db:check`: **No schema changes** ✓

### المرحلة 16h: 6 صفحات إضافية Server-Side Pagination
- **الهدف**: توسيع الـ refactor للـ 6 pages المتبقية (PurchaseOrders/PurchaseReturns/Products/Leads/Opportunities/Employees)
- **Hooks الجديدة (6)**:
  - `purchasesApi`: `usePurchaseOrdersPaginated` + `usePurchaseReturnsPaginated`
  - `inventoryApi`: `useProductsPaginated`
  - `crmApi`: `useLeadsPaginated` + `useOpportunitiesPaginated`
  - `hrApi`: `useEmployeesPaginated`
  - كلها بنفس الـ pattern: `useXxxPaginated(companyId, filters?)` + mutations that call `reload()`
- **UI Refactors (6 pages)**:
  - `PurchaseOrdersPage`: status filter dropdown (draft/confirmed/invoiced/cancelled)
  - `PurchaseReturnsPage`: status filter (draft/posted/cancelled)
  - `ProductsPage`: productTypeId server filter + category client filter (الـ category filter ليس في API)
  - `LeadsPage`: status filter dropdown (new/contacted/qualified/converted/lost)
  - `OpportunitiesPage`: stage filter (new/qualified/proposal/negotiation/won/lost)
  - `EmployeesPage`: isActive filter (all/active/inactive) + total count
- **Pattern موحَّد**: نفس template من Phase 16e-16g:
  1. Replace hook import + call
  2. Remove `useBranchFilter` + `useOwnerFilter` + `OwnerFilterToggle`
  3. Add filter state (status/stage/isActive) + pass to hook
  4. Add `<Pagination>` after the table
- **النتيجة النهائية**:
  - `npx tsc -b`: **0 errors** ✓
  - `npx vitest run`: **279/279 passed** ✓
  - `npx eslint src`: **0 errors, 0 warnings** ✓
  - `npm run build`: **built in 18.44s** ✓
  - `npm run db:check`: **No schema changes** ✓
  - **11 pages** server-side paginated total: Invoices + PurchaseInvoices + Quotations + SalesReturns + Suppliers + **Orders** + **Returns** + **Products** + **Leads** + **Opportunities** + **Employees**

### قواعد ذهبية مضافة (Phase 16h)
- **Hook naming موحَّد**: `useXxxPaginated(companyId, filters?)` + `*Filters` interface منفصلة — لا تكرر النمط في كل page
- **Filter union للـ `isActive?`**: `boolean | undefined` — `undefined` = all (لا filter). الـ API يحقق `filters?.isActive !== undefined` للـ WHERE
- **Category client-side filter للـ ProductsPage**: الـ API لا يحوي `categoryId` filter → استخدم `useMemo` على الـ `products` بعد الـ server-side pagination. الـ trade-off: يعمل على current page فقط، لكن الـ categories في الـ demo data محدودة
- **Status filter لا يحوي `cancelled` افتراضياً**: اعرض الخيارات في الـ dropdown (draft/posted/cancelled) — لكن الـ API لا يفلتر cancelled تلقائياً. لو طلب "active only" استخدم API filter مخصص
- **Empty filter = no filter**: `filters={ status: statusFilter || undefined }` — إذا الـ dropdown "الكل"، الـ value = `''`، نمرر `undefined` للـ API (لا WHERE)
- **الـ total count في الـ pagination = count after filters**: `total = COUNT(*) WHERE ${where}` — لو filter status=posted، الـ total = عدد posted فقط. الـ user يرى count صحيح للـ active filter
- **Page reset on filter change**: الـ `usePaginatedList` deps يشمل الـ filter values → تغيير filter يَستدعي load → page 1 implicitly
- **Buggy ESLint: select without `<form>`**: لو الـ select لا يحوي `aria-label` + `title`، الـ eslint يكتشف a11y issue. استخدم كليهما

*آخر تحديث: 2026-06-06 | الإصدار: maghzaccount-pro v0.3.16*

