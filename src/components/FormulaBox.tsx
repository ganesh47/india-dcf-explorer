interface Props {
  formula: string
  caption?: string
}

export default function FormulaBox({ formula, caption }: Props) {
  return (
    <div className="my-4 rounded-lg border border-blue-200 bg-blue-50 px-5 py-3">
      <code className="text-sm font-mono text-blue-900 font-semibold">{formula}</code>
      {caption && <p className="mt-1 text-xs text-blue-600">{caption}</p>}
    </div>
  )
}
