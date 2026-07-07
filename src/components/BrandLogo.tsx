import { clsx } from "clsx";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "inline-flex w-[132px] flex-col items-center leading-none",
        className
      )}
      aria-label="SBDP Distribution PVT Ltd"
    >
      <div className="font-sans text-[24px] font-extrabold tracking-[0.14em] text-[#1a3060]">
        SBDP
      </div>
      <div className="mt-1.5 h-[2px] w-[76%] rounded-full bg-[#c8962a]" />
      <div className="mt-2 text-[7px] font-normal tracking-[0.24em] text-[#1a3060]">
        DISTRIBUTION PVT LTD
      </div>
    </div>
  );
}
