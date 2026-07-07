"use client";

import { Check, Plus } from "@gravity-ui/icons";
import { useState } from "react";

const CATEGORIES = [
  { id: 1, label: "Compras", emoji: "🥑", color: "bg-[#D4E8A8]" },
  { id: 2, label: "Ropa", emoji: "👖", color: "bg-[#C5D5F0]" },
  { id: 3, label: "Comer afuera", emoji: "🍔", color: "bg-[#F0D4C8]" },
  { id: 4, label: "Lujo", emoji: "💎", color: "bg-[#E8D4F0]" },
  { id: 5, label: "Auto", emoji: "🚗", color: "bg-[#E0D8F0]" },
  { id: 6, label: "Mascotas", emoji: "🐕", color: "bg-[#E8D4F0]" },
];

export default function CategorySelector() {
  const [selected, setSelected] = useState<number[]>([]);

  const toggleCategory = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSave = () => {
    console.log("Categorías seleccionadas:", selected);
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 text-center">
            Categorías
          </h1>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => toggleCategory(category.id)}
              className={`relative flex flex-col items-center justify-center w-24 h-24 rounded-2xl transition-all duration-200 ${
                category.color
              } ${
                selected.includes(category.id)
                  ? "ring-2 ring-gray-800 scale-95"
                  : "hover:scale-105"
              }`}
            >
              <div className="text-4xl mb-2">{category.emoji}</div>
              <p className="text-xs font-medium text-gray-700 text-center px-1">
                {category.label}
              </p>
              {selected.includes(category.id) && (
                <div className="absolute top-2 right-2 bg-gray-800 text-white rounded-full p-1">
                  <Check /* size={12} */ />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Add Category Button */}
        <div className="flex justify-start mb-8">
          <button className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-gray-400 rounded-2xl text-gray-500 hover:border-gray-600 hover:text-gray-700 transition-colors">
            <Plus /* size={24}  */ />
            <span className="text-xs mt-2 text-center text-gray-600 px-2">
              Añadir
              <br />
              categoría
            </span>
          </button>
        </div>

        {/* Save Button */}
        {/* <div className="flex justify-center w-full">
          <button
            onClick={handleSave}
            className="bg-gray-800 text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-900 transition-colors flex items-center gap-2"
          >
            <span>→</span> Guardar
          </button>
        </div> */}
      </div>
    </div>
  );
}
