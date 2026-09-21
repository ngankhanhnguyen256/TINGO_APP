import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ProductVisualProps {
  imageKey: string;
  className?: string;
  size?: 'thumb' | 'sm' | 'md' | 'lg' | 'hero';
  fit?: 'contain' | 'cover';
}

export const ProductVisual: React.FC<ProductVisualProps> = ({
  imageKey,
  className = '',
  size = 'md',
  fit = 'contain',
}) => {
  const [imgError, setImgError] = useState(false);

  // Reset error state whenever imageKey changes so new/updated images load properly
  React.useEffect(() => {
    setImgError(false);
  }, [imageKey]);

  // Height classes based on size
  const sizeClasses = {
    thumb: 'h-full w-full',
    sm: 'h-32 sm:h-36',
    md: 'h-full w-full max-h-[160px] sm:max-h-[220px]',
    lg: 'h-60 sm:h-80',
    hero: 'h-72 sm:h-96 md:h-[420px]',
  }[size];

  // Check if imageKey is a URL or Base64 uploaded image
  const isCustomImage =
    imageKey &&
    (imageKey.startsWith('http://') ||
      imageKey.startsWith('https://') ||
      imageKey.startsWith('data:image/') ||
      imageKey.startsWith('/'));

  const isThumb = size === 'thumb';

  return (
    <div
      className={`relative w-full ${sizeClasses} rounded-2xl overflow-hidden flex items-center justify-center select-none bg-transparent ${className}`}
    >
      {/* Render Custom Uploaded Image or Built-in Illustration */}
      {isCustomImage && !imgError ? (
        <div className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden p-1.5 sm:p-2.5">
          <img
            src={imageKey}
            alt="Sản phẩm TINGO"
            onError={() => setImgError(true)}
            className="max-h-full max-w-full w-auto h-auto object-contain transition-transform duration-300 group-hover:scale-105 drop-shadow-xs"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div
          className={`relative z-10 w-full h-full flex items-center justify-center ${
            isThumb ? 'overflow-hidden p-0' : 'p-2'
          }`}
        >
          {isThumb ? (
            <div className="transform scale-[0.38] sm:scale-[0.42] origin-center flex items-center justify-center pointer-events-none">
              {renderProductIllustration(imageKey, size)}
            </div>
          ) : (
            renderProductIllustration(imageKey, size)
          )}
        </div>
      )}
    </div>
  );
};

