import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, 
  XCircle,
  Loader2
} from 'lucide-react';
import ThermalReceipt from './ThermalReceipt';
import { Product, Customer, Invoice } from '../types';
import { safeCustomerName } from '../utils/customerName';

// Import refactored components
import { ProductSearchBar } from './cash-register/ProductSearchBar';
import { SearchResults } from './cash-register/SearchResults';
import { CartTable } from './cash-register/CartTable';
import { ActivityLog } from './cash-register/ActivityLog';
import { Sidebar } from './cash-register/Sidebar';
import { ReviewCheckoutModal } from './cash-register/ReviewCheckoutModal';
import { ImeiSelectorModal } from './cash-register/ImeiSelectorModal';
import { DepositAmountModal } from './cash-register/DepositAmountModal';
import { UpdateCartModal } from './cash-register/UpdateCartModal';
import CustomerFormModal from './CustomerFormModal';
import { CartItem, PaymentEntry, Activity } from './cash-register/types';
import { useThermalSettings } from '../hooks/useThermalSettings';
import { useAuth } from '../context/AuthContext';

interface CashRegisterProps {
  onViewCustomers?: () => void;
  onSelectCustomer?: (id: number) => void;
  preSelectedCustomerId?: number | null;
  initiateDeposit?: boolean;
  onSelectProduct?: (id: number) => void;
}

