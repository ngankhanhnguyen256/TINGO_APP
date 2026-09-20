import React from 'react';
import { X, Sparkles, Heart, Leaf, ShieldCheck, Award } from 'lucide-react';

interface StoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShopNow: () => void;
}

export const StoryModal: React.FC<StoryModalProps> = ({
  isOpen,
  onClose,
  onShopNow,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-emerald-100 relative p-6 sm:p-8">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Content */}
        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#008874] block mb-1">
              CÂU CHUYỆN THƯƠNG HIỆU
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
              Hành Trình Dinh Dưỡng Sạch TINGO
            </h2>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-md">
            <img
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80"
              alt="Organic farm TINGO"
              className="w-full h-56 object-cover"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="space-y-4 text-slate-700 text-sm leading-relaxed">
            <p>
              <strong>TINGO</strong> được sinh ra từ niềm trăn trở giản dị nhưng mãnh liệt: Làm thế nào để người Việt Nam có thể tiếp cận những sản phẩm đồ uống và dinh dưỡng <strong>100% thuần tự nhiên</strong>, tiện lợi mà không chứa chất bảo quản, đường tinh luyện hay phụ gia độc hại?
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
              <div className="p-4 rounded-2xl bg-[#f4faf6] border border-emerald-100">
                <Leaf className="w-6 h-6 text-[#008764] mb-2" />
                <h4 className="font-bold text-slate-900 text-sm">Nông Trại Hữu Cơ</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Đậu Hà Lan, ngũ cốc và thảo mộc được canh tác chuẩn VietGAP Organic tại Tây Nguyên & Đà Lạt.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-100">
                <Sparkles className="w-6 h-6 text-[#0284c7] mb-2" />
                <h4 className="font-bold text-slate-900 text-sm">Công Nghệ Lượng Tử</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Ứng dụng kỹ thuật phân tách ion phân tử siêu nhỏ mang lại nguồn nước kiềm giàu Hydro hoạt tính.
                </p>
              </div>
            </div>

            <p>
              Chúng tôi tin rằng: <em>"Cơ thể bạn là ngôi đền thiêng liêng duy nhất bạn có để sống."</em> Hãy nuôi dưỡng nó bằng những gì tinh khiết và lành tính nhất từ thiên nhiên.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 italic">
              Đồng hành cùng sức khoẻ gia đình Việt từ 2020
            </span>

            <button
              onClick={() => {
                onClose();
                onShopNow();
              }}
              className="px-6 py-2.5 rounded-full bg-[#008764] hover:bg-[#007052] text-white font-bold text-sm shadow-md cursor-pointer"
            >
              Khám Phá Sản Phẩm
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
