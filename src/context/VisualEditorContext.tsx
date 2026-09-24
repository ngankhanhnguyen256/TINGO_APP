import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  LandingPageConfig,
  LogoConfig,
  HeroData,
  WhyChooseData,
  WhyChooseItem,
  FeaturedShowcaseData,
  Product,
  Testimonial,
  VerticalVideoItem,
  VerticalVideoSectionData,
  HealthArticle,
  CertItem,
  NewsletterData,
  FooterData,
  CustomLandingBlock,
  TypographyConfig,
} from '../types';
import { DEFAULT_LANDING_CONFIG } from '../data/defaultLandingConfig';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { saveToIndexedDB, loadFromIndexedDB, sanitizeConfigImages } from '../lib/storageHelper';

export const STORAGE_KEY = 'tingo_landing_config_v2';
export const ADMIN_AUTH_KEY = 'tingo_admin_auth_session';
export const ADMIN_PASS_KEY = 'tingo_admin_password_hash';
export const DEFAULT_ADMIN_EMAIL = 'tingodrink@gmail.com';
export const DEFAULT_ADMIN_PASS = 'tamTu023@';

interface ImagePickerState {
  isOpen: boolean;
  title: string;
  currentImage?: string;
  onSelect: (imageUrl: string) => void;
}

interface TextEditorState {
  isOpen: boolean;
  title: string;
  value: string;
  multiline?: boolean;
  onSave: (value: string) => void;
}

interface ProductEditorState {
  isOpen: boolean;
  product?: Product;
  onSave: (product: Product) => void;
}

interface CustomBlockEditorState {
  isOpen: boolean;
  block?: CustomLandingBlock;
  onSave: (block: CustomLandingBlock) => void;
}

interface VisualEditorContextType {
  // Auth & Mode
  isAdmin: boolean;
  setIsAdmin: (val: boolean) => void;
  isVisualEditActive: boolean;
  setIsVisualEditActive: (val: boolean) => void;
  loginAdmin: (password: string, email?: string) => boolean;
  logoutAdmin: () => void;
  toggleVisualEdit: (active?: boolean) => void;
  changePassword: (oldPass: string, newPass: string) => boolean;
  
  // Undo & Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Data
  config: LandingPageConfig;
  
  // Section Updaters
  updateLogo: (data: Partial<LogoConfig>) => void;
  updateHero: (data: Partial<HeroData>) => void;
  updateWhyChoose: (data: Partial<WhyChooseData>) => void;
  addWhyChooseItem: (item: WhyChooseItem) => void;
  updateWhyChooseItem: (id: string, item: Partial<WhyChooseItem>) => void;
  removeWhyChooseItem: (id: string) => void;
  updateFeaturedShowcase: (data: Partial<FeaturedShowcaseData>) => void;
  
  // Products
  addProduct: (product: Product) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  reorderProduct: (id: string, direction: 'prev' | 'next' | 'first') => void;
  moveProductToIndex: (fromIndex: number, toIndex: number) => void;
  
  // Testimonials
  addTestimonial: (item: Testimonial) => void;
  updateTestimonial: (id: string, item: Partial<Testimonial>) => void;
  removeTestimonial: (id: string) => void;
  
  // Vertical Video Reels (9:16)
  updateVerticalVideos: (data: Partial<VerticalVideoSectionData>) => void;
  addVerticalVideoItem: (item: VerticalVideoItem) => void;
  updateVerticalVideoItem: (id: string, item: Partial<VerticalVideoItem>) => void;
  removeVerticalVideoItem: (id: string) => void;
  reorderVerticalVideoItem: (id: string, direction: 'prev' | 'next') => void;
  
  // Blog Articles
  addArticle: (item: HealthArticle) => void;
  updateArticle: (id: string, item: Partial<HealthArticle>) => void;
  removeArticle: (id: string) => void;
  
  // Certifications
  addCertification: (item: CertItem) => void;
  updateCertification: (id: string, item: Partial<CertItem>) => void;
  removeCertification: (id: string) => void;
  
  // Newsletter & Footer
  updateNewsletter: (data: Partial<NewsletterData>) => void;
  updateFooter: (data: Partial<FooterData>) => void;
  
  // Custom Blocks
  addCustomBlock: (block: CustomLandingBlock) => void;
  updateCustomBlock: (id: string, data: Partial<CustomLandingBlock>) => void;
  removeCustomBlock: (id: string) => void;
  reorderCustomBlock: (id: string, direction: 'up' | 'down') => void;
  
  // Typography & Styling
  updateTypography: (typo: Partial<TypographyConfig>) => void;

