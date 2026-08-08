'use client';

export default function SimbaIcon({ className = "w-5 h-5 inline-block" }: { className?: string }) {
  return (
    <img
      src="/simba-logo.png"
      alt="Simba Logo"
      width={20}
      height={20}
      style={{ maxWidth: '100%', maxHeight: '100%', display: 'inline-block' }}
      className={`${className} object-contain flex-shrink-0`}
    />
  );
}
