import { Product, HealthArticle, Testimonial, Order } from '../types';

export const CATEGORIES = [
  { id: 'all', name: 'Tất Cả' },
  { id: 'nuoc-ion-kiem', name: 'Nước Ion Kiềm' },
  { id: 'bot-dinh-duong', name: 'Bột Dinh Dưỡng' },
  { id: 'gel-nang-luong', name: 'Gel Năng Lượng' },
  { id: 'ca-phe', name: 'Cà Phê Sức Khỏe' },
  { id: 'combo', name: 'Combo Tiết Kiệm' },
];

export const PRODUCTS: Product[] = [
  {
    id: 'tingo-vhealth-duo',
    name: 'BỘT DINH DƯỠNG VHEALTH 2 VỊ',
    slug: 'bot-dinh-duong-vhealth-2-vi',
    category: 'bot-dinh-duong',
    categoryLabel: 'BỘT DINH DƯỠNG',
    price: 790000,
    originalPrice: 940000,
    discountPercent: 16,
    badge: 'Bán Chạy #1',
    image: 'vhealth-duo',
    rating: 4.9,
    reviewsCount: 384,
    shortDesc: 'Bộ đôi dinh dưỡng hoàn hảo Trà Xanh matcha & Sôcôla thượng hạng, giàu đạm thực vật và chất xơ hòa tan.',
    description: 'Bột dinh dưỡng Vhealth 2 vị là sự kết hợp hoàn hảo giữa hương vị Matcha Nhật Bản tươi mát và Sô-cô-la nguyên chất đậm đà. Nguồn đạm đậu Hà Lan tinh khiết không biến đổi gen (Non-GMO), bổ sung 24 vitamin khoáng chất thiết yếu cho bữa sáng nhanh gọn, no lâu và tràn đầy sinh lực.',
    ingredients: [
      'Đạm thực vật tinh khiết từ hạt đậu Hà Lan hữu cơ',
      'Bột matcha Trà Xanh nguyên chất / Bột Cacao hữu cơ giàu Flavonoid',
      'Ngũ cốc nguyên cám (Yến mạch, Hạt chia, Hạt macca)',
      'Vitamin tổng hợp nhóm B (B1, B2, B6, B12), Vitamin C, Vitamin D3',
      'Khoáng chất thiết yếu: Canxi hữu cơ, Kẽm, Magie',
      'Đường isomalt ăn kiêng năng lượng thấp tự nhiên'
    ],
    usageInstructions: [
      'Pha 1 gói Vhealth (25g) với khoảng 150ml - 200ml nước',
      'Ngon hơn khi pha với nước ấm (khoảng 45°C - 50°C)',
      'Có thể pha cùng nước lọc, sữa chua, sữa hạt hoặc xay cùng sinh tố hoa quả'
    ],
    volumeOrWeight: 'Hộp 20 gói x 25g (500g)',
    benefits: [
      'Cung cấp năng lượng sạch kéo dài, không gây tăng đường huyết đột ngột',
      'Hỗ trợ tiêu hóa nhẹ bụng, không gây ợ hơi khó tiêu',
      'Giữ vóc dáng thon gọn, hỗ trợ kiểm soát cân nặng lành mạnh',
      'Tăng cường sức đề kháng và thanh lọc độc tố cơ thể'
    ],
    inStock: true,
    featured: true,
  },
  {
    id: 'tingo-quantum-water',
    name: 'HYDRONGEN QUANTUM',
    slug: 'nuoc-uong-hydrogen-quantum',
    category: 'nuoc-ion-kiem',
    categoryLabel: 'NƯỚC ION KIỀM',
    price: 754455,
    originalPrice: 890000,
    discountPercent: 15,
    badge: 'Công Nghệ Lượng Tử',
    image: 'quantum-hydrogen',
    rating: 5.0,
    reviewsCount: 512,
    shortDesc: 'Nước uống giàu Hydro hoạt tính công nghệ lượng tử, phân tử siêu nhỏ thẩm thấu tức thì vào tế bào.',
    description: 'Nước uống Ion Kiềm Quantum ứng dụng công nghệ phân tách lượng tử tiên tiến, mang lại nguồn nước kiềm pH 9.0 - 9.5 tự nhiên và nồng độ Hydrogen hòa tan cao vượt trội (lên tới 1600 ppb). Túi nhôm chuyên dụng 4 lớp giữ trọn vẹn khí Hydro không bị thất thoát.',
    ingredients: [
      '100% Nước khoáng ngầm thiên nhiên qua xử lý lượng tử',
      'Khoáng chất vi lượng tự nhiên (Ca2+, Mg2+, Na+, K+, HCO3-)',
      'Hydrogen hoạt tính hòa tan nồng độ cao'
    ],
    usageInstructions: [
      'Uống trực tiếp ngay sau khi mở nắp vặn túi',
      'Nên uống 1-2 túi mỗi ngày trước bữa ăn hoặc sau khi vận động thể thao',
      'Ngon hơn khi uống lạnh'
    ],
    volumeOrWeight: 'Thùng 24 túi x 333ml',
    benefits: [
      'Trung hòa axit dư thừa trong dạ dày, giảm trào ngược hiệu quả',
      'Chống oxy hóa mạnh mẽ, làm chậm quá trình lão hóa tế bào',
      'Thẩm thấu nhanh, bù nước và khoáng chất tức thì cho người vận động'
    ],
    inStock: true,
    featured: true,
  },
  {
    id: 'tingo-vhealth-scl',
    name: 'VHEALTH SCL',
    slug: 'bot-dinh-duong-vhealth-socola',
    category: 'bot-dinh-duong',
    categoryLabel: 'BỘT DINH DƯỠNG',
    price: 652000,
    originalPrice: 790000,
    discountPercent: 17,
    image: 'vhealth-scl',
    rating: 4.8,
    reviewsCount: 220,
    shortDesc: 'Hương vị Sô-cô-la Bỉ cao cấp kết hợp ngũ cốc nguyên cám, ngọt thanh dịu nhẹ, dinh dưỡng trọn vẹn.',
    description: 'Bột dinh dưỡng Vhealth Socola đem lại trải nghiệm béo ngậy ngọt dịu tự nhiên từ cacao nguyên chất kết hợp hạt chia hữu cơ. Nguồn dinh dưỡng lý tưởng thay thế bữa ăn phụ lành mạnh cho người bận rộn và học sinh, sinh viên.',
    ingredients: [
      'Bột Cacao tự nhiên giàu Polyphenol',
      'Đạm đậu Hà Lan cô lập (Pea Protein Isolate)',
      'Hạt chia organic, hạt yến mạch cán mịn',
      'Bộ tổ hợp Vitamin B-Complex & Khoáng kẽm hữu cơ'
    ],
    usageInstructions: [
      'Pha 1 gói (25g) với 150ml nước ấm 50°C',
      'Khuấy đều 30 giây là có thể thưởng thức ngay'
    ],
    volumeOrWeight: 'Hộp 20 gói x 25g',
    benefits: [
      'Tạo cảm giác no lâu, hạn chế cảm giác thèm ngọt độc hại',
      'Bổ sung Magie tự nhiên giúp thư giãn tinh thần và giảm căng thẳng'
    ],
    inStock: true,
    featured: true,
  },
  {
    id: 'tingo-vhealth-tra-xanh',
    name: 'VHEALTH TRÀ XANH',
    slug: 'bot-dinh-duong-vhealth-tra-xanh',
    category: 'bot-dinh-duong',
    categoryLabel: 'BỘT DINH DƯỠNG',
    price: 652000,
    originalPrice: 790000,
    discountPercent: 17,
    badge: 'Organic Matcha',
    image: 'vhealth-matcha',
    rating: 4.9,
    reviewsCount: 275,
    shortDesc: 'Bột dinh dưỡng Matcha Trà Xanh nguyên chất, thơm mát tinh tế, hỗ trợ thải độc và giữ dáng thanh mảnh.',
    description: 'Chiết xuất từ những đọt trà xanh non tươi organic giàu EGCG, kết hợp chất xơ hòa tan Inulin và protein thực vật giúp kích thích chuyển hóa mỡ thừa, thanh lọc gan và đem lại làn da tươi trẻ rạng ngời.',
    ingredients: [
      'Bột Matcha trà xanh nguyên chất giàu EGCG',
      'Protein đậu Hà Lan tinh khiết',
      'Chất xơ hòa tan Inulin FOS',
      'Bột sữa dừa thực vật nguyên chất không lactose'
    ],
    usageInstructions: [
      'Pha 1 gói với 150ml nước ấm hoặc nước mát',
      'Thêm đá viên nếu muốn uống mát giải nhiệt'
    ],
    volumeOrWeight: 'Hộp 20 gói x 25g',
    benefits: [
      'Hàm lượng EGCG cao gấp 5 lần hỗ trợ đốt calo tự nhiên',
      'Giữ cơ thể nhẹ nhàng, thanh thoát và tràn đầy sức sống'
    ],
    inStock: true,
    featured: true,
  },
  {
    id: 'tingo-vsportgel',
    name: 'VSPORTGEL',
    slug: 'gel-nang-luong-vsportgel',
    category: 'gel-nang-luong',
    categoryLabel: 'GEL NĂNG LƯỢNG',
    price: 1900545,
    originalPrice: 2150000,
    discountPercent: 12,
    badge: 'Hiệu Năng Cao',
    image: 'vsportgel',
    rating: 4.9,
    reviewsCount: 198,
    shortDesc: 'Gel năng lượng hấp thu siêu nhanh cho runner, vận động viên và người tập gym cường độ cao.',
    description: 'Vsportgel cung cấp nguồn năng lượng kép Maltodextrin và Fructose tỉ lệ vàng 2:1, kết hợp các chất điện giải Na+, K+, Mg2+ giúp nạp năng lượng trong 3 phút, chống chuột rút cơ và duy trì sức bền dẻo dai trên mọi cự ly.',
    ingredients: [
      'Phức hợp Carbohydrate chuyển hóa nhanh (Maltodextrin & Fructose)',
      'Chiết xuất Nhân Sâm & Taurine tự nhiên',
      'Khoáng điện giải Natri, Kali, Magie, Canxi hữu cơ',
      'Vitamin B1, B5, B6 phục hồi cơ bắp'
    ],
    usageInstructions: [
      'Sử dụng 1 gói trước khi chạy 15 phút',
      'Tiếp tục dùng 1 gói sau mỗi 45 phút vận động liên tục',
      'Uống kèm 50ml - 100ml nước'
    ],
    volumeOrWeight: 'Hộp 24 gói x 40g (Vị cam dứa nhiệt đới)',
    benefits: [
      'Hấp thụ ngay tại dạ dày, không gây sốc hông hay khó chịu đường ruột',
      'Phục hồi glycogen cơ bắp cấp tốc, giảm đau mỏi sau tập'
    ],
    inStock: true,
    featured: true,
  },
  {
    id: 'tingo-caphe-link',
    name: 'CAPHE LINK',
    slug: 'ca-phe-suc-khoe-caphe-link',
    category: 'ca-phe',
    categoryLabel: 'CÀ PHÊ SỨC KHỎE',
    price: 365000,
    originalPrice: 420000,
    discountPercent: 13,
    image: 'caphe-link',
    rating: 4.8,
    reviewsCount: 164,
    shortDesc: 'Cà phê thảo mộc thượng hạng kết hợp nấm Linh Chi và Hoàng Kỳ, tỉnh táo sảng khoái không cồn cào ruột.',
    description: 'Caphe Link phá vỡ định kiến về cà phê gây nóng trong hay kích ứng dạ dày. Sự kết hợp giữa hạt Robusta Cầu Đất cùng Cao Linh Chi, Hoàng Kỳ giúp bạn duy trì sự tập trung sắc bén suốt 8 tiếng làm việc mà vẫn bảo vệ tim mạch.',
    ingredients: [
      'Cà phê hòa tan Arabica & Robusta Đắk Lắk',
      'Chiết xuất Nấm Linh Chi đỏ hữu cơ (Ganoderma lucidum)',
      'Cao rễ Hoàng Kỳ (Astragalus membranaceus)',
      'Cao lá Chay và đường thực vật năng lượng thấp'
    ],
    usageInstructions: [
      'Hòa tan 1 gói trong 70ml - 80ml nước sôi (80°C - 90°C)',
      'Khuấy đều và thưởng thức nóng hoặc thêm đá tùy khẩu vị'
    ],
    volumeOrWeight: 'Hộp 20 gói x 16g',
    benefits: [
      'Tỉnh táo êm dịu, không gây tim đập nhanh hay run tay',
      'Hỗ trợ hạ men gan, thải độc và nâng cao sức đề kháng'
    ],
    inStock: true,
    featured: false,
  },
  {
    id: 'tingo-green-quantum',
    name: 'GREEN QUANTUM',
    slug: 'nuoc-xit-khoang-green-quantum',
    category: 'nuoc-ion-kiem',
    categoryLabel: 'NƯỚC XỊT KHOÁNG',
    price: 420000,
    originalPrice: 490000,
    discountPercent: 14,
    badge: 'Chăm Sóc Da Sạch',
    image: 'green-quantum',
    rating: 4.9,
    reviewsCount: 142,
    shortDesc: 'Nước xịt khoáng ion lượng tử phục hồi độ ẩm tức thì, kháng khuẩn dịu nhẹ cho mọi loại da.',
    description: 'Nước xịt khoáng vi hạt lượng tử Green Quantum thấu sâu qua lớp biểu bì da, cấp nước tức thì trong phòng máy lạnh và làm dịu làn da cháy nắng hay kích ứng chỉ sau 1 lần xịt.',
    ingredients: [
      '100% Nước ion kiềm lượng tử tinh khiết giàu khoáng Silic hữu cơ',
      'Kẽm PCA kháng khuẩn và chiết xuất lô hội tự nhiên'
    ],
    usageInstructions: [
      'Giữ chai thẳng đứng, cách mặt 20cm và xịt đều theo vòng tròn',
      'Để khô tự nhiên hoặc vỗ nhẹ bằng đầu ngón tay'
    ],
    volumeOrWeight: 'Chai xịt phun sương 250ml',
    benefits: [
      'Cấp ẩm tức thì tăng 68% độ ẩm cho làn da sau 30 giây',
      'Khóa lớp trang điểm lâu trôi và bảo vệ da khỏi bụi mịn'
    ],
    inStock: true,
    featured: false,
  },
  {
    id: 'tingo-topapro',
    name: 'TOPAPRO',
    slug: 'bo-sung-vitamin-topapro',
    category: 'bot-dinh-duong',
    categoryLabel: 'BỔ SUNG VITAMIN & KHOÁNG',
    price: 890000,
    originalPrice: 990000,
    discountPercent: 10,
    badge: 'Miễn Dịch Toàn Diện',
    image: 'topapro',
    rating: 4.9,
    reviewsCount: 118,
    shortDesc: 'Tổ hợp vi chất & axit amin tự nhiên giúp tăng cường hệ miễn dịch và phục hồi thể lực nhanh chóng.',
    description: 'Topapro là công thức thảo mộc dinh dưỡng dạng gói tiện lợi, bổ sung kháng thể IgG tự nhiên cùng 18 loại axit amin giúp củng cố hàng rào miễn dịch, ngăn ngừa ốm vặt và tái tạo thể lực sau ngày dài làm việc.',
    ingredients: [
      'Sữa non bò nguyên chất giàu kháng thể IgG',
      'Tổ hợp 18 Axit Amin thiết yếu từ mầm ngũ cốc',
      'Chiết xuất Đông Trùng Hạ Thảo & Tảo Spirulina hữu cơ',
      'Kẽm Gluconate, Selen và Vitamin C chuẩn hóa'
    ],
    usageInstructions: [
      'Dùng 1-2 gói mỗi ngày sau bữa ăn 30 phút',
      'Pha với 100ml nước ấm'
    ],
    volumeOrWeight: 'Hộp 30 gói x 10g',
    benefits: [
      'Nâng cao đề kháng, giảm nguy cơ cảm cúm và viêm đường hô hấp',
      'Ăn ngon ngủ sâu, phục hồi sinh lực cho người mệt mỏi suy nhược'
    ],
    inStock: true,
    featured: false,
  },
  {
    id: 'tingo-combo-family',
    name: 'COMBO GIA ĐÌNH VHEALTH DUO + QUANTUM',
    slug: 'combo-gia-dinh-vhealth-duo-quantum',
    category: 'combo',
    categoryLabel: 'COMBO TIẾT KIỆM',
    price: 1250000,
    originalPrice: 1580000,
    discountPercent: 21,
    badge: 'Tiết Kiệm 330K',
    image: 'combo-family',
    rating: 5.0,
    reviewsCount: 310,
    shortDesc: 'Gói chăm sóc toàn diện cho cả gia đình: 1 Hộp Vhealth Trà Xanh + 1 Hộp Vhealth Socola + 6 túi Nước Hydrogen.',
    description: 'Giải pháp dinh dưỡng trọn gói cho tổ ấm của bạn. Đầy đủ bữa ăn sáng giàu đạm thực vật, nước ion kiềm chống oxy hóa và nguồn năng lượng dồi dào cho cả bố mẹ, con cái và ông bà.',
    ingredients: [
      '1 Hộp Vhealth Trà Xanh (20 gói)',
      '1 Hộp Vhealth Socola (20 gói)',
      '6 Túi Nước Ion Kiềm Hydrogen Quantum 333ml',
      'Tặng kèm 1 Bình lắc thủy tinh cao cấp TINGO 500ml'
    ],
    usageInstructions: [
      'Dùng Vhealth vào bữa sáng hoặc xế chiều',
      'Dùng Nước Hydrogen Quantum trước khi tập thể dục hoặc khi thức dậy'
    ],
    volumeOrWeight: 'Combo Trọn Bộ 3 Sản Phẩm + Quà Tặng',
    benefits: [
      'Tiết kiệm đến 21% so với mua lẻ từng sản phẩm',
      'Miễn phí vận chuyển toàn quốc và bảo hành chính hãng 100%'
    ],
    inStock: true,
    featured: true,
  }
];

