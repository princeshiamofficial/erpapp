
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle, // Imported DialogTitle
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
// import { MultiColorCalculatorIcon } from '@/components/icons/MultiColorCalculatorIcon'; // Replaced by History icon
import { History, Divide, X as MultiplyIcon, Minus, Plus, Percent, Clock } from 'lucide-react'; // Added icons
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CalculatorDialogProps {
  children: React.ReactNode;
}

interface CalculatorButtonProps {
  label: string | React.ReactNode;
  onClick: () => void;
  className?: string;
  variant?: 'number' | 'operator' | 'function' | 'equals' | 'control' | 'control-special' | 'control-ac';
  gridSpan?: string;
  ariaLabel?: string;
}

const CalcButton: React.FC<CalculatorButtonProps> = ({ label, onClick, className, variant = 'number', gridSpan, ariaLabel }) => {
  const baseStyle = "text-xl h-14 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#202124] transition-colors duration-150 ease-in-out flex items-center justify-center";

  let variantStyle = "";
  switch (variant) {
    case 'number': // Numbers (0-9, .)
      variantStyle = "bg-[#5f6368] text-[#e8eaed] hover:bg-[#6b6f73] focus:ring-[#8ab4f8]";
      break;
    case 'operator': // Regular operators (+, -, ×, ÷)
      variantStyle = "bg-[#202124] text-[#8ab4f8] hover:bg-[#303134] focus:ring-[#5f6368] text-2xl";
      break;
    case 'function': // Scientific functions (sin, cos, log, Inv, π, e, Ans, EXP, xʸ)
      variantStyle = "bg-[#303134] text-[#e8eaed] hover:bg-[#3c4043] focus:ring-[#5f6368]";
      break;
    case 'equals': // Equals button
      variantStyle = "bg-[#8ab4f8] text-[#202124] hover:bg-[#9ac1f9] focus:ring-[#aad0fa] text-2xl";
      break;
    case 'control': // Control buttons like ( ), %
      variantStyle = "bg-[#303134] text-[#e8eaed] hover:bg-[#3c4043] focus:ring-[#5f6368]";
      break;
    case 'control-special': // For Rad/Deg toggle-like buttons
       variantStyle = "bg-transparent text-[#8ab4f8] hover:bg-[#303134] text-base w-auto px-2";
      break;
    case 'control-ac': // For AC button
      variantStyle = "bg-[#303134] text-[#e8eaed] hover:bg-[#3c4043] focus:ring-[#5f6368]";
      break;
    default:
      variantStyle = "bg-card hover:bg-muted border border-border";
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(baseStyle, variantStyle, gridSpan, className)}
      whileTap={{ scale: 0.95 }}
      // whileHover={{ scale: 1.03 }} // Subtle hover scale
      aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
    >
      {label}
    </motion.button>
  );
};


