
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MultiColorCalculatorIcon } from '@/components/icons/MultiColorCalculatorIcon';
import { motion } from 'framer-motion'; // Import framer-motion
import { cn } from '@/lib/utils';

interface CalculatorDialogProps {
  children: React.ReactNode; // To use as DialogTrigger
}

interface CalculatorButtonProps {
  label: string;
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}

const CalcButton: React.FC<CalculatorButtonProps> = ({ label, onClick, className, ariaLabel }) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        "text-xl font-medium h-14 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-card transition-all duration-150 ease-in-out",
        "flex items-center justify-center", // Ensure text is centered
        className
      )}
      whileTap={{ scale: 0.95 }}
      whileHover={{ scale: 1.03, boxShadow: "0px 5px 10px rgba(0,0,0,0.1)" }}
      aria-label={ariaLabel || label}
    >
      {label}
    </motion.button>
  );
};


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
    if (operator === "/" && current !== 0) return prev / current;
    if (operator === "/" && current === 0) {
      alert("Cannot divide by zero"); // Basic error handling
      return parseFloat(currentValue || "0");
    }
    return current;
  };

  const handleEqualsClick = () => {
    if (operator && currentValue !== null) {
      const result = performCalculation();
      setDisplayValue(String(result));
      setCurrentValue(null); 
      setOperator(null);
      setWaitingForOperand(true); 
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
  
  const handleBackspaceClick = () => {
    if (waitingForOperand) return; // Don't backspace if waiting for new number after operator
    if (displayValue.length === 1) {
      setDisplayValue("0");
    } else {
      setDisplayValue(displayValue.slice(0, -1));
    }
  };


  const calculatorButtonsConfig = [
    { label: "C", onClick: () => handleClearClick(true), className: "col-span-1 bg-destructive/80 hover:bg-destructive text-destructive-foreground", ariaLabel: "Clear All" },
    { label: "CE", onClick: () => handleClearClick(false), className: "bg-secondary hover:bg-secondary/80 text-secondary-foreground", ariaLabel: "Clear Entry" },
    { label: "⌫", onClick: handleBackspaceClick, className: "bg-secondary hover:bg-secondary/80 text-secondary-foreground", ariaLabel: "Backspace" },
    { label: "÷", onClick: () => handleOperatorClick("/"), className: "bg-primary/90 hover:bg-primary text-primary-foreground", ariaLabel: "Divide" },
    
    { label: "7", onClick: () => handleNumberClick("7"), className: "bg-card hover:bg-muted border border-border" },
    { label: "8", onClick: () => handleNumberClick("8"), className: "bg-card hover:bg-muted border border-border" },
    { label: "9", onClick: () => handleNumberClick("9"), className: "bg-card hover:bg-muted border border-border" },
    { label: "×", onClick: () => handleOperatorClick("*"), className: "bg-primary/90 hover:bg-primary text-primary-foreground", ariaLabel: "Multiply" },

    { label: "4", onClick: () => handleNumberClick("4"), className: "bg-card hover:bg-muted border border-border" },
    { label: "5", onClick: () => handleNumberClick("5"), className: "bg-card hover:bg-muted border border-border" },
    { label: "6", onClick: () => handleNumberClick("6"), className: "bg-card hover:bg-muted border border-border" },
    { label: "-", onClick: () => handleOperatorClick("-"), className: "bg-primary/90 hover:bg-primary text-primary-foreground", ariaLabel: "Subtract" },

    { label: "1", onClick: () => handleNumberClick("1"), className: "bg-card hover:bg-muted border border-border" },
    { label: "2", onClick: () => handleNumberClick("2"), className: "bg-card hover:bg-muted border border-border" },
    { label: "3", onClick: () => handleNumberClick("3"), className: "bg-card hover:bg-muted border border-border" },
    { label: "+", onClick: () => handleOperatorClick("+"), className: "bg-primary/90 hover:bg-primary text-primary-foreground", ariaLabel: "Add" },

    { label: "0", onClick: () => handleNumberClick("0"), className: "col-span-2 bg-card hover:bg-muted border border-border" },
    { label: ".", onClick: handleDecimalClick, className: "bg-card hover:bg-muted border border-border", ariaLabel: "Decimal" },
    { label: "=", onClick: handleEqualsClick, className: "bg-green-600 hover:bg-green-700 text-white", ariaLabel: "Equals" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xs p-0 border-border/50 shadow-2xl bg-background">
        <div className="bg-card rounded-lg"> {/* Main calculator body background */}
          <DialogHeader className="p-4 border-b border-border/30">
            <DialogTitle className="flex items-center text-lg text-card-foreground">
              <MultiColorCalculatorIcon className="mr-2 h-5 w-5" /> Calculator
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-3">
            <Input
              type="text"
              value={displayValue}
              readOnly
              className="h-20 text-4xl text-right font-mono bg-muted/70 border-border/50 rounded-md shadow-inner focus-visible:ring-0 focus-visible:ring-offset-0 text-card-foreground placeholder:text-muted-foreground"
              aria-label="Calculator display"
            />
            <div className="grid grid-cols-4 gap-2.5"> {/* Increased gap slightly */}
              {calculatorButtonsConfig.map((btn) => (
                <CalcButton
                  key={btn.label}
                  label={btn.label}
                  onClick={btn.onClick}
                  className={btn.className}
                  ariaLabel={btn.ariaLabel}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
