interface Props {
  children: React.ReactNode
}

export default function ELI5Box({ children }: Props) {
  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg" aria-hidden>💡</span>
        <span className="text-xs font-bold uppercase tracking-widest text-yellow-700">Explain it simply</span>
      </div>
      <div className="text-sm text-yellow-900 leading-relaxed space-y-2">{children}</div>
    </div>
  )
}