export function CalculatorDialog({ children }: CalculatorDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState("0");
  const [expression, setExpression] = useState(""); // For the upper part of the display
  const [currentValue, setCurrentValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [calcMode, setCalcMode] = useState<'rad' | 'deg'>('deg'); // Radian/Degree mode
  const { toast } = useToast();

  const handleNumberClick = (number: string) => {
    if (waitingForOperand) {
      setDisplayValue(number);
      setWaitingForOperand(false);
    } else {
      setDisplayValue(displayValue === "0" ? number : displayValue + number);
    }
    setExpression(prev => prev + number);
  };

  const handleDecimalClick = () => {
    if (waitingForOperand) {
      setDisplayValue("0.");
      setWaitingForOperand(false);
    } else if (!displayValue.includes(".")) {
      setDisplayValue(displayValue + ".");
    }
    if (!expression.endsWith(".") && (expression === "" || /[+\-*/]$/.test(expression) || waitingForOperand) ) {
      setExpression(prev => prev + "0.");
    } else if (!expression.endsWith(".")) {
       setExpression(prev => prev + ".");
    }
  };

  const handleOperatorClick = (nextOperator: string) => {
    const inputValue = parseFloat(displayValue);

    if (currentValue === null) {
      setCurrentValue(String(inputValue));
    } else if (operator) {
      const result = performCalculation();
      setDisplayValue(String(result));
      setCurrentValue(String(result));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
    setExpression(prev => prev + ` ${nextOperator} `);
  };

  const performCalculation = (): number => {
    const prev = parseFloat(currentValue!);
    const current = parseFloat(displayValue); // Use current displayValue as second operand

    if (operator === "+") return prev + current;
    if (operator === "-") return prev - current;
    if (operator === "*") return prev * current;
    if (operator === "/" && current !== 0) return prev / current;
    if (operator === "/" && current === 0) {
      toast({ title: "Error", description: "Cannot divide by zero", variant: "destructive" });
      return parseFloat(currentValue || "0");
    }
    return current; // Should not happen if operator is set
  };

  const handleEqualsClick = () => {
    if (operator && currentValue !== null) {
      const result = performCalculation();
      setDisplayValue(String(result));
      setExpression(String(result)); // Show result in expression line
      setCurrentValue(null);
      setOperator(null);
      setWaitingForOperand(true); // Ready for new calculation starting with this result
    }
  };

  const handleClearClick = (allClear: boolean) => {
    setDisplayValue("0");
    setExpression("");
    if (allClear) {
      setCurrentValue(null);
      setOperator(null);
    }
    setWaitingForOperand(false);
  };

  const handleUnsupported = (featureName: string) => {
    toast({
      title: "Feature Not Implemented",
      description: `${featureName} functionality is not yet available.`,
      variant: "default",
      duration: 3000,
    });
  };

  const handleParenthesis = (p: '(' | ')') => {
    // Basic append, no validation or evaluation logic
    setDisplayValue("0"); // Reset display for new input after parenthesis potentially
    setExpression(prev => prev + p);
    setWaitingForOperand(p === '('); // If opening, expect operand. If closing, might be end of sub-expression.
  };

  const handlePercentage = () => {
    // This is a simplified percentage often meaning "divide by 100"
    // Or if it's part of an operation like "100 + 10%", it means 100 + (10/100)*100
    // For simplicity now, just treat it as /100 of current display value
    const currentNum = parseFloat(displayValue);
    if (!isNaN(currentNum)) {
      const result = currentNum / 100;
      setDisplayValue(result.toString());
      setExpression(result.toString()); // Update expression to reflect this change
      // Consider if this should complete an operation or allow further input.
      // For now, it finalizes the display value like equals would.
      setCurrentValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  };


  const calculatorButtonsConfig = [
    // Control Strip - A bit different, 2 special buttons then 5 controls
    // This is a conceptual grouping, the grid handles layout
    { label: calcMode === 'rad' ? <span className="font-semibold text-[#e8eaed]">Rad</span> : <span className="text-[#8ab4f8]">Rad</span>, onClick: () => setCalcMode('rad'), variant: "control-special", gridSpan: "col-span-1", ariaLabel: "Radians Mode" },
    { label: calcMode === 'deg' ? <span className="font-semibold text-[#e8eaed]">Deg</span> : <span className="text-[#8ab4f8]">Deg</span>, onClick: () => setCalcMode('deg'), variant: "control-special", gridSpan: "col-span-1", ariaLabel: "Degrees Mode" },
    { label: "x!", onClick: () => handleUnsupported("Factorial"), variant: "control", ariaLabel: "Factorial" },
    { label: "(", onClick: () => handleParenthesis("("), variant: "control", ariaLabel: "Open Parenthesis" },
    { label: ")", onClick: () => handleParenthesis(")"), variant: "control", ariaLabel: "Close Parenthesis" },
    { label: <Percent className="h-5 w-5" />, onClick: handlePercentage, variant: "control", ariaLabel: "Percentage" },
    { label: "AC", onClick: () => handleClearClick(true), variant: "control-ac", ariaLabel: "All Clear" },

    // Main Grid (7 columns)
    { label: "Inv", onClick: () => handleUnsupported("Inverse"), variant: "function", ariaLabel: "Inverse" },
    { label: "sin", onClick: () => handleUnsupported("Sine"), variant: "function", ariaLabel: "Sine" },
    { label: "ln", onClick: () => handleUnsupported("Natural Logarithm"), variant: "function", ariaLabel: "Natural Logarithm" },
    { label: "7", onClick: () => handleNumberClick("7"), variant: "number" },
    { label: "8", onClick: () => handleNumberClick("8"), variant: "number" },
    { label: "9", onClick: () => handleNumberClick("9"), variant: "number" },
    { label: <Divide className="h-6 w-6"/>, onClick: () => handleOperatorClick("/"), variant: "operator", ariaLabel: "Divide" },

    { label: "π", onClick: () => handleUnsupported("Pi"), variant: "function", ariaLabel: "Pi" },
    { label: "cos", onClick: () => handleUnsupported("Cosine"), variant: "function", ariaLabel: "Cosine" },
    { label: "log", onClick: () => handleUnsupported("Logarithm"), variant: "function", ariaLabel: "Logarithm base 10" },
    { label: "4", onClick: () => handleNumberClick("4"), variant: "number" },
    { label: "5", onClick: () => handleNumberClick("5"), variant: "number" },
    { label: "6", onClick: () => handleNumberClick("6"), variant: "number" },
    { label: <MultiplyIcon className="h-6 w-6"/>, onClick: () => handleOperatorClick("*"), variant: "operator", ariaLabel: "Multiply" },

    { label: "e", onClick: () => handleUnsupported("Euler's Number"), variant: "function", ariaLabel: "Euler's Number e" },
    { label: "tan", onClick: () => handleUnsupported("Tangent"), variant: "function", ariaLabel: "Tangent" },
    { label: "√", onClick: () => handleUnsupported("Square Root"), variant: "function", ariaLabel: "Square Root" },
    { label: "1", onClick: () => handleNumberClick("1"), variant: "number" },
    { label: "2", onClick: () => handleNumberClick("2"), variant: "number" },
    { label: "3", onClick: () => handleNumberClick("3"), variant: "number" },
    { label: <Minus className="h-6 w-6"/>, onClick: () => handleOperatorClick("-"), variant: "operator", ariaLabel: "Subtract" },

    { label: "Ans", onClick: () => handleUnsupported("Answer"), variant: "function", ariaLabel: "Last Answer" },
    { label: "EXP", onClick: () => handleUnsupported("Exponent"), variant: "function", ariaLabel: "Exponent Notation" },
    { label: <div className="flex">x<span className="text-xs align-super">y</span></div>, onClick: () => handleUnsupported("Power"), variant: "function", ariaLabel: "Power x to y" },
    { label: "0", onClick: () => handleNumberClick("0"), variant: "number" },
    { label: ".", onClick: handleDecimalClick, variant: "number", ariaLabel: "Decimal Point" },
    { label: "=", onClick: handleEqualsClick, variant: "equals", ariaLabel: "Equals" },
    { label: <Plus className="h-6 w-6"/>, onClick: () => handleOperatorClick("+"), variant: "operator", ariaLabel: "Add" },
  ];

  // Function to manually chunk buttons for rows
  const chunkArray = (arr: any[], size: number) => {
    const result = [];
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result;
  };

  const controlStripButtons = calculatorButtonsConfig.slice(0, 7);
  const mainGridButtonsRows = chunkArray(calculatorButtonsConfig.slice(7), 7);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) { // Reset on close
        handleClearClick(true);
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm p-0 border-none shadow-2xl bg-[#202124]">
        <div className="bg-[#202124] rounded-lg">
          <DialogHeader className="p-4 pt-5">
            <DialogTitle className="sr-only">Calculator</DialogTitle> {/* Added for accessibility */}
            {/* Display Area */}
            <div className="h-[100px] flex flex-col justify-end items-end px-3 py-2 rounded-md">
              <div className="flex items-center w-full justify-between mb-1">
                <button onClick={() => handleUnsupported("History")} aria-label="Calculation History" className="text-[#9aa0a6] hover:text-[#bdc1c6] p-1.5 rounded-full hover:bg-[#303134]">
                  <Clock className="h-5 w-5" />
                </button>
                <Input
                  type="text"
                  value={expression}
                  readOnly
                  className="h-7 text-lg text-right font-mono bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[#9aa0a6] p-0 m-0"
                  aria-label="Calculator expression display"
                />
              </div>
              <Input
                type="text"
                value={displayValue}
                readOnly
                className="h-16 text-5xl text-right font-sans bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-[#e8eaed] p-0 m-0"
                aria-label="Calculator main display"
              />
            </div>
          </DialogHeader>
          <div className="p-3 pt-2 space-y-1.5"> {/* Reduced gap and padding for denser look */}
            {/* Control Strip */}
            <div className="grid grid-cols-7 gap-1.5">
              {controlStripButtons.map((btn, index) => (
                <CalcButton
                  key={`control-${index}-${btn.label}`}
                  label={btn.label}
                  onClick={btn.onClick}
                  variant={btn.variant as any}
                  className={cn("text-sm", btn.className)}
                  gridSpan={btn.gridSpan}
                  ariaLabel={btn.ariaLabel}
                />
              ))}
            </div>

            {/* Main Button Grid */}
            {mainGridButtonsRows.map((row, rowIndex) => (
              <div key={`row-${rowIndex}`} className="grid grid-cols-7 gap-1.5">
                {row.map((btn, btnIndex) => (
                   <CalcButton
                    key={`btn-${rowIndex}-${btnIndex}-${btn.label}`}
                    label={btn.label}
                    onClick={btn.onClick}
                    variant={btn.variant as any}
                    gridSpan={btn.gridSpan}
                    ariaLabel={btn.ariaLabel}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

