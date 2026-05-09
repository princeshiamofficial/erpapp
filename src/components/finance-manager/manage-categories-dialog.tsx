
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionCategory } from "@/types";
import { PlusCircle, Trash2, Edit2, Check, X, Info } from 'lucide-react';
import * as Lucide from 'lucide-react';
import { cn } from "@/lib/utils";
import { updateTransactionCategoriesAction } from '@/app/(app)/finance-manager/actions';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { getFinanceColorClasses } from '@/lib/finance-colors';

interface ManageCategoriesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  categories: TransactionCategory[];
  onCategoriesUpdated: () => void;
}

const COMMON_ICONS = ["Home", "Lightbulb", "Car", "ClipboardIcon", "Utensils", "Megaphone", "ShoppingBag", "SendHorizonal", "Banknote", "Briefcase", "Braces", "Tag", "ShoppingCart", "Plane", "Music", "Coffee", "Gift", "Smartphone", "Heart", "Star", "Package", "Truck", "Scissors", "Pencil"];

const COMMON_COLORS = [
  { label: "Blue", value: "text-blue-600" },
  { label: "Green", value: "text-green-600" },
  { label: "Red", value: "text-red-600" },
  { label: "Yellow", value: "text-yellow-600" },
  { label: "Purple", value: "text-purple-600" },
  { label: "Pink", value: "text-pink-600" },
  { label: "Indigo", value: "text-indigo-600" },
  { label: "Orange", value: "text-orange-600" },
  { label: "Teal", value: "text-teal-600" },
  { label: "Rose", value: "text-rose-600" },
  { label: "Amber", value: "text-amber-600" },
  { label: "Emerald", value: "text-emerald-600" },
];

const getIconComponent = (iconName: string) => {
  return (Lucide as any)[iconName] || Lucide.HelpCircle;
};

