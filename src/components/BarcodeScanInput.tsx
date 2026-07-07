"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { Camera, ScanBarcode, X } from "lucide-react";
import { Button, Input } from "@/components/ui";

export function BarcodeScanInput({
  name = "scan",
  defaultValue,
  placeholder = "Scan barcode or type item code, then press Enter",
  submitOnEnter = true,
  submitOnScan = submitOnEnter,
  onValueChange,
  onCommit
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  submitOnEnter?: boolean;
  submitOnScan?: boolean;
  onValueChange?: (value: string) => void;
  onCommit?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const scannedRef = useRef(false);

  useEffect(() => {
    setValue(defaultValue ?? "");
  }, [defaultValue]);

  function updateValue(nextValue: string) {
    setValue(nextValue);
    onValueChange?.(nextValue);
  }

  useEffect(() => {
    if (!cameraOpen) return;

    let cancelled = false;
    scannedRef.current = false;
    setError("");

    async function startScanner() {
      try {
        if (!window.isSecureContext) {
          setError("Camera needs HTTPS.");
          return;
        }

        const video = videoRef.current;
        if (!video) return;

        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          video,
          (result) => {
            if (!result || scannedRef.current) return;

            scannedRef.current = true;
            const text = result.getText();
            updateValue(text);
            onCommit?.(text);
            controlsRef.current?.stop();
            controlsRef.current = null;
            setCameraOpen(false);

            window.setTimeout(() => {
              if (submitOnScan) {
                inputRef.current?.form?.requestSubmit();
              } else {
                inputRef.current?.focus();
              }
            }, 0);
          }
        );

        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
        }
      } catch {
        setError("Camera unavailable.");
      }
    }

    void startScanner();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [cameraOpen, submitOnScan]);

  function closeCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraOpen(false);
  }

  return (
    <div className="rounded-md border-2 border-accent bg-white p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-accent">
          <ScanBarcode size={18} />
          Scanning ready
        </div>
        <Button type="button" variant="secondary" className="h-9 w-9 px-0" onClick={() => setCameraOpen(true)} title="Open camera" aria-label="Open camera">
          <Camera size={17} />
        </Button>
      </div>
      <Input
        ref={inputRef}
        name={name}
        value={value}
        placeholder={placeholder}
        autoFocus
        className="h-12 border-accent text-base tabular"
        onChange={(event) => updateValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            if (submitOnEnter) {
              event.currentTarget.form?.requestSubmit();
            } else {
              event.preventDefault();
              onCommit?.(value);
            }
          }
        }}
      />

      {cameraOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-md border border-line bg-white p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="font-semibold">Camera scanner</div>
              <Button type="button" variant="secondary" className="h-9 w-9 px-0" onClick={closeCamera} title="Close camera" aria-label="Close camera">
                <X size={17} />
              </Button>
            </div>
            <video ref={videoRef} className="aspect-video w-full rounded-md bg-black object-cover" muted playsInline />
            {error ? <div className="mt-2 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
