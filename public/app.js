// 통계 데이터 모의 (실제 서비스 시 동행복권 API 연동 필요)
let hotNumbers = [];
let coldNumbers = [];

// Phase 2: AI State & History State
let aiStats = JSON.parse(localStorage.getItem('lottoAiStats')) || { 
    version: 1.0, 
    sumMin: 100, 
    sumMax: 180, 
    oddRatio: 3, // 홀수 목표 개수 (기본 3)
    highRatio: 3, // 고저(23이상) 목표 개수 (기본 3)
    consecutiveProb: 0.5, // 연속 번호 출현 확률 (기본 50%)
    learningCount: 0 
};
let lottoHistory = JSON.parse(localStorage.getItem('lottoHistory')) || [];

function showToast(message) {
    let toast = document.getElementById('custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'custom-toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// 로또 번호의 색상을 결정하는 함수
function getBallColorClass(num) {
    if (num <= 10) return 'color-1';
    if (num <= 20) return 'color-2';
    if (num <= 30) return 'color-3';
    if (num <= 40) return 'color-4';
    return 'color-5';
}

function createBallElement(num) {
    const ball = document.createElement('div');
    ball.className = `ball ${getBallColorClass(num)}`;
    ball.textContent = num;
    return ball;
}

// 초기 UI 렌더링
async function renderStats() {
    const hotContainer = document.getElementById('hot-numbers');
    const coldContainer = document.getElementById('cold-numbers');

    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        if (data.hot) hotNumbers = data.hot;
        if (data.cold) coldNumbers = data.cold;
        if (data.totalDraws) {
            console.log(`Loaded stats from ${data.totalDraws} past draws.`);
        }
    } catch (e) {
        console.error("Failed to fetch stats, using fallback", e);
        hotNumbers = [7, 15, 23, 31, 44];
        coldNumbers = [2, 9, 18, 25, 41];
    }

    hotContainer.innerHTML = '';
    coldContainer.innerHTML = '';

    hotNumbers.forEach(num => {
        hotContainer.appendChild(createBallElement(num));
    });
    coldNumbers.forEach(num => {
        coldContainer.appendChild(createBallElement(num));
    });
}

// 통계 및 패턴 기반 번호 생성 로직
function generateLottoNumbers(fixed = [], excluded = []) {
    let numbers = new Set(fixed);
    let attempts = 0;

    while (numbers.size < 6 && attempts < 1000) {
        attempts++;
        const candidate = Math.floor(Math.random() * 45) + 1;
        
        if (excluded.includes(candidate)) continue;
        if (numbers.has(candidate)) continue;

        numbers.add(candidate);
        
        // 패턴 필터링 확인 (6개가 다 모였을 때만)
        if (numbers.size === 6) {
            const arr = Array.from(numbers).sort((a,b) => a-b);
            
            // 1. 총합 필터링 (AI 학습에 의해 범위 변경됨)
            const sum = arr.reduce((a, b) => a + b, 0);
            if (sum < aiStats.sumMin || sum > aiStats.sumMax) {
                // 실패시 랜덤으로 하나 빼서 다시 뽑기 (고정수는 제외)
                const removable = arr.filter(n => !fixed.includes(n));
                if (removable.length > 0) {
                    numbers.delete(removable[Math.floor(Math.random() * removable.length)]);
                }
                continue;
            }

            // 2. 3연속 숫자 방지 및 AI 연속 확률 적용
            let hasConsecutive = false;
            let hasConsecutive3 = false;
            for (let i = 0; i < arr.length - 1; i++) {
                if (arr[i] + 1 === arr[i+1]) hasConsecutive = true;
                if (i < arr.length - 2 && arr[i] + 1 === arr[i+1] && arr[i+1] + 1 === arr[i+2]) hasConsecutive3 = true;
            }
            if (hasConsecutive3 || (hasConsecutive !== (Math.random() < aiStats.consecutiveProb))) {
                const removable = arr.filter(n => !fixed.includes(n));
                if (removable.length > 0) numbers.delete(removable[Math.floor(Math.random() * removable.length)]);
                continue;
            }

            // 3. 홀짝 비율 (AI 학습 비율 적용)
            const odds = arr.filter(n => n % 2 !== 0).length;
            if (Math.abs(odds - Math.round(aiStats.oddRatio)) > 1) {
                 const removable = arr.filter(n => !fixed.includes(n));
                 if (removable.length > 0) numbers.delete(removable[Math.floor(Math.random() * removable.length)]);
                 continue;
            }

            // 4. 고저 비율 (AI 학습 비율 적용)
            const highs = arr.filter(n => n >= 23).length;
            if (Math.abs(highs - Math.round(aiStats.highRatio)) > 1) {
                 const removable = arr.filter(n => !fixed.includes(n));
                 if (removable.length > 0) numbers.delete(removable[Math.floor(Math.random() * removable.length)]);
                 continue;
            }
        }
    }
    
    // 타임아웃(1000번 반복) 방지: 조건에 상관없이 남은 개수 채우기
    if (numbers.size < 6) {
        while(numbers.size < 6) {
            let rnd = Math.floor(Math.random() * 45) + 1;
            if(!excluded.includes(rnd)) numbers.add(rnd);
        }
    }

    return Array.from(numbers).sort((a,b) => a-b);
}

function parseInput(inputStr) {
    if (!inputStr.trim()) return [];
    return inputStr.split(',')
        .map(s => parseInt(s.trim()))
        .filter(n => !isNaN(n) && n >= 1 && n <= 45);
}

document.getElementById('generate-btn').addEventListener('click', () => {
    const fixedStr = document.getElementById('fixed-numbers').value;
    const excludedStr = document.getElementById('excluded-numbers').value;
    
    const fixed = parseInput(fixedStr);
    const excluded = parseInput(excludedStr);

    // [QA 포인트] 고정수와 제외수에 같은 숫자가 포함될 수 없도록 예외 처리
    const intersection = fixed.filter(x => excluded.includes(x));
    if (intersection.length > 0) {
        showToast('고정수와 제외수에 같은 숫자가 포함될 수 없습니다.');
        return;
    }
    // [QA 포인트] 고정수가 6개를 넘지 않도록 처리
    if (fixed.length > 6) {
        showToast('고정수는 최대 6개까지만 입력 가능합니다.');
        return;
    }

    const container = document.getElementById('games-container');
    const resultsSection = document.getElementById('results-section');
    const machineSection = document.getElementById('machine-section');
    const machineSphere = document.getElementById('machine-sphere');
    
    // UI 초기화: 결과 숨기고 추첨기 표시
    container.innerHTML = '';
    resultsSection.style.display = 'none';
    machineSection.style.display = 'flex';
    machineSphere.classList.add('active');

    // 미니 공 애니메이션 (더 천천히, 현실적인 속도로 회전/이동)
    const miniBalls = machineSphere.querySelectorAll('.mini-ball');
    const moveInterval = setInterval(() => {
        miniBalls.forEach(ball => {
            ball.style.transform = `translate(${Math.random() * 80 - 40}px, ${Math.random() * 80 - 40}px) rotate(${Math.random() * 360}deg)`;
            ball.style.transition = 'transform 0.8s ease-in-out';
        });
    }, 800);

    // 3초 후 추첨 완료 및 결과 표시
    setTimeout(() => {
        clearInterval(moveInterval);
        machineSphere.classList.remove('active');
        machineSection.style.display = 'none';

        window.currentGeneratedGames = [];
        for (let i = 0; i < 5; i++) {
            const gameRow = document.createElement('div');
            gameRow.className = 'game-row';
            
            const label = document.createElement('div');
            label.className = 'game-label';
            label.textContent = `Game ${i+1}`;
            gameRow.appendChild(label);
            
            const numbers = generateLottoNumbers(fixed, excluded);
            window.currentGeneratedGames.push(numbers);
            
            const ballsContainer = document.createElement('div');
            ballsContainer.className = 'balls-row';
            
            numbers.forEach((num, idx) => {
                const ball = createBallElement(num);
                ball.style.animationDelay = `${idx * 0.1}s`;
                ball.style.opacity = '0';
                ball.style.animationFillMode = 'forwards';
                ballsContainer.appendChild(ball);
            });
            
            gameRow.appendChild(ballsContainer);
            container.appendChild(gameRow);
        }
        
        resultsSection.style.display = 'block';
        document.getElementById('omr-sheet-section').style.display = 'none';
    }, 3000);
});

document.getElementById('show-omr-btn').addEventListener('click', () => {
    const omrSection = document.getElementById('omr-sheet-section');
    const omrGames = document.getElementById('omr-games');
    
    if (omrSection.style.display === 'block') {
        omrSection.style.display = 'none';
        return;
    }
    
    omrGames.innerHTML = '';
    const letters = ['A', 'B', 'C', 'D', 'E'];
    
    window.currentGeneratedGames.forEach((gameNumbers, idx) => {
        const gameDiv = document.createElement('div');
        gameDiv.className = 'omr-game';
        
        const leftDiv = document.createElement('div');
        leftDiv.className = 'omr-left';
        leftDiv.innerHTML = `
            <div class="omr-left-item">
                <span>자동 및 반자동 선택</span>
                <span>[&nbsp;&nbsp;]</span>
            </div>
            <div class="omr-left-item">
                <span>취소</span>
                <span>[&nbsp;&nbsp;]</span>
            </div>
        `;
        gameDiv.appendChild(leftDiv);
        
        const gridContainer = document.createElement('div');
        gridContainer.className = 'omr-grid-container';
        
        // 7 columns, numbers 1-45, arranged vertically, right to left.
        // col=0 means rightmost column: 1, 2, 3, 4, 5, 6, 7
        for (let col = 0; col < 7; col++) {
            const colDiv = document.createElement('div');
            colDiv.className = 'omr-col';
            for (let row = 0; row < 7; row++) {
                const num = col * 7 + row + 1;
                if (num <= 45) {
                    const numDiv = document.createElement('div');
                    numDiv.className = 'omr-num';
                    if (gameNumbers.includes(num)) {
                        numDiv.classList.add('marked');
                    }
                    numDiv.innerHTML = `<span>${num}</span>`;
                    colDiv.appendChild(numDiv);
                }
            }
            gridContainer.appendChild(colDiv);
        }
        gameDiv.appendChild(gridContainer);
        
        const rightDiv = document.createElement('div');
        rightDiv.className = 'omr-right';
        rightDiv.innerHTML = `<span>${letters[idx]}</span><span style="margin-top: 15px; font-weight: normal; letter-spacing: 1px;">1,000원</span>`;
        gameDiv.appendChild(rightDiv);
        
        omrGames.appendChild(gameDiv);
    });
    
    omrSection.style.display = 'block';
});

document.getElementById('print-btn').addEventListener('click', () => {
    const omrWrapper = document.getElementById('omr-wrapper');
    const omrSection = document.getElementById('omr-sheet-section');
    const printBtnContainer = document.getElementById('print-btn').parentNode;
    
    // 임시로 body의 직계 자식으로 이동 (CSS 레이아웃 제약 회피)
    document.body.appendChild(omrWrapper);
    
    // 인쇄 실행
    window.print();
    
    // 인쇄 완료 후 원상 복구
    omrSection.insertBefore(omrWrapper, printBtnContainer);
});

function initMachine() {
    const machineSphere = document.getElementById('machine-sphere');
    if (!machineSphere) return;
    machineSphere.innerHTML = '';
    
    // 45개의 번호 중 시각적으로 적당한 개수(25개)만 기계에 삽입
    const availableNumbers = Array.from({length: 45}, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    
    for (let i = 0; i < 25; i++) {
        const num = availableNumbers[i];
        const mBall = document.createElement('div');
        mBall.className = `mini-ball ${getBallColorClass(num)}`;
        mBall.textContent = num;
        mBall.style.left = `${Math.random() * 100 + 10}px`;
        mBall.style.top = `${Math.random() * 100 + 10}px`;
        machineSphere.appendChild(mBall);
    }
}

// 앱 시작
initMachine();
renderStats();
renderHistory();
updateAiStatus();

// Phase 2 Logic
function updateAiStatus() {
    const aiText = document.getElementById('ai-level-text');
    if(aiText) {
        aiText.textContent = `학습 완료: ${aiStats.learningCount}회 (현재 버전: v${aiStats.version.toFixed(1)}) | 목표 총합 범위: ${aiStats.sumMin}~${aiStats.sumMax}`;
    }
}

function renderHistory() {
    const container = document.getElementById('history-container');
    if(!container) return;
    
    if (lottoHistory.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #A0A0B0; padding: 20px;">저장된 로또 번호가 없습니다.</p>';
        return;
    }
    
    container.innerHTML = '';
    
    // 최신 순으로 정렬하여 표시
    const sortedHistory = [...lottoHistory].sort((a, b) => b.id - a.id);
    
    sortedHistory.forEach(record => {
        const card = document.createElement('div');
        card.className = 'history-card';
        
        const header = document.createElement('div');
        header.className = 'history-header';
        header.innerHTML = `<span>생성 일시: ${record.date}</span><span>상태: ${record.analyzed ? '분석 완료' : '대기 중'}</span>`;
        card.appendChild(header);
        
        const gamesDiv = document.createElement('div');
        gamesDiv.className = 'history-games';
        
        record.games.forEach((game, idx) => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'history-game-row';
            
            const ballsDiv = document.createElement('div');
            ballsDiv.className = 'history-game-balls';
            game.forEach(num => {
                const b = createBallElement(num);
                ballsDiv.appendChild(b);
            });
            
            rowDiv.appendChild(ballsDiv);
            
            if (record.analyzed) {
                const resultDiv = document.createElement('div');
                resultDiv.className = `history-result ${record.results[idx] !== '낙첨' ? 'hit' : ''}`;
                resultDiv.textContent = record.results[idx];
                rowDiv.appendChild(resultDiv);
            }
            
            gamesDiv.appendChild(rowDiv);
        });
        
        card.appendChild(gamesDiv);
        container.appendChild(card);
    });
}

const saveBtn = document.getElementById('save-btn');
if(saveBtn) {
    saveBtn.addEventListener('click', () => {
        if (!window.currentGeneratedGames || window.currentGeneratedGames.length === 0) return;
        
        const newRecord = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            games: [...window.currentGeneratedGames],
            analyzed: false,
            results: []
        };
        
        lottoHistory.push(newRecord);
        localStorage.setItem('lottoHistory', JSON.stringify(lottoHistory));
        showToast('❤️ 내 번호 보관함에 성공적으로 저장되었습니다!');
        renderHistory();
        
        // 스크롤 이동
        document.getElementById('analytics-section').scrollIntoView({ behavior: 'smooth' });
    });
}