export const HEALTH_ARTICLES: HealthArticle[] = [
  {
    id: 'bai-viet-1',
    title: 'Tại sao đạm thực vật từ đậu Hà Lan là xu hướng dinh dưỡng vàng 2026?',
    category: 'Dinh Dưỡng Sạch',
    readTime: '4 phút đọc',
    date: '18/09/2026',
    author: 'Bs. Nguyễn Lan Phương - Chuyên gia dinh dưỡng TINGO',
    summary: 'Khác với đạm động vật giàu chất béo bão hòa, đạm thực vật từ đậu Hà Lan tinh khiết mang lại nguồn protein hoàn chỉnh không gây đầy hơi và bảo vệ tim mạch vượt trội.',
    content: `Đạm (Protein) là viên gạch nền tảng của mọi tế bào trong cơ thể. Tuy nhiên, việc lạm dụng đạm động vật nhiều cholesterol thường khiến gan thận quá tải.
    
Đậu Hà Lan tinh khiết (Pea Protein) chứa đầy đủ 9 loại axit amin thiết yếu, trong đó có hàm lượng cao BCAA (Leucine, Isoleucine, Valine) giúp duy trì và phục hồi cơ bắp. Đặc biệt, đạm đậu Hà Lan không chứa lactose hay gluten nên rất thân thiện với dạ dày nhạy cảm.

Chỉ cần bổ sung 1 gói bột dinh dưỡng Vhealth mỗi sáng, bạn đã nạp đủ 15g protein thực vật cao cấp cho ngày dài năng động.`,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'bai-viet-2',
    title: 'Công nghệ Lượng Tử & Nước Ion Kiềm: Bí quyết trẻ hóa từng tế bào',
    category: 'Khoa Học Sức Khỏe',
    readTime: '5 phút đọc',
    date: '16/09/2026',
    author: 'ThS. Trần Hoàng Nam - Viện Nghiên Cứu Lượng Tử',
    summary: 'Nước giàu Hydrogen hoạt tính với cụm phân tử siêu nhỏ có khả năng thẩm thấu xuyên màng tế bào, trung hòa các gốc tự do có hại gây lão hóa.',
    content: `Cơ thể chúng ta có hơn 70% là nước. Khi môi trường ô nhiễm và thói quen ăn uống nhiều thực phẩm có tính axit (thịt đỏ, đồ chiên rán, nước ngọt), cơ thể tích tụ độc tố.

Nước Hydrogen Quantum với độ kiềm tự nhiên pH 9.0+ giúp cân bằng độ pH nội môi, đào thải axit lactic sau khi vận động và cung cấp cụm phân tử nước siêu nhỏ giúp da luôn ẩm mượt, căng tràn sức sống.`,
    image: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'bai-viet-3',
    title: '3 Phút bữa sáng dinh dưỡng chuẩn sạch cho người bận rộn',
    category: 'Phong Cách Sống',
    readTime: '3 phút đọc',
    date: '14/09/2026',
    author: 'Mai Anh - Lifestyle Blogger',
    summary: 'Bí quyết chuẩn bị bữa sáng thơm ngon, giàu năng lượng chỉ với 1 gói Vhealth pha ấm, giúp bạn giữ dáng và tỉnh táo suốt buổi sáng.',
    content: `Bỏ bữa sáng là thói quen xấu khiến trao đổi chất chậm lại và dễ gây tăng cân do ăn bù vào buổi trưa.

Công thức bữa sáng 3 phút cùng TINGO:
1. 1 gói Vhealth Socola hoặc Matcha Trà Xanh
2. 150ml nước ấm 50°C
3. Thêm 1 thìa hạt chia hoặc nửa quả chuối nếu muốn món sinh tố sánh mịn.

Vừa tiết kiệm thời gian, vừa đảm bảo 100% nguyên liệu sạch từ thiên nhiên!`,
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 'rev-1',
    name: 'Chị Bích Ngọc',
    role: 'Nhân viên văn phòng (TP.HCM)',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    comment: 'Mình dùng Vhealth Trà Xanh thay bữa sáng gần 3 tháng nay. Bụng nhẹ tênh, không còn cảm giác buồn ngủ gật gù lúc 10h sáng nữa. Vị trà thơm thanh không bị ngọt gắt!',
    productName: 'Bột Dinh Dưỡng Vhealth Trà Xanh',
    verified: true,
  },
  {
    id: 'rev-2',
    name: 'Anh Quốc Dũng',
    role: 'Marathon Runner - Runner 42km',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    comment: 'Vsportgel và nước Quantum là combo bất ly thân của mình trong mọi giải chạy. Nạp 1 gói gel là 3 phút sau thấy người hồi sức rõ rệt, không bao giờ bị chuột rút!',
    productName: 'Vsportgel & Nước Ion Kiềm Quantum',
    verified: true,
  },
  {
    id: 'rev-3',
    name: 'Cô Thu Hà (54 tuổi)',
    role: 'Giáo viên hưu trí (Hà Nội)',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    comment: 'Dạ dày cô trước hay bị ợ chua với trào ngược. Uống nước Quantum một thời gian thấy êm hẳn. Cả nhà cô giờ chuyển sang uống TINGO mỗi ngày.',
    productName: 'Nước Uống Hydrogen Quantum',
    verified: true,
  },
];