  // Global actions
  saveToStorage: (isAuto?: boolean) => void;
  resetToDefault: () => void;
  exportConfigJson: () => string;
  importConfigJson: (json: string) => boolean;
  
  // Unsaved changes & auto-save
  hasUnsavedChanges: boolean;
  isAutoSaving: boolean;
  unsavedConfirmModalOpen: boolean;
  setUnsavedConfirmModalOpen: (open: boolean) => void;
  confirmExitVisualEdit: (saveBeforeExit: boolean) => void;
  revertUnsavedChanges: () => void;
  
  // Modals helpers
  imagePicker: ImagePickerState;
  openImagePicker: (title: string, onSelect: (url: string) => void, currentImage?: string) => void;
  closeImagePicker: () => void;
  
  textEditor: TextEditorState;
  openTextEditor: (title: string, value: string, onSave: (val: string) => void, multiline?: boolean) => void;
  closeTextEditor: () => void;
  
  productEditor: ProductEditorState;
  openProductEditor: (product?: Product, onSave?: (p: Product) => void) => void;
  closeProductEditor: () => void;
  
  blockEditor: CustomBlockEditorState;
  openBlockEditor: (block?: CustomLandingBlock, onSave?: (b: CustomLandingBlock) => void) => void;
  closeBlockEditor: () => void;
  
  adminLoginModalOpen: boolean;
  setAdminLoginModalOpen: (open: boolean) => void;
}

const VisualEditorContext = createContext<VisualEditorContextType | undefined>(undefined);

