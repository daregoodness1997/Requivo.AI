import * as React from 'react';
import { Dialog } from 'radix-ui';

import { cn } from '@/lib/utils';

const DialogRoot = Dialog.Root;
const DialogTrigger = Dialog.Trigger;
const DialogPortal = Dialog.Portal;
const DialogClose = Dialog.Close;

const DialogOverlay = React.forwardRef<
  React.ComponentRef<typeof Dialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof Dialog.Overlay>
>(({ className, ...props }, ref) => (
  <Dialog.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = Dialog.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ComponentRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <Dialog.Content
      ref={ref}
      className={cn(
        'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        className,
      )}
      {...props}
    >
      {children}
      <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.41995 11.7816 3.19544C11.5571 2.97088 11.1699 2.97088 10.9455 3.19544L7.50001 6.64088L4.05453 3.19544C3.83004 2.97088 3.44296 2.97088 3.21838 3.19544C2.99382 3.41995 2.99382 3.80702 3.21838 4.03157L6.66386 7.47813L3.21838 10.9236C2.99382 11.1481 2.99382 11.5352 3.21838 11.7597C3.44296 11.9843 3.83004 11.9843 4.05453 11.7597L7.50001 8.31388L10.9455 11.7597C11.1699 11.9843 11.5571 11.9843 11.7816 11.7597C12.0062 11.5352 12.0062 11.1481 11.7816 10.9236L8.33616 7.47813L11.7816 4.03157Z" fill="currentColor" />
        </svg>
      </Dialog.Close>
    </Dialog.Content>
  </DialogPortal>
));
DialogContent.displayName = Dialog.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
);

const DialogTitle = React.forwardRef<
  React.ComponentRef<typeof Dialog.Title>,
  React.ComponentPropsWithoutRef<typeof Dialog.Title>
>(({ className, ...props }, ref) => (
  <Dialog.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight text-slate-900', className)}
    {...props}
  />
));
DialogTitle.displayName = Dialog.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ComponentRef<typeof Dialog.Description>,
  React.ComponentPropsWithoutRef<typeof Dialog.Description>
>(({ className, ...props }, ref) => (
  <Dialog.Description
    ref={ref}
    className={cn('text-sm text-slate-500', className)}
    {...props}
  />
));
DialogDescription.displayName = Dialog.Description.displayName;

export {
  DialogRoot as Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
