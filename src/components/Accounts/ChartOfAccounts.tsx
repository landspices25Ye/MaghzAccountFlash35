import { useState } from 'react';
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  Plus, 
  PlusCircle, 
  X,
  AlertCircle
} from 'lucide-react';
import { useTranslation } from '../../core/i18n/useTranslation';
import { useAppStore } from '../../core/store/appStore';
import { pgAddAccount } from '../../database/pgClient';
import { realmAddAccount, realmAddLog } from '../../database/realmClient';

interface Account {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  parentId?: string | null;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  nature: 'debit' | 'credit';
  isGroup: boolean;
  balance: number;
}

interface ChartOfAccountsProps {
  accounts: Account[];
  onRefresh: () => void;
}

export default function ChartOfAccounts({ accounts, onRefresh }: ChartOfAccountsProps) {
  const { t, language } = useTranslation();
  const dbMode = useAppStore((state) => state.dbMode);
  const dbConnected = useAppStore((state) => state.dbConnected);
  const activeCompanyId = useAppStore((state) => state.activeCompanyId);

  const isPg = dbMode === 'postgresql' && dbConnected;

  // Selected Category filter
  const [activeCategory, setActiveCategory] = useState<'asset' | 'liability' | 'equity' | 'revenue' | 'expense'>('asset');
  
  // Collapse state map: key is account ID, value is boolean
  const [collapsedNodes, setCollapsedNodes] = useState<Record<string, boolean>>({});
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [parentAccount, setParentAccount] = useState<Account | null>(null);
  const [code, setCode] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [type, setType] = useState<'asset' | 'liability' | 'equity' | 'revenue' | 'expense'>('asset');
  const [nature, setNature] = useState<'debit' | 'credit'>('debit');
  const [isGroup, setIsGroup] = useState(false);

  const categories = [
    { key: 'asset', label: t('accounts.asset'), color: 'asset' },
    { key: 'liability', label: t('accounts.liability'), color: 'liability' },
    { key: 'equity', label: t('accounts.equity'), color: 'equity' },
    { key: 'revenue', label: t('accounts.revenue'), color: 'revenue' },
    { key: 'expense', label: t('accounts.expense'), color: 'expense' },
  ] as const;

  const toggleNode = (nodeId: string) => {
    setCollapsedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Build the hierarchical tree for selected type
  const buildTree = (typeFilter: string) => {
    const typeAccounts = accounts.filter(a => a.type === typeFilter);
    const idMap: Record<string, Account & { children: any[] }> = {};
    const roots: any[] = [];

    // Pre-populate with empty children array
    typeAccounts.forEach(acc => {
      idMap[acc.id] = { ...acc, children: [] };
    });

    // Populate hierarchy
    typeAccounts.forEach(acc => {
      const mapped = idMap[acc.id];
      if (acc.parentId && idMap[acc.parentId]) {
        idMap[acc.parentId].children.push(mapped);
      } else {
        roots.push(mapped);
      }
    });

    // Sort by code
    const sortTree = (nodes: any[]) => {
      nodes.sort((a, b) => a.code.localeCompare(b.code));
      nodes.forEach(n => {
        if (n.children.length > 0) {
          sortTree(n.children);
        }
      });
    };
    sortTree(roots);

    return roots;
  };

  // Open modal with pre-filled parent data and code suggestion
  const handleOpenAddModal = (parent?: Account) => {
    setErrorMsg(null);
    setNameAr('');
    setNameEn('');
    
    if (parent) {
      setParentAccount(parent);
      setType(parent.type);
      setNature(parent.nature);
      setIsGroup(false);
      
      // Auto-suggest Next Account Code
      const siblingAccounts = accounts.filter(a => a.parentId === parent.id);
      if (siblingAccounts.length > 0) {
        // Sort siblings numerically to find the maximum
        const sorted = [...siblingAccounts].sort((a, b) => b.code.localeCompare(a.code));
        const maxCode = sorted[0].code;
        // Try incrementing the last numeric part
        const parentCodeLen = parent.code.length;
        const suffix = maxCode.substring(parentCodeLen);
        const nextNum = parseInt(suffix, 10) + 1;
        if (!isNaN(nextNum)) {
          const nextSuffix = nextNum.toString().padStart(suffix.length, '0');
          setCode(parent.code + nextSuffix);
        } else {
          setCode(parent.code + '001');
        }
      } else {
        // First child
        setCode(parent.code + '001');
      }
    } else {
      setParentAccount(null);
      setType(activeCategory);
      setNature(activeCategory === 'asset' || activeCategory === 'expense' ? 'debit' : 'credit');
      setIsGroup(true); // Base accounts are usually groups
      setCode('');
    }
    
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !nameAr) {
      setErrorMsg(language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    // Check code duplication
    const duplicate = accounts.find(a => a.code === code);
    if (duplicate) {
      setErrorMsg(t('accounts.codeExists'));
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const payload = {
      companyId: activeCompanyId || '',
      code,
      nameAr,
      nameEn: nameEn || undefined,
      parentId: parentAccount?.id || undefined,
      type,
      nature,
      isGroup,
    };

    try {
      if (isPg) {
        // Layer 1: PostgreSQL
        const res = await pgAddAccount(payload);
        if (res.success) {
          const actionMsg = `إضافة حساب جديد: ${code} - ${nameAr}`;
          await realmAddLog(activeCompanyId || '', 'مدير النظام', actionMsg, 'الحسابات (GL)', `تم تسجيل الحساب تحت ${parentAccount ? parentAccount.nameAr : 'الدليل الرئيسي'}`);
          setIsModalOpen(false);
          onRefresh();
        } else {
          setErrorMsg(res.error || t('common.error'));
        }
      } else {
        // Layer 2 & 3: Realm DB or Mock adapter
        const res = await realmAddAccount(payload);
        if (res.success) {
          const actionMsg = `إضافة حساب جديد: ${code} - ${nameAr}`;
          await realmAddLog(activeCompanyId || '', 'مدير النظام', actionMsg, 'الحسابات (GL)', `تم تسجيل الحساب تحت ${parentAccount ? parentAccount.nameAr : 'الدليل الرئيسي'}`);
          setIsModalOpen(false);
          onRefresh();
        } else {
          setErrorMsg(res.error || t('common.error'));
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatBalance = (val: number) => {
    const formatted = new Intl.NumberFormat(language === 'ar' ? 'ar-YE' : 'en-US', {
      maximumFractionDigits: 2
    }).format(Math.abs(val));
    return `${formatted} ${language === 'ar' ? 'ر.ي' : 'YER'}`;
  };

  // Render tree recursively
  const renderTreeNode = (node: any, depth = 0) => {
    const isCollapsed = !!collapsedNodes[node.id];
    const hasChildren = node.children.length > 0;
    
    return (
      <div key={node.id} className="tree-node-wrapper">
        <div 
          className={`tree-node ${node.isGroup ? 'is-group' : 'is-ledger'}`}
          style={{ paddingInlineStart: `${Math.max(12, depth * 28)}px` }}
        >
          {node.isGroup ? (
            <button 
              className={`tree-node-chevron ${isCollapsed ? 'collapsed' : ''}`}
              onClick={() => toggleNode(node.id)}
            >
              {isCollapsed ? (
                <Folder size={18} style={{ color: 'hsl(var(--primary))' }} />
              ) : (
                <FolderOpen size={18} style={{ color: 'hsl(var(--primary))' }} />
              )}
            </button>
          ) : (
            <span className="tree-node-chevron">
              <FileText size={16} style={{ color: 'hsl(var(--foreground-muted))' }} />
            </span>
          )}

          <div className="tree-node-info">
            <span className="tree-node-code">{node.code}</span>
            <span className="tree-node-name">
              {language === 'ar' ? node.nameAr : (node.nameEn || node.nameAr)}
            </span>
          </div>

          <span className={`tree-node-balance ${node.nature === 'debit' ? 'debit-val' : 'credit-val'}`}>
            {formatBalance(node.balance)}
          </span>

          <div className="tree-node-actions">
            {node.isGroup && (
              <button 
                onClick={() => handleOpenAddModal(node)}
                className="btn-icon" 
                title={t('accounts.addAccount')}
                style={{ color: 'hsl(var(--primary))' }}
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        </div>

        {node.isGroup && !isCollapsed && hasChildren && (
          <div className="tree-node-children">
            {node.children.map((child: any) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const treeRoots = buildTree(activeCategory);

  return (
    <div className="accounts-layout animate-fade-in">
      {/* Category Selection Sidebar */}
      <div className="accounts-filters-sidebar">
        <div className="card" style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
          <h3 style={{ padding: '0.5rem', fontSize: '0.9rem', color: 'hsl(var(--foreground-muted))' }}>
            {language === 'ar' ? 'تبويبات الحسابات' : 'Account Types'}
          </h3>
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`filter-category-btn ${activeCategory === cat.key ? 'active' : ''}`}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className={`category-indicator ${cat.color}`} />
                {cat.label}
              </div>
            </button>
          ))}
        </div>

        <button 
          onClick={() => handleOpenAddModal(undefined)}
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          <PlusCircle size={18} />
          {t('accounts.addAccount')}
        </button>
      </div>

      {/* Hierarchical Accounts Tree */}
      <div className="card" style={{ flex: 1, minHeight: '450px' }}>
        <div className="accounts-tree-header">
          <span>{language === 'ar' ? 'اسم الحساب والترميز' : 'Account Name & Code'}</span>
          <div style={{ display: 'flex', gap: '4rem' }}>
            <span>{t('accounts.balance')}</span>
            <span style={{ width: '20px' }}></span>
          </div>
        </div>

        <div className="tree-list" style={{ marginTop: '0.75rem' }}>
          {treeRoots.length > 0 ? (
            treeRoots.map(root => renderTreeNode(root, 0))
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'hsl(var(--foreground-muted))' }}>
              {language === 'ar' ? 'لا توجد حسابات تحت هذا التبويب بعد.' : 'No accounts created under this type yet.'}
            </div>
          )}
        </div>
      </div>

      {/* Add Account Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3>{t('accounts.addAccount')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="btn-icon">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {errorMsg && (
                  <div style={{ display: 'flex', gap: '0.5rem', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.875rem', alignItems: 'center' }}>
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {parentAccount && (
                  <div className="form-group" style={{ opacity: 0.8 }}>
                    <label className="form-label">{t('accounts.parent')}</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      disabled 
                      value={`${parentAccount.code} - ${language === 'ar' ? parentAccount.nameAr : (parentAccount.nameEn || parentAccount.nameAr)}`} 
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">{t('accounts.code')} *</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={code} 
                    onChange={(e) => setCode(e.target.value)} 
                    placeholder="e.g. 111003"
                    required
                  />
                </div>

                <div className="grid grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">{t('accounts.nameAr')} *</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={nameAr} 
                      onChange={(e) => setNameAr(e.target.value)} 
                      placeholder="الأرباح المحتجزة"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t('accounts.nameEn')}</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={nameEn} 
                      onChange={(e) => setNameEn(e.target.value)} 
                      placeholder="Retained Earnings"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2">
                  <div className="form-group">
                    <label className="form-label">{t('accounts.type')}</label>
                    <select 
                      className="form-control" 
                      value={type} 
                      onChange={(e) => setType(e.target.value as any)}
                      disabled={!!parentAccount}
                    >
                      <option value="asset">{t('accounts.asset')}</option>
                      <option value="liability">{t('accounts.liability')}</option>
                      <option value="equity">{t('accounts.equity')}</option>
                      <option value="revenue">{t('accounts.revenue')}</option>
                      <option value="expense">{t('accounts.expense')}</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">{t('accounts.nature')}</label>
                    <select 
                      className="form-control" 
                      value={nature} 
                      onChange={(e) => setNature(e.target.value as any)}
                      disabled={!!parentAccount}
                    >
                      <option value="debit">{t('accounts.debit')}</option>
                      <option value="credit">{t('accounts.credit')}</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <input 
                    type="checkbox" 
                    id="isGroupAcc"
                    checked={isGroup} 
                    onChange={(e) => setIsGroup(e.target.checked)} 
                    style={{ marginTop: '0.25rem', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="isGroupAcc" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                    <strong style={{ display: 'block', color: 'hsl(var(--foreground))' }}>{t('accounts.isGroup')}</strong>
                    <span style={{ color: 'hsl(var(--foreground-muted))', fontSize: '0.75rem' }}>{t('accounts.isGroupDesc')}</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
