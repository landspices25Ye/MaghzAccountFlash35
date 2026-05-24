import { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet,
  Calendar,
  ArrowUpRight
} from 'lucide-react';
import { useTranslation } from '../../core/i18n/useTranslation';
import { useAppStore } from '../../core/store/appStore';
import { pgPostTransaction, pgGetTransactions } from '../../database/pgClient';
import { realmPostTransaction, realmGetTransactions, realmAddLog } from '../../database/realmClient';

interface Account {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  isGroup: boolean;
  type: string;
  nature: string;
  balance: number;
}

interface JournalLine {
  accountId: string;
  accountName: string;
  accountCode: string;
  debit: number;
  credit: number;
  memo: string;
}

interface JournalEntriesProps {
  accounts: Account[];
  onRefresh: () => void;
}

export default function JournalEntries({ accounts, onRefresh }: JournalEntriesProps) {
  const { t, language } = useTranslation();
  const dbMode = useAppStore((state) => state.dbMode);
  const dbConnected = useAppStore((state) => state.dbConnected);
  const activeCompanyId = useAppStore((state) => state.activeCompanyId);

  const isPg = dbMode === 'postgresql' && dbConnected;

  // View state: 'list' or 'new'
  const [view, setView] = useState<'list' | 'new'>('list');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form states for New Voucher
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: '', accountName: '', accountCode: '', debit: 0, credit: 0, memo: '' },
    { accountId: '', accountName: '', accountCode: '', debit: 0, credit: 0, memo: '' },
  ]);

  // Autocomplete dropdown focus tracking
  const [focusedLineIndex, setFocusedLineIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch transactions list
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      if (isPg) {
        const res = await pgGetTransactions(activeCompanyId || undefined);
        if (res.success && res.rows) {
          setTransactions(res.rows);
        }
      } else {
        const res = await realmGetTransactions(activeCompanyId || undefined);
        if (res.success && res.transactions) {
          setTransactions(res.transactions);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [isPg, activeCompanyId]);

  // Auto-fill reference
  useEffect(() => {
    if (view === 'new') {
      const pad = (transactions.length + 1).toString().padStart(4, '0');
      setReference(`JV-${pad}`);
    }
  }, [view, transactions]);

  // Non-group accounts for selection
  const ledgerAccounts = accounts.filter(a => !a.isGroup);

  // Autocomplete accounts filter
  const filteredAccounts = ledgerAccounts.filter(acc => {
    const term = searchQuery.toLowerCase();
    return (
      acc.code.includes(term) ||
      acc.nameAr.toLowerCase().includes(term) ||
      (acc.nameEn && acc.nameEn.toLowerCase().includes(term))
    );
  });

  const handleAddLine = () => {
    setLines([...lines, { accountId: '', accountName: '', accountCode: '', debit: 0, credit: 0, memo: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, idx) => idx !== index));
  };

  const handleLineChange = (index: number, field: keyof JournalLine, value: any) => {
    const updated = [...lines];
    if (field === 'debit') {
      const numVal = parseFloat(value) || 0;
      updated[index].debit = numVal;
      if (numVal > 0) updated[index].credit = 0; // standard ledger rule: line cannot have both Dr and Cr
    } else if (field === 'credit') {
      const numVal = parseFloat(value) || 0;
      updated[index].credit = numVal;
      if (numVal > 0) updated[index].debit = 0;
    } else {
      updated[index][field] = value as never;
    }
    setLines(updated);
  };

  const handleSelectAccount = (index: number, account: Account) => {
    const updated = [...lines];
    updated[index].accountId = account.id;
    updated[index].accountCode = account.code;
    updated[index].accountName = language === 'ar' ? account.nameAr : (account.nameEn || account.nameAr);
    setLines(updated);
    setFocusedLineIndex(null);
    setSearchQuery('');
  };

  // Math Calculations
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  const diff = Math.abs(totalDebit - totalCredit);
  const isBalanced = totalDebit > 0 && diff === 0;

  const handlePost = async () => {
    if (!isBalanced) {
      setErrorMsg(t('journal.mustBalance'));
      return;
    }

    // Verify all lines have accounts selected and non-zero values
    const invalidLine = lines.some(l => !l.accountId || (l.debit === 0 && l.credit === 0));
    if (invalidLine) {
      setErrorMsg(language === 'ar' ? 'يرجى اختيار الحساب وإدخال قيمة مدينة أو دائنة لكل سطر.' : 'Please select an account and input a debit or credit value for each row.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const payload = {
      companyId: activeCompanyId || '',
      date,
      reference,
      description,
      totalAmount: totalDebit,
      entries: lines.map(l => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        memo: l.memo || description || undefined,
      }))
    };

    try {
      let res;
      if (isPg) {
        res = await pgPostTransaction(payload);
      } else {
        res = await realmPostTransaction(payload);
      }

      if (res.success) {
        // Activity log
        const logMsg = `ترحيل سند القيد اليومي ${reference}`;
        await realmAddLog(
          activeCompanyId || '',
          'مدير النظام',
          logMsg,
          'الحسابات (GL)',
          `قيد يومية متوازن بقيمة ${totalDebit.toLocaleString()} ر.ي بنجاح.`
        );

        setSuccessMsg(t('journal.successPost'));
        // Reset form
        setDate(new Date().toISOString().substring(0, 10));
        setDescription('');
        setLines([
          { accountId: '', accountName: '', accountCode: '', debit: 0, credit: 0, memo: '' },
          { accountId: '', accountName: '', accountCode: '', debit: 0, credit: 0, memo: '' },
        ]);
        
        // Refresh and switch back
        onRefresh();
        await fetchTransactions();
        setTimeout(() => {
          setView('list');
          setSuccessMsg(null);
        }, 1500);
      } else {
        setErrorMsg(res.error || t('journal.errorPost'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('journal.errorPost'));
    } finally {
      setLoading(false);
    }
  };

  const getAccountNameById = (id: string) => {
    const acc = accounts.find(a => a.id === id);
    if (!acc) return '';
    return `${acc.code} - ${language === 'ar' ? acc.nameAr : (acc.nameEn || acc.nameAr)}`;
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-YE' : 'en-US', {
      style: 'currency',
      currency: 'YER',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="journal-layout animate-fade-in">
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>{view === 'list' ? t('journal.entryList') : t('journal.newEntry')}</h2>
        <button 
          onClick={() => setView(view === 'list' ? 'new' : 'list')}
          className="btn btn-secondary"
        >
          {view === 'list' ? (
            <>
              <Plus size={16} />
              {t('journal.newEntry')}
            </>
          ) : (
            t('common.cancel')
          )}
        </button>
      </div>

      {successMsg && (
        <div style={{ display: 'flex', gap: '0.5rem', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.9rem', alignItems: 'center' }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div style={{ display: 'flex', gap: '0.5rem', color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.9rem', alignItems: 'center' }}>
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── VIEW 1: NEW VOUCHER FORM ───────────────────────────────────────────── */}
      {view === 'new' && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="journal-header-form">
            <div className="form-group">
              <label className="form-label">{t('journal.date')}</label>
              <input 
                type="date" 
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">{t('journal.reference')}</label>
              <input 
                type="text" 
                className="form-control"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="JV-0001"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('journal.description')}</label>
              <input 
                type="text" 
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="مثال: فاتورة تسوية حسابات عهدة نقدية"
              />
            </div>
          </div>

          {/* Journal Entries Grid Table */}
          <div className="table-container">
            <table className="journal-table">
              <thead>
                <tr>
                  <th style={{ width: '30%', textAlign: 'start' }}>{t('journal.account')} *</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>{t('journal.debit')}</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>{t('journal.credit')}</th>
                  <th style={{ width: '35%', textAlign: 'start' }}>{t('journal.memo')}</th>
                  <th style={{ width: '5%', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx}>
                    <td>
                      <div className="autocomplete-container">
                        <input
                          type="text"
                          className="form-control"
                          placeholder={t('journal.selectAccount')}
                          value={focusedLineIndex === idx ? searchQuery : (line.accountCode ? `${line.accountCode} - ${line.accountName}` : '')}
                          onFocus={() => {
                            setFocusedLineIndex(idx);
                            setSearchQuery(line.accountCode ? `${line.accountCode} - ${line.accountName}` : '');
                          }}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                          }}
                        />
                        {focusedLineIndex === idx && (
                          <div className="autocomplete-dropdown">
                            {filteredAccounts.length > 0 ? (
                              filteredAccounts.map(acc => (
                                <div 
                                  key={acc.id} 
                                  className="autocomplete-item"
                                  onClick={() => handleSelectAccount(idx, acc)}
                                >
                                  <span>{language === 'ar' ? acc.nameAr : (acc.nameEn || acc.nameAr)}</span>
                                  <span className="autocomplete-item-code">{acc.code}</span>
                                </div>
                              ))
                            ) : (
                              <div style={{ padding: '0.5rem 0.875rem', color: 'hsl(var(--foreground-muted))', fontSize: '0.8rem' }}>
                                {language === 'ar' ? 'لا يوجد حسابات مطابقة.' : 'No accounts matching.'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="form-control"
                        style={{ textAlign: 'center', fontFamily: 'monospace' }}
                        value={line.debit || ''}
                        onChange={(e) => handleLineChange(idx, 'debit', e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        className="form-control"
                        style={{ textAlign: 'center', fontFamily: 'monospace' }}
                        value={line.credit || ''}
                        onChange={(e) => handleLineChange(idx, 'credit', e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td>
                      <input 
                        type="text" 
                        className="form-control"
                        value={line.memo}
                        onChange={(e) => handleLineChange(idx, 'memo', e.target.value)}
                        placeholder={t('journal.memo')}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => handleRemoveLine(idx)}
                        className="btn-icon"
                        disabled={lines.length <= 2}
                        style={{ color: '#ef4444' }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button onClick={handleAddLine} className="btn btn-secondary">
              <Plus size={16} />
              {t('journal.addRow')}
            </button>
          </div>

          {/* Real-time Balance Checking and Posting button */}
          <div className="grid grid-cols-2" style={{ alignItems: 'center' }}>
            <div className={`balance-status-bar ${isBalanced ? 'balanced' : 'unbalanced'}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isBalanced ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>
                  {isBalanced 
                    ? t('journal.balanced') 
                    : `${t('journal.unbalanced')} ${formatCurrency(diff)}`
                  }
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', fontFamily: 'monospace' }}>
                <span>Dr: {formatCurrency(totalDebit)}</span>
                <span>Cr: {formatCurrency(totalCredit)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button 
                onClick={handlePost} 
                className="btn btn-primary"
                disabled={loading || !isBalanced}
                style={{ padding: '0.75rem 2rem' }}
              >
                {loading ? t('common.loading') : t('journal.post')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── VIEW 2: HISTORICAL VOUCHERS LIST ──────────────────────────────────────── */}
      {view === 'list' && (
        <div className="journal-history-list">
          {transactions.length > 0 ? (
            transactions.map((tx) => (
              <div key={tx.id} className="journal-voucher-card animate-fade-in">
                <div className="journal-voucher-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'hsl(var(--primary) / 0.1)', color: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <ArrowUpRight size={18} />
                    </div>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.95rem' }}>{tx.reference || 'JV-UNNAMED'}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--foreground-muted))', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Calendar size={12} />
                        {new Date(tx.date).toLocaleDateString(language === 'ar' ? 'ar-YE' : 'en-US')}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'end' }}>
                      <span style={{ fontSize: '0.75rem', color: 'hsl(var(--foreground-muted))', display: 'block' }}>{t('journal.total')}</span>
                      <strong style={{ color: 'hsl(var(--primary))', fontFamily: 'monospace' }}>{formatCurrency(tx.totalAmount)}</strong>
                    </div>
                    <span style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                      {language === 'ar' ? 'مرحل' : 'Posted'}
                    </span>
                  </div>
                </div>

                <div className="journal-voucher-body">
                  {tx.description && (
                    <p style={{ fontSize: '0.85rem', color: 'hsl(var(--foreground-muted))', marginBottom: '0.75rem' }}>
                      {tx.description}
                    </p>
                  )}

                  <div className="voucher-details-grid">
                    {tx.entries && tx.entries.map((entry: any) => (
                      <div key={entry.id} className="voucher-line-item">
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                            {getAccountNameById(entry.accountId)}
                          </span>
                          {entry.memo && (
                            <span style={{ fontSize: '0.75rem', color: 'hsl(var(--foreground-muted))' }}>
                              {entry.memo}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                          {entry.debit > 0 && (
                            <span className="voucher-line-side debit">
                              Dr: {formatCurrency(entry.debit)}
                            </span>
                          )}
                          {entry.credit > 0 && (
                            <span className="voucher-line-side credit">
                              Cr: {formatCurrency(entry.credit)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center', color: 'hsl(var(--foreground-muted))', gap: '1rem' }}>
              <FileSpreadsheet size={48} style={{ color: 'hsl(var(--foreground-muted))', opacity: 0.5 }} />
              <div>
                <h3>{t('dashboard.noTransactions')}</h3>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  {language === 'ar' ? 'سجل قيود اليومية المحاسبية فارغ حالياً.' : 'The general ledger is currently empty.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
