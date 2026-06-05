import React, { useState } from 'react';
import {
  Database,
  Server,
  CheckCircle,
  XCircle,
  Building2,
  Coins,
  FileText,
  Package,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Settings,
  Globe,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useOnboardingStore } from '@/core/store/onboardingStore';
import { useAppStore } from '@/core/store';
import { Button, Input, Card } from '@/core/ui/components';

const steps = [
  { id: 0, title: 'مرحباً', description: 'تهيئة نظام محاسبة المهذب' },
  { id: 1, title: 'قاعدة البيانات', description: 'إعداد اتصال PostgreSQL' },
  { id: 2, title: 'بيانات الشركة', description: 'إعداد معلومات المنشأة' },
  { id: 3, title: 'البيانات الأولية', description: 'تغذية البيانات الافتراضية' },
  { id: 4, title: 'الإنجاز', description: 'الانتهاء من التهيئة' },
];

export const OnboardingWizard: React.FC = () => {
  const { currentStep, setCurrentStep, dbConfig, companyConfig, setCompleted, setProcessing, isProcessing, processingMessage, error, setError } = useOnboardingStore();
  const setActiveCompany = useAppStore((state) => state.setActiveCompany);

  const nextStep = () => setCurrentStep(Math.min(currentStep + 1, steps.length - 1));
  const prevStep = () => setCurrentStep(Math.max(currentStep - 1, 0));

  const handleFinish = async () => {
    setProcessing(true, 'جارٍ حفظ الإعدادات...');
    setError(null);

    try {
      // Update app company state
      setActiveCompany(companyConfig.name, 'comp-1', companyConfig.currency, {
        dateFormat: 'yyyy-MM-dd',
        decimalPlaces: 2,
        calendar: 'gregorian',
      });

      // Update Electron PG config
      if (typeof window !== 'undefined' && window.electronDB?.updateConfig) {
        await window.electronDB.updateConfig({
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user,
          password: dbConfig.password,
        });
      }

      setCompleted(true);
      setProcessing(false);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الحفظ');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-3xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex flex-col items-center gap-2 flex-1">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all
                  ${idx <= currentStep ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}
                `}>
                  {idx < currentStep ? <CheckCircle size={18} /> : idx + 1}
                </div>
                <div className="text-center hidden sm:block">
                  <p className={`text-xs font-medium ${idx <= currentStep ? 'text-primary-600' : 'text-slate-400'}`}>{step.title}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="relative h-1 bg-slate-200 dark:bg-slate-800 rounded-full mt-2">
            <div
              className="absolute top-0 right-0 h-full bg-primary-600 rounded-full transition-all duration-500"
              style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <Card className="p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-800">
          {currentStep === 0 && <WelcomeStep onNext={nextStep} />}
          {currentStep === 1 && <DatabaseStep onNext={nextStep} onBack={prevStep} />}
          {currentStep === 2 && <CompanyStep onNext={nextStep} onBack={prevStep} />}
          {currentStep === 3 && <SeedStep onNext={nextStep} onBack={prevStep} />}
          {currentStep === 4 && <CompleteStep onFinish={handleFinish} onBack={prevStep} />}
        </Card>

        {error && (
          <div className="mt-4 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-2 text-rose-700 dark:text-rose-400">
            <XCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {isProcessing && (
          <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-primary-600" />
            <span className="text-sm text-primary-700 dark:text-primary-400">{processingMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Step 1: Welcome ─────────────────────────────────────────────────────────
function WelcomeStep({ onNext }: { onNext: () => void }) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const resetOnboarding = useOnboardingStore((state) => state.reset);

  const handleResetAll = async () => {
    setIsResetting(true);
    setResetError('');
    try {
      if (typeof window !== 'undefined' && window.electronDB?.clearAll) {
        const result = await window.electronDB.clearAll();
        if (!result.success) {
          throw new Error(result.error || 'فشل مسح البيانات');
        }
        resetOnboarding();
        setIsResetting(false);
        setShowResetConfirm(false);
        return;
      }
      throw new Error('خدمة PostgreSQL غير متوفرة. تأكد من تشغيل Electron.');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'حدث خطأ أثناء مسح البيانات');
      setIsResetting(false);
    }
  };

  return (
    <div className="text-center space-y-6">
      <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto">
        <Settings size={40} className="text-primary-600 dark:text-primary-400" />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">مرحباً بك في محاسبة المهذب</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          دعنا نساعدك في تهيئة النظام. ستستغرق هذه العملية بضع دقائق فقط.
          يمكنك تغيير هذه الإعدادات لاحقاً من قائمة الإعدادات.
        </p>
      </div>
      <div className="flex justify-center gap-4 text-sm text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1"><Database size={16} /> PostgreSQL</div>
        <div className="flex items-center gap-1"><Globe size={16} /> متعدد العملات</div>
        <div className="flex items-center gap-1"><Sparkles size={16} /> بيانات افتراضية</div>
      </div>
      <Button variant="primary" size="lg" leftIcon={<ArrowRight size={18} />} onClick={onNext}>
        ابدأ التهيئة
      </Button>

      {/* Reset All Data */}
      <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
        {!showResetConfirm ? (
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Trash2 size={14} />}
            onClick={() => setShowResetConfirm(true)}
            className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
          >
            مسح جميع البيانات والبدء من جديد
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
              <AlertTriangle size={18} />
              <span className="text-sm font-medium">سيتم حذف جميع بيانات قاعدة البيانات. هذا الإجراء لا يمكن التراجع عنه.</span>
            </div>
            {resetError && (
              <div className="flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg">
                <XCircle size={18} />
                <span className="text-sm">{resetError}</span>
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowResetConfirm(false); setResetError(''); }}
                disabled={isResetting}
              >
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="sm"
                leftIcon={isResetting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                onClick={handleResetAll}
                isLoading={isResetting}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {isResetting ? 'جارٍ المسح...' : 'نعم، امسح جميع البيانات'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Database ────────────────────────────────────────────────────────
function DatabaseStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { dbConfig, setDbConfig, setError, setProcessing, isProcessing } = useOnboardingStore();
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  const handleTest = async () => {
    setTestStatus('idle');
    setError(null);

    if (typeof window !== 'undefined' && window.electronDB?.testConnection) {
      setProcessing(true, 'جارٍ اختبار اتصال PostgreSQL...');
      try {
        const result = await window.electronDB.testConnection({
          host: dbConfig.host,
          port: dbConfig.port,
          database: dbConfig.database,
          user: dbConfig.user,
          password: dbConfig.password,
        });
        if (result.success) {
          setTestStatus('success');
          setTestMessage(`متصل بـ: ${result.db} | النسخة: ${(result.version || '').split(' ')[0]}`);
        } else {
          setTestStatus('error');
          setTestMessage(result.error || 'فشل الاتصال');
        }
      } catch (err) {
        setTestStatus('error');
        setTestMessage(err instanceof Error ? err.message : 'فشل الاتصال');
      }
      setProcessing(false);
    } else {
      setTestStatus('error');
      setTestMessage('PostgreSQL غير متوفر. تأكد من تشغيل Electron.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Database size={24} className="text-primary-600 dark:text-primary-400" />
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">إعداد قاعدة البيانات</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">أدخل بيانات اتصال PostgreSQL</p>
        </div>
      </div>

      <div className="space-y-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-2">
          <Server size={16} />
          <span className="text-sm font-medium">PostgreSQL</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="الخادم (Host)" value={dbConfig.host || ''} onChange={e => setDbConfig({ host: e.target.value })} />
          <Input label="المنفذ (Port)" value={dbConfig.port || ''} onChange={e => setDbConfig({ port: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="اسم قاعدة البيانات" value={dbConfig.database || ''} onChange={e => setDbConfig({ database: e.target.value })} />
          <Input label="اسم المستخدم" value={dbConfig.user || ''} onChange={e => setDbConfig({ user: e.target.value })} />
        </div>
        <Input label="كلمة المرور" type="password" value={dbConfig.password || ''} onChange={e => setDbConfig({ password: e.target.value })} />
      </div>

      {testStatus === 'success' && (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
          <CheckCircle size={18} />
          <span className="text-sm font-medium">{testMessage}</span>
        </div>
      )}
      {testStatus === 'error' && (
        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg">
          <XCircle size={18} />
          <span className="text-sm font-medium">{testMessage}</span>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button variant="secondary" leftIcon={<ArrowLeft size={16} />} onClick={onBack}>رجوع</Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleTest} isLoading={isProcessing} leftIcon={<Settings size={16} />}>
            اختبار الاتصال
          </Button>
          <Button variant="primary" leftIcon={<ArrowRight size={16} />} onClick={onNext}>
            التالي
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Company ─────────────────────────────────────────────────────────
function CompanyStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { companyConfig, setCompanyConfig } = useOnboardingStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Building2 size={24} className="text-primary-600 dark:text-primary-400" />
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">بيانات الشركة</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">أدخل معلومات منشأتك الأساسية</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="اسم الشركة *" value={companyConfig.name} onChange={e => setCompanyConfig({ name: e.target.value })} required />
          <Input label="الاسم الإنجليزي" value={companyConfig.nameEn} onChange={e => setCompanyConfig({ nameEn: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">العملة الافتراضية</label>
            <select
              value={companyConfig.currency}
              title="اختر عملتك الأساسية"
              onChange={e => setCompanyConfig({ currency: e.target.value })}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="YER">ريال يمني (YER)</option>
              <option value="SAR">ريال سعودي (SAR)</option>
              <option value="USD">دولار أمريكي (USD)</option>
              <option value="AED">درهم إماراتي (AED)</option>
              <option value="KWD">دينار كويتي (KWD)</option>
              <option value="QAR">ريال قطري (QAR)</option>
            </select>
          </div>
          <Input label="الرقم الضريبي" value={companyConfig.taxNumber} onChange={e => setCompanyConfig({ taxNumber: e.target.value })} />
          <Input label="الهاتف" value={companyConfig.phone} onChange={e => setCompanyConfig({ phone: e.target.value })} />
        </div>

        <Input label="العنوان" value={companyConfig.address} onChange={e => setCompanyConfig({ address: e.target.value })} />
        <Input label="البريد الإلكتروني" type="email" value={companyConfig.email} onChange={e => setCompanyConfig({ email: e.target.value })} />
      </div>

      <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button variant="secondary" leftIcon={<ArrowLeft size={16} />} onClick={onBack}>رجوع</Button>
        <Button variant="primary" leftIcon={<ArrowRight size={16} />} onClick={onNext}>التالي</Button>
      </div>
    </div>
  );
}

// ─── Step 4: Seed Data ───────────────────────────────────────────────────────
function SeedStep({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { seedOption, setSeedOption, setError, setProcessing, isProcessing } = useOnboardingStore();
  const [seedStatus, setSeedStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [seedMessage, setSeedMessage] = useState('');

  const handleSeedNow = async () => {
    if (seedOption === 'none') {
      onNext();
      return;
    }

    setSeedStatus('idle');
    setError(null);
    setProcessing(true, seedOption === 'default' ? 'جارٍ بذر البيانات الافتراضية...' : 'جارٍ بذر البيانات الوهمية...');

    try {
      if (typeof window !== 'undefined' && window.electronDB) {
        const electronDB = window.electronDB;

        if (seedOption === 'default') {
          if (!electronDB.seedDefault) {
            throw new Error('seedDefault غير متوفر');
          }
          const result = await electronDB.seedDefault();
          if (result.success) {
            setSeedStatus('success');
            setSeedMessage('تم بذر البيانات الافتراضية بنجاح');
          } else {
            throw new Error(result.error || 'فشل البذر');
          }
        } else if (seedOption === 'demo') {
          if (!electronDB.seedDemo) {
            throw new Error('seedDemo غير متوفر');
          }
          const result = await electronDB.seedDemo();
          if (result.success) {
            setSeedStatus('success');
            setSeedMessage('تم بذر البيانات الوهمية بنجاح');
          } else {
            throw new Error(result.error || 'فشل البذر');
          }
        }
      } else {
        throw new Error('PostgreSQL غير متوفر');
      }

      setProcessing(false);
      onNext();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء البذر';
      setSeedStatus('error');
      setSeedMessage(msg);
      setError(msg);
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Package size={24} className="text-primary-600 dark:text-primary-400" />
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">البيانات الأولية</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">اختر نوع البيانات التي تريد بدء العمل بها</p>
        </div>
      </div>

      <div className="space-y-3">
        <SeedOptionCard
          active={seedOption === 'none'}
          icon={<FileText size={20} />}
          title="بدون بيانات"
          desc="ابدأ بشركة فارغة وقم بإدخال كل شيء يدوياً"
          onClick={() => setSeedOption('none')}
        />
        <SeedOptionCard
          active={seedOption === 'default'}
          icon={<CheckCircle size={20} />}
          title="البيانات الافتراضية"
          desc="شجرة حسابات، إعدادات VAT، فروع، مستخدم، وعملة (موصى به)"
          onClick={() => setSeedOption('default')}
        />
        <SeedOptionCard
          active={seedOption === 'demo'}
          icon={<Sparkles size={20} />}
          title="البيانات الوهمية (Demo)"
          desc="كل ما سبق + عملاء، موردين، منتجات، فواتير، موظفين، مهام..."
          onClick={() => setSeedOption('demo')}
        />
      </div>

      {seedStatus === 'success' && (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
          <CheckCircle size={18} />
          <span className="text-sm font-medium">{seedMessage}</span>
        </div>
      )}
      {seedStatus === 'error' && (
        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 dark:bg-rose-900/20 p-3 rounded-lg">
          <XCircle size={18} />
          <span className="text-sm font-medium">{seedMessage}</span>
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button variant="secondary" leftIcon={<ArrowLeft size={16} />} onClick={onBack}>رجوع</Button>
        <Button variant="primary" onClick={handleSeedNow} isLoading={isProcessing} leftIcon={<ArrowRight size={16} />}>
          {seedOption === 'none' ? 'تخطي' : 'بذر البيانات والتالي'}
        </Button>
      </div>
    </div>
  );
}

function SeedOptionCard({ active, icon, title, desc, onClick }: { active: boolean; icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-lg border-2 text-right transition-all flex items-start gap-3 ${
        active
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
      }`}
    >
      <div className={`mt-0.5 ${active ? 'text-primary-600' : 'text-slate-400'}`}>{icon}</div>
      <div>
        <p className="font-bold text-slate-900 dark:text-slate-100">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{desc}</p>
      </div>
    </button>
  );
}

