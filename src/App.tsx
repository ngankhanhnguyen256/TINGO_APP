import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { WhyChooseSection } from './components/WhyChooseSection';
import { FeaturedProductSection } from './components/FeaturedProductSection';
import { ProductCatalogSection } from './components/ProductCatalogSection';
import { CertificationsSection } from './components/CertificationsSection';
import { HealthBlogSection } from './components/HealthBlogSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { VerticalVideoCarouselSection } from './components/VerticalVideoCarouselSection';
import { NewsletterSection } from './components/NewsletterSection';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { ProductDetailModal } from './components/ProductDetailModal';
import { StoryModal } from './components/StoryModal';
import { SearchModal } from './components/SearchModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { CustomBlockRenderer } from './components/CustomBlockRenderer';
import { AdminToolbar } from './components/admin/AdminToolbar';
import { AdminLoginModal } from './components/admin/AdminLoginModal';
import { ImagePickerModal } from './components/admin/ImagePickerModal';
import { TextEditorModal } from './components/admin/TextEditorModal';
import { ProductEditorModal } from './components/admin/ProductEditorModal';
import { JsonBackupModal } from './components/admin/JsonBackupModal';
import { AdminOrdersModal } from './components/admin/AdminOrdersModal';
import { GoogleSheetsSyncModal } from './components/admin/GoogleSheetsSyncModal';
import { UnsavedChangesModal } from './components/admin/UnsavedChangesModal';
import { CustomerAuthProvider, useCustomerAuth } from './context/CustomerAuthContext';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { CustomerProfileModal } from './components/CustomerProfileModal';
import { VisualEditorProvider, useVisualEditor } from './context/VisualEditorContext';
import { PRODUCTS } from './data/mockData';
import { CartItem, Product, Order, CustomerUser } from './types';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './lib/firebase';
import {
  loadStoredCart,
  saveStoredCart,
  clearCartStorage,
  fetchCustomerCloudCart,
} from './utils/cartStorage';
import {
  getGoogleAccessToken,
  reconcileAndSyncAll,
  isAutoSyncEnabled,
  flushPendingSyncQueues,
} from './lib/googleSheetsService';

