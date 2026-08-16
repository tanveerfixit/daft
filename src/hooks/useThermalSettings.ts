import { useState, useEffect } from 'react';

export interface ThermalPrinterSettings {
  font_family: string;
  font_size: string;
  show_logo: boolean;
  show_business_name: boolean;
  show_business_address: boolean;
  show_business_phone: boolean;
  show_business_email: boolean;
  show_customer_info: boolean;
  show_invoice_number: boolean;
  show_date: boolean;
  show_items_table: boolean;
  show_totals: boolean;
  show_footer: boolean;
  show_powered_by: boolean;
  eod_show_cash_summary: boolean;
  eod_show_payment_type: boolean;
  eod_show_total_cash: boolean;
  eod_show_total_card_sale: boolean;
  eod_show_total: boolean;
  eod_footer_type: string;
  eod_footer_custom_text: string;
  footer_text: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

export function useThermalSettings() {
  const [settings, setSettings] = useState<ThermalPrinterSettings | null>(null);
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, companyRes] = await Promise.all([
          fetch('/api/thermal-printer-settings'),
          fetch('/api/company')
        ]);

        const settingsData = settingsRes.ok ? await settingsRes.json().catch(() => null) : null;
        const companyData = companyRes.ok ? await companyRes.json().catch(() => null) : null;

        if (settingsData && typeof settingsData === 'object' && !Array.isArray(settingsData)) {
          setSettings({
            ...settingsData,
            show_logo: !!settingsData.show_logo,
            show_business_name: !!settingsData.show_business_name,
            show_business_address: !!settingsData.show_business_address,
            show_business_phone: !!settingsData.show_business_phone,
            show_business_email: !!settingsData.show_business_email,
            show_customer_info: !!settingsData.show_customer_info,
            show_invoice_number: !!settingsData.show_invoice_number,
            show_date: !!settingsData.show_date,
            show_items_table: !!settingsData.show_items_table,
            show_totals: !!settingsData.show_totals,
            show_footer: !!settingsData.show_footer,
            show_powered_by: !!settingsData.show_powered_by,
            eod_show_cash_summary: settingsData.eod_show_cash_summary !== undefined ? !!settingsData.eod_show_cash_summary : true,
            eod_show_payment_type: settingsData.eod_show_payment_type !== undefined ? !!settingsData.eod_show_payment_type : true,
            eod_show_total_cash: settingsData.eod_show_total_cash !== undefined ? !!settingsData.eod_show_total_cash : true,
            eod_show_total_card_sale: settingsData.eod_show_total_card_sale !== undefined ? !!settingsData.eod_show_total_card_sale : true,
            eod_show_total: settingsData.eod_show_total !== undefined ? !!settingsData.eod_show_total : true,
            eod_footer_type: settingsData.eod_footer_type || 'branch',
            eod_footer_custom_text: settingsData.eod_footer_custom_text || '',
          });
        }

        if (companyData) {
          setCompany({
            name: companyData.name || '',
            address: companyData.address || '',
            city: companyData.city || '',
            phone: companyData.phone || '',
            email: companyData.email || ''
          });
        }
      } catch (error) {
        console.error('Error fetching thermal settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { settings, company, loading };
}
