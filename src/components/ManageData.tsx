import React, { useState } from 'react';
import { 
  Download, 
  Truck, 
  Layers, 
  Factory, 
  Wrench, 
  Smartphone, 
  Store, 
  Receipt, 
  UserCircle, 
  Tag, 
  Percent, 
  ShieldCheck,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Database
} from 'lucide-react';

type ManageView = 
  | 'export' 
  | 'suppliers' 
  | 'categories' 
  | 'manufacturers' 
  | 'repair-problems' 
  | 'brand-models' 
  | 'vendors' 
  | 'expense-types' 
  | 'customer-types' 
  | 'conditional-prices' 
  | 'commissions' 
  | 'gdpr';

interface SidebarItem {
  id: ManageView;
  label: string;
  icon: React.ElementType;
}

const sidebarItems: SidebarItem[] = [
  { id: 'export', label: 'Export Data', icon: Download },
  { id: 'suppliers', label: 'Manage Suppliers', icon: Truck },
  { id: 'categories', label: 'Manage Product Categories', icon: Layers },
  { id: 'manufacturers', label: 'Manage Manufacturers', icon: Factory },
  { id: 'repair-problems', label: 'Manage Repair Problems', icon: Wrench },
  { id: 'brand-models', label: 'Manage Brand Models', icon: Smartphone },
  { id: 'vendors', label: 'Manage Vendors', icon: Store },
  { id: 'expense-types', label: 'Manage Expense Type', icon: Receipt },
  { id: 'customer-types', label: 'Manage Customer Type', icon: UserCircle },
  { id: 'conditional-prices', label: 'Manage Conditional Prices', icon: Tag },
  { id: 'commissions', label: 'Manage Commissions', icon: Percent },
  { id: 'gdpr', label: 'Manage EU GDPR', icon: ShieldCheck },
];