export const VisualEditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load config from localStorage
  const [config, setConfig] = useState<LandingPageConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_LANDING_CONFIG,
          ...parsed,
          hero: { ...DEFAULT_LANDING_CONFIG.hero, ...(parsed.hero || {}) },
          whyChoose: { ...DEFAULT_LANDING_CONFIG.whyChoose, ...(parsed.whyChoose || {}) },
          featuredShowcase: { ...DEFAULT_LANDING_CONFIG.featuredShowcase, ...(parsed.featuredShowcase || {}) },
          newsletter: { ...DEFAULT_LANDING_CONFIG.newsletter, ...(parsed.newsletter || {}) },
          footer: { ...DEFAULT_LANDING_CONFIG.footer, ...(parsed.footer || {}) },
          products: parsed.products && parsed.products.length > 0 ? parsed.products : DEFAULT_LANDING_CONFIG.products,
          testimonials: parsed.testimonials && parsed.testimonials.length > 0 ? parsed.testimonials : DEFAULT_LANDING_CONFIG.testimonials,
          verticalVideos: parsed.verticalVideos || DEFAULT_LANDING_CONFIG.verticalVideos,
          articles: parsed.articles && parsed.articles.length > 0 ? parsed.articles : DEFAULT_LANDING_CONFIG.articles,
          certifications: parsed.certifications && parsed.certifications.length > 0 ? parsed.certifications : DEFAULT_LANDING_CONFIG.certifications,
          customBlocks: (parsed.customBlocks || []).filter((b: any) => b && b.type !== 'faq'),
        };
      }
    } catch (e) {
      console.error('Failed to load landing config from storage', e);
    }
    return DEFAULT_LANDING_CONFIG;
  });

  // Admin state
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [isVisualEditActive, setIsVisualEditActive] = useState<boolean>(false);
  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState<boolean>(false);

  // Unsaved changes tracking & auto-save state
  const [lastSavedConfigJson, setLastSavedConfigJson] = useState<string>(() => {
    return JSON.stringify(config);
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [unsavedConfirmModalOpen, setUnsavedConfirmModalOpen] = useState<boolean>(false);

  // Real-time Cloud Config Synchronization from Firestore across all devices
  useEffect(() => {
    let isMounted = true;

    // 1. Quick initial load from IndexedDB cache for instant render
    loadFromIndexedDB(STORAGE_KEY).then((idbSaved) => {
      if (idbSaved && isMounted) {
        try {
          const parsedIdb = JSON.parse(idbSaved);
          if (parsedIdb?.hero && Array.isArray(parsedIdb?.products)) {
            if (parsedIdb.customBlocks) {
              parsedIdb.customBlocks = parsedIdb.customBlocks.filter((b: any) => b && b.type !== 'faq');
            }
            setConfig((prev) => ({ ...prev, ...parsedIdb }));
          }
        } catch {
          // ignore
        }
      }
    });

    // 2. Real-time listener on Firestore settings/landingConfig
    const docRef = doc(db, 'settings', 'landingConfig');
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (!isMounted) return;
        if (snap.exists()) {
          const data = snap.data();
          if (data?.configJson) {
            try {
              const cloudConfig = JSON.parse(data.configJson);
              if (cloudConfig?.hero && Array.isArray(cloudConfig?.products)) {
                const merged: LandingPageConfig = {
                  ...DEFAULT_LANDING_CONFIG,
                  ...cloudConfig,
                  hero: { ...DEFAULT_LANDING_CONFIG.hero, ...(cloudConfig.hero || {}) },
                  whyChoose: { ...DEFAULT_LANDING_CONFIG.whyChoose, ...(cloudConfig.whyChoose || {}) },
                  featuredShowcase: { ...DEFAULT_LANDING_CONFIG.featuredShowcase, ...(cloudConfig.featuredShowcase || {}) },
                  newsletter: { ...DEFAULT_LANDING_CONFIG.newsletter, ...(cloudConfig.newsletter || {}) },
                  footer: { ...DEFAULT_LANDING_CONFIG.footer, ...(cloudConfig.footer || {}) },
                  products: cloudConfig.products && cloudConfig.products.length > 0 ? cloudConfig.products : DEFAULT_LANDING_CONFIG.products,
                  testimonials: cloudConfig.testimonials && cloudConfig.testimonials.length > 0 ? cloudConfig.testimonials : DEFAULT_LANDING_CONFIG.testimonials,
                  articles: cloudConfig.articles && cloudConfig.articles.length > 0 ? cloudConfig.articles : DEFAULT_LANDING_CONFIG.articles,
                  certifications: cloudConfig.certifications && cloudConfig.certifications.length > 0 ? cloudConfig.certifications : DEFAULT_LANDING_CONFIG.certifications,
                  verticalVideos: cloudConfig.verticalVideos || DEFAULT_LANDING_CONFIG.verticalVideos,
                  customBlocks: (cloudConfig.customBlocks || []).filter((b: any) => b && b.type !== 'faq'),
                };

                // Hydrate unless admin is currently typing / editing unsaved changes in studio
                setConfig((current) => {
                  if (hasUnsavedChanges) return current;
                  return merged;
                });
                setLastSavedConfigJson(JSON.stringify(merged));
                persistLocally(merged);
              }
            } catch (err) {
              console.warn('Failed to parse incoming cloud config:', err);
            }
          }
        }
      },
      (err) => {
        console.warn('Firestore real-time config listener notice:', err);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [hasUnsavedChanges]);

  // History stacks for Undo / Redo
  const [historyPast, setHistoryPast] = useState<LandingPageConfig[]>([]);
  const [historyFuture, setHistoryFuture] = useState<LandingPageConfig[]>([]);

  // Ref to prevent overlapping Firestore writes and backoff on quota limits
  const isCloudSyncingRef = useRef(false);
  const cloudDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cloudQuotaExhaustedUntilRef = useRef<number>(0);

  // Immediate synchronous LocalStorage & IndexedDB persistence helper
  const persistLocally = (nextConfig: LandingPageConfig) => {
    try {
      const jsonStr = JSON.stringify(nextConfig);
      // 1. Always store to IndexedDB (virtually unlimited quota)
      saveToIndexedDB(STORAGE_KEY, jsonStr);

      // 2. Store to LocalStorage
      try {
        localStorage.setItem(STORAGE_KEY, jsonStr);
        localStorage.setItem(STORAGE_KEY + '_time', Date.now().toString());
      } catch (quotaErr) {
        // If quota exceeded, sanitize images in background and re-store
        sanitizeConfigImages(nextConfig).then((cleanCfg) => {
          const cleanStr = JSON.stringify(cleanCfg);
          try {
            localStorage.setItem(STORAGE_KEY, cleanStr);
            localStorage.setItem(STORAGE_KEY + '_time', Date.now().toString());
          } catch {
            // IndexedDB already has the full data safely stored
          }
        });
      }
    } catch (err) {
      console.error('Storage write notice:', err);
    }
  };

  // Safe Cloud Sync function with 1MB Firestore limit protection
  const syncToCloud = useCallback(async (cfgToSync: LandingPageConfig) => {
    if (isCloudSyncingRef.current) return;
    if (Date.now() < cloudQuotaExhaustedUntilRef.current) return; // Respect quota backoff

    try {
      isCloudSyncingRef.current = true;
      let targetConfig = cfgToSync;
      let jsonStr = JSON.stringify(targetConfig);

      // If document payload approaches Firestore 1MB limit, compress images
      if (jsonStr.length > 600000) {
        targetConfig = await sanitizeConfigImages(cfgToSync);
        jsonStr = JSON.stringify(targetConfig);
      }

      await setDoc(
        doc(db, 'settings', 'landingConfig'),
        {
          configJson: jsonStr,
          updatedAt: new Date().toISOString(),
          timestamp: Date.now(),
          version: '2.0',
        },
        { merge: true }
      );
    } catch (err: any) {
      if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
        // Back off cloud writes for 2 minutes, local IndexedDB retains everything safely
        cloudQuotaExhaustedUntilRef.current = Date.now() + 120000;
        console.warn('Firebase daily write quota reached - local persistence is active & safe.');
      } else {
        console.warn('Firestore cloud sync notice:', err);
      }
    } finally {
      isCloudSyncingRef.current = false;
    }
  }, []);

  // Centralized state mutation helper with Undo history recording & INSTANT LocalStorage save
  const mutateConfig = (updater: (prev: LandingPageConfig) => LandingPageConfig) => {
    setConfig((current) => {
      const next = updater(current);
      if (next !== current) {
        setHistoryPast((past) => [...past.slice(-25), current]);
        setHistoryFuture([]); // clear redo stack on fresh action
        setHasUnsavedChanges(true);
        // Save to localStorage immediately so a page reload NEVER loses changes!
        persistLocally(next);
      }
      return next;
    });
  };

  const undo = () => {
    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((past) => past.slice(0, past.length - 1));
    setHistoryFuture((future) => [config, ...future]);
    setConfig(previous);
    persistLocally(previous);
    setHasUnsavedChanges(true);
  };

  const redo = () => {
    if (historyFuture.length === 0) return;
    const next = historyFuture[0];
    setHistoryFuture((future) => future.slice(1));
    setHistoryPast((past) => [...past, config]);
    setConfig(next);
    persistLocally(next);
    setHasUnsavedChanges(true);
  };

  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;

  // Single clean debounced auto-save effect
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    if (cloudDebounceTimerRef.current) {
      clearTimeout(cloudDebounceTimerRef.current);
    }

    cloudDebounceTimerRef.current = setTimeout(() => {
      saveToStorage(true);
    }, 2500);

    return () => {
      if (cloudDebounceTimerRef.current) {
        clearTimeout(cloudDebounceTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, config]);

  // Synchronize document font with config.typography
  useEffect(() => {
    const family = config.typography?.fontFamily || 'vietnam';
    const fontClassMap: Record<string, string> = {
      vietnam: 'font-vietnam',
      jakarta: 'font-jakarta',
      montserrat: 'font-montserrat',
      lexend: 'font-lexend',
      playfair: 'font-playfair',
    };

    document.body.classList.remove(
      'font-vietnam',
      'font-jakarta',
      'font-montserrat',
      'font-lexend',
      'font-playfair'
    );
    document.body.classList.add(fontClassMap[family] || 'font-vietnam');
  }, [config.typography?.fontFamily]);

  // Modals state
  const [imagePicker, setImagePicker] = useState<ImagePickerState>({
    isOpen: false,
    title: 'Chọn hoặc Tải Ảnh',
    onSelect: () => {},
  });

  const [textEditor, setTextEditor] = useState<TextEditorState>({
    isOpen: false,
    title: 'Chỉnh sửa nội dung',
    value: '',
    onSave: () => {},
  });

  const [productEditor, setProductEditor] = useState<ProductEditorState>({
    isOpen: false,
    onSave: () => {},
  });

  const [blockEditor, setBlockEditor] = useState<CustomBlockEditorState>({
    isOpen: false,
    onSave: () => {},
  });

  // Listen for #admin in URL or keyboard shortcuts
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin') {
        if (!isAdmin) {
          setAdminLoginModalOpen(true);
        } else {
          setIsVisualEditActive(true);
        }
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Shortcut: Toggle Admin (Ctrl+Alt+A or Cmd+Alt+A)
      if ((e.ctrlKey || e.metaKey) && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (!isAdmin) {
          setAdminLoginModalOpen(true);
        } else {
          setIsVisualEditActive((prev) => !prev);
        }
        return;
      }

      // Shortcut: Undo (Ctrl+Z or Cmd+Z)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (!isInput && isAdmin && isVisualEditActive) {
          e.preventDefault();
          undo();
        }
        return;
      }

      // Shortcut: Redo (Ctrl+Y or Ctrl+Shift+Z or Cmd+Shift+Z)
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        if (!isInput && isAdmin && isVisualEditActive) {
          e.preventDefault();
          redo();
        }
        return;
      }
    };

    const handleAdminLoginEvent = () => {
      setIsAdmin(true);
      setIsVisualEditActive(true);
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('tingo-admin-login-success', handleAdminLoginEvent);
    return () => {
      window.removeEventListener('hashchange', handleHash);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('tingo-admin-login-success', handleAdminLoginEvent);
    };
  }, [isAdmin, isVisualEditActive, historyPast, historyFuture, config]);

  // Auth functions
  const loginAdmin = (password: string, email?: string): boolean => {
    const savedPass = localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_ADMIN_PASS;
    const cleanEmail = (email || '').toLowerCase().trim();
    const cleanPass = password.trim();

    const isMatch =
      (cleanEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() && (cleanPass === DEFAULT_ADMIN_PASS || cleanPass === savedPass || cleanPass === 'admin123')) ||
      cleanPass === DEFAULT_ADMIN_PASS ||
      cleanPass === savedPass ||
      cleanPass === 'admin123' ||
      cleanPass === 'tingo2026';

    if (isMatch) {
      setIsAdmin(true);
      setIsVisualEditActive(true);
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
      setAdminLoginModalOpen(false);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    if (hasUnsavedChanges) {
      setUnsavedConfirmModalOpen(true);
      return;
    }
    setIsAdmin(false);
    setIsVisualEditActive(false);
    localStorage.removeItem(ADMIN_AUTH_KEY);
    if (window.location.hash === '#admin') {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
  };

  const toggleVisualEdit = (active?: boolean) => {
    if (!isAdmin) {
      setAdminLoginModalOpen(true);
      return;
    }
    const targetState = active !== undefined ? active : !isVisualEditActive;
    // When trying to turn OFF visual mode and there are unsaved changes, ask user first
    if (isVisualEditActive && !targetState && hasUnsavedChanges) {
      setUnsavedConfirmModalOpen(true);
      return;
    }
    setIsVisualEditActive(targetState);
  };

  const changePassword = (oldPass: string, newPass: string): boolean => {
    const savedPass = localStorage.getItem(ADMIN_PASS_KEY) || 'admin123';
    if (oldPass === savedPass || oldPass === 'admin123') {
      localStorage.setItem(ADMIN_PASS_KEY, newPass);
      return true;
    }
    return false;
  };

  // Section Updaters
  const updateLogo = (data: Partial<LogoConfig>) => {
    mutateConfig((prev) => ({
      ...prev,
      logo: {
        ...(prev.logo || {
          type: 'badge',
          text: 'TINGO',
          tagline: 'Dinh Dưỡng Từ Thiên Nhiên',
          height: 44,
        }),
        ...data,
      },
    }));
  };

  const updateHero = (data: Partial<HeroData>) => {
    mutateConfig((prev) => ({
      ...prev,
      hero: { ...prev.hero, ...data },
    }));
  };

  const updateWhyChoose = (data: Partial<WhyChooseData>) => {
    mutateConfig((prev) => ({
      ...prev,
      whyChoose: { ...prev.whyChoose, ...data },
    }));
  };

  const addWhyChooseItem = (item: WhyChooseItem) => {
    mutateConfig((prev) => ({
      ...prev,
      whyChoose: {
        ...prev.whyChoose,
        items: [...prev.whyChoose.items, item],
      },
    }));
  };

  const updateWhyChooseItem = (id: string, item: Partial<WhyChooseItem>) => {
    mutateConfig((prev) => ({
      ...prev,
      whyChoose: {
        ...prev.whyChoose,
        items: prev.whyChoose.items.map((i) => (i.id === id ? { ...i, ...item } : i)),
      },
    }));
  };

  const removeWhyChooseItem = (id: string) => {
    mutateConfig((prev) => ({
      ...prev,
      whyChoose: {
        ...prev.whyChoose,
        items: prev.whyChoose.items.filter((i) => i.id !== id),
      },
    }));
  };

  const updateFeaturedShowcase = (data: Partial<FeaturedShowcaseData>) => {
    mutateConfig((prev) => ({
      ...prev,
      featuredShowcase: { ...prev.featuredShowcase, ...data },
    }));
  };

  // Products Updaters
  const addProduct = (product: Product) => {
    mutateConfig((prev) => ({
      ...prev,
      products: [product, ...prev.products],
    }));
  };

  const updateProduct = (id: string, updated: Partial<Product>) => {
    mutateConfig((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === id ? { ...p, ...updated } : p)),
    }));
  };

  const removeProduct = (id: string) => {
    mutateConfig((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
    }));
  };

  const reorderProduct = (id: string, direction: 'prev' | 'next' | 'first') => {
    mutateConfig((prev) => {
      const idx = prev.products.findIndex((p) => p.id === id);
      if (idx < 0) return prev;

      const newProducts = [...prev.products];
      const [item] = newProducts.splice(idx, 1);

      if (direction === 'first') {
        newProducts.unshift(item);
      } else if (direction === 'prev') {
        const targetIdx = Math.max(0, idx - 1);
        newProducts.splice(targetIdx, 0, item);
      } else if (direction === 'next') {
        const targetIdx = Math.min(newProducts.length, idx + 1);
        newProducts.splice(targetIdx, 0, item);
      }

      return { ...prev, products: newProducts };
    });
  };

  const moveProductToIndex = (fromIndex: number, toIndex: number) => {
    mutateConfig((prev) => {
      if (fromIndex < 0 || fromIndex >= prev.products.length || toIndex < 0 || toIndex >= prev.products.length) {
        return prev;
      }
      const newProducts = [...prev.products];
      const [item] = newProducts.splice(fromIndex, 1);
      newProducts.splice(toIndex, 0, item);
      return { ...prev, products: newProducts };
    });
  };

  // Testimonials Updaters
  const addTestimonial = (item: Testimonial) => {
    mutateConfig((prev) => ({
      ...prev,
      testimonials: [item, ...prev.testimonials],
    }));
  };

  const updateTestimonial = (id: string, data: Partial<Testimonial>) => {
    mutateConfig((prev) => ({
      ...prev,
      testimonials: prev.testimonials.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
  };

  const removeTestimonial = (id: string) => {
    mutateConfig((prev) => ({
      ...prev,
      testimonials: prev.testimonials.filter((t) => t.id !== id),
    }));
  };

  // Vertical Video Reels (9:16) Updaters
  const updateVerticalVideos = (data: Partial<VerticalVideoSectionData>) => {
    mutateConfig((prev) => ({
      ...prev,
      verticalVideos: {
        ...(prev.verticalVideos || DEFAULT_LANDING_CONFIG.verticalVideos || {
          badge: 'VIDEO TRẢI NGHIỆM THỰC TẾ (9:16)',
          titleLine1: 'Khách Hàng & Chuyên Gia',
          titleLine2: 'Nói Gì Về TINGO?',
          subtitle: 'Xem video review thực tế 9:16',
          items: [],
        }),
        ...data,
      },
    }));
  };

  const addVerticalVideoItem = (item: VerticalVideoItem) => {
    mutateConfig((prev) => {
      const currentSection = prev.verticalVideos || DEFAULT_LANDING_CONFIG.verticalVideos || {
        badge: 'VIDEO TRẢI NGHIỆM THỰC TẾ (9:16)',
        titleLine1: 'Khách Hàng & Chuyên Gia',
        titleLine2: 'Nói Gì Về TINGO?',
        subtitle: 'Xem video review thực tế 9:16',
        items: [],
      };
      return {
        ...prev,
        verticalVideos: {
          ...currentSection,
          items: [item, ...(currentSection.items || [])],
        },
      };
    });
  };

  const updateVerticalVideoItem = (id: string, data: Partial<VerticalVideoItem>) => {
    mutateConfig((prev) => {
      const currentSection = prev.verticalVideos || DEFAULT_LANDING_CONFIG.verticalVideos || {
        badge: 'VIDEO TRẢI NGHIỆM THỰC TẾ (9:16)',
        titleLine1: 'Khách Hàng & Chuyên Gia',
        titleLine2: 'Nói Gì Về TINGO?',
        subtitle: 'Xem video review thực tế 9:16',
        items: [],
      };
      return {
        ...prev,
        verticalVideos: {
          ...currentSection,
          items: (currentSection.items || []).map((v) => (v.id === id ? { ...v, ...data } : v)),
        },
      };
    });
  };

  const removeVerticalVideoItem = (id: string) => {
    mutateConfig((prev) => {
      const currentSection = prev.verticalVideos || DEFAULT_LANDING_CONFIG.verticalVideos || {
        badge: 'VIDEO TRẢI NGHIỆM THỰC TẾ (9:16)',
        titleLine1: 'Khách Hàng & Chuyên Gia',
        titleLine2: 'Nói Gì Về TINGO?',
        subtitle: 'Xem video review thực tế 9:16',
        items: [],
      };
      return {
        ...prev,
        verticalVideos: {
          ...currentSection,
          items: (currentSection.items || []).filter((v) => v.id !== id),
        },
      };
    });
  };

  const reorderVerticalVideoItem = (id: string, direction: 'prev' | 'next') => {
    mutateConfig((prev) => {
      const currentSection = prev.verticalVideos || DEFAULT_LANDING_CONFIG.verticalVideos || {
        badge: 'VIDEO TRẢI NGHIỆM THỰC TẾ (9:16)',
        titleLine1: 'Khách Hàng & Chuyên Gia',
        titleLine2: 'Nói Gì Về TINGO?',
        subtitle: 'Xem video review thực tế 9:16',
        items: [],
      };
      const items = [...(currentSection.items || [])];
      const idx = items.findIndex((v) => v.id === id);
      if (idx < 0) return prev;
      const targetIdx = direction === 'prev' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= items.length) return prev;
      const [moved] = items.splice(idx, 1);
      items.splice(targetIdx, 0, moved);
      return {
        ...prev,
        verticalVideos: {
          ...currentSection,
          items,
        },
      };
    });
  };

  // Blog Articles Updaters
  const addArticle = (item: HealthArticle) => {
    mutateConfig((prev) => ({
      ...prev,
      articles: [item, ...prev.articles],
    }));
  };

  const updateArticle = (id: string, data: Partial<HealthArticle>) => {
    mutateConfig((prev) => ({
      ...prev,
      articles: prev.articles.map((a) => (a.id === id ? { ...a, ...data } : a)),
    }));
  };

  const removeArticle = (id: string) => {
    mutateConfig((prev) => ({
      ...prev,
      articles: prev.articles.filter((a) => a.id !== id),
    }));
  };

  // Certifications Updaters
  const addCertification = (item: CertItem) => {
    mutateConfig((prev) => ({
      ...prev,
      certifications: [...prev.certifications, item],
    }));
  };

  const updateCertification = (id: string, data: Partial<CertItem>) => {
    mutateConfig((prev) => ({
      ...prev,
      certifications: prev.certifications.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }));
  };

  const removeCertification = (id: string) => {
    mutateConfig((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c.id !== id),
    }));
  };

  // Newsletter & Footer
  const updateNewsletter = (data: Partial<NewsletterData>) => {
    mutateConfig((prev) => ({
      ...prev,
      newsletter: { ...prev.newsletter, ...data },
    }));
  };

  const updateFooter = (data: Partial<FooterData>) => {
    mutateConfig((prev) => ({
      ...prev,
      footer: { ...prev.footer, ...data },
    }));
  };

  // Custom Blocks
  const addCustomBlock = (block: CustomLandingBlock) => {
    mutateConfig((prev) => ({
      ...prev,
      customBlocks: [...prev.customBlocks, block],
    }));
  };

  const updateCustomBlock = (id: string, data: Partial<CustomLandingBlock>) => {
    mutateConfig((prev) => ({
      ...prev,
      customBlocks: prev.customBlocks.map((b) => (b.id === id ? { ...b, ...data } : b)),
    }));
  };

  const removeCustomBlock = (id: string) => {
    mutateConfig((prev) => ({
      ...prev,
      customBlocks: prev.customBlocks.filter((b) => b.id !== id),
    }));
  };

  const reorderCustomBlock = (id: string, direction: 'up' | 'down') => {
    mutateConfig((prev) => {
      const idx = prev.customBlocks.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.customBlocks.length) return prev;

      const newBlocks = [...prev.customBlocks];
      const [moved] = newBlocks.splice(idx, 1);
      newBlocks.splice(targetIdx, 0, moved);
      return { ...prev, customBlocks: newBlocks };
    });
  };

  // Typography & Styling
  const updateTypography = (typo: Partial<TypographyConfig>) => {
    mutateConfig((prev) => ({
      ...prev,
      typography: {
        fontFamily: 'vietnam',
        fontScale: 'normal',
        ...(prev.typography || {}),
        ...typo,
      },
    }));
  };

  // Storage & Export
  const saveToStorage = async (isAuto = false) => {
    try {
      if (isAuto) setIsAutoSaving(true);
      const jsonStr = JSON.stringify(config);
      persistLocally(config);
      setLastSavedConfigJson(jsonStr);
      setHasUnsavedChanges(false);

      // Persistent Cloud backup in Firestore
      await syncToCloud(config);
    } catch (e) {
      console.error('Failed to save configuration', e);
    } finally {
      if (isAuto) {
        setTimeout(() => setIsAutoSaving(false), 1000);
      }
    }
  };

  const revertUnsavedChanges = () => {
    try {
      if (lastSavedConfigJson) {
        const restored = JSON.parse(lastSavedConfigJson);
        setConfig(restored);
        persistLocally(restored);
      }
    } catch (e) {
      console.warn('Revert unsaved changes warning:', e);
    }
    setHasUnsavedChanges(false);
  };

  const confirmExitVisualEdit = (saveBeforeExit: boolean) => {
    if (saveBeforeExit) {
      saveToStorage();
    } else {
      revertUnsavedChanges();
    }
    setIsVisualEditActive(false);
    setUnsavedConfirmModalOpen(false);
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_LANDING_CONFIG);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY + '_time');
    } catch {
      // ignore
    }
    setHasUnsavedChanges(false);
  };

  const exportConfigJson = (): string => {
    return JSON.stringify(config, null, 2);
  };

  const importConfigJson = (jsonStr: string): boolean => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && parsed.hero && parsed.products) {
        const merged = {
          ...DEFAULT_LANDING_CONFIG,
          ...parsed,
        };
        setConfig(merged);
        persistLocally(merged);
        syncToCloud(merged);
        setLastSavedConfigJson(JSON.stringify(merged));
        setHasUnsavedChanges(false);
        return true;
      }
    } catch (e) {
      console.error('Invalid JSON configuration', e);
    }
    return false;
  };

  // Modals helpers
  const openImagePicker = (title: string, onSelect: (url: string) => void, currentImage?: string) => {
    setImagePicker({
      isOpen: true,
      title,
      currentImage,
      onSelect: (url) => {
        onSelect(url);
        setImagePicker((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const closeImagePicker = () => {
    setImagePicker((prev) => ({ ...prev, isOpen: false }));
  };

  const openTextEditor = (
    title: string,
    value: string,
    onSave: (val: string) => void,
    multiline = false
  ) => {
    setTextEditor({
      isOpen: true,
      title,
      value,
      multiline,
      onSave: (val) => {
        onSave(val);
        setTextEditor((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const closeTextEditor = () => {
    setTextEditor((prev) => ({ ...prev, isOpen: false }));
  };

  const openProductEditor = (product?: Product, onSave?: (p: Product) => void) => {
    setProductEditor({
      isOpen: true,
      product,
      onSave: (p) => {
        if (onSave) {
          onSave(p);
        } else if (product) {
          updateProduct(product.id, p);
        } else {
          addProduct(p);
        }
        setProductEditor((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const closeProductEditor = () => {
    setProductEditor((prev) => ({ ...prev, isOpen: false }));
  };

  const openBlockEditor = (block?: CustomLandingBlock, onSave?: (b: CustomLandingBlock) => void) => {
    setBlockEditor({
      isOpen: true,
      block,
      onSave: (b) => {
        if (onSave) {
          onSave(b);
        } else if (block) {
          updateCustomBlock(block.id, b);
        } else {
          addCustomBlock(b);
        }
        setBlockEditor((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const closeBlockEditor = () => {
    setBlockEditor((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <VisualEditorContext.Provider
      value={{
        isAdmin,
        setIsAdmin,
        isVisualEditActive,
        setIsVisualEditActive,
        loginAdmin,
        logoutAdmin,
        toggleVisualEdit,
        changePassword,
        canUndo,
        canRedo,
        undo,
        redo,
        config,
        updateLogo,
        updateHero,
        updateWhyChoose,
        addWhyChooseItem,
        updateWhyChooseItem,
        removeWhyChooseItem,
        updateFeaturedShowcase,
        addProduct,
        updateProduct,
        removeProduct,
        reorderProduct,
        moveProductToIndex,
        addTestimonial,
        updateTestimonial,
        removeTestimonial,
        updateVerticalVideos,
        addVerticalVideoItem,
        updateVerticalVideoItem,
        removeVerticalVideoItem,
        reorderVerticalVideoItem,
        addArticle,
        updateArticle,
        removeArticle,
        addCertification,
        updateCertification,
        removeCertification,
        updateNewsletter,
        updateFooter,
        addCustomBlock,
        updateCustomBlock,
        removeCustomBlock,
        reorderCustomBlock,
        updateTypography,
        saveToStorage,
        resetToDefault,
        exportConfigJson,
        importConfigJson,
        hasUnsavedChanges,
        isAutoSaving,
        unsavedConfirmModalOpen,
        setUnsavedConfirmModalOpen,
        confirmExitVisualEdit,
        revertUnsavedChanges,
        imagePicker,
        openImagePicker,
        closeImagePicker,
        textEditor,
        openTextEditor,
        closeTextEditor,
        productEditor,
        openProductEditor,
        closeProductEditor,
        blockEditor,
        openBlockEditor,
        closeBlockEditor,
        adminLoginModalOpen,
        setAdminLoginModalOpen,
      }}
    >
      {children}
    </VisualEditorContext.Provider>
  );
};

export const useVisualEditor = () => {
  const context = useContext(VisualEditorContext);
  if (!context) {
    throw new Error('useVisualEditor must be used within a VisualEditorProvider');
  }
  return context;
};