// ─── Step 5: Complete ────────────────────────────────────────────────────────
function CompleteStep({ onFinish, onBack }: { onFinish: () => void; onBack: () => void }) {
  const { companyConfig, seedOption } = useOnboardingStore();

  const seedLabel = seedOption === 'none' ? 'بدون بيانات' : seedOption === 'default' ? 'البيانات الافتراضية' : 'البيانات الوهمية';

  return (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">جاهز للبدء!</h2>
        <p className="text-slate-500 dark:text-slate-400">تمت تهيئة النظام بنجاح. إليك ملخص إعداداتك:</p>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-right space-y-2 border border-slate-200 dark:border-slate-800 max-w-md mx-auto">
        <SummaryRow label="الشركة" value={companyConfig.name} icon={<Building2 size={16} />} />
        <SummaryRow label="العملة" value={companyConfig.currency} icon={<Coins size={16} />} />
        <SummaryRow label="قاعدة البيانات" value="PostgreSQL" icon={<Database size={16} />} />
        <SummaryRow label="البيانات" value={seedLabel} icon={<Package size={16} />} />
      </div>

      <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-800 max-w-md mx-auto">
        <Button variant="secondary" leftIcon={<ArrowLeft size={16} />} onClick={onBack}>رجوع</Button>
        <Button variant="primary" size="lg" onClick={onFinish} leftIcon={<ArrowRight size={16} />}>
          الدخول إلى النظام
        </Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <span className="font-medium text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

export default OnboardingWizard;


