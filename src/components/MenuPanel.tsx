import React from 'react';
import { MenuItem } from '../types';
import { Beer, Wine, GlassWater, Coffee, Pizza, FileLock as Cocktail } from 'lucide-react';

interface MenuPanelProps {
  menuItems: MenuItem[];
  onAddItem: (itemId: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

// Category mapping for translation
const categoryMap: { [key: string]: string } = {
  'Food': 'Comida',
  'Cocktails': 'Cócteles',
  'Beer': 'Cerveza',
  'Wine': 'Vino',
  'Spirits': 'Licores',
  'Soft Drinks': 'Refrescos'
};

// Reverse mapping for looking up original categories
const reverseCategoryMap: { [key: string]: string } = Object.entries(categoryMap)
  .reduce((acc, [key, value]) => ({ ...acc, [value]: key }), {});

const categories = ['Todos', 'Comida', 'Cócteles', 'Cerveza', 'Vino', 'Licores', 'Refrescos'];

const getCategoryIcon = (category: string) => {
  // Get original category if it's translated
  const originalCategory = reverseCategoryMap[category] || category;
  
  switch (originalCategory) {
    case 'Beer':
      return <Beer className="w-5 h-5 text-white" />;
    case 'Wine':
      return <Wine className="w-5 h-5 text-white" />;
    case 'Cocktails':
      return <Cocktail className="w-5 h-5 text-white" />;
    case 'Food':
      return <Pizza className="w-5 h-5 text-white" />;
    case 'Soft Drinks':
      return <GlassWater className="w-5 h-5 text-white" />;
    case 'Spirits':
      return <Coffee className="w-5 h-5 text-white" />;
    default:
      return null;
  }
};

export function MenuPanel({ menuItems, onAddItem, selectedCategory, onSelectCategory }: MenuPanelProps) {
  // Filter items based on selected category
  const filteredItems = selectedCategory === 'Todos' 
    ? menuItems 
    : menuItems.filter(item => {
        // Get the Spanish translation for the item's category
        const translatedItemCategory = categoryMap[item.category] || item.category;
        // Compare with the selected category
        return translatedItemCategory === selectedCategory;
      });

  return (
    <div className="h-full">
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`px-4 py-2 rounded-full flex items-center gap-2 whitespace-nowrap
              ${selectedCategory === category 
                ? 'bg-[#D80000] text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
          >
            {category !== 'Todos' && getCategoryIcon(category)}
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {filteredItems.map((item) => {
          // Get the translated category for display
          const translatedCategory = categoryMap[item.category] || item.category;
          return (
            <button
              key={item.id}
              onClick={() => onAddItem(item.id)}
              className="bg-gray-800 p-4 rounded-lg shadow hover:shadow-md transition-shadow flex flex-col h-full border border-gray-700 hover:border-gray-600"
            >
              <div className="flex items-center gap-2 mb-2">
                {getCategoryIcon(translatedCategory)}
                <span className="font-medium text-white">{item.name}</span>
              </div>
              {item.description && (
                <p className="text-sm text-gray-400 mb-2 flex-grow">{item.description}</p>
              )}
              <p className="text-lg font-bold text-[#88BDFD]">RD${item.price.toFixed(2)}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}