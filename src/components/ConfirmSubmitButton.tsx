"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

type ConfirmButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  titleText?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  onConfirm: () => void;
};

type ConfirmSubmitButtonProps = Omit<ConfirmButtonProps, "onConfirm"> & {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-sm rounded-md border border-line bg-white p-4 shadow-xl">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmButton({
  titleText = "Confirm action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  children,
  variant = "danger",
  ...props
}: ConfirmButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        {...props}
        type={props.type ?? "button"}
        variant={variant}
        onClick={(event) => {
          if (props.disabled) return;
          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </Button>
      <ConfirmDialog
        open={open}
        title={titleText}
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          onConfirm();
        }}
      />
    </>
  );
}

export function ConfirmSubmitButton({
  titleText = "Confirm action",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onClick,
  children,
  variant = "danger",
  ...props
}: ConfirmSubmitButtonProps) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        {...props}
        ref={buttonRef}
        variant={variant}
        onClick={(event) => {
          if (props.disabled) return;

          if (confirmed) {
            setConfirmed(false);
            onClick?.(event);
            return;
          }

          event.preventDefault();
          setOpen(true);
        }}
      >
        {children}
      </Button>
      <ConfirmDialog
        open={open}
        title={titleText}
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          setConfirmed(true);
          window.setTimeout(() => buttonRef.current?.click(), 0);
        }}
      />
    </>
  );
}