function renderProductIllustration(key: string, size: string) {
  switch (key) {
    case 'quantum-hydrogen':
      return (
        <div className="relative z-10 flex flex-col items-center justify-center transition-transform duration-500 hover:scale-105">
          <div className="absolute -top-4 w-28 h-28 bg-cyan-400/30 rounded-full blur-xl animate-pulse-subtle" />
          <div className="relative flex flex-col items-center">
            <div className="w-5 sm:w-6 h-6 sm:h-7 bg-gradient-to-r from-slate-100 via-white to-slate-200 rounded-t-sm border border-slate-300 shadow-sm relative z-20">
              <div className="w-full h-1 bg-slate-300 my-1" />
              <div className="w-full h-1 bg-slate-300" />
            </div>
            <div className="relative w-36 sm:w-44 h-48 sm:h-56 bg-gradient-to-b from-slate-100 via-slate-200 to-slate-300 rounded-t-3xl rounded-b-xl shadow-2xl border border-white/90 p-3 flex flex-col items-center justify-between overflow-hidden">
              <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12" />
              <div className="text-center mt-2">
                <div className="w-8 h-8 mx-auto rounded-full bg-gradient-to-tr from-cyan-600 to-teal-400 flex items-center justify-center text-white shadow-md">
                  <span className="font-bold text-xs">Q</span>
                </div>
                <h4 className="font-black text-slate-800 tracking-wider text-xs sm:text-sm mt-1">QUANTUM</h4>
                <p className="text-[9px] sm:text-[10px] text-teal-800 font-semibold tracking-tight uppercase">Nước uống giàu Hydrogen</p>
              </div>
              <div className="relative my-auto w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-gradient-to-tr from-blue-600 via-cyan-500 to-teal-300 p-[2px] shadow-lg flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-slate-900/70 backdrop-blur-xs flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-radial from-cyan-300/40 to-transparent animate-pulse" />
                  <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_12px_#38bdf8]" />
                  <div className="absolute w-10 h-10 border border-cyan-400/50 rounded-full animate-spin" style={{ animationDuration: '6s' }} />
                  <div className="absolute w-12 h-6 border border-teal-300/40 rounded-full transform rotate-45" />
                </div>
              </div>
              <div className="w-full flex justify-between items-center text-[9px] text-slate-600 font-medium px-1 border-t border-slate-300/60 pt-1">
                <span>pH 9.0 - 9.5</span>
                <span className="font-bold text-teal-800">333ml</span>
              </div>
            </div>
          </div>
        </div>
      );

    case 'vhealth-matcha':
      return (
        <div className="relative z-10 flex items-center justify-center transition-transform duration-500 hover:scale-105">
          <div className="w-28 sm:w-36 h-40 sm:h-48 bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800 rounded-xl shadow-2xl border border-emerald-300/40 p-3 text-white flex flex-col justify-between relative">
            <div className="flex justify-between items-center">
              <span className="text-[9px] bg-emerald-500/80 px-2 py-0.5 rounded-full font-bold uppercase">Trà Xanh Matcha</span>
              <span className="text-xs">🍃</span>
            </div>
            <div className="text-center my-auto">
              <div className="text-lg font-black tracking-tight text-white drop-shadow-sm">Vhealth</div>
              <div className="text-[10px] text-emerald-100 font-semibold mt-1">Hương Vị Trà Xanh</div>
              <div className="w-12 h-12 mx-auto my-2 rounded-full bg-emerald-500/30 border border-emerald-300/50 flex items-center justify-center text-xl shadow-inner">
                🍵
              </div>
              <p className="text-[9px] text-emerald-200">Đạm Đậu Hà Lan & Yến Mạch</p>
            </div>
            <div className="text-[9px] text-emerald-100 flex justify-between border-t border-emerald-500/60 pt-1 font-mono">
              <span>20 gói x 25g</span>
              <span className="font-bold text-amber-300">Non-GMO</span>
            </div>
            <div className="absolute -right-4 -bottom-1 w-10 h-28 bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-700 rounded-sm shadow-xl border border-emerald-200 transform rotate-12 flex flex-col items-center justify-between p-1.5 text-white">
              <span className="text-[7px] font-bold">Vhealth</span>
              <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[8px]">🌿</div>
              <span className="text-[7px] bg-emerald-900/80 px-1 rounded">25g</span>
            </div>
          </div>
        </div>
      );

    case 'vhealth-scl':
      return (
        <div className="relative z-10 flex items-center justify-center transition-transform duration-500 hover:scale-105">
          <div className="w-28 sm:w-36 h-40 sm:h-48 bg-gradient-to-b from-amber-800 via-amber-900 to-stone-900 rounded-xl shadow-2xl border border-amber-500/40 p-3 text-white flex flex-col justify-between relative">
            <div className="flex justify-between items-center">
              <span className="text-[9px] bg-amber-700/80 px-2 py-0.5 rounded-full font-bold uppercase">Socola Thượng Hạng</span>
              <span className="text-xs">🍫</span>
            </div>
            <div className="text-center my-auto">
              <div className="text-lg font-black tracking-tight text-white drop-shadow-sm">Vhealth SCL</div>
              <div className="text-[10px] text-amber-200 font-semibold mt-1">Cacao Hữu Cơ & Hạt Chia</div>
              <div className="w-12 h-12 mx-auto my-2 rounded-full bg-amber-700/30 border border-amber-400/50 flex items-center justify-center text-xl shadow-inner">
                🌾
              </div>
              <p className="text-[9px] text-amber-200">Giàu Flavonoid & Khoáng Chất</p>
            </div>
            <div className="text-[9px] text-amber-100 flex justify-between border-t border-amber-700/60 pt-1 font-mono">
              <span>20 gói x 25g</span>
              <span className="font-bold text-amber-300">500g</span>
            </div>
            <div className="absolute -right-4 -bottom-1 w-10 h-28 bg-gradient-to-b from-amber-600 via-amber-800 to-stone-900 rounded-sm shadow-xl border border-amber-300 transform rotate-12 flex flex-col items-center justify-between p-1.5 text-white">
              <span className="text-[7px] font-bold">Vhealth</span>
              <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[8px]">☕</div>
              <span className="text-[7px] bg-stone-900/90 px-1 rounded">25g</span>
            </div>
          </div>
        </div>
      );

    case 'vsportgel':
      return (
        <div className="relative z-10 flex items-center justify-center transition-transform duration-500 hover:scale-105">
          <div className="w-32 sm:w-40 h-32 sm:h-38 bg-gradient-to-b from-orange-500 via-amber-600 to-orange-700 rounded-xl shadow-2xl border border-orange-300/60 p-3 text-white flex flex-col justify-between relative">
            <div className="flex justify-between items-center">
              <span className="text-[8px] bg-white/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Năng Lượng Kép</span>
              <span className="text-xs">⚡</span>
            </div>
            <div className="text-center my-auto">
              <div className="text-base sm:text-lg font-black tracking-tight text-white">VSPORTGEL</div>
              <div className="text-[9px] sm:text-[10px] text-orange-100 font-medium">Bổ sung năng lượng tức thì</div>
              <div className="text-[8px] text-orange-200 mt-1 font-mono">Maltodextrin + B-Complex</div>
            </div>
            <div className="text-[8px] text-orange-100 flex justify-between border-t border-orange-400/50 pt-1 font-mono">
              <span>24 Gói</span>
              <span className="font-bold text-white">Cam Dứa</span>
            </div>
            <div className="absolute -right-3 -bottom-2 w-8 sm:w-9 h-20 sm:h-24 bg-gradient-to-b from-amber-400 via-orange-500 to-orange-600 rounded-t-lg rounded-b-sm shadow-xl border border-amber-200 transform rotate-12 flex flex-col items-center justify-between p-1 text-white">
              <div className="w-3 h-2 bg-slate-800 rounded-t-xs" />
              <span className="text-[6px] font-black">GEL</span>
              <span className="text-[6px] bg-black/40 px-1 rounded">40g</span>
            </div>
          </div>
        </div>
      );

    case 'topapro':
      return (
        <div className="relative z-10 flex items-center justify-center transition-transform duration-500 hover:scale-105">
          <div className="w-28 sm:w-36 h-36 sm:h-44 bg-gradient-to-b from-sky-700 via-blue-800 to-indigo-900 rounded-xl shadow-2xl border border-sky-400/40 p-3 text-white flex flex-col justify-between relative">
            <div className="flex justify-between items-center">
              <span className="text-[8px] bg-sky-500/70 px-2 py-0.5 rounded-full font-bold uppercase">Vitamin & Axit Amin</span>
              <span className="text-xs">🛡️</span>
            </div>
            <div className="text-center my-auto">
              <div className="text-base sm:text-lg font-black tracking-tight text-white">TOPAPRO</div>
              <div className="text-[9px] text-sky-200 font-medium mt-0.5">Dinh dưỡng chuyên sâu</div>
              <div className="w-10 h-10 mx-auto my-1 rounded-full bg-sky-600/40 border border-sky-300/40 flex items-center justify-center text-sm">
                🔬
              </div>
            </div>
            <div className="text-[8px] text-sky-200 flex justify-between border-t border-sky-600/50 pt-1 font-mono">
              <span>30 Gói</span>
              <span className="font-bold text-sky-100">IgG + 18 AA</span>
            </div>
            <div className="absolute -right-3 -bottom-1 w-8 h-24 bg-gradient-to-b from-sky-400 to-blue-700 rounded-sm shadow-lg border border-sky-200 transform rotate-12 flex flex-col items-center justify-between p-1 text-white">
              <span className="text-[6px] font-bold">TOPA</span>
              <span className="text-[6px] bg-blue-950/80 px-1 rounded">PRO</span>
            </div>
          </div>
        </div>
      );

    case 'caphe-link':
      return (
        <div className="relative z-10 flex items-center justify-center transition-transform duration-500 hover:scale-105">
          <div className="w-28 sm:w-36 h-36 sm:h-44 bg-gradient-to-b from-stone-800 via-stone-900 to-black rounded-xl shadow-2xl border border-amber-700/50 p-3 text-white flex flex-col justify-between relative">
            <div className="flex justify-between items-center">
              <span className="text-[8px] bg-amber-900/80 px-2 py-0.5 rounded-full font-bold text-amber-200 uppercase">Cà Phê Thảo Mộc</span>
              <span className="text-xs">☕</span>
            </div>
            <div className="text-center my-auto">
              <div className="text-base sm:text-lg font-black tracking-wider text-amber-100">CAPHE LINK</div>
              <div className="text-[9px] text-stone-300 font-medium mt-0.5">Linh Chi & Hoàng Kỳ</div>
              <div className="w-10 h-10 mx-auto my-1 rounded-full bg-amber-950/60 border border-amber-600/50 flex items-center justify-center text-sm shadow-inner">
                🍂
              </div>
            </div>
            <div className="text-[8px] text-stone-400 flex justify-between border-t border-stone-700 pt-1 font-mono">
              <span>20 Gói</span>
              <span className="text-amber-400 font-semibold">Tỉnh Táo Êm</span>
            </div>
          </div>
        </div>
      );

    case 'green-quantum':
      return (
        <div className="relative z-10 flex items-center justify-center transition-transform duration-500 hover:scale-105">
          <div className="relative flex flex-col items-center">
            <div className="w-4 h-5 bg-gradient-to-r from-slate-200 via-white to-slate-300 rounded-t-sm border border-slate-300" />
            <div className="w-16 sm:w-20 h-40 sm:h-48 bg-gradient-to-b from-white via-slate-100 to-slate-200 rounded-2xl shadow-xl border border-white/90 p-2 flex flex-col items-center justify-between">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-700 font-black text-[10px]">
                Q
              </div>
              <div className="text-center">
                <span className="text-[8px] font-black tracking-wider text-emerald-800 uppercase block">Green Quantum</span>
                <span className="text-[7px] text-slate-500 block">Xịt Khoáng Ion</span>
              </div>
              <span className="text-[8px] font-bold text-teal-700 font-mono">250ml</span>
            </div>
          </div>
        </div>
      );

    case 'vhealth-duo':
    case 'combo-family':
    default:
      if (key && (key.startsWith('http') || key.startsWith('data:'))) {
        return (
          <div className="relative z-10 w-full h-full p-4 flex items-center justify-center">
            <img
              src={key}
              alt="Sản phẩm"
              className="max-h-[82%] max-w-[85%] object-contain drop-shadow-xl"
              referrerPolicy="no-referrer"
            />
          </div>
        );
      }

      return (
        <div className="relative z-10 flex items-end justify-center gap-2 sm:gap-3 transition-transform duration-500 hover:scale-105">
          <div className="relative flex flex-col items-center">
            <div className="w-24 sm:w-32 h-36 sm:h-44 bg-gradient-to-b from-emerald-600 via-emerald-700 to-emerald-800 rounded-lg shadow-xl border border-emerald-400/30 p-2 sm:p-3 text-white flex flex-col justify-between transform -rotate-3 hover:rotate-0 transition-transform">
              <div className="flex justify-between items-start">
                <span className="text-[8px] sm:text-[9px] bg-emerald-500/60 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Trà Xanh</span>
                <div className="w-3.5 h-3.5 rounded-full bg-emerald-400/40 flex items-center justify-center text-[8px]">🍃</div>
              </div>
              <div className="text-center my-auto">
                <div className="text-sm sm:text-base font-black tracking-tight leading-none text-emerald-100">Vhealth</div>
                <div className="text-[8px] sm:text-[9px] text-emerald-200 mt-0.5 font-medium">Matcha Organic</div>
                <div className="w-8 h-8 mx-auto mt-1 rounded-full bg-emerald-500/40 border border-emerald-300/40 flex items-center justify-center">
                  <span className="text-xs">🍵</span>
                </div>
              </div>
              <div className="text-[8px] text-emerald-200 flex justify-between border-t border-emerald-500/40 pt-1 font-mono">
                <span>20 Gói</span>
                <span>500g</span>
              </div>
            </div>
            <div className="absolute -bottom-2 -left-2 w-7 sm:w-9 h-20 sm:h-24 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-sm shadow-lg border border-emerald-200 transform -rotate-12 flex flex-col items-center justify-between p-1 text-white">
              <span className="text-[6px] font-bold">Vhealth</span>
              <span className="text-[6px] bg-emerald-800/80 px-1 rounded">Matcha</span>
            </div>
          </div>

          <div className="relative flex flex-col items-center">
            <div className="w-24 sm:w-32 h-36 sm:h-44 bg-gradient-to-b from-amber-800 via-amber-900 to-stone-900 rounded-lg shadow-xl border border-amber-600/30 p-2 sm:p-3 text-white flex flex-col justify-between transform rotate-3 hover:rotate-0 transition-transform">
              <div className="flex justify-between items-start">
                <span className="text-[8px] sm:text-[9px] bg-amber-700/60 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Socola</span>
                <div className="w-3.5 h-3.5 rounded-full bg-amber-600/40 flex items-center justify-center text-[8px]">🍫</div>
              </div>
              <div className="text-center my-auto">
                <div className="text-sm sm:text-base font-black tracking-tight leading-none text-amber-100">Vhealth</div>
                <div className="text-[8px] sm:text-[9px] text-amber-200 mt-0.5 font-medium">Cacao Nguyên Chất</div>
                <div className="w-8 h-8 mx-auto mt-1 rounded-full bg-amber-700/40 border border-amber-500/40 flex items-center justify-center">
                  <span className="text-xs">🌾</span>
                </div>
              </div>
              <div className="text-[8px] text-amber-200 flex justify-between border-t border-amber-700/40 pt-1 font-mono">
                <span>20 Gói</span>
                <span>500g</span>
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 w-7 sm:w-9 h-20 sm:h-24 bg-gradient-to-b from-amber-600 to-stone-800 rounded-sm shadow-lg border border-amber-400 transform rotate-12 flex flex-col items-center justify-between p-1 text-white">
              <span className="text-[6px] font-bold">Vhealth</span>
              <span className="text-[6px] bg-stone-900/80 px-1 rounded">Socola</span>
            </div>
          </div>
        </div>
      );
  }
}
