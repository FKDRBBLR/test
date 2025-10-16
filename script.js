document.addEventListener('DOMContentLoaded', () => {
    console.log("앱 스크립트가 로드되었습니다.");

    // --- Constants & State ---
    const practiceToggle = document.getElementById('practice-toggle');
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    const practiceSettings = document.getElementById('practice-settings');
    const linesInput = document.getElementById('lines-input');
    const timeInput = document.getElementById('time-input');
    const choiceButtons = document.querySelectorAll('.choice-button');
    const mainContent = document.querySelector('.main-content');
    const footerSettings = document.querySelector('.footer-settings');
    const gameScreen = document.getElementById('game-screen');

    let isPracticeMode = true;
    let lastValidLines, lastValidTime;
    let gamePattern = [];
    let currentGameIndex = 0;
    let gameFailed = false;

    // --- Initialization ---
    const initializeApp = () => {
        practiceToggle.textContent = `연습모드: 켬`;
        practiceSettings.classList.remove('hidden');
        const savedLines = localStorage.getItem('practiceLines') || '5';
        const savedTime = localStorage.getItem('practiceTime') || '4';
        linesInput.value = savedLines;
        timeInput.value = savedTime;
        lastValidLines = savedLines;
        lastValidTime = savedTime;
    };

    // --- UI & Game Logic Functions ---
    const showToast = (message) => {
        const existingToast = document.querySelector('.toast-message');
        if (existingToast) existingToast.remove();
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.className = 'toast-message';
        document.body.appendChild(toast);
        setTimeout(() => { toast.classList.add('show'); }, 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { if (toast.parentElement) toast.remove(); }, 500);
        }, 2000);
    };

    // --- New Event Handlers ---

    function handlePointerDown(event) {
        event.preventDefault();
        const target = event.currentTarget;
        target.classList.add('pressed'); // Universal pressed state for visual feedback

        if (target.classList.contains('floor-button') || target.classList.contains('exit-button')) {
            if (target.src.includes('_unpressed.png')) {
                target.src = target.src.replace('_unpressed.png', '_pressed.png');
            }
        }
    }

    function handlePointerUp(event) {
        event.preventDefault();
        const target = event.currentTarget;

        // --- Revert Visual State ---
        if (target.classList.contains('pressed')) {
            target.classList.remove('pressed');
            if (target.classList.contains('floor-button') || target.classList.contains('exit-button')) {
                if (target.src.includes('_pressed.png')) {
                    target.src = target.src.replace('_pressed.png', '_unpressed.png');
                }
            }
        }

        // --- Execute Game Logic ---
        if (target.classList.contains('exit-button')) {
            showMainScreen();
        } else if (target.classList.contains('choice-button')) {
            const role = target.textContent;
            validateAndStartGame(role);
        } else if (target.hasAttribute('data-command')) {
            const commandId = parseInt(target.dataset.command.replace('command', ''), 10);
            handlePlayerInput(commandId);
        }
    }

    const handlePlayerInput = (commandId) => {
        if (gameFailed || currentGameIndex >= gamePattern.length) return;
        const expectedCommand = gamePattern[currentGameIndex];
        if (commandId === expectedCommand) {
            const iconToUpdate = document.querySelectorAll('.command-icon')[currentGameIndex];
            if (iconToUpdate) {
                iconToUpdate.src = iconToUpdate.src.replace('.png', '_off.png');
            }
            currentGameIndex++;
            if (currentGameIndex === gamePattern.length) {
                showToast('성공');
            }
        } else {
            showToast('실패');
            gameFailed = true;
        }
    };

    const showMainScreen = () => {
        mainContent.classList.remove('hidden');
        footerSettings.classList.remove('hidden');
        gameScreen.classList.add('hidden');
        gameScreen.innerHTML = '';
    };

    const patternGenerator = {
        pigNormalIcons: [1, 2, 3],
        pigSpecialIcon: 6,
        rabbitNormalIcons: [4, 5, 7],
        rabbitSpecialIcon: 8,
        generatePigPair(p){p.push(this.pigNormalIcons[Math.floor(Math.random()*this.pigNormalIcons.length)]);p.push(this.pigSpecialIcon);},
        generateRabbitPair(p){if(Math.random()<0.5){p.push(this.rabbitSpecialIcon);p.push(this.rabbitSpecialIcon);}else{p.push(this.rabbitNormalIcons[Math.floor(Math.random()*this.rabbitNormalIcons.length)]);p.push(this.rabbitNormalIcons[Math.floor(Math.random()*this.rabbitNormalIcons.length)]);}},
        generateFullPattern(totalCount,role=null){const p=[];const pairs=totalCount/2;const rm={'돼지':'Pig','토끼':'Rabbit'};const gr=rm[role]||null;if(gr===null){for(let i=0;i<pairs;i++){if(Math.random()<0.5){this.generatePigPair(p);}else{this.generateRabbitPair(p);}}}else if(gr==='Pig'){for(let i=0;i<pairs;i++)this.generatePigPair(p);}else if(gr==='Rabbit'){for(let i=0;i<pairs;i++)this.generateRabbitPair(p);}const fp=[];for(let i=0;i<p.length;i+=6){fp.push(p.slice(i,i+6));}return fp;}
    };

    const showGameScreen = (role) => {
        mainContent.classList.add('hidden');
        footerSettings.classList.add('hidden');
        gameScreen.classList.remove('hidden');
        const lines = parseInt(linesInput.value, 10);
        const totalIcons = lines * 6;
        const pattern = patternGenerator.generateFullPattern(totalIcons, isPracticeMode ? role : null);
        gamePattern = pattern.flat();
        currentGameIndex = 0;
        gameFailed = false;
        const getIconPath=(id)=>{const s1=[1,2,3,6],s2=[4,5,7,8];if(s1.includes(id))return`res/thanksgiving2024_room_command${id}.png`;if(s2.includes(id))return`res/thanksgiving_room_command${id}.png`;return'';};
        const commandBoxesHTML = pattern.map(row => `<div class="command-box">${row.map(id => `<img src="${getIconPath(id)}" class="command-icon">`).join('')}</div>`).join('');
        gameScreen.innerHTML = `
            <div class="ceiling"></div>
            <img src="res/thanksgiving_room_exit_unpressed.png" class="exit-button">
            <div class="game-area"><div class="scroll-viewport"><div class="scroll-content">${commandBoxesHTML}</div></div></div>
            <div class="floor-container"></div>`;
        
        const exitButton = gameScreen.querySelector('.exit-button');
        setupButtonListeners(exitButton);

        renderFloorButtons(role);
    };

    const renderFloorButtons = (role) => {
        const floorContainer = gameScreen.querySelector('.floor-container');
        if (!floorContainer) return;
        let buttonHTML = '';
        if (role === '돼지') {
            buttonHTML = `<div class="button-layout-container"><img src="res/thanksgiving2024_room_command1_unpressed.png" class="floor-button pig-cmd1" data-command="command1"><img src="res/thanksgiving2024_room_command2_unpressed.png" class="floor-button pig-cmd2" data-command="command2"><img src="res/thanksgiving2024_room_command3_unpressed.png" class="floor-button pig-cmd3" data-command="command3"><img src="res/thanksgiving_room_command_item.png" class="floor-button pig-item1 item"><img src="res/thanksgiving_room_command_item.png" class="floor-button pig-item2 item"><img src="res/thanksgiving2024_room_command6_unpressed.png" class="floor-button pig-cmd6" data-command="command6"></div>`;
        } else if (role === '토끼') {
            buttonHTML = `<div class="button-layout-container"><img src="res/thanksgiving_room_command8_unpressed.png" class="floor-button rabbit-cmd8" data-command="command8"><img src="res/thanksgiving_room_command_item.png" class="floor-button rabbit-item1 item"><img src="res/thanksgiving_room_command_item.png" class="floor-button rabbit-item2 item"><img src="res/thanksgiving_room_command4_unpressed.png" class="floor-button rabbit-cmd4" data-command="command4"><img src="res/thanksgiving_room_command5_unpressed.png" class="floor-button rabbit-cmd5" data-command="command5"><img src="res/thanksgiving_room_command7_unpressed.png" class="floor-button rabbit-cmd7" data-command="command7"></div>`;
        }
        floorContainer.innerHTML = `<img src="res/thanksgiving_room_container_top.png" class="floor-top">` + buttonHTML;

        floorContainer.querySelectorAll('[data-command]').forEach(setupButtonListeners);
    };

    function setupButtonListeners(button) {
        button.addEventListener('pointerdown', handlePointerDown);
        button.addEventListener('pointerup', handlePointerUp);
        // If the pointer leaves the button while pressed, release the visual state
        button.addEventListener('pointerleave', (e) => {
            if(e.currentTarget.classList.contains('pressed')) {
                handlePointerUp(e);
            }
        });
    }

    // --- Event Listeners Setup ---
    const validateAndStartGame = (role) => {
        const lines = parseInt(linesInput.value,10), time = parseInt(timeInput.value,10);
        if(lines>=1000||time>=1000){alert("줄 또는 시간 값은 999를 초과할 수 없습니다.");return;}
        if(lines===0||time===0){alert("줄 또는 시간 값은 0이 될 수 없습니다.");return;}
        if(isNaN(lines)||isNaN(time)||lines<1||time<1){alert("유효하지 않은 값입니다. 1 이상의 숫자를 입력하세요.");return;}
        showGameScreen(role);
    };

    choiceButtons.forEach(setupButtonListeners);

    practiceToggle.addEventListener('click', () => alert('개발중..'));

    // --- Fullscreen Logic ---
    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                alert(`전체화면 모드를 시작할 수 없습니다: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    fullscreenToggle.addEventListener('click', toggleFullScreen);

    // --- Input Validation ---
    const setupInputValidation = (input, lastValidValueRef, storageKey) => {
        input.addEventListener('focus', () => { lastValidValueRef.value = input.value; });
        input.addEventListener('input', () => { let v=input.value; if(v==='0')input.value=''; else if(v.length>3)input.value=v.slice(0,3); });
        input.addEventListener('blur', () => { if(input.value==='')input.value=lastValidValueRef.value; localStorage.setItem(storageKey,input.value); });
    };

    if (linesInput && timeInput) {
        setupInputValidation(linesInput, { get:()=>lastValidLines, set:(v)=>lastValidLines=v }, 'practiceLines');
        setupInputValidation(timeInput, { get:()=>lastValidTime, set:(v)=>lastValidTime=v }, 'practiceTime');
    }

    initializeApp();
});
