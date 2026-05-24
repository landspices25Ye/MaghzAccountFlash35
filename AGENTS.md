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

- **الإصدار الحالي:** v0.0.0 (أساس بنيوي — Foundation)
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
│   │   │   ├── adapters/           ← PG, Realm, Mock adapters
│   │   │   ├── schema/             ← Drizzle schemas (per module)
│   │   │   └── realm/              ← Realm schemas
│   │   ├── reports/                ← محرك التقارير
│   │   │   ├── engine/             ← ReportBuilder, QueryBuilder
│   │   │   └── export/             ← PDF, Excel, CSV
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
- **Memoization:** لا تُفرط في `useMemo`/`useCallback`.

### 4.3 Tailwind CSS
- **النظام:** استخدم Tailwind classes مباشرة في JSX.
- **Dark Mode:** استخدم `dark:` prefix لكل لون.
- **RTL:** استخدم `rtl:` prefix أو logical properties.
- **ممنوع:** لا تضف CSS مخصص إلا للأنماط المشتركة (`@layer components`).

### 4.4 قاعدة البيانات (3 طبقات)

| الطبقة | البيئة | التقنية |
|--------|--------|---------|
| Layer 1 | Electron + PG متاح | PostgreSQL + Drizzle ORM |
| Layer 2 | Electron بدون PG | Realm DB |
| Layer 3 | Browser | Mock/Dexie |

**قاعدة حاسمة:** استخدم Database Adapters من `core/database/adapters/`. لا تكتب كود قاعدة بيانات مباشرة داخل المكونات.

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
| PDF لا يدعم العربية | حمّل خط Cairo في `@react-pdf/renderer` |
| pgClient لا يعمل في Browser | طبيعي — استخدم Mock adapter |

---

## 10. الاتصال والدعم

- **المشرف:** مالك المستودع
- **الوثائق التقنية:** 
  - `ARCHITECTURE.md` — البنية المعمارية
  - `DESIGN.md` — نظام التصميم
  - `STYLEGUIDE.md` — أسلوب الكود
  - `PROJECT.md` — وثائق المشروع
  - `TESTING.md` — استراتيجية الاختبار
  - `DEPLOYMENT.md` — النشر والتوزيع

---

*آخر تحديث: 2026-05-24 | الإصدار: maghzaccount-pro v0.0.0*
