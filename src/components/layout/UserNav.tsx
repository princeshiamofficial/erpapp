
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { LogOut, User as UserIcon, Settings, Edit3, Bot } from "lucide-react";
import { EditProfileDialog } from "@/components/users/edit-profile-dialog";
import { AssistantSheet } from "./AssistantSheet"; // Import the new component

export function UserNav() {
  const { currentUser, logout } = useAuth();

  if (!currentUser) {
    return null;
  }

  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return names[0].charAt(0).toUpperCase() + names[names.length - 1].charAt(0).toUpperCase();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10 border-2 border-primary">
            <AvatarImage 
              src={currentUser.avatarUrl || `https://placehold.co/100x100.png?text=${getInitials(currentUser.name)}`} 
              alt={currentUser.name} 
              data-ai-hint={currentUser.avatarUrl ? "user uploaded" : "abstract lettermark"} 
            />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {getInitials(currentUser.name)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{currentUser.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUser.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground font-semibold pt-1">
              Role: {currentUser.role.replace(/_/g, " ")}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <EditProfileDialog>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
              <Edit3 className="mr-2 h-4 w-4" /> 
              <span>Edit Profile</span>
            </DropdownMenuItem>
          </EditProfileDialog>
          <AssistantSheet>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
              <Bot className="mr-2 h-4 w-4" />
              <span>Assistant</span>
            </DropdownMenuItem>
          </AssistantSheet>
          <DropdownMenuItem disabled>
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile (Soon)</span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings (Soon)</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
