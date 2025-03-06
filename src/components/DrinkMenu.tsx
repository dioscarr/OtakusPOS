import React from 'react';
import { DrinkItem } from '../types';
import { Beer, Wine, FileLock as Cocktail, Coffee } from 'lucide-react';

interface DrinkMenuProps {
  drinks: DrinkItem[];
  onAddDrink: (drinkId: string) => void;
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

const categories = ['All', 'Beer', 'Wine', 'Cocktails', 'Spirits', 'Soft Drinks'];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Beer':
      return <Beer className="w-5 h-5" />;
    case 'Wine':
      return <Wine className="w-5 h-5" />;
    case 'Cocktails':
      return <Cocktail className="w-5 h-5" />;
    default:
      return <Coffee className="w-5 h-5" />;
  }
};

export function DrinkMenu({ drinks, onAddDrink, selectedCategory, onSelectCategory }: DrinkMenuProps) {
  const filteredDrinks = selectedCategory === 'All' 
    ? drinks 
    : drinks.filter(drink => drink.category === selectedCategory);

  return (
    <div className="h-full">
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onSelectCategory(category)}
            className={`px-4 py-2 rounded-full flex items-center gap-2 whitespace-nowrap
              ${selectedCategory === category 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            {category !== 'All' && getCategoryIcon(category)}
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {filteredDrinks.map((drink) => (
          <button
            key={drink.id}
            onClick={() => onAddDrink(drink.id)}
            className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              {getCategoryIcon(drink.category)}
              <span className="font-medium">{drink.name}</span>
            </div>
            {drink.description && (
              <p className="text-sm text-gray-600 mb-2">{drink.description}</p>
            )}
            <p className="text-lg font-bold text-blue-600">${drink.price.toFixed(2)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}