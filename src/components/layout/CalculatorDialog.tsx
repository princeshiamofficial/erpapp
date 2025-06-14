
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { History, Divide, X as MultiplyIcon, Minus, Plus, Percent, Clock, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    case 'number':
      variantStyle = "bg-[#5f6368] text-[#e8eaed] hover:bg-[#6b6f73] focus:ring-primary"; // Focus ring to primary
      break;
    case 'operator':
      variantStyle = "bg-[#202124] text-primary hover:bg-[#303134] focus:ring-[#5f6368] text-2xl"; // Text to primary (orange)
      break;
    case 'function':
      variantStyle = "bg-[#303134] text-[#e8eaed] hover:bg-[#3c4043] focus:ring-[#5f6368]";
      break;
    case 'equals':
      variantStyle = "bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-orange-400 text-2xl"; // Background to primary (orange)
      break;
    case 'control':
      variantStyle = "bg-[#303134] text-[#e8eaed] hover:bg-[#3c4043] focus:ring-[#5f6368]";
      break;
    case 'control-special':
       variantStyle = "bg-transparent text-primary hover:bg-[#303134] text-base w-auto px-2"; // Active text to primary (orange)
      break;
    case 'control-ac':
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
      aria-label={ariaLabel || (typeof label === 'string' ? label : undefined)}
    >
      {label}
    </motion.button>
  );
};


const HISTORY_STORAGE_KEY = 'colorHutCalculatorHistory';
const MAX_HISTORY_ITEMS = 30;

