export type DialLevel = 'feels' | 'fragments' | 'clusters' | 'claims'

interface MeaningDialProps {
  level: DialLevel
  onChange: (level: DialLevel) => void
  disabled?: boolean
}

const LEVELS: DialLevel[] = ['feels', 'fragments', 'clusters', 'claims']

const LEVEL_CONFIG: Record<DialLevel, {
  microcopy: string
}> = {
  feels: {
    microcopy: '1x (no compression): Our vibes in our own words.'
  },
  fragments: {
    microcopy: '5x: Light AI clustering.'
  },
  clusters: {
    microcopy: '20x: AI suggests names for patterns.'
  },
  claims: {
    microcopy: '100x (full compression): AI summaries of our vibes.'
  }
}

export function MeaningDial({ level, onChange, disabled }: MeaningDialProps) {
  const currentIndex = LEVELS.indexOf(level)

  const handleClick = (newLevel: DialLevel) => {
    if (!disabled) {
      onChange(newLevel)
    }
  }

  return (
    <div className="meaning-dial">
      {/* Title */}
      <div className="dial-title">
        <span className="dial-title-main">FIDELITY DIAL</span>
      </div>

      {/* Endcaps + Track */}
      <div className="dial-container">
        <div className="dial-endcap dial-endcap-left">
          <span className="endcap-icon">" "</span>
          <span className="endcap-label">Human</span>
          <span className="endcap-sub">lossless</span>
        </div>

        <div className="dial-track">
          {LEVELS.map((l, i) => (
            <button
              key={l}
              className={`dial-stop ${level === l ? 'active' : ''} ${i <= currentIndex ? 'reached' : ''}`}
              onClick={() => handleClick(l)}
              disabled={disabled}
            >
              <span className={`dial-dot blur-level-${i}`} />
            </button>
          ))}
          <div 
            className="dial-progress" 
            style={{ width: `${(currentIndex / (LEVELS.length - 1)) * 100}%` }}
          />
        </div>

        <div className="dial-endcap dial-endcap-right">
          <span className="endcap-icon">≈</span>
          <span className="endcap-label">AI</span>
          <span className="endcap-sub">lossy</span>
        </div>
      </div>

      {/* Dynamic microcopy */}
      <p className={`dial-microcopy microcopy-level-${currentIndex}`}>
        {LEVEL_CONFIG[level].microcopy}
      </p>
    </div>
  )
}

export default MeaningDial
