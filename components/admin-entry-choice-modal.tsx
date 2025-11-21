"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AdminEntryChoiceModalProps {
  open: boolean;
  onClose: () => void;
  onSelectUser: () => void;
  onSelectAdmin: () => void;
}

export function AdminEntryChoiceModal({ open, onClose, onSelectUser, onSelectAdmin }: AdminEntryChoiceModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="font-mono max-w-md dark:bg-background dark:border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold mb-2">// ADMIN ACCESS</DialogTitle>
          <DialogDescription className="text-muted-foreground leading-relaxed">
            You are an admin. Where do you want to go?
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={onSelectUser}
            variant="outline"
            className="font-mono bg-transparent w-full"
          >
            User Dashboard
          </Button>
          <Button
            onClick={onSelectAdmin}
            className="font-mono bg-accent text-accent-foreground hover:bg-accent/90 glow-accent w-full"
          >
            Admin Dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
