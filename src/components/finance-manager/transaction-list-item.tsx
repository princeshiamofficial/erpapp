
"use client";

import React from 'react';
import type { Transaction, User } from '@/types';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, Trash2, Edit3, UserCircle } from 'lucide-react'; // Added UserCircle
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TransactionListItemProps {
  transaction: Transaction;
  currentUser: User | null;
  onDelete: (transactionId: string) => void;
  onEdit: (transaction: Transaction) => void;
  userName?: string; // Optional userName prop
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT' }).format(value);
};

export function TransactionListItem({ transaction, currentUser, onDelete, onEdit, userName }: TransactionListItemProps) {
  const isIncome = transaction.type === 'income';
  const canModify = currentUser?.id === transaction.userId || currentUser?.role === 'SYSTEM_ADMIN';

  return (
    <div className="flex items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
        <div className={cn(
          "p-2 rounded-full",
          isIncome ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
        )}>
          {isIncome ? <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" /> : <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-md font-semibold text-foreground truncate" title={transaction.category}>
            {transaction.category}
          </p>
          {userName && (
            <div className="flex items-center text-xs text-primary truncate mt-0.5" title={`User: ${userName}`}>
              <UserCircle className="h-3.5 w-3.5 mr-1 opacity-80" />
              {userName}
            </div>
          )}
          <p className="text-xs text-muted-foreground truncate" title={transaction.description}>
            {transaction.description || 'No description'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {format(parseISO(transaction.date), "MMM d, yyyy")}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-end ml-2 sm:ml-4">
        <p className={cn(
          "text-md sm:text-lg font-bold",
          isIncome ? "text-green-600" : "text-red-600"
        )}>
          {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
        </p>
        {canModify && (
          <div className="flex items-center space-x-1 mt-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary"
              onClick={() => onEdit(transaction)}
              title="Edit Transaction"
              disabled // Edit functionality to be implemented
            >
              <Edit3 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(transaction.id)}
              title="Delete Transaction"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

