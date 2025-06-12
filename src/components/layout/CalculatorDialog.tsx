
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MultiColorCalculatorIcon } from '@/components/icons/MultiColorCalculatorIcon'; // Assuming this exists

interface CalculatorDialogProps {
  children: React.ReactNode; // To use as DialogTrigger
}

export function CalculatorDialog({ children }: CalculatorDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState("0");
  const [currentValue, setCurrentValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const handleNumberClick = (number: string) => {
    if (waitingForOperand) {
      setDisplayValue(number);
      setWaitingForOperand(false);
    } else {
      setDisplayValue(displayValue === "0" ? number : displayValue + number);
    }
  };

  const handleDecimalClick = () => {
    if (waitingForOperand) {
      setDisplayValue("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!displayValue.includes(".")) {
      setDisplayValue(displayValue + ".");
    }
  };

  const handleOperatorClick = (nextOperator: string) => {
    const inputValue = parseFloat(displayValue);

    if (currentValue === null) {
      setCurrentValue(inputValue.toString());
    } else if (operator) {
      const result = performCalculation();
      setDisplayValue(String(result));
      setCurrentValue(String(result));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const performCalculation = (): number => {
    const prev = parseFloat(currentValue!);
    const current = parseFloat(displayValue);

    if (operator === "+") return prev + current;
    if (operator === "-") return prev - current;
    if (operator === "*") return prev * current;
    if (operator === "/") return prev / current;
    return current; // Should not happen
  };

  const handleEqualsClick = () => {
    if (operator && currentValue !== null) {
      const result = performCalculation();
      setDisplayValue(String(result));
      setCurrentValue(null); // Or String(result) if you want to continue operations
      setOperator(null);
      setWaitingForOperand(true); // Ready for new input
    }
  };

  const handleClearClick = (clearAll: boolean = true) => {
    setDisplayValue("0");
    if (clearAll) {
      setCurrentValue(null);
      setOperator(null);
    }
    setWaitingForOperand(false);
  };

  const calculatorButtons = [
    { label: "C", onClick: () => handleClearClick(true), className: "col-span-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground" },
    { label: "CE", onClick: () => handleClearClick(false), className: "bg-secondary hover:bg-secondary/80" },
    { label: "/", onClick: () => handleOperatorClick("/"), className: "bg-primary hover:bg-primary/90 text-primary-foreground" },
    { label: "7", onClick: () => handleNumberClick("7") },
    { label: "8", onClick: () => handleNumberClick("8") },
    { label: "9", onClick: () => handleNumberClick("9") },
    { label: "*", onClick: () => handleOperatorClick("*"), className: "bg-primary hover:bg-primary/90 text-primary-foreground" },
    { label: "4", onClick: () => handleNumberClick("4") },
    { label: "5", onClick: () => handleNumberClick("5") },
    { label: "6", onClick: () => handleNumberClick("6") },
    { label: "-", onClick: () => handleOperatorClick("-"), className: "bg-primary hover:bg-primary/90 text-primary-foreground" },
    { label: "1", onClick: () => handleNumberClick("1") },
    { label: "2", onClick: () => handleNumberClick("2") },
    { label: "3", onClick: () => handleNumberClick("3") },
    { label: "+", onClick: () => handleOperatorClick("+"), className: "bg-primary hover:bg-primary/90 text-primary-foreground" },
    { label: "0", onClick: () => handleNumberClick("0"), className: "col-span-2" },
    { label: ".", onClick: handleDecimalClick },
    { label: "=", onClick: handleEqualsClick, className: "bg-green-600 hover:bg-green-700 text-white" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xs p-0"> {/* Adjusted max-width and removed padding for tighter fit */}
        <div className="bg-card rounded-lg shadow-xl">
          <DialogHeader className="p-4 border-b border-border">
            <DialogTitle className="flex items-center text-lg">
              <MultiColorCalculatorIcon className="mr-2 h-5 w-5" /> Calculator
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-3">
            <Input
              type="text"
              value={displayValue}
              readOnly
              className="h-16 text-3xl text-right font-mono bg-muted border-border/50 rounded-md shadow-inner focus-visible:ring-0 focus-visible:ring-offset-0"
              aria-label="Calculator display"
            />
            <div className="grid grid-cols-4 gap-2">
              {calculatorButtons.map((btn) => (
                <Button
                  key={btn.label}
                  onClick={btn.onClick}
                  variant={btn.className?.includes("bg-primary") || btn.className?.includes("bg-destructive") || btn.className?.includes("bg-green") ? "default" : "outline"}
                  size="lg"
                  className={`text-xl font-medium h-14 ${btn.className || ''}`}
                  aria-label={btn.label === "*" ? "Multiply" : btn.label === "/" ? "Divide" : btn.label}
                >
                  {btn.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
