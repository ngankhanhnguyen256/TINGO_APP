import { LandingPageConfig } from '../types';
import { PRODUCTS, HEALTH_ARTICLES, TESTIMONIALS } from './mockData';

export const DEFAULT_LANDING_CONFIG: LandingPageConfig = {
  hero: {
    badgeText: '100% Nguyên Liệu Tự Nhiên Sạch',
    titleLine1: 'TINGO',
    titleLine2: 'Dinh Dưỡng',
    titleLine3: 'Sống',
    titleLine4: 'Từ Thiên Nhiên',
    subtitle: 'Cân bằng cơ thể, khơi nguồn năng lượng với đồ uống dinh dưỡng sạch hàng đầu cho người Việt.',
    primaryBtnText: 'Mua Ngay',
    secondaryBtnText: 'Xem Câu Chuyện',
    stats: [
      { value: '100%', label: 'Thuần thực vật' },
      { value: '24+', label: 'Vi chất dinh dưỡng' },
      { value: '4.9★', label: '12.000+ Đánh giá' },
    ],
    slides: [
      {
        productId: 'tingo-quantum-water',
        imageKey: 'quantum-hydrogen',
        title: 'Tươi mát từng giọt',
        subtitle: 'Rót đầy năng lượng tự nhiên',
        badge: 'Nước Ion Kiềm Lượng Tử',
        highlight: 'Nồng độ Hydrogen 1600ppb',
      },
      {
        productId: 'tingo-vhealth-duo',
        imageKey: 'vhealth-duo',
        title: 'Dinh dưỡng vàng 2 vị',
        subtitle: 'Đạm đậu Hà Lan & Cacao Bỉ',
        badge: 'Bữa Sáng Nhanh 3 Phút',
        highlight: '24 Vitamin & Khoáng chất',
      },
      {
        productId: 'tingo-vsportgel',
        imageKey: 'vsportgel',
        title: 'Phục hồi tức thì',
        subtitle: 'Năng lượng kép cho sức bền vượt trội',
        badge: 'Gel Năng Lượng Đỉnh Cao',
        highlight: 'Chống chuột rút hiệu quả',
      },
      {
        productId: 'tingo-vhealth-tra-xanh',
        imageKey: 'vhealth-matcha',
        title: 'Thanh lọc & Tươi trẻ',
        subtitle: 'Matcha hữu cơ giàu EGCG tự nhiên',
        badge: 'Bột Dinh Dưỡng Matcha',
        highlight: '100% Thuần thực vật hữu cơ',
      },
      {
        productId: 'tingo-caphe-link',
        imageKey: 'caphe-link',
        title: 'Tỉnh táo bứt phá',
        subtitle: 'Cà phê thảo mộc Linh Chi & Hoàng Kỳ',
        badge: 'Cà Phê Sức Khỏe',
        highlight: 'Tập trung bền bỉ suốt 8 giờ',
      },
    ],
  },
  whyChoose: {
    subtitle: 'VÌ SAO CHỌN TINGO',
    titleLine1: 'Sống khoẻ mỗi ngày',
    titleLine2: 'từ những điều tự nhiên',
    items: [
      {
        id: 'energy',
        iconType: 'zap',
        colorScheme: 'emerald',
        title: 'Năng Lượng Sạch',
        description:
          'Thay vì nạp năng lượng "rỗng" từ đường tinh luyện gây mệt mỏi nhanh, cơ thể bạn cần Complex Carbs (tinh bột phức hợp) từ ngũ cốc nguyên cám. Chúng giải phóng năng lượng từ từ, giữ đường huyết ổn định suốt ngày dài. Mẹo hay: Kết hợp ngũ cốc và cacao nguyên chất giàu Flavonoid giúp bạn tỉnh táo, no lâu và giữ dáng hiệu quả. Chỉ 3 phút mỗi sáng với V-Health...',
        highlight: 'Complex Carbs & Cacao Flavonoid',
      },
      {
        id: 'protein',
        iconType: 'sprout',
        colorScheme: 'cyan',
        title: 'Đạm Đậu Nành & Hà Lan',
        description:
          'Hệ tiêu hóa quá tải vì đạm động vật nhiều cholesterol? Hãy chuyển sang đạm thực vật từ đậu Hà Lan tinh khiết. Đây là nguồn protein lành tính, giàu axit amin thiết yếu nhưng hoàn toàn không chứa chất béo bão hòa. Điểm cộng lớn: Đạm đậu Hà Lan cực kỳ dễ tiêu, không gây đầy bụng, ợ hơi, giúp bảo vệ tim mạch và nhẹ nhàng với cả dạ dày nhạy cảm của người lớn tuổi.',
        highlight: '100% Thuần Thực Vật Lành Tính',
      },
      {
        id: 'quantum',
        iconType: 'sun',
        colorScheme: 'lime',
        title: 'Nước Ion Kiềm Công Nghệ Lượng Tử',
        description:
          'Không chỉ là nước uống giải khát, nước Ion Kiềm Quantum ứng dụng công nghệ lượng tử hiện đại mang đến nguồn nước giàu tính kiềm tự nhiên và nồng độ Hydrogen cao. Giá trị thực: Các cụm phân tử nước siêu nhỏ giúp thẩm thấu nhanh vào từng tế bào, trung hòa axit dư thừa và đào thải độc tố tối ưu. Sử dụng mỗi ngày là bí quyết đơn giản...',
        highlight: 'Phân Tử Siêu Nhỏ pH 9.0+',
      },
      {
        id: 'recovery',
        iconType: 'truck',
        colorScheme: 'sky',
        title: 'Bí Quyết Giảm Mệt Mỏi Tức Thì',
        description:
          'Khi cơ thể cạn kiệt năng lượng do vận động mạnh hoặc làm việc quá sức, việc bổ sung đúng chất là cực kỳ quan trọng. Sự kết hợp giữa năng lượng chuyển hóa nhanh, Khoáng chất (Magnesi, Kẽm) và Vitamin nhóm B (B1, B5, B6) chính là “chìa khóa” giúp cơ bắp phục hồi, giảm tình trạng đau mỏi, chuột rút. Mẹo nhỏ: Bỏ túi 1 gói Vsportgel...',
        highlight: 'Nạp Lại Năng Lượng Trong 3 Phút',
      },
    ],
  },
  featuredShowcase: {
    productId: 'tingo-vhealth-duo',
    badge: 'Bán Chạy #1',
    titleLine1: 'BỘT DINH DƯỠNG',
    titleLine2: 'VHEALTH 2 VỊ',
    points: [
      'Pha 1 gói Vhealth với khoảng 150ml nước',
      'Ngon hơn khi pha với nước ấm',
      'Có thể pha với nước lọc, sữa, nước hoa quả... khuấy đều và thưởng thức',
    ],
    guarantees: [
      '100% Chính hãng TINGO',
      'Đổi trả 7 ngày',
      'Kiểm tra hàng trước khi thanh toán',
    ],
  },
  products: PRODUCTS,
  certifications: [
    {
      id: 'cert-1',
      title: 'ISO 22000:2018',
      desc: 'Tiêu chuẩn an toàn thực phẩm quốc tế',
      icon: 'shield',
    },
    {
      id: 'cert-2',
      title: 'HACCP Certified',
      desc: 'Kiểm soát mối nguy sinh học & hóa học',
      icon: 'award',
    },
    {
      id: 'cert-3',
      title: '100% Organic Non-GMO',
      desc: 'Nguồn gốc thuần thực vật không biến đổi gen',
      icon: 'sprout',
    },
    {
      id: 'cert-4',
      title: 'Bộ Y Tế Cấp Phép',
      desc: 'Được chứng nhận lưu hành an toàn toàn quốc',
      icon: 'heart',
    },
  ],
  testimonials: TESTIMONIALS,
  articles: HEALTH_ARTICLES,
  newsletter: {
    badge: 'ƯU ĐÃI THÀNH VIÊN MỚI',
    title: 'Nhận ngay Voucher 10% cho đơn hàng đầu tiên',
    desc: 'Đăng ký nhận cẩm nang sức khỏe hàng tuần cùng các chương trình khuyến mãi độc quyền từ TINGO.',
    placeholder: 'Nhập địa chỉ email của bạn...',
    btnText: 'Đăng Ký Nhận Quà',
    discountCode: 'TINGO10',
  },
  footer: {
    brandDesc: 'Đồ uống & dinh dưỡng sức khoẻ từ nguyên liệu tự nhiên Việt Nam.',
    address: '1/12 Linh Đông, TP. Thủ Đức, TP.HCM',
    hotline: '028 2210 7946',
    email: 'hello@tingo.vn',
    copyright: '© 2026 TINGO Organic & Health Vietnam. Tất cả quyền được bảo lưu.',
  },
  customBlocks: [],
  typography: {
    fontFamily: 'vietnam',
    fontScale: 'normal',
  },
};