export const DEFAULT_VERTICAL_VIDEOS: {
  badge: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  items: {
    id: string;
    title: string;
    author: string;
    authorAvatar?: string;
    videoUrl: string;
    thumbnailUrl?: string;
    viewsCount?: string;
    likesCount?: string;
    badge?: string;
    linkedProductId?: string;
    linkedProductName?: string;
    linkedProductPrice?: number;
  }[];
} = {
  badge: 'VIDEO TRẢI NGHIỆM THỰC TẾ (9:16)',
  titleLine1: 'Khách Hàng & Chuyên Gia',
  titleLine2: 'Nói Gì Về TINGO?',
  subtitle: 'Xem video review thực tế, cách pha chế và trải nghiệm dinh dưỡng từ cộng đồng người dùng TINGO.',
  items: [
    {
      id: 'vid-1',
      title: '3 Phút Pha Bữa Sáng Vhealth Trà Xanh Cùng Nhung',
      author: 'Hồng Nhung (Fitness Coach)',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1556911073-38141963c9e0?auto=format&fit=crop&w=600&q=80',
      viewsCount: '48.5K',
      likesCount: '3.2K',
      badge: 'Bữa Sáng Nhanh',
      linkedProductId: 'tingo-vhealth-duo',
      linkedProductName: 'Bột Dinh Dưỡng Vhealth 2 Vị',
      linkedProductPrice: 790000,
    },
    {
      id: 'vid-2',
      title: 'Tại Sao Nước Ion Kiềm Lượng Tử Quantum Lại Hot?',
      author: 'Bác Sĩ Dinh Dưỡng Minh Quân',
      authorAvatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=200&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=600&q=80',
      viewsCount: '82.1K',
      likesCount: '6.7K',
      badge: 'Chuyên Gia Khuyên Dùng',
      linkedProductId: 'tingo-quantum-water',
      linkedProductName: 'Nước Ion Kiềm Quantum Hydrogen',
      linkedProductPrice: 280000,
    },
    {
      id: 'vid-3',
      title: 'Nạp Năng Lượng Chạy Bộ 21KM Cùng Vsportgel',
      author: 'Runner Hoàng Long (Marathon)',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80',
      viewsCount: '31.9K',
      likesCount: '2.8K',
      badge: 'Thử Thách Thể Thao',
      linkedProductId: 'tingo-vsportgel',
      linkedProductName: 'Gel Năng Lượng Vsportgel',
      linkedProductPrice: 650000,
    },
    {
      id: 'vid-4',
      title: 'Cà Phê Thảo Mộc Caphe Link Giữ Tỉnh Táo 8 Tiếng',
      author: 'Quỳnh Anh (CEO Startup)',
      authorAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
      viewsCount: '54.2K',
      likesCount: '4.1K',
      badge: 'Dân Văn Phòng',
      linkedProductId: 'tingo-caphe-link',
      linkedProductName: 'Cà Phê Sức Khỏe Caphe Link',
      linkedProductPrice: 380000,
    },
    {
      id: 'vid-5',
      title: 'Xịt Khoáng Quantum Cấp Ẩm Tức Thì Cho Da Nhạy Cảm',
      author: 'Linh Đan (Beauty Blogger)',
      authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80',
      viewsCount: '66.4K',
      likesCount: '5.5K',
      badge: 'Chăm Sóc Da',
      linkedProductId: 'tingo-xit-khoang-quantum',
      linkedProductName: 'Xịt Khoáng Nước Kiềm Quantum',
      linkedProductPrice: 220000,
    },
  ],
};

