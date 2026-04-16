export default function Loading() {
  const skeletonBg = '#eeece8'
  const card = {
    background: '#fff',
    border: '1px solid #eeece8',
    borderRadius: 12,
  } as const

  const bar = (w: string | number, h: number, mt: number = 0) => ({
    width: w,
    height: h,
    background: skeletonBg,
    borderRadius: 6,
    marginTop: mt,
  }) as const

  return (
    <>
      <style>{`
        @keyframes dash-pulse {
          0%   { opacity: 0.6; }
          50%  { opacity: 1; }
          100% { opacity: 0.6; }
        }
        .dash-skel { animation: dash-pulse 1.4s ease-in-out infinite; }
      `}</style>
      <div className="dash-skel" style={{ padding: '32px 36px', maxWidth: 1280, paddingBottom: 120 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={bar(160, 12)} />
          <div style={{ ...bar(260, 26), marginTop: 10 }} />
          <div style={{ ...bar(320, 12), marginTop: 10 }} />
        </div>

        {/* Attention cards */}
        <div style={{ marginBottom: 32 }}>
          <div style={bar(140, 10)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ ...card, padding: '18px 20px', background: '#f2ede6', border: '1px solid #dedad4' }}>
                <div style={bar('60%', 14)} />
                <div style={{ ...bar('90%', 10), marginTop: 10 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Today table skeleton */}
        <div style={{ marginBottom: 32 }}>
          <div style={bar(120, 10)} />
          <div style={{ ...bar(200, 12), marginTop: 10 }} />
          <div style={{ ...card, marginTop: 12, overflow: 'hidden' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{
                padding: '14px 16px',
                borderBottom: i < 3 ? '1px solid #eeece8' : 'none',
                background: i % 2 === 1 ? '#faf9f7' : '#fff',
              }}>
                <div style={bar('80%', 12)} />
              </div>
            ))}
          </div>
        </div>

        {/* 4 metric cubes */}
        <div style={{ marginBottom: 8 }}>
          <div style={bar(140, 10)} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ ...card, padding: '20px 20px' }}>
                <div style={bar(60, 26)} />
                <div style={{ ...bar('70%', 12), marginTop: 10 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
