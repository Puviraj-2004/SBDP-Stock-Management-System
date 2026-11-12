"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Building2, Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui";

export type BankOption = {
  id: string;
  name: string;
  code: string;
  logoUrl: string;
};

export const SRI_LANKAN_BANKS: BankOption[] = [
  { id: "boc", name: "Bank of Ceylon (BOC)", code: "BOC", logoUrl: "/banks/boc.svg" },
  { id: "combank", name: "Commercial Bank", code: "COMBANK", logoUrl: "/banks/combank.svg" },
  { id: "peoples", name: "People's Bank", code: "PB", logoUrl: "/banks/peoples.svg" },
  { id: "hnb", name: "Hatton National Bank (HNB)", code: "HNB", logoUrl: "/banks/hnb.svg" },
  { id: "sampath", name: "Sampath Bank", code: "SAMPATH", logoUrl: "/banks/sampath.svg" },
  { id: "seylan", name: "Seylan Bank", code: "SEYLAN", logoUrl: "/banks/seylan.svg" },
  { id: "ntb", name: "Nations Trust Bank (NTB)", code: "NTB", logoUrl: "/banks/ntb.svg" },
  { id: "dfcc", name: "DFCC Bank", code: "DFCC", logoUrl: "/banks/dfcc.svg" },
  { id: "ndb", name: "NDB Bank", code: "NDB", logoUrl: "/banks/ndb.svg" },
  { id: "amana", name: "Amana Bank", code: "AMANA", logoUrl: "/banks/amana.svg" },
  { id: "panasia", name: "Pan Asia Bank", code: "PABC", logoUrl: "/banks/panasia.svg" },
  { id: "union", name: "Union Bank", code: "UBC", logoUrl: "/banks/union.svg" },
  { id: "cargills", name: "Cargills Bank", code: "CARGILLS", logoUrl: "/banks/cargills.svg" }
];

export function getBankLogo(bankName?: string | null) {
  if (!bankName) return null;
  const normalized = bankName.trim().toLowerCase();
  const match = SRI_LANKAN_BANKS.find(
    (b) =>
      b.name.toLowerCase() === normalized ||
      b.code.toLowerCase() === normalized ||
      b.name.toLowerCase().includes(normalized) ||
      normalized.includes(b.code.toLowerCase())
  );
  if (!match) return null;
  return (
    <img
      src={match.logoUrl}
      alt={match.name}
      className="h-5 w-5 shrink-0 rounded object-contain inline-block"
      loading="lazy"
    />
  );
}

export function BankSelect({
  name = "bankName",
  defaultValue = "",
  required = false
}: {
  name?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  // Match default value to a standard bank option
  const matchedInitial = useMemo(() => {
    if (!defaultValue) return null;
    const norm = defaultValue.trim().toLowerCase();
    return (
      SRI_LANKAN_BANKS.find(
        (b) => b.name.toLowerCase() === norm || b.code.toLowerCase() === norm
      ) ?? null
    );
  }, [defaultValue]);

  const [selectedBankId, setSelectedBankId] = useState<string>(
    matchedInitial ? matchedInitial.id : defaultValue ? "other" : ""
  );
  const [customBankName, setCustomBankName] = useState<string>(
    matchedInitial ? "" : defaultValue ?? ""
  );

  useEffect(() => {
    if (matchedInitial) {
      setSelectedBankId(matchedInitial.id);
      setCustomBankName("");
    } else if (defaultValue) {
      setSelectedBankId("other");
      setCustomBankName(defaultValue);
    } else {
      setSelectedBankId("");
      setCustomBankName("");
    }
  }, [defaultValue, matchedInitial]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const selectedBank = SRI_LANKAN_BANKS.find((b) => b.id === selectedBankId);
  const isOther = selectedBankId === "other";
  const finalValue = isOther ? customBankName : (selectedBank?.name ?? "");

  return (
    <div ref={containerRef} className="relative grid gap-2">
      {/* Hidden input for form submission */}
      <input type="hidden" name={name} value={finalValue} />

      {/* Dropdown trigger */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5 truncate">
          {selectedBank ? (
            <>
              <img
                src={selectedBank.logoUrl}
                alt={selectedBank.name}
                className="h-6 w-6 shrink-0 rounded object-contain"
              />
              <span className="font-medium">{selectedBank.name}</span>
            </>
          ) : isOther ? (
            <>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <Building2 size={14} />
              </div>
              <span className="font-medium text-ink">
                Other Bank {customBankName ? `(${customBankName})` : ""}
              </span>
            </>
          ) : (
            <span className="text-muted">Select a bank...</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Popover options list */}
      {open ? (
        <div className="absolute left-0 top-[44px] z-50 max-h-64 w-full overflow-y-auto rounded-md border border-line bg-white p-1 shadow-lg">
          <div className="grid gap-0.5">
            {SRI_LANKAN_BANKS.map((bank) => {
              const isSelected = selectedBankId === bank.id;
              return (
                <button
                  key={bank.id}
                  type="button"
                  onClick={() => {
                    setSelectedBankId(bank.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-[#f6f4ef] ${
                    isSelected ? "bg-accent/10 font-medium text-accent" : "text-ink"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={bank.logoUrl}
                      alt={bank.name}
                      className="h-6 w-6 shrink-0 rounded object-contain"
                    />
                    <span>{bank.name}</span>
                  </div>
                  {isSelected ? <Check size={16} className="text-accent" /> : null}
                </button>
              );
            })}

            {/* Other option */}
            <div className="my-1 border-t border-line" />
            <button
              type="button"
              onClick={() => {
                setSelectedBankId("other");
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-[#f6f4ef] ${
                isOther ? "bg-accent/10 font-medium text-accent" : "text-ink"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <Building2 size={14} />
                </div>
                <span>Other Bank (Type name)</span>
              </div>
              {isOther ? <Check size={16} className="text-accent" /> : null}
            </button>
          </div>
        </div>
      ) : null}

      {/* If "Other" is selected, show custom text input */}
      {isOther ? (
        <Input
          type="text"
          placeholder="Enter bank name..."
          value={customBankName}
          onChange={(e) => setCustomBankName(e.target.value)}
          required={required}
          autoFocus
          className="mt-1"
        />
      ) : null}
    </div>
  );
}