export const SAMPLE_ORDERS: Order[] = [
  {
    id: 'TIN-89241',
    createdAt: '18/09/2026 - 14:30',
    customerName: 'Nguyễn Văn Hùng',
    customerPhone: '0912345678',
    customerEmail: 'hung.nguyen@gmail.com',
    shippingAddress: '45 Lê Duẩn, Phường Bến Nghé, Quận 1',
    city: 'Hồ Chí Minh',
    district: 'Quận 1',
    paymentMethod: 'cod',
    items: [
      {
        product: PRODUCTS[0],
        quantity: 1,
      },
      {
        product: PRODUCTS[1],
        quantity: 1,
      }
    ],
    subtotal: 1544455,
    discountAmount: 154445,
    shippingFee: 0,
    total: 1390010,
    status: 'shipping',
    couponCode: 'TINGO10',
    timeline: [
      { status: 'pending', title: 'Đơn hàng đã được đặt thành công', time: '18/09/2026 14:30', completed: true },
      { status: 'processing', title: 'TINGO đang đóng gói sản phẩm', time: '18/09/2026 15:10', completed: true },
      { status: 'shipping', title: 'Đang vận chuyển cùng GHN Express', time: '18/09/2026 16:45', completed: true },
      { status: 'delivered', title: 'Dự kiến giao hàng trong ngày mai', time: '19/09/2026 10:00', completed: false },
    ],
  },
  {
    id: 'TIN-77312',
    createdAt: '17/09/2026 - 09:15',
    customerName: 'Trần Thị Mai',
    customerPhone: '0987654321',
    customerEmail: 'mai.tran@gmail.com',
    shippingAddress: '120 Hoàng Quốc Việt, Cầu Giấy',
    city: 'Hà Nội',
    district: 'Cầu Giấy',
    paymentMethod: 'vietqr',
    items: [
      {
        product: PRODUCTS[8], // Combo
        quantity: 1,
      }
    ],
    subtotal: 1250000,
    discountAmount: 0,
    shippingFee: 0,
    total: 1250000,
    status: 'delivered',
    timeline: [
      { status: 'pending', title: 'Đơn hàng đã đặt', time: '17/09/2026 09:15', completed: true },
      { status: 'processing', title: 'Đã thanh toán qua VietQR & Đóng gói', time: '17/09/2026 09:20', completed: true },
      { status: 'shipping', title: 'Đang vận chuyển hỏa tốc', time: '17/09/2026 11:00', completed: true },
      { status: 'delivered', title: 'Đã giao hàng thành công', time: '18/09/2026 14:00', completed: true },
    ],
  }
];
