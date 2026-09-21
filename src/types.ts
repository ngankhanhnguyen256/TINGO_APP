export interface CustomerUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  freeshipVouchers: number; // Defaults to 5
  isFirstOrder: boolean; // True for first-time buyer (gets 20k welcome coupon)
  createdAt: string;
  isBlocked?: boolean; // When blocked, cannot login or register
  blockedAt?: string;
  blockedReason?: string;
  lastLoginAt?: string;
  ordersCount?: number;
  totalSpent?: number;
  lastOrderAt?: string;
  lastOrderId?: string;
}

export interface Voucher {
  code: string;
  title: string;
  description: string;
  type: 'freeship' | 'fixed' | 'percent';
  value: number; // e.g. 20000 or 10
  minOrder?: number;
  availableCount?: number;
  isFirstOrderOnly?: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  categoryLabel: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  image: string;
  badge?: string;
  rating: number;
  reviewsCount: number;
  soldCount?: number; // Base sold count
  initialSoldCount?: number;
  description: string;
  shortDesc: string;
  ingredients: string[];
  usageInstructions: string[];
  volumeOrWeight: string;
  benefits: string[];
  inStock: boolean;
  featured?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedVariant?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipping' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string;
  city: string;
  district: string;
  paymentMethod: 'cod' | 'vietqr' | 'momo';
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  timeline: {
    status: string;
    title: string;
    time: string;
    completed: boolean;
  }[];
  couponCode?: string;
  notes?: string;
  updatedAt?: string;
  cancelledAt?: string;
  cancelledBy?: 'customer' | 'admin';
  cancelReason?: string;
}

export interface HealthArticle {
  id: string;
  title: string;
  category: string;
  readTime: string;
  date: string;
  summary: string;
  content: string;
  image: string;
  author: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  comment: string;
  productName: string;
  verified: boolean;
}

export interface HeroSlide {
  productId: string;
  imageKey: string;
  title: string;
  subtitle: string;
  badge: string;
  highlight: string;
}

export interface HeroData {
  badgeText: string;
  titleLine1: string;
  titleLine2: string;
  titleLine3: string;
  titleLine4: string;
  subtitle: string;
  primaryBtnText: string;
  secondaryBtnText: string;
  stats: {
    value: string;
    label: string;
  }[];
  slides: HeroSlide[];
}

export interface WhyChooseItem {
  id: string;
  iconType: 'zap' | 'sprout' | 'sun' | 'truck' | 'heart' | 'shield' | 'sparkles' | 'award';
  colorScheme: 'emerald' | 'cyan' | 'lime' | 'sky' | 'amber' | 'rose' | 'teal';
  title: string;
  description: string;
  highlight: string;
}

export interface WhyChooseData {
  subtitle: string;
  titleLine1: string;
  titleLine2: string;
  items: WhyChooseItem[];
}

export interface FeaturedShowcaseData {
  productId: string;
  badge: string;
  titleLine1: string;
  titleLine2: string;
  points: string[];
  guarantees: string[];
}

export interface CertItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export interface NewsletterData {
  badge: string;
  title: string;
  desc: string;
  placeholder: string;
  btnText: string;
  discountCode: string;
}

export interface FooterData {
  brandDesc: string;
  address: string;
  addressLink?: string; // Google Maps URL
  hotline: string;
  hotlineLink?: string; // Direct call or custom link
  email: string;
  emailLink?: string; // Mailto or contact link
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  zaloUrl?: string;
  faqBannerUrl?: string; // Custom FAQ banner link
  faqBannerTitle?: string;
  faqBannerSubtitle?: string;
  faqBannerImage?: string;
  copyright: string;
}

export interface LogoConfig {
  type: 'badge' | 'image';
  imageUrl?: string;
  text?: string;
  tagline?: string;
  height?: number;
}

export interface CustomLandingBlock {
  id: string;
  type: 'promo_banner' | 'feature_grid' | 'faq' | 'image_showcase';
  title: string;
  subtitle?: string;
  badge?: string;
  content?: string;
  image?: string;
  buttonText?: string;
  buttonLink?: string;
  items?: {
    id: string;
    title: string;
    desc: string;
    icon?: string;
  }[];
}

export interface TypographyConfig {
  fontFamily: 'vietnam' | 'jakarta' | 'montserrat' | 'lexend' | 'playfair';
  fontScale: 'compact' | 'normal' | 'large';
}

export interface LandingPageConfig {
  logo?: LogoConfig;
  hero: HeroData;
  whyChoose: WhyChooseData;
  featuredShowcase: FeaturedShowcaseData;
  products: Product[];
  certifications: CertItem[];
  testimonials: Testimonial[];
  articles: HealthArticle[];
  newsletter: NewsletterData;
  footer: FooterData;
  customBlocks: CustomLandingBlock[];
  typography?: TypographyConfig;
}
