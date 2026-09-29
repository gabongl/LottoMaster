import Script from "next/script";

export default function Home() {
  return (
    <>
      <div className="container">
        <header>
          <h1>🎰 Lotto Master</h1>
          <p>단순 운이 아닌, 통계와 패턴으로 번호를 예측하세요.</p>
        </header>

        <main>
          <section className="glass-panel dashboard">
            <h2>📊 핵심 통계 요약 (최근 기준)</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <h3>가장 많이 나온 수 (Hot)</h3>
                <div className="balls-row" id="hot-numbers"></div>
              </div>
              <div className="stat-card">
                <h3>가장 안 나온 수 (Cold)</h3>
                <div className="balls-row" id="cold-numbers"></div>
              </div>
            </div>
          </section>

          <section className="glass-panel generator-section">
            <h2>🔮 통계 기반 번호 예측하기</h2>
            <div className="controls">
              <div className="control-group">
                <label htmlFor="fixed-numbers">고정수 (콤마로 구분)</label>
                <input type="text" id="fixed-numbers" placeholder="예: 7, 13" />
              </div>
              <div className="control-group">
                <label htmlFor="excluded-numbers">제외수 (콤마로 구분)</label>
                <input type="text" id="excluded-numbers" placeholder="예: 4, 44" />
              </div>
            </div>
            
            <div id="deep-analysis-section" style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', marginBottom: '20px', borderLeft: '4px solid #E67E22' }}>
              <h3 style={{ color: '#E67E22', fontSize: '1.1rem', marginBottom: '10px' }}>🧠 백엔드 초정밀 분석 (1회~최신회차 DB 기반)</h3>
              <button id="deep-analyze-btn" className="primary-btn" style={{ background: 'linear-gradient(135deg, #E67E22, #D35400)', width: '100%', marginBottom: '10px' }}>🔍 DB 기반 정밀 분석 실행 (필수)</button>
              <div id="deep-analyze-progress" style={{ display: 'none', color: '#F39C12', fontSize: '0.95rem', fontStyle: 'italic', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '5px' }}>
                과거 1243회차 데이터 스캔 중...
              </div>
              <div id="deep-analyze-result" style={{ display: 'none', color: '#2ECC71', fontSize: '0.95rem', fontWeight: 'bold', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '5px' }}>
                ✅ 정밀 분석 완료! (낙수 및 정규분포 가중치 적용됨)
              </div>
            </div>

            <button id="generate-btn" className="primary-btn" disabled style={{ opacity: 0.5 }}>최적 조합 5게임 생성 (먼저 정밀 분석을 실행하세요)</button>
          </section>

          <section id="machine-section" className="glass-panel" style={{ display: 'none', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <h3 style={{ color: '#F39C12', marginBottom: '1.5rem' }}>기계가 번호를 추첨 중입니다... 🎰</h3>
            <div className="lotto-machine">
              <div className="machine-sphere" id="machine-sphere"></div>
              <div className="machine-tube"></div>
            </div>
          </section>

          <section className="glass-panel results" style={{ display: 'none' }} id="results-section">
            <h2>🎯 생성된 예측 번호</h2>
            <div id="games-container"></div>
            
            <div style={{ textAlign: 'center', margin: '2rem 0', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button id="save-btn" className="primary-btn" style={{ background: 'linear-gradient(135deg, #E74C3C, #C0392B)' }}>❤️ 이 번호로 결정 (DB 저장)</button>
              <button id="show-omr-btn" className="primary-btn" style={{ background: 'linear-gradient(135deg, #2ECC71, #27AE60)' }}>OMR 마킹 용지 보기 / 인쇄하기</button>
            </div>

            <div id="omr-sheet-section" style={{ display: 'none' }}>
              <div className="omr-wrapper" id="omr-wrapper">
                <div className="omr-header">
                  Lotto 6/45
                </div>
                <div id="omr-games"></div>
                <div className="omr-footer">
                  - 발행기관: 복권위원회 &nbsp;&nbsp;&nbsp; - 한 게임당 가격은 1,000원입니다.
                </div>
              </div>
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button id="print-btn" className="primary-btn">인쇄하기 (PDF 저장)</button>
              </div>
            </div>

            <p className="disclaimer">※ 본 서비스는 통계적 확률 기반이며, 당첨을 보장하지 않습니다.</p>
          </section>

          <section className="glass-panel dashboard" id="analytics-section">
            <h2>📈 내 번호 보관함 & 적중률 분석</h2>
            
            <div className="ai-status" style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', marginBottom: '20px', borderLeft: '4px solid #9B59B6' }}>
              <h3 style={{ color: '#9B59B6', fontSize: '1.1rem', marginBottom: '5px' }}>🧠 AI 알고리즘 상태 (<span id="ai-version">v1.0</span>)</h3>
              <p id="ai-params" style={{ fontSize: '0.9rem', color: '#DDD', lineHeight: '1.5' }}>파라미터 초기화 중...</p>
              <p style={{ fontSize: '0.8rem', color: '#AAA', marginTop: '8px' }}>누적 자가 학습: <span id="learning-count">0</span>회 완료</p>
            </div>

            <div className="controls" style={{ marginBottom: '20px' }}>
              <button id="analyze-btn" className="primary-btn" style={{ width: '100%', padding: '15px', fontSize: '1.1rem', background: 'linear-gradient(135deg, #3498DB, #2980B9)' }}>
                🔄 지난 회차 자동 확인 및 적중률 분석 (AI 자가 학습)
              </button>
            </div>

            <div id="history-container">
              <p style={{ textAlign: 'center', color: '#A0A0B0', padding: '20px' }}>저장된 로또 번호가 없습니다.</p>
            </div>
          </section>
        </main>
      </div>

      {/* Load original vanilla JS script */}
      <Script src="/app.js" strategy="lazyOnload" />
    </>
  );
}
