import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Receipt, 
  CreditCard, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight,
  Wallet,
  Calendar,
  Building,
  Tag,
  FileText
} from 'lucide-react';
import { api, Category, Account, Transaction, Bill } from '../lib/api';
import { useTheme } from '../lib/ThemeContext';
import { useToast } from '../lib/ToastContext';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transactionToEdit?: Transaction | null;
}

type TxType = 'expense' | 'income' | 'bill' | 'savings' | 'debt';

interface TypeConfig {
  id: TxType;
  label: string;
  badgeTitle: string;
  badgeDesc: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  merchantLabel: string;
  merchantPlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  categoryLabel: string;
  accountLabel: string;
  dateLabel: string;
  submitText: string;
  quickChips: string[];
  amountPresets: number[];
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transactionToEdit,
}) => {
  const [transactionType, setTransactionType] = useState<TxType>('expense');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<Bill[]>([]);
  const [suggestedCategory, setSuggestedCategory] = useState<{ id: string; name: string; conf: number; rule?: string } | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currency, currencySymbol } = useTheme();
  const { success, error: toastError } = useToast();

  // Type definitions & dynamic behavior for each transaction type
  const typeConfigs: Record<TxType, TypeConfig> = {
    expense: {
      id: 'expense',
      label: 'Expense',
      badgeTitle: 'Daily Expense / Spending',
      badgeDesc: 'Record personal purchases, groceries, food, dining, and lifestyle spends',
      color: '#E53935',
      bgColor: 'rgba(229, 57, 53, 0.08)',
      borderColor: 'rgba(229, 57, 53, 0.25)',
      icon: <ArrowDownRight size={17} color="#E53935" />,
      merchantLabel: 'Merchant / Store / Payee',
      merchantPlaceholder: 'e.g. Swiggy, Amazon, DMart, Uber, Starbucks...',
      notesLabel: 'Notes & Item Description (Optional)',
      notesPlaceholder: 'e.g. Dinner with team, weekly grocery shopping, shoes...',
      categoryLabel: 'Expense Category',
      accountLabel: 'Paid From Account',
      dateLabel: 'Expense Date',
      submitText: 'Save Expense',
      quickChips: ['Groceries', 'Food & Dining', 'Uber / Transport', 'Shopping', 'Pharmacy'],
      amountPresets: [100, 200, 500, 1000, 2000, 5000]
    },
    income: {
      id: 'income',
      label: 'Income',
      badgeTitle: 'Income & Earnings Received',
      badgeDesc: 'Record salary, freelance invoices, dividends, business revenue, or cash gifts',
      color: '#006B45',
      bgColor: 'rgba(0, 107, 69, 0.08)',
      borderColor: 'rgba(0, 107, 69, 0.25)',
      icon: <ArrowUpRight size={17} color="#006B45" />,
      merchantLabel: 'Income Source / Employer / Payer',
      merchantPlaceholder: 'e.g. Tech Corp, Client Acme, Rental Tenant, Upwork...',
      notesLabel: 'Pay Slip / Invoice Ref (Optional)',
      notesPlaceholder: 'e.g. October 2026 Salary, Milestone #2 invoice, Bonus...',
      categoryLabel: 'Income Category',
      accountLabel: 'Deposited Into Account',
      dateLabel: 'Received Date',
      submitText: 'Save Income',
      quickChips: ['Full-time Salary', 'Freelance Project', 'Rental Income', 'Dividend / Interest', 'Bonus / Gift'],
      amountPresets: [1000, 5000, 10000, 25000, 50000, 100000]
    },
    bill: {
      id: 'bill',
      label: 'Bill',
      badgeTitle: 'Recurring Bill & Utility Payment',
      badgeDesc: 'Track electricity, house rent, broadband WiFi, mobile, or subscription bills',
      color: '#16A6B6',
      bgColor: 'rgba(22, 166, 182, 0.08)',
      borderColor: 'rgba(22, 166, 182, 0.25)',
      icon: <Receipt size={17} color="#16A6B6" />,
      merchantLabel: 'Biller / Service Provider',
      merchantPlaceholder: 'e.g. Tata Power, Airtel Broadband, Landlord Rent, Netflix, Adani Gas...',
      notesLabel: 'Consumer No. / Bill Cycle / Ref (Optional)',
      notesPlaceholder: 'e.g. Consumer ID: 1029384, October Electricity, Flat 402 Rent...',
      categoryLabel: 'Bill Category',
      accountLabel: 'Paid From Account',
      dateLabel: 'Bill Payment Date',
      submitText: 'Record Bill Payment',
      quickChips: ['Electricity Bill', 'House Rent', 'WiFi / Broadband', 'Mobile Recharge', 'Piped Gas', 'Subscription'],
      amountPresets: [500, 1000, 1500, 2500, 5000, 15000]
    },
    savings: {
      id: 'savings',
      label: 'Savings',
      badgeTitle: 'Savings & Investment Deposit',
      badgeDesc: 'Record transfers into Mutual Funds, Fixed Deposits, Emergency Fund, or PPF',
      color: '#2563EB',
      bgColor: 'rgba(37, 99, 235, 0.08)',
      borderColor: 'rgba(37, 99, 235, 0.25)',
      icon: <TrendingUp size={17} color="#2563EB" />,
      merchantLabel: 'Savings Goal / Investment / Scheme',
      merchantPlaceholder: 'e.g. Emergency Fund, HDFC Fixed Deposit, Zerodha Nifty 50, PPF...',
      notesLabel: 'Folio / Scheme Plan Notes (Optional)',
      notesPlaceholder: 'e.g. Monthly SIP installment, 1-yr FD lock-in, Gold savings...',
      categoryLabel: 'Savings Category',
      accountLabel: 'Transferred From Account',
      dateLabel: 'Investment Date',
      submitText: 'Save to Investments',
      quickChips: ['Monthly SIP', 'Fixed Deposit (FD)', 'Emergency Fund', 'Index Mutual Fund', 'PPF / EPF'],
      amountPresets: [500, 1000, 2000, 5000, 10000, 25000]
    },
    debt: {
      id: 'debt',
      label: 'Debt Payment',
      badgeTitle: 'Debt Repayment / Loan / EMI',
      badgeDesc: 'Record credit card bill clearance, home/car loan EMI, or personal debt repayment',
      color: '#7C3AED',
      bgColor: 'rgba(124, 58, 237, 0.08)',
      borderColor: 'rgba(124, 58, 237, 0.25)',
      icon: <CreditCard size={17} color="#7C3AED" />,
      merchantLabel: 'Lender / Bank / Card Name',
      merchantPlaceholder: 'e.g. HDFC Regalia Credit Card, SBI Home Loan, Car EMI, Friend repayment...',
      notesLabel: 'Loan Account No. / Statement Ref (Optional)',
      notesPlaceholder: 'e.g. EMI #14 of 36, Full statement balance cleared, Principal repayment...',
      categoryLabel: 'Debt Category',
      accountLabel: 'Paid From Account',
      dateLabel: 'Repayment Date',
      submitText: 'Record Debt Payment',
      quickChips: ['Credit Card Bill', 'Home Loan EMI', 'Car / Bike EMI', 'Personal Loan', 'Friend / Relative Loan'],
      amountPresets: [1000, 2000, 5000, 10000, 20000, 50000]
    }
  };

  const currentConfig = typeConfigs[transactionType];

  // Strictly filter categories to match current transaction type!
  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.category_type === transactionType);
  }, [categories, transactionType]);

  // Initial load
  useEffect(() => {
    if (isOpen) {
      api.getCategories().then(cats => {
        setCategories(cats);
        // Default category matching initial type
        if (!categoryId) {
          const matching = cats.filter(c => c.category_type === (transactionToEdit?.transaction_type || 'expense'));
          if (matching.length > 0) {
            setCategoryId(matching[0].id);
          }
        }
      }).catch(() => {});

      api.getAccounts().then(accs => {
        setAccounts(accs);
        if (accs.length > 0 && !accountId) {
          setAccountId(accs[0].id);
        }
      }).catch(() => {});

      api.getBills().then(bills => {
        setUpcomingBills(bills.filter(b => b.status === 'upcoming' || b.status === 'overdue'));
      }).catch(() => {});

      if (transactionToEdit) {
        setTransactionType(transactionToEdit.transaction_type as TxType);
        setAmount(String(transactionToEdit.amount));
        setMerchant(transactionToEdit.merchant || '');
        setNote(transactionToEdit.note || '');
        setTransactionDate(transactionToEdit.transaction_date);
        setCategoryId(transactionToEdit.category_id || '');
        setAccountId(transactionToEdit.account_id || '');
      } else {
        // Reset form
        setAmount('');
        setMerchant('');
        setNote('');
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setSuggestedCategory(null);
      }
      setError(null);
    }
  }, [isOpen, transactionToEdit]);

  // When transaction type changes, automatically set first valid category for that type
  const handleTypeChange = (newType: TxType) => {
    setTransactionType(newType);
    setSuggestedCategory(null);

    const matches = categories.filter(c => c.category_type === newType);
    if (matches.length > 0) {
      setCategoryId(matches[0].id);
    } else {
      setCategoryId('');
    }
  };

  // Live Smart Categorization trigger (only for expense)
  useEffect(() => {
    if (transactionToEdit || transactionType !== 'expense') return;
    const term = `${merchant} ${note}`.trim();
    if (term.length < 3) {
      setSuggestedCategory(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.suggestCategory(merchant, note);
        if (res.suggested_category_id && res.confidence >= 0.70) {
          const matched = categories.find(c => c.id === res.suggested_category_id);
          if (matched && matched.category_type === 'expense') {
            setSuggestedCategory({
              id: res.suggested_category_id,
              name: res.suggested_category_name || matched.name,
              conf: res.confidence,
              rule: res.matched_rule || undefined
            });
          }
        } else {
          setSuggestedCategory(null);
        }
      } catch {
        // ignore
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [merchant, note, transactionType, categories, transactionToEdit]);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        transaction_type: transactionType,
        amount: Number(amount),
        merchant: merchant.trim() || undefined,
        note: note.trim() || undefined,
        transaction_date: transactionDate,
        category_id: categoryId || undefined,
        account_id: accountId || undefined,
        currency: currency,
      };

      if (transactionToEdit) {
        await api.updateTransaction(transactionToEdit.id, payload);
        success('Transaction updated successfully!', 'Changes Saved');
      } else {
        await api.createTransaction(payload);
        success(
          `Recorded ${currentConfig.label} of ${currencySymbol}${Number(amount).toLocaleString()}`,
          'Transaction Saved'
        );
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddPresetAmount = (presetVal: number) => {
    const current = Number(amount) || 0;
    setAmount(String(current + presetVal));
  };

  const handleApplyUpcomingBill = (bill: Bill) => {
    setMerchant(bill.name);
    setAmount(String(bill.expected_amount));
    if (bill.category_id) {
      setCategoryId(bill.category_id);
    }
    if (bill.account_id) {
      setAccountId(bill.account_id);
    }
    setNote(`Payment for ${bill.name} (Due: ${bill.due_date})`);
  };

  const handleQuickChipClick = (chipText: string) => {
    if (!merchant) {
      setMerchant(chipText);
    } else if (!note) {
      setNote(chipText);
    } else {
      setNote(prev => `${prev} • ${chipText}`);
    }
  };

  const typeButtons: { id: TxType; label: string; color: string; icon: React.ReactNode }[] = [
    { id: 'expense', label: 'Expense', color: '#E53935', icon: <ArrowDownRight size={14} /> },
    { id: 'income', label: 'Income', color: '#006B45', icon: <ArrowUpRight size={14} /> },
    { id: 'bill', label: 'Bill', color: '#16A6B6', icon: <Receipt size={14} /> },
    { id: 'savings', label: 'Savings', color: '#2563EB', icon: <TrendingUp size={14} /> },
    { id: 'debt', label: 'Debt Payment', color: '#7C3AED', icon: <CreditCard size={14} /> },
  ];

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header" style={{ borderBottom: `2px solid ${currentConfig.borderColor}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: currentConfig.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {currentConfig.icon}
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                {transactionToEdit ? 'Edit Transaction Record' : `Record ${currentConfig.label}`}
              </h2>
              <p style={{ fontSize: '11.5px', color: 'var(--muted)', margin: 0, marginTop: '2px' }}>
                {currentConfig.badgeDesc}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="btn-icon"
            style={{ width: '32px', height: '32px' }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
            {error && (
              <div style={{
                padding: '11px 14px',
                background: 'var(--expense-light)',
                color: 'var(--expense)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                border: '1px solid var(--expense-border)'
              }} role="alert">
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Type selector tabs */}
            <div style={{ marginBottom: '18px' }}>
              <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 700 }}>
                Transaction Type
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {typeButtons.map((t) => {
                  const isSelected = transactionType === t.id;
                  return (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => handleTypeChange(t.id)}
                      style={{
                        flex: '1 1 85px',
                        padding: '9px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        border: isSelected ? `2px solid ${t.color}` : '1px solid var(--border)',
                        background: isSelected ? currentConfig.bgColor : 'var(--surface-subtle)',
                        color: isSelected ? t.color : 'var(--muted)',
                        boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {t.icon}
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* If Bill tab is selected and there are upcoming bills, show quick-select */}
            {transactionType === 'bill' && upcomingBills.length > 0 && (
              <div style={{
                marginBottom: '16px',
                padding: '10px 12px',
                background: 'rgba(22, 166, 182, 0.08)',
                borderRadius: 'var(--radius-sm)',
                border: '1px dashed rgba(22, 166, 182, 0.4)'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#16A6B6', textTransform: 'uppercase', marginBottom: '6px' }}>
                  ⚡ Quick Pick from Scheduled Bills:
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {upcomingBills.slice(0, 3).map(bill => (
                    <button
                      key={bill.id}
                      type="button"
                      onClick={() => handleApplyUpcomingBill(bill)}
                      style={{
                        padding: '4px 9px',
                        borderRadius: '6px',
                        background: 'var(--surface)',
                        border: '1px solid rgba(22, 166, 182, 0.3)',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: 'var(--text)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span>{bill.name}</span>
                      <span style={{ color: '#16A6B6', fontWeight: 800 }}>({currencySymbol}{Number(bill.expected_amount).toLocaleString()})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Amount input & Quick Chips */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  Amount ({currencySymbol})
                </label>
                <span style={{ fontSize: '11px', color: currentConfig.color, fontWeight: 700 }}>
                  {currentConfig.label} Amount
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                className="form-input font-tabular"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                autoFocus
                style={{ fontSize: '20px', fontWeight: 800, borderColor: amount ? currentConfig.borderColor : undefined }}
              />
              {/* Type-Specific Quick Amount Chips */}
              <div className="quick-chips-row" style={{ marginTop: '8px' }}>
                {currentConfig.amountPresets.map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleAddPresetAmount(val)}
                    className="quick-chip font-tabular"
                    style={{ fontSize: '11px', padding: '3px 7px' }}
                  >
                    +{currencySymbol}{val.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Merchant / Payee / Source / Lender Input */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {currentConfig.merchantLabel}
                </label>
                <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  Required
                </span>
              </div>
              <input
                type="text"
                placeholder={currentConfig.merchantPlaceholder}
                className="form-input"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                required
              />

              {/* Quick Type Chips to help user quickly fill names */}
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                {currentConfig.quickChips.map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => handleQuickChipClick(chip)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    + {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Notes / Details Input */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontWeight: 700 }}>
                {currentConfig.notesLabel}
              </label>
              <input
                type="text"
                placeholder={currentConfig.notesPlaceholder}
                className="form-input"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* AI Smart Suggestion Banner (for expenses) */}
            {suggestedCategory && !categoryId && transactionType === 'expense' && (
              <div style={{
                background: 'var(--green-50)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="var(--green-600)" />
                  <div>
                    <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)' }}>
                      AI Suggested: {suggestedCategory.name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '6px' }}>
                      ({Math.round(suggestedCategory.conf * 100)}% match)
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCategoryId(suggestedCategory.id)}
                  className="btn btn-primary"
                  style={{ padding: '3px 8px', fontSize: '11px', minHeight: '24px' }}
                >
                  <Check size={12} />
                  Apply
                </button>
              </div>
            )}

            {/* Strictly Filtered Category Select */}
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {currentConfig.categoryLabel}
                </label>
                <span style={{ fontSize: '11px', color: currentConfig.color, fontWeight: 600 }}>
                  Only {currentConfig.label} categories ({filteredCategories.length})
                </span>
              </div>
              <select
                className="form-select"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {filteredCategories.length === 0 ? (
                  <option value="">No {transactionType} categories configured</option>
                ) : (
                  filteredCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Account & Date in row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {currentConfig.accountLabel}
                </label>
                <select
                  className="form-select"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  required
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({currencySymbol}{Number(a.current_balance).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 700 }}>
                  {currentConfig.dateLabel}
                </label>
                <input
                  type="date"
                  className="form-input"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: `1px solid var(--border)` }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="btn btn-primary"
              style={{
                backgroundColor: currentConfig.color,
                borderColor: currentConfig.color,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {currentConfig.icon}
              {isSubmitting ? 'Saving...' : transactionToEdit ? 'Update Transaction' : currentConfig.submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