export function CalculatorDialog({ children }: CalculatorDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState("0");
  const [expression, setExpression] = useState("");
  const [currentValue, setCurrentValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [calcMode, setCalcMode] = useState<'rad' | 'deg'>('deg');
  const { toast } = useToast();

  const [history, setHistory] = useState<string[]>([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  useEffect(() => {
    const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (storedHistory) {
      try {
        setHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Failed to parse calculator history from localStorage", e);
        localStorage.removeItem(HISTORY_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (history.length > 0 || localStorage.getItem(HISTORY_STORAGE_KEY)) {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    }
  }, [history]);

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
    let currentDisplay = displayValue;
    if (waitingForOperand) {
      currentDisplay = "0.";
      setDisplayValue(currentDisplay);
      setWaitingForOperand(false);
    } else if (!displayValue.includes(".")) {
      currentDisplay = displayValue + ".";
      setDisplayValue(currentDisplay);
    }
    
    if (expression === "" || /[+\-*/]$/.test(expression.trim()) || waitingForOperand) {
      setExpression(prev => prev + (currentDisplay.startsWith("0.") ? "0." : "."));
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
    } else { 
       setCurrentValue(String(inputValue));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
    setExpression(prev => prev.trim() + ` ${nextOperator} `);
  };

  const performCalculation = (): number => {
    const prev = parseFloat(currentValue!);
    const current = parseFloat(displayValue); 

    if (operator === "+") return prev + current;
    if (operator === "-") return prev - current;
    if (operator === "*") return prev * current;
    if (operator === "/" && current !== 0) return prev / current;
    if (operator === "/" && current === 0) {
      toast({ title: "Error", description: "Cannot divide by zero", variant: "destructive" });
      return parseFloat(currentValue || "0");
    }
    return current;
  };

  const handleEqualsClick = () => {
    if (operator && currentValue !== null) {
      const currentFullExpression = expression.trim();
      const result = performCalculation();
      
      setDisplayValue(String(result));
      setExpression(String(result));

      const historyEntry = `${currentFullExpression} = ${result}`;
      setHistory(prevHistory => [historyEntry, ...prevHistory.slice(0, MAX_HISTORY_ITEMS - 1)]);

      setCurrentValue(String(result)); 
      setOperator(null);
      setWaitingForOperand(true); 
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
    setDisplayValue("0"); 
    setExpression(prev => prev + p);
    setWaitingForOperand(p === '(');
  };

  const handlePercentage = () => {
    const currentNum = parseFloat(displayValue);
    if (!isNaN(currentNum)) {
      const result = currentNum / 100;
      setDisplayValue(result.toString());
      setExpression(prev => `(${prev}) / 100`); 
      setCurrentValue(result.toString());
      setOperator(null);
      setWaitingForOperand(true);
    }
  };
  
  const handleClearHistoryClick = () => {
    setHistory([]);
    toast({ title: "History Cleared", description: "Calculator history has been cleared." });
  };

  const handleHistoryItemClick = (entry: string) => {
    const parts = entry.split(" = ");
    if (parts.length === 2) {
      setExpression(parts[0]); 
      setDisplayValue(parts[1]); 
      setCurrentValue(parts[1]); 
      setOperator(null);
      setWaitingForOperand(true);
      setShowHistoryPanel(false); 
    }
  };

  const calculatorButtonsConfig = [
    { label: calcMode === 'rad' ? <span className="font-semibold text-[#e8eaed]">Rad</span> : <span className="text-primary">Rad</span>, onClick: () => setCalcMode('rad'), variant: "control-special", gridSpan: "col-span-1", ariaLabel: "Radians Mode" },
    { label: calcMode === 'deg' ? <span className="font-semibold text-[#e8eaed]">Deg</span> : <span className="text-primary">Deg</span>, onClick: () => setCalcMode('deg'), variant: "control-special", gridSpan: "col-span-1", ariaLabel: "Degrees Mode" },
    { label: "x!", onClick: () => handleUnsupported("Factorial"), variant: "control", ariaLabel: "Factorial" },
    { label: "(", onClick: () => handleParenthesis("("), variant: "control", ariaLabel: "Open Parenthesis" },
    { label: ")", onClick: () => handleParenthesis(")"), variant: "control", ariaLabel: "Close Parenthesis" },
    { label: <Percent className="h-5 w-5" />, onClick: handlePercentage, variant: "control", ariaLabel: "Percentage" },
    { label: "AC", onClick: () => handleClearClick(true), variant: "control-ac", ariaLabel: "All Clear" },
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
    { label: "0", onClick: () => handleNumberClick("0"), variant: "number", gridSpan:"col-span-2" },
    { label: ".", onClick: handleDecimalClick, variant: "number", ariaLabel: "Decimal Point" },
    { label: "=", onClick: handleEqualsClick, variant: "equals", ariaLabel: "Equals" },
    { label: <Plus className="h-6 w-6"/>, onClick: () => handleOperatorClick("+"), variant: "operator", ariaLabel: "Add" },
  ];

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
      if (!open) { 
        handleClearClick(true);
        setShowHistoryPanel(false); 
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-sm p-0 border-none shadow-2xl bg-[#202124]">
        <div className="bg-[#202124] rounded-lg relative overflow-hidden">
          <DialogHeader className="p-4 pt-5">
             <DialogTitle className="sr-only">Calculator</DialogTitle>
            <div className="h-[100px] flex flex-col justify-end items-end px-3 py-2 rounded-md">
              <div className="flex items-center w-full justify-between mb-1">
                <button 
                  onClick={() => setShowHistoryPanel(prev => !prev)} 
                  aria-label="Toggle Calculation History" 
                  className="text-[#9aa0a6] hover:text-[#bdc1c6] p-1.5 rounded-full hover:bg-[#303134]"
                >
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
          <div className="p-3 pt-2 space-y-1.5">
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
          <AnimatePresence>
            {showHistoryPanel && (
              <motion.div
                initial={{ opacity: 0, x: "100%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "100%" }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="absolute inset-0 bg-[#292a2d] p-4 flex flex-col z-10"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-medium text-[#e8eaed]">History</h3>
                  <Button variant="ghost" size="sm" onClick={handleClearHistoryClick} className="text-primary hover:bg-[#303134] text-xs h-8"> {/* Clear button text to primary */}
                    <Trash2 className="h-4 w-4 mr-1.5" /> Clear
                  </Button>
                </div>
                {history.length === 0 ? (
                  <div className="text-sm text-center text-[#9aa0a6] flex-1 flex flex-col items-center justify-center"> {/* Added flex-col */}
                    <History className="h-12 w-12 text-[#5f6368] mb-3"/>
                    <p>No history yet.</p>
                  </div>
                ) : (
                  <ScrollArea className="flex-1 -mr-2 pr-2 custom-scrollbar">
                    <div className="space-y-2 text-right">
                      {history.map((entry, index) => (
                        <div 
                            key={index} 
                            className="text-sm text-[#bdc1c6] hover:bg-[#3c4043] p-2 rounded-md cursor-pointer transition-colors"
                            onClick={() => handleHistoryItemClick(entry)}
                            title="Click to reload calculation"
                        >
                          <div className="text-xs text-[#9aa0a6] break-all">{entry.split(" = ")[0]} =</div>
                          <div className="text-lg text-[#e8eaed] font-medium break-all">{entry.split(" = ")[1]}</div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
                <Button variant="outline" onClick={() => setShowHistoryPanel(false)} className="mt-4 border-[#5f6368] text-[#e8eaed] hover:bg-[#303134] bg-[#3c4043]">
                  Close History
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
