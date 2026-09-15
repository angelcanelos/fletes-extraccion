export default function Campo({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-[13px] font-bold text-[#33402f]">{label}</label>}
      {children}
    </div>
  );
}