function MainApp() {
  const { config, isAdmin } = useVisualEditor();
  const { customer, isLoggedIn, openAuthModal } = useCustomerAuth();
  const [jsonBackupOpen, setJsonBackupOpen] = useState(false);
  const [adminOrdersOpen, setAdminOrdersOpen] = useState(false);
  const [googleSheetsModalOpen, setGoogleSheetsModalOpen] = useState(false);

  // Persistent cart with Cookie + LocalStorage + Customer Cloud Sync
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadStoredCart());

  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutKey, setCheckoutKey] = useState(1);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<Order | null>(null);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [shippingFee, setShippingFee] = useState<number>(0);
  // Real orders from Firestore & local backup
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem('tingo_orders_storage');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeSection, setActiveSection] = useState<string>('hero');

  // Auto-save cart to Cookie & LocalStorage & Customer Cloud Profile
  useEffect(() => {
    saveStoredCart(cartItems, customer?.phone);
  }, [cartItems, customer?.phone]);

  // If customer logs in, sync their cross-device cloud cart if local cart is empty
  useEffect(() => {
    if (isLoggedIn && customer?.phone) {
      fetchCustomerCloudCart(customer.phone).then((cloudCart) => {
        if (cloudCart && cloudCart.length > 0) {
          setCartItems((curr) => (curr.length === 0 ? cloudCart : curr));
        }
      });
    }
  }, [isLoggedIn, customer?.phone]);

  // Listen for explicit logout event from CustomerAuthContext
  useEffect(() => {
    const handleCartCleared = () => {
      setCartItems([]);
      setAppliedCoupon('');
      setDiscountAmount(0);
      setShippingFee(0);
    };
    window.addEventListener('tingo-cart-cleared', handleCartCleared);
    return () => window.removeEventListener('tingo-cart-cleared', handleCartCleared);
  }, []);

  // Real-time Firestore orders listener with resilient MERGE logic (Never overwrite/wipe local cache)
  useEffect(() => {
    try {
      const unsubscribe = onSnapshot(
        collection(db, 'orders'),
        (snapshot) => {
          // 1. Gather all incoming orders from Firebase
          const incomingMap = new Map<string, Order>();
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Order;
            if (docSnap.id) {
              incomingMap.set(docSnap.id, {
                ...data,
                id: docSnap.id,
              });
            }
          });

          // 2. Load existing orders from LocalStorage to prevent data loss
          let localList: Order[] = [];
          try {
            const raw = localStorage.getItem('tingo_orders_storage');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                localList = parsed.filter((o) => o && o.id);
              }
            }
          } catch {
            // ignore
          }

          // 3. Build merged map: start with local cache
          const mergedMap = new Map<string, Order>();
          localList.forEach((ord) => {
            mergedMap.set(ord.id, ord);
          });

          // 4. Merge incoming Firebase orders (updates status, adds new orders)
          incomingMap.forEach((ord, id) => {
            const existing = mergedMap.get(id);
            if (existing) {
              // Merge fields: preserve local extra info while accepting cloud status updates
              mergedMap.set(id, {
                ...existing,
                ...ord,
              });
            } else {
              mergedMap.set(id, ord);
            }
          });

          // 5. Convert to array and sort descending by date
          const mergedList = Array.from(mergedMap.values()).sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime() || (a as any).createdAtTimestamp || 0;
            const timeB = new Date(b.createdAt).getTime() || (b as any).createdAtTimestamp || 0;
            return timeB - timeA;
          });

          // 6. Safety check: NEVER replace non-empty local cache with empty array
          if (mergedList.length > 0) {
            setOrders(mergedList);
            try {
              localStorage.setItem('tingo_orders_storage', JSON.stringify(mergedList));
            } catch {
              // ignore
            }
          } else if (localList.length > 0) {
            setOrders(localList);
          }
        },
        (err) => {
          console.warn('Firestore orders subscription note (Keeping local cache intact):', err);
          // On error (quota exceeded, offline, unauthorized), strictly keep local cache
          try {
            const raw = localStorage.getItem('tingo_orders_storage');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setOrders(parsed);
              }
            }
          } catch {
            // ignore
          }
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore subscription catch (Keeping local cache):', e);
    }
  }, []);

  // Listen for explicit Admin Order Deletion events to only remove when Admin explicitly commands
  useEffect(() => {
    const handleOrderDeleted = (e: any) => {
      const deletedId = e.detail?.orderId;
      if (!deletedId) return;
      setOrders((prev) => {
        const updated = prev.filter((o) => o.id !== deletedId);
        try {
          localStorage.setItem('tingo_orders_storage', JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    };
    window.addEventListener('tingo-order-deleted', handleOrderDeleted);
    return () => window.removeEventListener('tingo-order-deleted', handleOrderDeleted);
  }, []);

  // Automatic Background Two-Way Sync Engine (reconciles Google Sheets and Firebase / Local queues for BOTH orders & customers)
  useEffect(() => {
    const runAutoSync = async () => {
      // Background sync runs 24/7 via Webhook and OAuth if auto-sync is enabled
      if (!isAutoSyncEnabled()) return;

      try {
        const token = getGoogleAccessToken();

        // 1. Retrieve all local customers from cache
        let localCustList: CustomerUser[] = [];
        try {
          const rawCust = localStorage.getItem('tingo_registered_customers_cache');
          if (rawCust) {
            const parsed = JSON.parse(rawCust);
            localCustList = Array.isArray(parsed) ? parsed : Object.values(parsed);
          }
        } catch {
          // ignore
        }

        // 2. Retrieve local orders
        let localOrdersList: Order[] = orders;
        if (!localOrdersList || localOrdersList.length === 0) {
          try {
            const rawOrders = localStorage.getItem('tingo_orders_storage');
            if (rawOrders) {
              const parsedOrd = JSON.parse(rawOrders);
              if (Array.isArray(parsedOrd)) {
                localOrdersList = parsedOrd;
              }
            }
          } catch {
            // ignore
          }
        }

        // 3. Flush offline queues
        await flushPendingSyncQueues();

        // 4. Automatically sync ONLY unsynced orders & unsynced customers to Google Sheets
        await reconcileAndSyncAll(localOrdersList, localCustList, token || undefined);
      } catch (e) {
        // background quiet catch
      }
    };

    // Initial sync check after 3s
    const initTimer = setTimeout(runAutoSync, 3000);
    // Recurring background sync every 60s
    const interval = setInterval(runAutoSync, 60000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
    };
  }, [orders]);

  // ScrollSpy to update active nav tab
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['hero', 'why-tingo', 'featured', 'products', 'health'];
      const scrollPosition = window.scrollY + 200;

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const showToast = (title: string, description?: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddToCart = (product: Product, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });

    showToast(
      'Đã thêm vào giỏ hàng!',
      `${quantity}x ${product.name} đã được thêm thành công.`
    );
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Đã xóa sản phẩm', 'Sản phẩm đã được gỡ khỏi giỏ hàng.');
  };

  const handleBuyNow = (product: Product) => {
    handleAddToCart(product, 1);
    setCartDrawerOpen(true);
  };

  const handleProceedToCheckout = (coupon: string, discount: number, shipFee: number) => {
    setAppliedCoupon(coupon);
    setDiscountAmount(discount);
    setShippingFee(shipFee);
    setCartDrawerOpen(false);
    setCheckoutKey((prev) => prev + 1);
    setCheckoutModalOpen(true);
  };

  const handleOrderSuccess = (newOrder: Order) => {
    setOrders((prev) => [newOrder, ...prev.filter((o) => o.id !== newOrder.id)]);
    setCartItems([]);
    clearCartStorage(customer?.phone);
    setAppliedCoupon('');
    setDiscountAmount(0);
    setShippingFee(0);
    setCheckoutKey((prev) => prev + 1);
    try {
      localStorage.removeItem('tingo_checkout_draft');
    } catch {
      // ignore
    }
    showToast(
      'Đặt hàng thành công! 🎉',
      `Mã đơn hàng #${newOrder.id} đã được gửi tới hệ thống đóng gói TINGO.`
    );
  };

  const handleOrderCancelled = (cancelledOrder: Order) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === cancelledOrder.id ? cancelledOrder : o))
    );
    showToast(
      'Đã hủy đơn hàng',
      `Đơn hàng #${cancelledOrder.id} đã được hủy thành công và đồng bộ tới hệ thống.`
    );
  };

  const handleSubscribeNewsletter = (email: string) => {
    showToast(
      'Đăng ký thành công! 🎁',
      `Mã giảm giá 10% TINGO10 đã được lưu cho email ${email}.`
    );
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#f8faf7] text-slate-800 flex flex-col selection:bg-[#008764] selection:text-white pb-20 sm:pb-16">
      
      {/* 1. Sticky Header matching screenshot */}
      <Header
        cartItems={cartItems}
        onOpenCart={() => setCartDrawerOpen(true)}
        onOpenSearch={() => setSearchModalOpen(true)}
        onOpenTracking={() => setTrackingModalOpen(true)}
        onOpenStory={() => setStoryModalOpen(true)}
        activeSection={activeSection}
        onNavigate={scrollToSection}
      />

      {/* Main Page Layout matching screenshots 1, 2, 3, 4, 5 */}
      <main className="flex-1">
        
        {/* Screenshot 1: Hero Section */}
        <HeroSection
          onShopNow={() => scrollToSection('products')}
          onOpenStory={() => setStoryModalOpen(true)}
          onSelectProduct={(p) => setSelectedProduct(p)}
          onAddToCart={handleAddToCart}
        />

        {/* Screenshot 2: Why Choose TINGO Section */}
        <WhyChooseSection />

        {/* Quality Certifications Bar */}
        <CertificationsSection />

        {/* 9:16 Vertical Video Carousel & Banner Video (Trải Nghiệm Thực Tế) - Before Products */}
        <VerticalVideoCarouselSection
          onAddToCart={handleAddToCart}
          onSelectProduct={(p) => setSelectedProduct(p)}
        />

        {/* Custom Admin Dynamic Blocks (Promo Banners, Image Showcases, etc.) */}
        {config.customBlocks?.map((block, idx) => (
          <CustomBlockRenderer
            key={block.id}
            block={block}
            index={idx}
            totalBlocks={config.customBlocks.length}
          />
        ))}

        {/* Screenshot 3: Featured Showcase - Bột Dinh Dưỡng Vhealth 2 Vị */}
        <FeaturedProductSection
          onAddToCart={handleAddToCart}
          onSelectProduct={(p) => setSelectedProduct(p)}
        />

        {/* Screenshot 4: Product Catalog Grid - Khám phá thêm */}
        <ProductCatalogSection
          onAddToCart={handleAddToCart}
          onSelectProduct={(p) => setSelectedProduct(p)}
        />

        {/* Real Customer Testimonials (Banner Format) */}
        <TestimonialsSection />

        {/* Health Knowledge & Blog */}
        <HealthBlogSection />

        {/* Screenshot 5: Newsletter Promotion Banner */}
        <NewsletterSection onSubscribe={handleSubscribeNewsletter} />

      </main>

      {/* Screenshot 5: Dark Forest Green Footer */}
      <Footer
        onOpenTracking={() => setTrackingModalOpen(true)}
        onOpenStory={() => setStoryModalOpen(true)}
      />

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveFromCart}
        onProceedToCheckout={handleProceedToCheckout}
        onExploreProducts={() => scrollToSection('products')}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        key={checkoutKey}
        isOpen={checkoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        cartItems={cartItems}
        discountAmount={discountAmount}
        appliedCoupon={appliedCoupon}
        shippingFee={shippingFee}
        onOrderSuccess={handleOrderSuccess}
        onOpenTracking={(order) => {
          setSelectedTrackingOrder(order || null);
          setTrackingModalOpen(true);
        }}
      />

      {/* Customer Authentication Modal (Mandatory Before Checkout) */}
      <CustomerAuthModal />

      {/* Customer Private Profile & Voucher Wallet Modal */}
      <CustomerProfileModal
        onOpenTracking={(order) => {
          setSelectedTrackingOrder(order || null);
          setTrackingModalOpen(true);
        }}
      />

      {/* Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={trackingModalOpen}
        onClose={() => {
          setTrackingModalOpen(false);
          setSelectedTrackingOrder(null);
        }}
        recentOrders={orders}
        initialOrder={selectedTrackingOrder}
        onOrderCancelled={handleOrderCancelled}
      />

      {/* Product Quick View / Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      {/* Brand Story Modal */}
      <StoryModal
        isOpen={storyModalOpen}
        onClose={() => setStoryModalOpen(false)}
        onShopNow={() => scrollToSection('products')}
      />

      {/* Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSelectProduct={(p) => setSelectedProduct(p)}
        onAddToCart={handleAddToCart}
      />

      {/* Admin Visual Editor Floating Controls & Modals */}
      <AdminToolbar
        onOpenJsonBackup={() => setJsonBackupOpen(true)}
        onOpenOrdersModal={() => setAdminOrdersOpen(true)}
        onOpenGoogleSheetsModal={() => setGoogleSheetsModalOpen(true)}
      />
      <AdminLoginModal />
      <ImagePickerModal />
      <TextEditorModal />
      <ProductEditorModal />
      <JsonBackupModal isOpen={jsonBackupOpen} onClose={() => setJsonBackupOpen(false)} />
      <AdminOrdersModal
        isOpen={adminOrdersOpen}
        onClose={() => setAdminOrdersOpen(false)}
        localOrders={orders}
        onOpenGoogleSheets={() => setGoogleSheetsModalOpen(true)}
      />
      <GoogleSheetsSyncModal
        isOpen={googleSheetsModalOpen}
        onClose={() => setGoogleSheetsModalOpen(false)}
        orders={orders}
      />
      <UnsavedChangesModal />

      {/* Interactive Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

    </div>
  );
}

export default function App() {
  return (
    <CustomerAuthProvider>
      <VisualEditorProvider>
        <MainApp />
      </VisualEditorProvider>
    </CustomerAuthProvider>
  );
}
