import React, { useState, useEffect } from 'react';
import { X, Tag, Printer, Smartphone, FileText, Check } from 'lucide-react';
import { printRepairDeviceLabel, printRepairCustomerReceipt, RepairPrintData } from '../utils/repairPrint';

interface RepairPrintModalProps {
  repair: RepairPrintData;
  onClose: () => void;
}

export default function RepairPrintModal({ repair, onClose }: RepairPrintModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'label' | 'receipt'>('label');
  const [printerSettings, setPrinterSettings] = useState<any>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/printer-settings').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/company').then(r => r.ok ? r.json() : null).catch(() => null)
    ]).then(([pSettings, comp]) => {
      if (pSettings) setPrinterSettings(pSettings);
      if (comp) setCompanyInfo(comp);
    });
  }, []);

  const handlePrint = () => {
    if (selectedFormat === 'label') {
      printRepairDeviceLabel(repair, printerSettings);
    } else {
      printRepairCustomerReceipt(repair, companyInfo);
    }
  };

  const customerName = repair.customer_name || 'Walk-in Customer';
  const phone = repair.customer_phone || repair.phone || '';
  const quoteVal = Number(repair.total_quote || 0);
  const depositVal = Number(repair.deposit_paid || 0);
  const remainingVal = Number(repair.remaining_balance || (quoteVal - depositVal));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-850">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded">
              <Printer size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Print Repair Documentation
              </h3>
              <p className="text-xs text-neutral-500 font-mono">
                Job #{repair.id} — {repair.device_model}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded cursor-pointer transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-sm">
          
          {/* Format Selector Cards */}
          <div className="grid grid-cols-2 gap-3">
            
            {/* 1. Device Sticker (Dymo / Label) */}
            <button
              type="button"
              onClick={() => setSelectedFormat('label')}
              className={`p-3.5 rounded border text-left flex flex-col justify-between transition-all cursor-pointer ${
                selectedFormat === 'label'
                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 bg-blue-600 text-white rounded">
                  <Tag size={16} />
                </div>
                {selectedFormat === 'label' && (
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-0.5">
                    <Check size={14} /> Selected
                  </span>
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-neutral-900 dark:text-neutral-100">Device Sticker</div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Dymo / Label printer sticker with clean typography to stick on phone
                </div>
              </div>
            </button>

            {/* 2. Customer Receipt Ticket (Thermal) */}
            <button
              type="button"
              onClick={() => setSelectedFormat('receipt')}
              className={`p-3.5 rounded border text-left flex flex-col justify-between transition-all cursor-pointer ${
                selectedFormat === 'receipt'
                  ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20 shadow-xs'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800/50 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 bg-neutral-700 text-white rounded">
                  <FileText size={16} />
                </div>
                {selectedFormat === 'receipt' && (
                  <span className="text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-0.5">
                    <Check size={14} /> Selected
                  </span>
                )}
              </div>
              <div>
                <div className="font-bold text-sm text-neutral-900 dark:text-neutral-100">Customer Ticket</div>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                  80mm / 58mm thermal receipt voucher for customer collection
                </div>
              </div>
            </button>
          </div>

          {/* Live Preview Box */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded p-3 bg-neutral-50 dark:bg-neutral-850">
            <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Smartphone size={12} /> Preview Summary
            </div>
            
            {selectedFormat === 'label' ? (
              <div className="p-3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded text-xs space-y-1.5 font-mono shadow-xs">
                <div className="flex justify-between items-center border-b border-neutral-300 pb-1 font-bold">
                  <span className="bg-black text-white px-2 py-0.5 rounded text-[11px]">JOB #{repair.id}</span>
                  <span className="text-neutral-600 text-[10px]">{new Date().toLocaleDateString('en-IE', { day: '2-digit', month: 'short' })}</span>
                </div>
                <div className="font-bold text-neutral-900 dark:text-white uppercase truncate text-sm">{repair.device_model}</div>
                <div className="text-xs text-neutral-700 dark:text-neutral-300 truncate font-semibold">👤 {customerName} {phone ? `• 📞 ${phone}` : ''}</div>
                <div className="text-[11px] text-neutral-600 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 p-1 rounded">Fault: {repair.issue || 'General Inspection / Repair'}</div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-dashed border-neutral-300">
                  <span>{quoteVal > 0 ? `Quote: €${quoteVal.toFixed(2)}` : 'Quote: Pending'}</span>
                  {depositVal > 0 && <span>Dep: €${depositVal.toFixed(2)}</span>}
                  <span>{remainingVal > 0 ? `Bal: €${remainingVal.toFixed(2)}` : ''}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 rounded text-xs space-y-1 font-mono shadow-xs">
                <div className="text-center font-bold">{companyInfo?.name || 'EPOS REPAIRS'}</div>
                <div className="text-center text-[10px] border-b border-dashed pb-1">REPAIR CHECK-IN #{repair.id}</div>
                <div className="flex justify-between text-[11px]">
                  <span>Customer:</span>
                  <span className="font-semibold">{customerName}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>Device:</span>
                  <span className="font-semibold">{repair.device_model}</span>
                </div>
                <div className="border-t border-b border-dashed py-1 text-[11px] flex justify-between font-bold">
                  <span>Balance Due:</span>
                  <span>€{remainingVal > 0 ? remainingVal.toFixed(2) : (quoteVal > 0 ? quoteVal.toFixed(2) : '0.00')}</span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Action Footer */}
        <div className="px-5 py-3.5 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-850 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                printRepairDeviceLabel(repair, printerSettings);
              }}
              className="px-3.5 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-750 text-neutral-800 dark:text-neutral-200 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Tag size={14} className="text-blue-600" />
              <span>Dymo Sticker</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Printer size={15} />
              <span>Print {selectedFormat === 'label' ? 'Device Sticker' : 'Customer Ticket'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
