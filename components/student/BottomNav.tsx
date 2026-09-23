export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 z-10 w-full max-w-[390px] -translate-x-1/2 border-t border-[#999999] bg-white">
      <div className="grid grid-cols-3">
        <div className="flex min-h-16 flex-col items-center justify-center bg-[#333333] text-white">
          <span className="text-sm font-bold">Home</span>
          <span className="mt-1 text-[10px]">Current</span>
        </div>

        <div className="flex min-h-16 flex-col items-center justify-center text-[#666666]">
          <span className="text-sm font-semibold">Classes</span>
        </div>

        <div className="flex min-h-16 flex-col items-center justify-center text-[#666666]">
          <span className="text-sm font-semibold">Grades</span>
        </div>
      </div>
    </nav>
  );
}