export default function ManageData() {
  const [activeView, setActiveView] = useState<ManageView>('export');

  const renderContent = () => {
    switch (activeView) {
      case 'export':
        return <ExportDataView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'categories':
        return <CategoriesView />;
      case 'manufacturers':
        return <ManufacturersView />;
      case 'brand-models':
        return <BrandModelsView />;
      case 'repair-problems':
        return (
          <ManagementPageTemplate
            title="Manage Repair Problems"
            description="Define common issues encountered during repairs. Standardizing problem descriptions helps in consistent pricing, better diagnostics, and clearer communication with customers."
            createButtonLabel="Add Problem"
            tableHeaders={['Problem Name']}
            renderTableRows={() => (
              <>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-700">Screen Cracked</td>
                </tr>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-700">Battery Replacement</td>
                </tr>
              </>
            )}
            renderSidePanel={() => (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Problem Name</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter problem name" />
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-all shadow-lg shadow-blue-100 mt-4">
                  Add Problem
                </button>
              </div>
            )}
          />
        );
      case 'vendors':
        return (
          <ManagementPageTemplate
            title="Manage Vendors"
            description="Manage third-party vendors and service partners. Track vendor details to manage outsourcing, specialized repairs, and external service integrations."
            createButtonLabel="Add Vendor"
            tableHeaders={['Vendor Name', 'Service Type']}
            renderTableRows={() => (
              <>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-700">Micro-Soldering Experts</td>
                  <td className="py-4 px-4 text-slate-500">Logic Board Repair</td>
                </tr>
              </>
            )}
            renderSidePanel={() => (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Vendor Name</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter vendor name" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Service Type</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter service type" />
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-all shadow-lg shadow-blue-100 mt-4">
                  Add Vendor
                </button>
              </div>
            )}
          />
        );
      case 'expense-types':
        return (
          <ManagementPageTemplate
            title="Manage Expense Types"
            description="Categorize your business expenses for better financial tracking. Common types include rent, utilities, inventory purchases, and staff wages."
            createButtonLabel="Add Expense Type"
            tableHeaders={['Type Name']}
            renderTableRows={() => (
              <>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-700">Rent</td>
                </tr>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-700">Utilities</td>
                </tr>
              </>
            )}
            renderSidePanel={() => (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Type Name</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter expense type" />
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-all shadow-lg shadow-blue-100 mt-4">
                  Add Expense Type
                </button>
              </div>
            )}
          />
        );
      case 'customer-types':
        return (
          <ManagementPageTemplate
            title="Manage Customer Types"
            description="Segment your customer base into different types. This allows for targeted marketing, specific pricing rules, and better customer relationship management."
            createButtonLabel="Add Customer Type"
            tableHeaders={['Type Name']}
            renderTableRows={() => (
              <>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-700">Retail</td>
                </tr>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-700">Wholesale</td>
                </tr>
              </>
            )}
            renderSidePanel={() => (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Type Name</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter customer type" />
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-all shadow-lg shadow-blue-100 mt-4">
                  Add Customer Type
                </button>
              </div>
            )}
          />
        );
      case 'conditional-prices':
        return (
          <ManagementPageTemplate
            title="Manage Conditional Prices"
            description="Set up special pricing rules based on specific conditions such as quantity, customer type, or promotional periods. This helps in automating discounts and special offers."
            createButtonLabel="Add Rule"
            tableHeaders={['Rule Name', 'Condition', 'Discount']}
            renderTableRows={() => (
              <>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-700">Bulk Discount</td>
                  <td className="py-4 px-4 text-slate-500">Qty &gt; 10</td>
                  <td className="py-4 px-4 text-emerald-600 font-bold">10%</td>
                </tr>
              </>
            )}
            renderSidePanel={() => (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Rule Name</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter rule name" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Condition</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter condition" />
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-all shadow-lg shadow-blue-100 mt-4">
                  Add Rule
                </button>
              </div>
            )}
          />
        );
      case 'commissions':
        return (
          <ManagementPageTemplate
            title="Manage Commissions"
            description="Configure commission structures for your sales and repair staff. Define rates based on product types, service categories, or individual performance targets."
            createButtonLabel="Add Commission"
            tableHeaders={['Staff Role', 'Rate (%)']}
            renderTableRows={() => (
              <>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-700">Technician</td>
                  <td className="py-4 px-4 text-slate-500">15%</td>
                </tr>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-700">Sales Agent</td>
                  <td className="py-4 px-4 text-slate-500">5%</td>
                </tr>
              </>
            )}
            renderSidePanel={() => (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Staff Role</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none">
                    <option>Select Role</option>
                    <option>Technician</option>
                    <option>Sales Agent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Rate (%)</label>
                  <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter rate" />
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-all shadow-lg shadow-blue-100 mt-4">
                  Add Commission
                </button>
              </div>
            )}
          />
        );
      case 'gdpr':
        return (
          <ManagementPageTemplate
            title="Manage EU GDPR"
            description="Manage data privacy settings and GDPR compliance. Configure data retention policies, consent forms, and customer data access requests to ensure legal compliance."
            createButtonLabel="Add Policy"
            tableHeaders={['Policy Name', 'Status']}
            renderTableRows={() => (
              <>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-4 font-bold text-slate-700">Data Retention Policy</td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded uppercase">Active</span>
                  </td>
                </tr>
              </>
            )}
            renderSidePanel={() => (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Policy Name</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter policy name" />
                </div>
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-all shadow-lg shadow-blue-100 mt-4">
                  Add Policy
                </button>
              </div>
            )}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Database size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a management module</p>
            <p className="text-sm">Choose an item from the sidebar to manage your data.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 uppercase tracking-tight" style={{ fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '22px' }}>Manage Data</h2>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-semibold transition-all ${
                activeView === item.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={18} />
              <span className="flex-1 text-left">{item.label}</span>
              {activeView === item.id && <ChevronRight size={14} />}
            </button>
          ))}
        </nav>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {renderContent()}
      </div>
    </div>
  );
}

// --- Sub-Views ---