const analyzeBtn = document.getElementById('analyze-btn');
if(analyzeBtn) {
    analyzeBtn.addEventListener('click', () => {
        let learningOccurred = false;
        const now = new Date();
        
        lottoHistory.forEach(record => {
            if (!record.analyzed) {
                // 저장된 날짜를 Date 객체로 변환
                const recordDate = new Date(record.date);
                
                // 실제로는 추첨일(토요일 오후 8시 45분)을 계산하여 현재 시간과 비교해야 함.
                // 여기서는 시뮬레이션을 위해 "저장 후 5초가 지나면 무조건 추첨일이 지났다"고 가정하고
                // 임의의 가상 당첨 번호를 동행복권 서버에서 가져왔다고 모의(Mock) 처리함.
                const isDrawDatePassed = (now - recordDate) > 5000; 

                if (isDrawDatePassed) {
                    record.analyzed = true;
                    learningOccurred = true;
                    // 가상 당첨 번호 (실제 서비스에서는 API 연동)
                    const mockWinningNums = [3, 15, 22, 28, 33, 41]; 
                    
                    record.results = record.games.map(game => {
                        const hitCount = game.filter(n => mockWinningNums.includes(n)).length;
                        if (hitCount === 6) return '1등 당첨!!';
                        if (hitCount === 5) return '3등 당첨!';
                        if (hitCount === 4) return '4등 당첨';
                        if (hitCount === 3) return '5등 당첨';
                        return '낙첨';
                    });
                }
            }
        });
        
        if (learningOccurred) {
            const winSum = [3, 15, 22, 28, 33, 41].reduce((a,b)=>a+b, 0);
            const targetMin = Math.max(21, winSum - 30);
            const targetMax = Math.min(255, winSum + 30);
            
            // 실제 당첨 번호의 특성 분석
            const mockWinningNums = [3, 15, 22, 28, 33, 41];
            const realOddCount = mockWinningNums.filter(n => n % 2 !== 0).length;
            const realHighCount = mockWinningNums.filter(n => n >= 23).length;
            let realHasConsecutive = 0;
            for (let i = 0; i < 5; i++) {
                if (mockWinningNums[i + 1] - mockWinningNums[i] === 1) realHasConsecutive = 1;
            }

            // 가중치 이동 (Learning Rate = 0.3)
            aiStats.sumMin = Math.round(aiStats.sumMin * 0.7 + targetMin * 0.3);
            aiStats.sumMax = Math.round(aiStats.sumMax * 0.7 + targetMax * 0.3);
            aiStats.oddRatio = parseFloat((aiStats.oddRatio * 0.7 + realOddCount * 0.3).toFixed(2));
            aiStats.highRatio = parseFloat((aiStats.highRatio * 0.7 + realHighCount * 0.3).toFixed(2));
            aiStats.consecutiveProb = parseFloat((aiStats.consecutiveProb * 0.7 + realHasConsecutive * 0.3).toFixed(2));
            
            aiStats.learningCount += 1;
            aiStats.version = parseFloat((aiStats.version + 0.1).toFixed(1));
            
            localStorage.setItem('lottoAiStats', JSON.stringify(aiStats));
            localStorage.setItem('lottoHistory', JSON.stringify(lottoHistory));
            
            showToast('✅ 지난 회차 자동 당첨 확인 및 AI 자가 학습 완료!');
            renderHistory();
            updateAiStatus();
        } else {
            showToast('⏳ 아직 추첨일이 도래하지 않은 번호들입니다.');
        }
    });
}

function updateAiStatus() {
    const versionEl = document.getElementById('ai-version');
    const paramsEl = document.getElementById('ai-params');
    const countEl = document.getElementById('learning-count');
    
    if (versionEl) versionEl.textContent = `v${aiStats.version.toFixed(1)}`;
    if (paramsEl) paramsEl.innerHTML = `총합 허용범위: <span class="highlight">${aiStats.sumMin}~${aiStats.sumMax}</span><br>` +
                                       `홀짝 가중치: <span class="highlight">홀수 ${aiStats.oddRatio}개</span><br>` +
                                       `고저 가중치: <span class="highlight">고(23~) ${aiStats.highRatio}개</span><br>` +
                                       `연속 출현율: <span class="highlight">${Math.round(aiStats.consecutiveProb * 100)}%</span>`;
    if (countEl) countEl.textContent = aiStats.learningCount;
}

// 초기 로드시 UI 업데이트
updateAiStatus();