export default function CashRegister({ onViewCustomers, onSelectCustomer, preSelectedCustomerId, initiateDeposit, onSelectProduct }: CashRegisterProps) {
  const { currentUser } = useAuth();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  // Quick Add State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickBarcode, setQuickBarcode] = useState('');
  const [quickCost, setQuickCost] = useState('');
  const [quickSelling, setQuickSelling] = useState('');
  const [quickCategoryId, setQuickCategoryId] = useState('');
  const [quickStock, setQuickStock] = useState('0');
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const bId = currentUser?.business_id;
    const saved = bId ? localStorage.getItem(`epos_cart_biz_${bId}`) : null;
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(() => {
    const bId = currentUser?.business_id;
    const saved = bId ? localStorage.getItem(`epos_customer_biz_${bId}`) : null;
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [availableMethods, setAvailableMethods] = useState<string[]>(['Cash', 'Card']);
  const [addedPayments, setAddedPayments] = useState<PaymentEntry[]>(() => {
    const bId = currentUser?.business_id;
    const saved = bId ? localStorage.getItem(`epos_payments_biz_${bId}`) : null;
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [lastInvoiceData, setLastInvoiceData] = useState<any>(null);
  const [printType, setPrintType] = useState<'Thermal' | 'A4'>('Thermal');
  const [activities, setActivities] = useState<Activity[]>(() => {
    const bId = currentUser?.business_id;
    const saved = bId ? localStorage.getItem(`epos_activities_biz_${bId}`) : null;
    try { return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  
  // Reload storage state if active business changes
  useEffect(() => {
    if (!currentUser?.business_id) return;
    const bId = currentUser.business_id;
    try {
      const savedCart = localStorage.getItem(`epos_cart_biz_${bId}`);
      setCart(savedCart ? JSON.parse(savedCart) : []);

      const savedCust = localStorage.getItem(`epos_customer_biz_${bId}`);
      setSelectedCustomer(savedCust ? JSON.parse(savedCust) : null);

      const savedPay = localStorage.getItem(`epos_payments_biz_${bId}`);
      setAddedPayments(savedPay ? JSON.parse(savedPay) : []);

      const savedAct = localStorage.getItem(`epos_activities_biz_${bId}`);
      setActivities(savedAct ? JSON.parse(savedAct) : []);
    } catch (e) {
      console.error('Error restoring business cart:', e);
    }
  }, [currentUser?.business_id]);

  // New Customer Modal State
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const walkInCustomerRef = useRef<Customer | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // IMEI Selector State
  const [showImeiSelector, setShowImeiSelector] = useState(false);
  const [imeiSelectorProduct, setImeiSelectorProduct] = useState<any>(null);
  const [availableImeis, setAvailableImeis] = useState<any[]>([]);
  const [isLoadingImeis, setIsLoadingImeis] = useState(false);
  const { settings, company } = useThermalSettings();

  // Update Cart Modal State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  // Deposit State
  const [showDepositModal, setShowDepositModal] = useState(false);

  const [depositProductInfo, setDepositProductInfo] = useState<any>(null);

  // Persistence Effects - strictly isolated by business ID
  useEffect(() => {
    if (currentUser?.business_id) {
      localStorage.setItem(`epos_cart_biz_${currentUser.business_id}`, JSON.stringify(cart));
    }
  }, [cart, currentUser?.business_id]);

  useEffect(() => {
    if (currentUser?.business_id) {
      localStorage.setItem(`epos_customer_biz_${currentUser.business_id}`, JSON.stringify(selectedCustomer));
    }
  }, [selectedCustomer, currentUser?.business_id]);

  useEffect(() => {
    if (currentUser?.business_id) {
      localStorage.setItem(`epos_payments_biz_${currentUser.business_id}`, JSON.stringify(addedPayments));
    }
  }, [addedPayments, currentUser?.business_id]);

  useEffect(() => {
    if (currentUser?.business_id) {
      localStorage.setItem(`epos_activities_biz_${currentUser.business_id}`, JSON.stringify(activities));
    }
  }, [activities, currentUser?.business_id]);

  // Effects
  useEffect(() => {
    fetch('/api/products/special/get-deposit-product')
      .then(res => res.json())
      .then(data => setDepositProductInfo(data))
      .catch(err => console.error('Error fetching deposit product:', err));
  }, []);

  useEffect(() => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCategories(data);
        }
      })
      .catch(err => console.error('Error fetching categories:', err));
  }, []);

  useEffect(() => {
    if (initiateDeposit && preSelectedCustomerId && !showDepositModal) {
      setShowDepositModal(true);
    }
  }, [initiateDeposit, preSelectedCustomerId]);

  useEffect(() => {
    // Fetch payment methods
    fetch('/api/payment-methods')
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const names = data.map((m: any) => m.name);
          setAvailableMethods(names);
          if (!names.includes(paymentMethod)) {
            setPaymentMethod(names[0]);
          }
        }
      })
      .catch(err => console.error('Error fetching payment methods:', err));
  }, []);

  // Fetch "Walk-in Customer" on startup (to keep a reference if needed, but don't select by default)
  useEffect(() => {
    const fetchWalkIn = async () => {
      try {
        const response = await fetch('/api/customers');
        if (response.ok) {
          const customers = await response.json();
          const walkIn = customers.find((c: any) => c.name === 'Walk-in Customer');
          if (walkIn) {
            walkInCustomerRef.current = walkIn;
          }
        }
      } catch (error) {
        console.error('Error fetching walk-in customer:', error);
      }
    };
    fetchWalkIn();
  }, []);

  // Fetch pre-selected customer if provided
  useEffect(() => {
    if (preSelectedCustomerId) {
      fetch(`/api/customers/${preSelectedCustomerId}`)
        .then(res => res.json())
        .then(data => {
          if (data.id) {
            setSelectedCustomer(data);
            addActivity('Customer Selected', `${data.name} attached to sale`, 'customer');
          }
        })
        .catch(err => console.error('Error fetching pre-selected customer:', err));
    }
  }, [preSelectedCustomerId]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const q = searchQuery;
      const delayDebounceFn = setTimeout(() => {
        fetchProducts(q);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setSearchResults([]);
      setActiveSearchIndex(0);
    }
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchQuery('');
        setSearchResults([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (customerSearch.length >= 2) {
      const q = customerSearch;
      const delayDebounceFn = setTimeout(() => {
        fetchCustomers(q);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setCustomerResults([]);
    }
  }, [customerSearch]);

  // Handlers
  const openQuickAdd = (term: string) => {
    const trimmed = term.trim();
    if (/^\d{6,}$/.test(trimmed)) {
      setQuickBarcode(trimmed);
      setQuickName('');
    } else {
      setQuickName(trimmed);
      setQuickBarcode('');
    }
    setQuickCost('');
    setQuickSelling('');
    setQuickStock('0');
    if (categories.length > 0) {
      setQuickCategoryId(categories[0].id.toString());
    } else {
      setQuickCategoryId('');
    }
    setShowQuickAdd(true);
  };

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim()) return alert('Please enter a product name');
    
    // Safely parse European number formats (e.g. 10,50 -> 10.50)
    const parsePrice = (val: string) => Number(val.replace(',', '.'));
    const parsedSelling = parsePrice(quickSelling);
    const parsedCost = parsePrice(quickCost);

    if (isNaN(parsedSelling) || parsedSelling < 0) {
      return alert('Please enter a valid selling price');
    }

    setQuickAddLoading(true);
    try {
      const payload = {
        name: quickName.trim(),
        category_id: quickCategoryId ? Number(quickCategoryId) : null,
        manufacturer_id: null,
        selling_price: parsedSelling,
        cost_price: isNaN(parsedCost) ? 0 : parsedCost,
        sku_code: quickBarcode.trim() || undefined,
        barcode: quickBarcode.trim() || undefined,
        branch_id: currentUser?.branch_id || 1,
        quantity: parseInt(quickStock) || 0
      };

      const res = await fetch('/api/products/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to quick add product');
      }

      const fullProduct = await res.json();

      addToCart({
        ...fullProduct,
        allow_overselling: true,
        total_stock: payload.quantity > 0 ? payload.quantity : 0
      });

      addActivity('Quick Add Product', `Product "${quickName}" created and added to cart`, 'stock');
      setShowQuickAdd(false);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err: any) {
      console.error('Quick Add error:', err);
      alert(err.message || 'An error occurred during quick add');
    } finally {
      setQuickAddLoading(false);
    }
  };

  const fetchProducts = async (queryTerm: string) => {
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(queryTerm)}&type=products`);
      if (response.ok) {
        const data = await response.json();
        if (searchQuery.trim() === queryTerm.trim()) {
          setSearchResults(Array.isArray(data) ? data : []);
          setActiveSearchIndex(0);
        }
      } else if (searchQuery.trim() === queryTerm.trim()) {
        setSearchResults([]);
        setActiveSearchIndex(0);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCustomers = async (queryTerm: string) => {
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(queryTerm)}&type=customers`);
      if (response.ok) {
        const data = await response.json();
        if (customerSearch.trim() === queryTerm.trim()) {
          setCustomerResults(Array.isArray(data) ? data : []);
        }
      } else if (customerSearch.trim() === queryTerm.trim()) {
        setCustomerResults([]);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const addActivity = (action: string, details: string, type: Activity['type'] = 'system') => {
    const newActivity: Activity = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      action,
      details,
      type
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 20));
  };

  const addToCart = (product: Product | any) => {
    // If it's a serialized product and no IMEI is selected yet, open the selector
    if (product.product_type === 'serialized' && !product.imei) {
      handleOpenImeiSelector(product);
      return;
    }

    // Senior-Level Validation: Block duplicates and stock overruns
    const isSerialized = product.product_type === 'serialized';
    
    // Check if this specific IMEI is already in the cart
    if (isSerialized && product.device_id) {
      const inCart = cart.some(item => item.device_id === product.device_id);
      if (inCart) {
        addActivity('Cart Blocked', `IMEI ${product.imei} is already in the cart`, 'system');
        return;
      }
    }

    // Check stock for non-serialized items if overselling is disabled
    if (!isSerialized && !product.allow_overselling) {
      const existing = cart.find(item => item.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      const available = product.total_stock || 0;
      
      if (currentQty >= available) {
        addActivity('Stock Limit', `Cannot add more ${product.product_name}. Stock: ${available}`, 'stock');
        return;
      }
    }

    setCart(prevCart => {
      // For serialized products, we match by product id AND device_id/imei
      const existingItemIndex = prevCart.findIndex(item => 
        item.id === product.id && 
        (!isSerialized || item.device_id === product.device_id)
      );

      if (existingItemIndex > -1 && !isSerialized) {
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += 1;
        return newCart;
      } else {
        return [...prevCart, { ...product, quantity: 1 }];
      }
    });

    addActivity('Added to Cart', `${product.product_name} added`, 'stock');
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateQuantity = (productId: number, delta: number, deviceId?: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === productId && (!deviceId || item.device_id === deviceId)) {
          // Serialized items are locked at quantity 1
          if (item.product_type === 'serialized') {
            return item;
          }

          const newQty = Math.max(1, item.quantity + delta);
          
          // Stock validation for quantity increase
          if (delta > 0 && !item.allow_overselling) {
            if (newQty > (item.total_stock || 0)) {
              addActivity('Stock Limit', `Exceeded stock for ${item.product_name}`, 'stock');
              return item;
            }
          }

          if (newQty !== item.quantity) {
            addActivity('Quantity Changed', `${item.product_name}: ${item.quantity} → ${newQty}`, 'stock');
          }
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const updatePrice = (productId: number, newPrice: number, deviceId?: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === productId && (!deviceId || item.device_id === deviceId)) {
          const oldPrice = item.customPrice ?? item.selling_price;
          if (newPrice !== oldPrice) {
            addActivity('Price Changed', `${item.product_name}: €${oldPrice.toFixed(2)} → €${newPrice.toFixed(2)}`, 'sale');
          }
          return { ...item, customPrice: newPrice };
        }
        return item;
      });
    });
  };

  const handleEditItem = (item: CartItem) => {
    setEditingItem(item);
    setShowUpdateModal(true);
  };

  const handleUpdateCartItem = (updatedFields: Partial<CartItem>) => {
    if (!editingItem) return;

    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === editingItem.id && (!editingItem.device_id || item.device_id === editingItem.device_id)) {
          const updatedItem = { ...item, ...updatedFields };
          
          // Log activity for significant changes
          if (updatedFields.quantity && updatedFields.quantity !== item.quantity) {
            addActivity('Quantity Updated', `${item.product_name}: ${item.quantity} → ${updatedFields.quantity}`, 'stock');
          }
          if (updatedFields.customPrice && updatedFields.customPrice !== (item.customPrice ?? item.selling_price)) {
            addActivity('Price Updated', `${item.product_name}: €${(item.customPrice ?? item.selling_price).toFixed(2)} → €${updatedFields.customPrice.toFixed(2)}`, 'sale');
          }
          if (updatedFields.discount !== undefined) {
            addActivity('Discount Applied', `${item.product_name}: ${updatedFields.discount}${updatedFields.discountType === 'percentage' ? '%' : '€'} discount`, 'sale');
          }

          return updatedItem;
        }
        return item;
      });
    });

    setShowUpdateModal(false);
    setEditingItem(null);
  };

  const removeFromCart = (productId: number, deviceId?: number) => {
    const itemToRemove = cart.find(item => item.id === productId && (!deviceId || item.device_id === deviceId));
    setCart(prevCart => prevCart.filter(item => !(item.id === productId && (!deviceId || item.device_id === deviceId))));
    if (itemToRemove) {
      addActivity('Removed from Cart', `${itemToRemove.product_name} removed`, 'stock');
    }
  };

  const handleAddPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;

    if (paymentMethod === 'Wallet') {
      const balance = selectedCustomer?.wallet_balance || 0;
      if (amount > balance) {
        alert(`Insufficient wallet balance. Available: €${balance.toFixed(2)}`);
        return;
      }
    }

    setAddedPayments(prev => [...prev, { method: paymentMethod, amount }]);
    setPaymentAmount('');
    addActivity('Payment Added', `€${amount.toFixed(2)} via ${paymentMethod}`, 'sale');
  };

  const removePayment = (index: number) => {
    setAddedPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddDepositToCart = (amount: number) => {
    if (!depositProductInfo || !selectedCustomer) return;
    
    const existingIndex = cart.findIndex(c => c.is_deposit);
    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex] = {
        ...newCart[existingIndex],
        selling_price: (newCart[existingIndex].selling_price || 0) + amount,
        customPrice: (newCart[existingIndex].customPrice || 0) + amount
      };
      setCart(newCart);
    } else {
      const depositItem: CartItem = {
        id: depositProductInfo.sku_id,
        product_id: depositProductInfo.product_id || depositProductInfo.sku_id,
        category_id: null,
        manufacturer_id: null,
        name: depositProductInfo.product_name,
        product_name: depositProductInfo.product_name,
        sku_code: depositProductInfo.sku_code || 'DEPOSIT',
        barcode: null,
        cost_price: 0,
        selling_price: amount,
        customPrice: amount,
        category_name: 'Service',
        product_type: 'service',
        allow_overselling: true,
        total_stock: 999,
        quantity: 1,
        is_deposit: true
      };
      setCart(prev => [depositItem, ...prev]);
    }
    
    setShowDepositModal(false);
    addActivity('Item Added', `Wallet Deposit for €${amount.toFixed(2)}`, 'stock');
  };

  const handleOpenImeiSelector = async (product: Product) => {
    setImeiSelectorProduct(product);
    setShowImeiSelector(true);
    setIsLoadingImeis(true);
    try {
      const response = await fetch(`/api/products/${product.product_id}/available-devices`);
      if (response.ok) {
        const data = await response.json();
        setAvailableImeis(data);
      }
    } catch (error) {
      console.error('Error fetching IMEIs:', error);
    } finally {
      setIsLoadingImeis(false);
    }
  };

  const handleSaveNewCustomer = async (customerData: Partial<Customer>) => {
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData)
      });

      if (response.ok) {
        const customer = await response.json();
        setSelectedCustomer(customer);
        setShowNewCustomerModal(false);
        addActivity('New Customer', `${safeCustomerName(customer)} registered`, 'customer');
      }
    } catch (error) {
      console.error('Error saving customer:', error);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setShowReviewModal(true);
  };

  const handleQuickCheckout = () => {
    if (cart.length === 0) return;
    const inputAmount = parseFloat(paymentAmount);
    const amount = (!isNaN(inputAmount) && inputAmount > 0) ? inputAmount : remainingAmount;
    if (amount <= 0) return;

    if (paymentMethod === 'Wallet') {
      const balance = selectedCustomer?.wallet_balance || 0;
      if (amount > balance) {
        alert(`Insufficient wallet balance. Available: €${balance.toFixed(2)}`);
        return;
      }
    }

    setAddedPayments(prev => [...prev, { method: paymentMethod, amount }]);
    setPaymentAmount('');
    addActivity('Payment Added (Quick)', `€${amount.toFixed(2)} via ${paymentMethod}`, 'sale');
    setShowReviewModal(true);
  };

  const handleFinalizeTransaction = async (printPreference: 'Thermal' | 'A4' | null) => {
    const invoiceData = {
      customer_id: selectedCustomer?.id || null,
      subtotal,
      tax_total: 0,
      discount_total: discountTotal,
      grand_total: total,
      items: cart.map(item => {
        const itemPrice = item.customPrice ?? item.selling_price;
        let itemTotal = itemPrice * item.quantity;
        if (item.discount) {
          if (item.discountType === 'percentage') {
            itemTotal = itemTotal * (1 - item.discount / 100);
          } else {
            itemTotal = itemTotal - item.discount;
          }
        }
        return {
          sku_id: item.id,
          device_id: item.device_id,
          imei: item.imei,
          quantity: item.quantity,
          price: itemPrice,
          discount: item.discount || 0,
          discount_type: item.discountType || 'percentage',
          total: Math.max(0, itemTotal),
          is_deposit: item.is_deposit || false,
          notes: item.notes || ''
        };
      }),
      payments: addedPayments,
      activities: activities
    };

    setIsFinalizing(true);
    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });

      if (response.ok) {
        const fullInvoice = await response.json();
        
        setLastInvoiceData(fullInvoice);
        setShowReviewModal(false);
        addActivity('Checkout Complete', `Invoice #${fullInvoice.invoice_number} generated`, 'sale');

        if (printPreference) {
          setPrintType(printPreference);
          setTimeout(() => {
            window.print();
            resetRegister();
          }, 300);
        } else {
          resetRegister();
        }
      } else {
        const err = await response.json();
        alert('Checkout failed: ' + (err.error || 'Server error'));
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      alert('Checkout failed: ' + (error.message || error));
    } finally {
      setIsFinalizing(false);
    }
  };

  const resetRegister = () => {
    setCart([]);
    setSelectedCustomer(null);
    setAddedPayments([]);
    setPaymentAmount('');
    setShowReviewModal(false);
    setLastInvoiceData(null);
    setSearchQuery('');
    setCustomerSearch('');
    setActivities([]); // Reset activities for the new invoice
    
    // Clear persistence
    if (currentUser?.business_id) {
      const bId = currentUser.business_id;
      localStorage.removeItem(`epos_cart_biz_${bId}`);
      localStorage.removeItem(`epos_customer_biz_${bId}`);
      localStorage.removeItem(`epos_payments_biz_${bId}`);
      localStorage.removeItem(`epos_activities_biz_${bId}`);
    }
    localStorage.removeItem('epos_cart');
    localStorage.removeItem('epos_customer');
    localStorage.removeItem('epos_payments');
    localStorage.removeItem('epos_activities');
  };

  const handlePrint = (type: 'Thermal' | 'A4') => {
    setPrintType(type);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.customPrice ?? item.selling_price) * item.quantity, 0);
  
  const discountTotal = cart.reduce((sum, item) => {
    if (!item.discount) return sum;
    const itemSubtotal = (item.customPrice ?? item.selling_price) * item.quantity;
    if (item.discountType === 'percentage') {
      return sum + (itemSubtotal * (item.discount / 100));
    } else {
      return sum + Math.min(item.discount, itemSubtotal);
    }
  }, 0);

  const total = Math.max(0, subtotal - discountTotal);
  const paidAmount = addedPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingAmount = total - paidAmount;
  const changeDue = Math.max(0, paidAmount - total);
  const isPaymentComplete = remainingAmount <= 0.01;

  useEffect(() => {
    if (remainingAmount > 0) {
      setPaymentAmount(remainingAmount.toFixed(2));
    } else {
      setPaymentAmount('');
    }
  }, [remainingAmount]);

  return (
    <div className="flex flex-col h-full bg-neutral-100 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 font-mono text-base px-2 py-2 select-none w-full overflow-hidden" style={{ fontSize: '17px' }}>
      {/* Header Area */}
      <div className="flex justify-between items-center shrink-0 mb-2 px-1 py-1">
        <h2 className="text-xl font-bold text-black dark:text-white uppercase">Register</h2>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden gap-2">
        {/* Left Side: Product Search & Cart */}
        <div className="flex-1 flex flex-col bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 p-3 min-w-0">
          {/* Search Bar & Results (Floating setup) */}
          <div ref={searchContainerRef} className="shrink-0 mb-3 relative z-50">
            <ProductSearchBar 
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onClear={() => setSearchQuery('')}
              onKeyDown={(e) => {
                const filteredResults = searchResults.filter(p => !p.device_id || !cart.some(c => c.device_id === p.device_id));
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setActiveSearchIndex(prev => Math.min(prev + 1, filteredResults.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setActiveSearchIndex(prev => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredResults.length > 0) {
                    const selectedItem = filteredResults[activeSearchIndex] || filteredResults[0];
                    addToCart(selectedItem);
                  }
                }
              }}
              onQuickAddClick={() => openQuickAdd(searchQuery)}
            />
            
            {/* Search Results (Floating) */}
            <SearchResults 
              results={searchResults.filter(p => !p.device_id || !cart.some(c => c.device_id === p.device_id))}
              searchQuery={searchQuery}
              onAddProduct={addToCart}
              onQuickAddClick={(term) => openQuickAdd(term)}
              activeIndex={activeSearchIndex}
            />
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4">
            {/* Cart Table */}
            <CartTable 
              cart={cart}
              onUpdateQuantity={updateQuantity}
              onUpdatePrice={updatePrice}
              onRemove={removeFromCart}
              onOpenImeiSelector={handleOpenImeiSelector}
              onEdit={handleEditItem}
              onSelectProduct={onSelectProduct}
            />

            {/* Activity Log */}
            <ActivityLog activities={activities} />
          </div>
        </div>

        {/* Right Side: Sidebar (Customer, Totals, Payment) */}
        <Sidebar 
          selectedCustomer={selectedCustomer}
          customerSearch={customerSearch}
          setCustomerSearch={setCustomerSearch}
          customerResults={customerResults}
          onSelectCustomer={(c) => {
            setSelectedCustomer(c);
            setCustomerSearch('');
            setCustomerResults([]);
            addActivity('Customer Selected', `${c.name} attached to sale`, 'customer');
          }}
          onClearCustomer={() => {
            setSelectedCustomer(null);
            setAddedPayments(prev => prev.filter(p => p.method !== 'Wallet'));
          }}
          onOpenNewCustomerModal={() => setShowNewCustomerModal(true)}
          onOpenDepositModal={() => setShowDepositModal(true)}
          
          subtotal={subtotal}
          tax={0}
          discount={discountTotal}
          total={total}
          
          addedPayments={addedPayments}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          paymentAmount={paymentAmount}
          setPaymentAmount={setPaymentAmount}
          onAddPayment={handleAddPayment}
          onRemovePayment={removePayment}
          remainingAmount={remainingAmount}
          
          onCheckout={handleCheckout}
          onQuickCheckout={handleQuickCheckout}
          onClearCart={() => setShowDiscardConfirm(true)}
          isCartEmpty={cart.length === 0}
          isPaymentComplete={isPaymentComplete}
          availableMethods={availableMethods}
        />
      </div>

      {/* Modals */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 font-mono text-base">
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-sm overflow-hidden flex flex-col rounded-lg shadow-xl">
            <div className="bg-red-600 dark:bg-red-750 px-4 py-2 border-b border-red-700 dark:border-red-800">
              <h3 className="text-white font-bold text-base uppercase">Discard Sale?</h3>
            </div>
            <div className="p-4 space-y-4 text-center">
              <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                Are you sure you want to clear the current cart and reset the transaction? This action will completely clear all items and activity logs.
              </p>
              <div className="flex gap-2 justify-center pt-2">
                <button 
                  onClick={() => setShowDiscardConfirm(false)}
                  className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1 px-4 rounded text-base transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    resetRegister();
                    setShowDiscardConfirm(false);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-4 rounded text-base border border-red-750 dark:border-red-800 transition-colors cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && (
        <ReviewCheckoutModal 
          grandTotal={total}
          payments={addedPayments}
          isFinalizing={isFinalizing}
          onCancel={() => setShowReviewModal(false)}
          onConfirm={handleFinalizeTransaction}
        />
      )}

      {showDepositModal && (
        <DepositAmountModal 
          customer={selectedCustomer}
          onClose={() => setShowDepositModal(false)}
          onAddDeposit={handleAddDepositToCart}
        />
      )}

      {showImeiSelector && imeiSelectorProduct && (
        <ImeiSelectorModal 
          product={imeiSelectorProduct}
          availableImeis={availableImeis}
          isLoading={isLoadingImeis}
          onClose={() => setShowImeiSelector(false)}
          onSelect={(device) => {
            addToCart({
              ...imeiSelectorProduct,
              device_id: device.id,
              imei: device.imei
            });
            setShowImeiSelector(false);
          }}
        />
      )}

      {showNewCustomerModal && (
        <CustomerFormModal 
          onClose={() => setShowNewCustomerModal(false)}
          onSave={handleSaveNewCustomer}
        />
      )}

      {showUpdateModal && editingItem && (
        <UpdateCartModal 
          item={editingItem}
          onClose={() => {
            setShowUpdateModal(false);
            setEditingItem(null);
          }}
          onSave={handleUpdateCartItem}
        />
      )}

      {showQuickAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[110] p-4 font-mono text-base">
          <div className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 w-full max-w-md overflow-hidden flex flex-col rounded-lg shadow-2xl text-base">
            {/* Modal Header */}
            <div className="bg-neutral-200 dark:bg-neutral-900 px-4 py-2.5 border-b border-neutral-300 dark:border-neutral-800 flex justify-between items-center">
              <h3 className="text-base font-bold text-black dark:text-white uppercase">⚡ Quick Add Product</h3>
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="text-neutral-500 hover:text-neutral-750 dark:hover:text-neutral-350 transition-colors border-0 bg-transparent p-0 cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>
            
            {/* Modal Form */}
            <form onSubmit={handleQuickAddSubmit} className="p-4 space-y-4 flex-1 bg-white dark:bg-black">
              <div className="space-y-1">
                <label className="block text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. iPhone 13 Pro Case"
                  className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none font-sans"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">SKU / Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g. SKU12345"
                    className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none font-mono"
                    value={quickBarcode}
                    onChange={(e) => setQuickBarcode(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Category *</label>
                  <select
                    required
                    className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none bg-transparent font-sans"
                    value={quickCategoryId}
                    onChange={(e) => setQuickCategoryId(e.target.value)}
                  >
                    <option value="" className="bg-white dark:bg-black">Choose Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-white dark:bg-black">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Cost (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none font-mono"
                    value={quickCost}
                    onChange={(e) => setQuickCost(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Selling (€) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none font-mono"
                    value={quickSelling}
                    onChange={(e) => setQuickSelling(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">Stock</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 rounded px-3 py-1.5 text-base text-neutral-900 dark:text-neutral-100 focus:outline-none font-mono"
                    value={quickStock}
                    onChange={(e) => setQuickStock(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-300 dark:border-neutral-800 flex gap-2 justify-end bg-neutral-100 dark:bg-neutral-950 p-3 -mx-4 -mb-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="bg-white dark:bg-black border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100 font-normal py-1.5 px-4 rounded text-base transition-colors cursor-pointer"
                  disabled={quickAddLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-5 rounded text-base border border-emerald-500 hover:border-emerald-600 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  disabled={quickAddLoading}
                >
                  {quickAddLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save & Add'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hidden Print Container */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999]">
        {lastInvoiceData && (
          <div className={printType === 'Thermal' ? 'w-[72mm]' : 'w-full'}>
            <ThermalReceipt invoice={lastInvoiceData} settings={settings} company={company} />
          </div>
        )}
      </div>
    </div>
  );
}
