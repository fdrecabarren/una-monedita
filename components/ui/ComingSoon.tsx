import { Hourglass } from "@phosphor-icons/react/dist/ssr"

interface Props {
  title: string
}

export function ComingSoon({ title }: Props) {
  return (
    <div className="min-h-screen bg-[#FBFBFA] flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex w-12 h-12 rounded-[10px] bg-[#F7F6F3] border border-[#EAEAEA] items-center justify-center mb-4">
          <Hourglass size={22} weight="regular" className="text-[#787774]" />
        </div>
        <h1
          className="text-xl tracking-[-0.02em] text-[#111111] mb-1"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {title}
        </h1>
        <p className="text-sm text-[#787774]">
          Próximamente
        </p>
      </div>
    </div>
  )
}
