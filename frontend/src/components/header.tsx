import React from 'react';
import {UtensilsCrossed} from 'lucide-react';

const Header = () => {
  return (
    <header className="sticky top-0 z-40 bg-amber-500 border-b border-gray-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">

              <div className="w-9 h-9 rounded-xl bg-[#e84a1a] text-white flex items-center justify-center shadow-xs">
              <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
              <span className="font-extrabold text-xl text-gray block">
                Campus Canteen Express
              </span>
            </div>
          </div>
      </div>

    </header>
  )
}

export default Header;

