export default function ChatHeader() {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-center text-center">
        <div className="block sm:hidden text-[13px] text-gray-700 leading-relaxed">
          <div>Safe space for your thoughts 💭</div>
          <div className="text-gray-500 text-[12px]">Not a medical or psychiatric advice.</div>
        </div>
        <span className="hidden sm:flex text-xs text-gray-600 items-center gap-1">
          Safe space for your thoughts 💭 | Not a medical or psychiatric advice.
        </span>
      </div>
    </div>
  );
}