function ExportDataView() {
  const exportTypes = [
    'Customers', 'Product Inventory', 'Product Sold', 'Product Purchased', 
    'IMEI', 'Invoices', 'Order', 'Repairs', 'Petty Cash', 'Expenses', 
    'Payments', 'Time Clock', 'Stock Take'
  ];

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 mb-2">Export Data</h1>
        <p className="text-slate-500 max-w-3xl">
          Export your business data for backup, reporting, or migration purposes. Download your product inventory, customer records, sales history, and other critical information in various formats for external use or analysis.
        </p>
      </div>

      <div className="bg-white rounded-md shadow-sm border border-slate-200 p-8">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Choose data type to Export</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none">
              <option>Choose data type to Export</option>
              {exportTypes.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <button className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-3 rounded-md transition-all shadow-lg shadow-emerald-100 flex items-center gap-2">
            <Download size={18} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
}

function SuppliersView() {
  const [suppliers, setSuppliers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formData, setFormData] = React.useState({ name: '', email: '', phone: '', contact_person: '' });
  const [isSaving, setIsSaving] = React.useState(false);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers');
      const data = await res.json();
      setSuppliers(data);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleSave = async () => {
    if (!formData.name) return alert('Supplier name is required');
    setIsSaving(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setFormData({ name: '', email: '', phone: '', contact_person: '' });
        fetchSuppliers();
      } else {
        alert('Failed to save supplier');
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    try {
      const res = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
      if (res.ok) fetchSuppliers();
      else alert('Failed to delete supplier');
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  return (
    <ManagementPageTemplate
      title="Manage Suppliers"
      description="Maintain a comprehensive list of your product suppliers and service providers. Track contact information, email addresses, and phone numbers to streamline your procurement process."
      createButtonLabel="Create Supplier"
      tableHeaders={['Name', 'Email', 'Contact No', 'Actions']}
      renderTableRows={() => (
        <>
          {loading ? (
            <tr><td colSpan={4} className="py-8 text-center text-slate-400">Loading...</td></tr>
          ) : suppliers.length === 0 ? (
            <tr><td colSpan={4} className="py-8 text-center text-slate-400">No suppliers found.</td></tr>
          ) : (
            suppliers.map(s => (
              <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="py-4 px-4 font-bold text-slate-700">{s.name}</td>
                <td className="py-4 px-4 text-slate-500">{s.email || '-'}</td>
                <td className="py-4 px-4 text-slate-500 font-mono">{s.phone || '-'}</td>
                <td className="py-4 px-4">
                  <button onClick={() => handleDelete(s.id)} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase">Delete</button>
                </td>
              </tr>
            ))
          )}
        </>
      )}
      renderSidePanel={() => (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Supplier Name</label>
            <input 
              type="text" 
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              placeholder="Enter supplier name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
            <input 
              type="email" 
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              placeholder="Enter email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Contact Number</label>
            <input 
              type="text" 
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              placeholder="Enter phone number"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Contact Person</label>
            <input 
              type="text" 
              className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              placeholder="Enter contact person"
              value={formData.contact_person}
              onChange={e => setFormData({ ...formData, contact_person: e.target.value })}
            />
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-all shadow-lg shadow-blue-100 mt-4 disabled:bg-slate-300"
          >
            {isSaving ? 'Saving...' : 'Save Supplier'}
          </button>
        </div>
      )}
    />
  );
}

function CategoriesView() {
  return (
    <ManagementPageTemplate
      title="Manage Product Categories"
      description="Organize your inventory into meaningful categories. Well-defined categories help in better reporting, stock management, and faster product lookup during sales."
      createButtonLabel="Add Category"
      tableHeaders={['Category Name']}
      renderTableRows={() => (
        <>
          <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-4 font-bold text-slate-700">Smartphones</td>
          </tr>
          <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-4 font-bold text-slate-700">Tablets</td>
          </tr>
          <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-4 font-bold text-slate-700">Accessories</td>
          </tr>
        </>
      )}
      renderSidePanel={() => (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Category Name</label>
            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter category name" />
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-all shadow-lg shadow-blue-100 mt-4">
            Add Category
          </button>
        </div>
      )}
    />
  );
}

function ManufacturersView() {
  return (
    <ManagementPageTemplate
      title="Manage Manufacturers"
      description="List all device and part manufacturers. This data is used to group products and repairs by brand, providing better insights into brand performance and reliability."
      createButtonLabel="Add Manufacturer"
      tableHeaders={['Manufacturer Name']}
      renderTableRows={() => (
        <>
          <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-4 font-bold text-slate-700">Apple</td>
          </tr>
          <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-4 font-bold text-slate-700">Samsung</td>
          </tr>
          <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-4 font-bold text-slate-700">Huawei</td>
          </tr>
        </>
      )}
      renderSidePanel={() => (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Manufacturer Name</label>
            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter manufacturer name" />
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-all shadow-lg shadow-blue-100 mt-4">
            Add Manufacturer
          </button>
        </div>
      )}
    />
  );
}

function BrandModelsView() {
  return (
    <ManagementPageTemplate
      title="Manage Brand Models"
      description="Define specific models for each brand. This granular data is essential for repair tracking, inventory management of specific parts, and accurate device identification."
      createButtonLabel="Add Model"
      tableHeaders={['Brand Name', 'Model Name']}
      renderTableRows={() => (
        <>
          <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-4 font-bold text-slate-700">Apple</td>
            <td className="py-4 px-4 text-slate-500">iPhone 15 Pro</td>
          </tr>
          <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-4 font-bold text-slate-700">Samsung</td>
            <td className="py-4 px-4 text-slate-500">Galaxy S24 Ultra</td>
          </tr>
        </>
      )}
      renderSidePanel={() => (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Brand Name</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none">
              <option>Select Brand</option>
              <option>Apple</option>
              <option>Samsung</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Model Name</label>
            <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter model name" />
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-md transition-all shadow-lg shadow-blue-100 mt-4">
            Add Model
          </button>
        </div>
      )}
    />
  );
}

// --- Template Component ---

interface ManagementPageTemplateProps {
  title: string;
  description: string;
  createButtonLabel: string;
  tableHeaders: string[];
  renderTableRows: () => React.ReactNode;
  renderSidePanel: () => React.ReactNode;
}

function ManagementPageTemplate({
  title,
  description,
  createButtonLabel,
  tableHeaders,
  renderTableRows,
  renderSidePanel
}: ManagementPageTemplateProps) {
  return (
    <div className="p-8">
      {/* Top Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 mb-2">{title}</h1>
        <p className="text-slate-500 max-w-3xl">{description}</p>
      </div>

      {/* Action Toolbar */}
      <div className="bg-white rounded-md shadow-sm border border-slate-200 p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={`Search ${title.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select className="pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none font-medium text-slate-600">
              <option>All Items</option>
              <option>Recently Added</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-md transition-all shadow-lg shadow-blue-100 flex items-center gap-2">
          <Plus size={18} />
          {createButtonLabel}
        </button>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Table Area */}
        <div className="flex-1 bg-white rounded-md shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full border-collapse">
            <thead style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <tr className="bg-[var(--bg-header)] dark:bg-neutral-800 border-b border-neutral-300 dark:border-neutral-700 text-[14px] font-semibold text-black dark:text-white text-center">
                {tableHeaders.map((header) => (
                  <th key={header} className="text-center py-2 px-3 border-r border-neutral-300 dark:border-neutral-700 text-[14px] font-semibold text-black dark:text-white">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renderTableRows()}
            </tbody>
          </table>
        </div>

        {/* Right Side Panel */}
        <div className="w-full lg:w-80 shrink-0">
          <div className="bg-white rounded-md shadow-sm border border-slate-200 p-6 sticky top-8">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-6 flex items-center gap-2">
              <Plus size={16} className="text-blue-600" />
              Add New Record
            </h3>
            {renderSidePanel()}
          </div>
        </div>
      </div>
    </div>
  );
}
