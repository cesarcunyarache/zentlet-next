"use client";

import { useState } from "react";
import { CategorySelector } from "./category-selector";
import { Button, Label, Switch, Select, ListBox } from "@heroui/react";
import { Check, Minus, MinusShapeFill, Plus } from "@gravity-ui/icons";

interface TransactionFormProps {
  onClose?: () => void;
  onSubmit?: (transaction: Transaction) => void;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  frequency: "hoy" | "una_vez" | "recurrente";
  visibility: "privada" | "publica";
  date: Date;
}

export default function TransactionForm({
  onClose,
  onSubmit,
}: TransactionFormProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [type, setType] = useState<"income" | "expense">("income");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [frequency, setFrequency] = useState("hoy");
  const [visibility, setVisibility] = useState("privada");

  const handleAmountChange = (delta: number) => {
    setAmount(Math.max(0, amount + delta));
  };

  const handleSubmit = () => {
    if (!description.trim() || amount === 0) {
      alert("Por favor completa la descripción y el monto");
      return;
    }

    const transaction: Transaction = {
      id: Date.now().toString(),
      description,
      amount,
      type,
      category: selectedCategory,
      frequency: frequency as "hoy" | "una_vez" | "recurrente",
      visibility: visibility as "privada" | "publica",
      date: new Date(),
    };

    onSubmit?.(transaction);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full sm:w-full max-w-md border animate-in slide-in-from-bottom duration-300">
        <div className="p-6 space-y-2 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center gap-2">
            <Select
              className="w-[65px]"
              placeholder="Select one"
              variant="secondary"
              value="hoy"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="hoy" textValue="hoy">
                    Hoy
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="option1" textValue="Option 1">
                    Mañana
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="option2" textValue="Option 2">
                    Pasado
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
            <Select
              className="w-[100px]"
              placeholder="Select one"
              variant="secondary"
              value="Una vez"
            >
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  <ListBox.Item id="Una vez" textValue="Una vez">
                    Una vez
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="option1" textValue="Option 1">
                    Semanal
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item id="option2" textValue="Option 2">
                    Mensual
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <input
            type="text"
            placeholder="Salario 3 millones"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-gray-300"
            autoFocus
          />

          {/* Amount Control */}
          <div className="flex items-center gap-3 py-2">
            <Switch aria-label="Power">
              {({ isSelected }) => (
                <Switch.Content>
                  <Switch.Control
                    className={`border py-2 h-[25px] w-[56px] bg-field-hover  ${isSelected ? "  bg-gray-100" : ""}`}
                  >
                    <Switch.Thumb
                      className={`size-[20px] h-[20px] w-[30px] bg-white shadow-sm ${isSelected ? "ms-[22px] shadow-lg bg-green-600" : "bg-red-500"} rounded-4xl`}
                    >
                      <Switch.Icon>
                        {isSelected ? (
                          <Plus className="size-2 text-white" />
                        ) : (
                          <Minus className="size-2 text-white" />
                        )}
                      </Switch.Icon>
                    </Switch.Thumb>
                  </Switch.Control>
                </Switch.Content>
              )}
            </Switch>

            <input
              type="number"
              placeholder=""
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder:text-gray-300"
              autoFocus
            />
          </div>

          {/* Category Selector */}

          <CategorySelector
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />

          <div className="flex gap-3 border-t border-gray-200">
            <Button
              onClick={handleSubmit}
              className="flex-1 py-3 px-4 rounded-lg bg-gray-800 text-white font-semibold hover:bg-gray-900 transition-colors"
            >
              ✓ Guardar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