export const ManageCategoriesDialog = ({ isOpen, onClose, categories, onCategoriesUpdated }: ManageCategoriesDialogProps) => {
  const { toast } = useToast();
  const [localCategories, setLocalCategories] = useState<TransactionCategory[]>(categories);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("Tag");
  const [newCatColor, setNewCatColor] = useState("text-blue-600");
  const [newCatType, setNewCatType] = useState<'expense' | 'purchase'>('expense');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editType, setEditType] = useState<'expense' | 'purchase'>('expense');

  React.useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const handleAddCategory = () => {
    if (!newCatLabel.trim()) return;
    
    const newCategory: TransactionCategory = {
      id: uuidv4(),
      value: newCatLabel.trim(),
      label: newCatLabel.trim(),
      icon: newCatIcon,
      colorClass: newCatColor,
      type: newCatType,
      isSystem: false
    };

    setLocalCategories([...localCategories, newCategory]);
    setNewCatLabel("");
    setNewCatIcon("Tag");
    setNewCatColor("text-blue-600");
  };

  const handleStartEdit = (cat: TransactionCategory) => {
    if (cat.isSystem) return;
    setEditingId(cat.id);
    setEditLabel(cat.label);
    setEditIcon(cat.icon);
    setEditColor(cat.colorClass);
    setEditType(cat.type);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    setLocalCategories(localCategories.map(cat => 
      cat.id === editingId ? { ...cat, label: editLabel, value: editLabel, icon: editIcon, colorClass: editColor, type: editType } : cat
    ));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const cat = localCategories.find(c => c.id === id);
    if (cat?.isSystem) return;
    setLocalCategories(localCategories.filter(c => c.id !== id));
  };

  const handleSaveAll = async () => {
    setIsSubmitting(true);
    const result = await updateTransactionCategoriesAction(localCategories);
    setIsSubmitting(false);
    if (result.success) {
      toast({ title: "Success", description: "Categories updated successfully." });
      onCategoriesUpdated();
      onClose();
    } else {
      toast({ title: "Error", description: result.error || "Failed to update categories.", variant: "destructive" });
    }
  };
  
  const renderCategoryItem = (cat: TransactionCategory) => {
    const Icon = getIconComponent(cat.icon);
    const isEditing = editingId === cat.id;

    return (
      <div key={cat.id} className="p-3 flex items-center justify-between group hover:bg-muted/30 transition-colors">
        {isEditing ? (
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <Input 
                value={editLabel} 
                onChange={(e) => setEditLabel(e.target.value)} 
                className="h-8 flex-1"
                placeholder="Category label"
              />
              <div className="flex gap-2">
                <Select value={editIcon} onValueChange={setEditIcon}>
                  <SelectTrigger className="h-8 w-10 p-0">
                    <div className="flex items-center justify-center w-full">
                      {React.createElement(getIconComponent(editIcon), { className: "h-3.5 w-3.5" })}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="max-h-[250px]">
                    <div className="grid grid-cols-4 gap-1 p-1">
                      {COMMON_ICONS.map(icon => (
                        <SelectItem 
                          key={icon} 
                          value={icon} 
                          className="flex items-center justify-center p-1.5 hover:bg-muted cursor-pointer transition-colors"
                        >
                          <div className="flex items-center justify-center w-full h-full">
                            {React.createElement(getIconComponent(icon), { className: "h-3.5 w-3.5" })}
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  </SelectContent>
                </Select>
                <Select value={editColor} onValueChange={setEditColor}>
                  <SelectTrigger className="h-8 w-10 p-0">
                    <div className="flex items-center justify-center w-full">
                      <div className={cn("h-3 w-3 rounded-full", getFinanceColorClasses(editColor).bg)} />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_COLORS.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn("h-3 w-3 rounded-full", getFinanceColorClasses(color.value).bg)} />
                          <span className="text-xs">{color.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={editType} onValueChange={(v) => setEditType(v as 'expense' | 'purchase')}>
                  <SelectTrigger className="h-8 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingId(null)}>
                Cancel
              </Button>
              <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={handleSaveEdit}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("p-2 rounded-lg bg-muted flex-shrink-0")}>
                <Icon className={cn("h-4 w-4", cat.colorClass)} />
              </div>
              <div className="min-w-0 text-left">
                <span className="text-sm font-medium truncate block">{cat.label}</span>
                {cat.isSystem && (
                  <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded uppercase tracking-wider text-muted-foreground font-semibold">System</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!cat.isSystem && (
                <>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => handleStartEdit(cat)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cat.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              {cat.isSystem && (
                 <div className="px-2" title="System categories cannot be modified">
                   <Info className="h-3.5 w-3.5 text-muted-foreground/40" />
                 </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Transaction Categories</DialogTitle>
          <DialogDescription>
            Add or edit custom categories for your transactions. System categories cannot be modified.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-6 px-1">
          {/* Add New Section */}
          <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <PlusCircle className="h-4 w-4" /> Add New Category
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-cat-label">Name</Label>
                <Input 
                  id="new-cat-label" 
                  value={newCatLabel} 
                  onChange={(e) => setNewCatLabel(e.target.value)} 
                  placeholder="Category name..."
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select value={newCatIcon} onValueChange={setNewCatIcon}>
                    <SelectTrigger className="h-10">
                      <div className="flex items-center justify-center w-full">
                        {React.createElement(getIconComponent(newCatIcon), { className: "h-5 w-5" })}
                      </div>
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="grid grid-cols-5 gap-1 p-1">
                        {COMMON_ICONS.map(icon => (
                          <SelectItem 
                            key={icon} 
                            value={icon} 
                            className="flex items-center justify-center p-2 hover:bg-muted cursor-pointer transition-colors"
                          >
                             <div className="flex items-center justify-center w-full h-full">
                                {React.createElement(getIconComponent(icon), { className: "h-5 w-5" })}
                             </div>
                          </SelectItem>
                        ))}
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select value={newCatColor} onValueChange={setNewCatColor}>
                    <SelectTrigger className="h-10">
                      <div className="flex items-center justify-center w-full">
                        <div className={cn("h-4 w-4 rounded-full", getFinanceColorClasses(newCatColor).bg)} />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_COLORS.map(color => (
                        <SelectItem key={color.value} value={color.value}>
                          <div className="flex items-center gap-2">
                            <div className={cn("h-3 w-3 rounded-full", getFinanceColorClasses(color.value).bg)} />
                            <span className="text-xs">{color.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newCatType} onValueChange={(v) => setNewCatType(v as 'expense' | 'purchase')}>
                    <SelectTrigger className="h-10 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="purchase">Purchase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <Button className="w-full mt-2" onClick={handleAddCategory} disabled={!newCatLabel.trim()}>
              Add Category
            </Button>
          </div>

          {/* Categories List */}
          <div className="space-y-3">
            <Tabs defaultValue="expense" className="w-full">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold">Existing Categories</h4>
                <TabsList className="h-8">
                  <TabsTrigger value="expense" className="text-xs h-7">Expenses</TabsTrigger>
                  <TabsTrigger value="purchase" className="text-xs h-7">Purchases</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="expense" className="mt-0">
                <div className="border rounded-lg divide-y bg-background overflow-hidden">
                  {localCategories.filter(c => c.type === 'expense' && !c.isSystem).length > 0 ? (
                    localCategories.filter(c => c.type === 'expense' && !c.isSystem).map((cat) => renderCategoryItem(cat))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">No custom expense categories.</div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="purchase" className="mt-0">
                <div className="border rounded-lg divide-y bg-background overflow-hidden">
                  {localCategories.filter(c => c.type === 'purchase' && !c.isSystem).length > 0 ? (
                    localCategories.filter(c => c.type === 'purchase' && !c.isSystem).map((cat) => renderCategoryItem(cat))
                  ) : (
                    <div className="p-8 text-center text-muted-foreground text-sm">No custom purchase categories.</div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSaveAll} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
