let hotkeys = [];
let speeds = [];
let previousShortsSpeed = 1;
let video = null;
let timeDisplayInterval = null;
let intervalId = null;
let first = false;
let speedLabel = null;
let speedLabelShorts = null;

const fontURL = chrome.runtime.getURL('src/fonts/TradeGothic-Bold.ttf');
const style = document.createElement('style');
style.textContent = `
  @font-face {
    font-family: 'TradeGothic-Bold';
    src: url('${fontURL}') format('truetype');
    font-style: normal;
  }
`;
document.head.appendChild(style);

let activeAnimationId = null;
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const ctrl = isMac ? 'Command' : 'Ctrl';
const alt = isMac ? 'Option' : 'Alt';
document.addEventListener('keydown', (e) => {
    if (
        (
            ['KeyL', 'KeyJ', 'ArrowLeft', 'ArrowRight', 'Period', 'Comma', 'Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Home', 'End', 'KeyC']
                .includes(e.code) &&
            !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey &&
            !textMode(document.activeElement)
        ) ||
        (
            ['KeyN', 'KeyP'].includes(e.code) &&
            e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey &&
            !textMode(document.activeElement)
        ) ||
        (
            ['KeyS', 'KeyA'].includes(e.code) &&
            !e.shiftKey && ctrlKey(e) && !e.altKey &&
            !textMode(document.activeElement)
        ) ||
        (
            e.code === 'KeyS' &&
            !e.shiftKey && !e.ctrlKey && !e.metaKey && e.altKey &&
            !textMode(document.activeElement)
        )
    ) {
        const video = Array.from(document.getElementsByTagName('video')).find(v => !isNaN(v.duration) && v.duration > 0);
        if (!video) return;

        const isShorts = location.pathname.startsWith("/shorts/");

        if (
            [
                'Period', 'Comma', 'KeyA', 'KeyS'
            ].includes(e.code) ||
            isShorts
        ) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }

        if (['KeyJ', 'KeyL', 'ArrowLeft', 'ArrowRight', 'Comma', 'Period'].includes(e.code)) {
            const speedDict = {
                'KeyJ': isShorts ? -5 : -10,
                'KeyL': isShorts ? 5 : 10,
                'ArrowLeft': isShorts ? -2 : -5,
                'ArrowRight': isShorts ? 2 : 5,
                'Comma': isShorts ? -0.25 : -0.5,
                'Period': isShorts ? 0.25 : 0.5
            }

            const originalTime = video.currentTime;
            const isLoop = isShorts ? video.dataset.STLoop === "true": video.loop;
            setTimeout(() => {
                video.currentTime = isLoop ? ((originalTime + ((video?.playbackRate || 1) * (speedDict[e.code] || 0))) % video.duration + video.duration) % video.duration : (originalTime + ((video?.playbackRate || 1) * (speedDict[e.code] || 0)));
            }, 0)
        } else if (e.code === "KeyA" && ctrlKey(e)) toggleAutoPlay(isShorts, false);
        else if (e.code === "KeyS" && ctrlKey(e) && !e.altKey && !textMode(document.activeElement)) {
            chrome.runtime.sendMessage({ action: "openExtensionPage" });
            video.pause();
        }
        else if (e.code === "KeyS" && !ctrlKey(e) && e.altKey && !textMode(document.activeElement)) {
            chrome.storage.sync.get('rateBasedTimeDisplay', (result) => {
                const timeDisplay = document.getElementById('rate-based-time-display-check');
                if (!timeDisplay) return;

                updateTimeDisplay(!result.rateBasedTimeDisplay);
                timeDisplay.ariaChecked = !result.rateBasedTimeDisplay;
                chrome.storage.sync.set({ rateBasedTimeDisplay: !result.rateBasedTimeDisplay });
            });
        } else if (isShorts) {
            if (['Digit0', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'].includes(e.code)) {
                setTimeout(() => {
                    video.currentTime = (video.duration * (parseInt(e.code.match(/\d+/)[0]) / 10));
                }, 0)
            } else if (['Home', 'End'].includes(e.code)) {
                setTimeout(() => {
                    video.currentTime = e.code === 'Home' ? 0 : e.code === 'End' ? video.duration : video.currentTime;
                }, 0);
            } else if (e.code === 'KeyC') {
                document.querySelector(
                    '.yt-spec-button-shape-next' +
                    '.yt-spec-button-shape-next--tonal' +
                    '.yt-spec-button-shape-next--mono' +
                    '.yt-spec-button-shape-next--size-l' +
                    '.yt-spec-button-shape-next--icon-button' +
                    '.yt-spec-button-shape-next--enable-backdrop-filter-experiment'
                )?.click();
                setTimeout(() => {
                    document.querySelector("div.yt-list-item-view-model__label.yt-list-item-view-model__container.yt-list-item-view-model__container--compact.yt-list-item-view-model__container--tappable")?.click();
                    setTimeout(() => {
                        document.querySelector('input#radio\\:0').checked === true ? document.querySelector('label[for="radio:1"]')?.click() : document.querySelector('label[for="radio:0"]')?.click();
                    }, 0)
                }, 0)
            } else if (e.code === 'KeyN' && e.shiftKey) nextShort();
            else if (e.code === 'KeyP' && e.shiftKey) document.querySelector('button[aria-label="Previous video"]')?.click();
        }
    }
}, true);

window.addEventListener("keydown", function (event) {
    if (textMode(document.activeElement) || !hotkeys.some(hotkey => matchesHotkey(event, hotkey))) return;

    const video = Array.from(document.getElementsByTagName('video')).find(v => !isNaN(v.duration) && v.duration > 0);
    if (!video) return;

    const index = getMatchingHotkeyIndex(event, hotkeys);

    const speed = speeds[index];
    if (speed) {
        if (Array.isArray(speed) && ((speed[0] > 16 || speed[0] < 0.0625) || (speed[1] > 16 || speed[1] < 0.0625))) return
        else if (speed > 16 || speed < 0.0625) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    } else return;

    let previousSpeed = video?.playbackRate;

    if (Array.isArray(speed)) {
        video.playbackRate = isVideoSpeed(video, speed[0]) ? speed[0] : speed[1];
    } else if (typeof speed === 'number') {
        video.playbackRate = speed;
    }

    if (location.pathname.startsWith("/shorts/")) {
        previousShortsSpeed = video?.playbackRate;
    }

    if (location.pathname.startsWith("/shorts/") && document.getElementById('speed-label-shorts')) {
        document.getElementById('speed-label-shorts').textContent = `Speed: ${video?.playbackRate || 1}x | Autoplay: ${document.getElementById('autoplay-button')?.dataset.autoplay || 'Off'}`;
    } else if (document.getElementById('speed-label')) {
        document.getElementById('speed-label').textContent = `Speed: ${video?.playbackRate || 1}x`;
    }

    displayMessage(video?.playbackRate, previousSpeed);
});

const textMode = (currentElement) =>
    currentElement.tagName.toLowerCase() === "input" ||
    currentElement.tagName.toLowerCase() === "textarea" ||
    currentElement.isContentEditable;

function checkShortsSpeed() {
    if (location.pathname.startsWith("/shorts/")) {
        const videos = document.getElementsByTagName('video');

        for (let i = 0; i < videos.length; i++) {
            const duration = videos[i].duration;
            if (!isNaN(duration) && duration > 0) {
                video = videos[i];
                break;
            }
        }

        if (!video) {
            return;
        }

        video.playbackRate = previousShortsSpeed;
    }
}

function formatSpeedValue(val) {
    if (typeof val === "number") {
        return Number(val.toFixed(4));
    }
    if (typeof val === "string" && val !== "") {
        const num = Number(val);
        if (!isNaN(num)) {
            return Number(num.toFixed(4));
        }
    }
    return val;
}

function getHotkeys() {
    hotkeys = [];
    speeds = [];
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get('hotkeys', (result) => {
            if (result.hotkeys && Array.isArray(result.hotkeys)) {
                result.hotkeys.forEach((hotkey) => {
                    if (hotkey.enabled === false) return;
                    hotkeys.push(hotkey.hotkey);
                    if (hotkey.speed !== undefined) {
                        speeds.push(formatSpeedValue(hotkey.speed));
                    } else {
                        speeds.push([
                            formatSpeedValue(hotkey.speed1),
                            formatSpeedValue(hotkey.speed2)
                        ]);
                    }
                });
            }
        });
    }
}

function fadeOut(element, startOpacity = 0.9, duration = 1000) {
    let opacity = startOpacity;
    const startTime = performance.now();

    if (activeAnimationId) {
        cancelAnimationFrame(activeAnimationId);
    }

    const fadeStep = function (timestamp) {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);

        opacity = startOpacity * (1 - progress);
        element.style.opacity = opacity;
        element.style.filter = `alpha(opacity=${opacity * 100})`;

        if (progress < 1) {
            activeAnimationId = requestAnimationFrame(fadeStep);
        } else {
            element.style.display = 'none';
            activeAnimationId = null;
        }
    };

    activeAnimationId = requestAnimationFrame(fadeStep);
}

function displayMessage(speed = 1, previousSpeed = 1, text = "") {
    let elementId = location.pathname.startsWith("/shorts/") ? "youtube-extension-text-box-shorts" : "youtube-extension-text-box";
    let textElement = document.getElementById(elementId);
    let bigElement = document.getElementById(`${elementId}-big-one`);
    let imageElement = document.getElementById(`${elementId}-image`);
    let imgSrc = chrome.runtime.getURL(speed > previousSpeed ? "src/images/faster-empty-icon.png" : speed < previousSpeed ? "src/images/slower-empty-icon.png" : "src/images/equal-empty-icon.png");
    let displaySpeed = text === "" ? speed + "x" : text;

    if (!textElement || !bigElement || !imageElement) {
        let mediaElement = location.pathname.startsWith("/shorts/") ? document.getElementById("shorts-player"): document.getElementById("movie_player");
        mediaElement.insertAdjacentHTML('afterbegin', `<div class="image-overlay" id="${elementId}-big-one"><img src=${imgSrc} alt="Speed Change" id="${elementId}-image"><div class="speed-tag" id="${elementId}">${displaySpeed}</div></div>`);
        bigElement = document.getElementById(`${elementId}-big-one`);
    } else {
        imageElement.src = imgSrc;
        textElement.innerHTML = displaySpeed;
    }

    bigElement.style.display = 'block';
    bigElement.style.opacity = 0.8;
    bigElement.style.filter = `alpha(opacity=${0.8 * 100})`;
    bigElement.style.zIndex = "99999999999999999";

    const video = Array.from(document.getElementsByTagName('video')).find(v => !isNaN(v.duration) && v.duration > 0);

    video.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: 300,
        clientY: 300
    }));

    video.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: 301,
        clientY: 300
    }));


    fadeOut(bigElement);
}

const isVideoSpeed = (video, speed) => video?.playbackRate !== speed;

function parseHotkeyString(hotkey) {
    const parts = hotkey.split("+").map(k => k.trim());
    return {
        key: parts.find(k => !["Shift", "Ctrl", "Meta", "Alt"].includes(k)),
        shiftKey: parts.includes("Shift"),
        ctrlKey: parts.includes("Ctrl"),
        metaKey: parts.includes("Meta"),
        altKey: parts.includes("Alt")
    };
}

function matchesHotkey(e, hotkey) {
    const parsed = parseHotkeyString(hotkey);
    return (
      e.key.toLowerCase() === parsed.key.toLowerCase() &&
      e.shiftKey === parsed.shiftKey &&
      e.ctrlKey === parsed.ctrlKey &&
      e.metaKey === parsed.metaKey &&
      e.altKey === parsed.altKey
    );
}

function getMatchingHotkeyIndex(e, hotkeyList) {
    for (let i = 0; i < hotkeyList.length; i++) {
        if (matchesHotkey(e, hotkeyList[i])) {
            return i;
        }
    }
    return -1;
}

function initializeExtensionButton() {
    function getTargetElements(callback) {
        const observer = new MutationObserver(() => {
            const targetElement = document.getElementById("fullscreen-button-shape");
            const autoplayTargetElement = document.querySelector('ytd-menu-renderer.style-scope.ytd-reel-player-overlay-renderer');
            if (targetElement && autoplayTargetElement) {
                observer.disconnect();
            }
            callback(targetElement, autoplayTargetElement);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (location.pathname.startsWith("/shorts/")) {
        getTargetElements((targetElement, autoplayTargetElement) => {
            if (!document.getElementById("open-SpeedTube-shorts")) {
                const imageURL = chrome.runtime.getURL("src/images/icon.png");

                const buttonHTML = `
                <button id="open-SpeedTube-shorts"
                    class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--overlay-dark yt-spec-button-shape-next--size-l yt-spec-button-shape-next--icon-button yt-spec-button-shape-next--enable-backdrop-filter-experiment"
                    title="Open SpeedTube Controls (${ctrl} + S)"
                    aria-label="Open SpeedTube Controls (${ctrl} + S)"
                    aria-disabled="false"
                    tabindex="0"
                    style="cursor:pointer; pointer-events:auto; z-index:9999; position:relative; border-radius: 50%; overflow: hidden;">
                    <div style="width:100%; height:100%;">
                        <img src="${imageURL}" alt="SpeedTube Controls"
                            style="width:100%; height:100%; object-fit:contain; transition:all 0.2s ease-in-out;">
                    </div>
                </button>
                `;

                const buttonFragment = document.createRange().createContextualFragment(buttonHTML);
                targetElement?.before(buttonFragment);

                const openButton = document.getElementById("open-SpeedTube-shorts");

                openButton?.addEventListener("click", () => {
                    chrome.runtime.sendMessage({ action: "openExtensionPage" });
                });
            }

            if (!document.getElementById("autoplay-button")) {
                const autoplayImageURL = chrome.runtime.getURL("src/images/autoplay-on.png");

                const autoplayButtonHtml = `
                <button id="autoplay-button"
                    class="yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--overlay-dark yt-spec-button-shape-next--size-l yt-spec-button-shape-next--icon-button yt-spec-button-shape-next--enable-backdrop-filter-experiment"
                    title="Autoplay (${ctrl} + A)"
                    aria-label="Autoplay (${ctrl} + A)"
                    aria-disabled="false"
                    tabindex="0"
                    style="cursor:pointer; pointer-events:auto; z-index:9999; position:relative; border-radius: 50%; overflow: hidden;">
                    <div style="width:100%; height:100%;">
                        <img src="${autoplayImageURL}" alt="SpeedTube Controls"
                            style="width:100%; height:100%; object-fit:contain; transition:all 0.2s ease-in-out;">
                    </div>
                </button>
                `;

                const autoplayButtonFragment = document.createRange().createContextualFragment(autoplayButtonHtml);
                autoplayTargetElement?.after(autoplayButtonFragment);

                const autoplayButton = document.getElementById("autoplay-button");

                autoplayButton?.addEventListener("click", () => {
                    toggleAutoPlay();
                });
            }
        });
    } else {
        if (!document.getElementById("open-SpeedTube")) {
            const imageURL = chrome.runtime.getURL("src/images/yt-movie-icon.png");

            const buttonHTML = `
            <button id="open-SpeedTube"
                class="ytp-button"
                aria-expanded="false"
                aria-haspopup="true"
                aria-controls="speedtube-extension-button"
                data-tooltip-target-id="speedtube-extension-button"
                aria-label="SpeedTube Controls"
                tabindex="0"
                style="width:48px; height:48px; padding:0; margin:0; background:none; border:none; border-radius: 50%; overflow: hidden;">
                <div style="width:100%; height:100%;">
                    <img src="${imageURL}" alt="SpeedTube Controls"
                        style="width:100%; height:100%; object-fit:contain; transition:all 0.2s ease-in-out;">
                </div>
            </button>
            `;

            const targetButton = document.querySelector('.ytp-button.ytp-autonav-toggle');

            const buttonFragment = document.createRange().createContextualFragment(buttonHTML);
            targetButton?.before(buttonFragment);

            const openButton = document.getElementById("open-SpeedTube");

            openButton?.addEventListener("click", () => {
                chrome.runtime.sendMessage({ action: "openExtensionPage" });
            });

            openButton?.addEventListener("mouseenter", () => {
                first = true;
                intervalId = setInterval(() => {
                    const tooltipChild = document.querySelector(".ytp-tooltip-text-wrapper");
                    const tooltipText = document.querySelector(".ytp-tooltip-text");
                    const shortcutText = document.querySelector(".ytp-tooltip-keyboard-shortcut");

                    const mouseOverEvent = new MouseEvent('mouseover', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    const mouseOutEvent = new MouseEvent('mouseout', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });

                    if (tooltipChild && tooltipChild.parentElement && tooltipText && shortcutText && targetButton && mouseOverEvent && mouseOutEvent) {
                        if (first) {
                            first = false;
                            targetButton.dispatchEvent(mouseOverEvent);
                            targetButton.dispatchEvent(mouseOutEvent);
                        }

                        tooltipText.textContent = `Open SpeedTube Controls (${ctrl} + S)`;
                        shortcutText.textContent = `(${ctrl} + S)`;
                        tooltipChild.parentElement.style.display = "block";
                        tooltipChild.parentElement.ariaHidden = "false";
                        tooltipChild.ariaHidden = "false";
                    }
                }, 100);
            });

            document.querySelector('.ytp-button.ytp-autonav-toggle')?.addEventListener("click", () => {
                toggleAutoPlay(false, true);
            })

            openButton?.addEventListener("mouseleave", () => {
                openButton.querySelector("img").style.filter = "none";
                openButton.querySelector("img").style.transform = "none";

                const tooltipContainer = document.querySelector(".ytp-tooltip");
                if (tooltipContainer) {
                    tooltipContainer.style.display = "none";
                }
                clearInterval(intervalId);
            });
        }
        if (!document.getElementById("rate-based-time-display-check")) {
            let menuVolume = document.querySelector('div.ytp-menuitem.ytp-drc-menu-item');
            if (!menuVolume) {
                const settingsButton = document.querySelector('button.ytp-button.ytp-settings-button');
                if (settingsButton) {
                    settingsButton.click();
                    settingsButton.click();
                } else return;
                menuVolume = document.querySelector('div.ytp-menuitem.ytp-drc-menu-item');
            }

            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                const timeDisplay = menuVolume?.cloneNode(true);

                timeDisplay.id = "rate-based-time-display-check";
                timeDisplay.title = `Playback Rate Based Time Display (${alt} + S)`;
                timeDisplay.ariaLabel = `Playback Rate Based Time Display (${alt} + S)`;
                timeDisplay.ariaDisabled = false;
                timeDisplay.querySelector('div.ytp-menuitem-label').textContent = "Smart Time";
                timeDisplay.querySelector('div.ytp-menuitem-icon').innerHTML = `
                    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="7" x2="12" y2="12" />
                        <polyline points="12,12 16,14.5" />
                    </svg>
                `;

                chrome.storage.sync.get('rateBasedTimeDisplay', (result) => {
                    if (typeof result.rateBasedTimeDisplay === 'boolean') {
                        timeDisplay.ariaChecked = result.rateBasedTimeDisplay;
                        chrome.storage.sync.set({ rateBasedTimeDisplay: result.rateBasedTimeDisplay });
                        updateTimeDisplay(result.rateBasedTimeDisplay, false);
                    } else {
                        timeDisplay.ariaChecked = false;
                        chrome.storage.sync.set({ rateBasedTimeDisplay: false });
                        updateTimeDisplay(false, false);
                    }
                });

                menuVolume?.before(timeDisplay);

                timeDisplay.addEventListener('click', () => {
                    chrome.storage.sync.get('rateBasedTimeDisplay', (result) => {
                        updateTimeDisplay(!result.rateBasedTimeDisplay);
                        timeDisplay.ariaChecked = !result.rateBasedTimeDisplay;
                        chrome.storage.sync.set({ rateBasedTimeDisplay: !result.rateBasedTimeDisplay });
                    });
                });
            }
        }
    }
}

function updateTimes(currentTime, duration) {
    const currentSpan = document.querySelector('span.ytp-time-current');
    const durationSpan = document.querySelector('span.ytp-time-duration');

    if (currentSpan && durationSpan) {
        currentSpan.textContent = formatTime(currentTime);
        durationSpan.textContent = formatTime(duration);
    }
}

function updateTimeDisplay(rateBasedTimeDisplay, display = true) {
    const video = Array.from(document.getElementsByTagName('video')).find(v => !isNaN(v.duration) && v.duration > 0);
    if (!video) return;

    if (rateBasedTimeDisplay === true) {
        updateTimes(video.currentTime / video.playbackRate, video.duration / video.playbackRate);
        if (display) displayMessage(video?.playbackRate, video?.playbackRate, "Smart⏱");
        if (!timeDisplayInterval) {
            timeDisplayInterval = setInterval(() => {
                updateTimes(video.currentTime / video.playbackRate, video.duration / video.playbackRate);
            }, 1);
        }
    } else {
        updateTimes(video.currentTime, video.duration);
        if (display) displayMessage(video?.playbackRate, video?.playbackRate, "Real ⏱");
        if (timeDisplayInterval) {
            clearInterval(timeDisplayInterval);
            timeDisplayInterval = null;
        }
    }
}

function nextShort() {
    document.querySelector('button[aria-label="Next video"]')?.click();
}

function updateButton(button, autoplay) {
    button.title = `Autoplay ${autoplay ? 'On' : 'Off'} (${ctrl} + A)`;
    button.ariaLabel = `Autoplay ${autoplay ? 'On' : 'Off'} (${ctrl} + A)`;
    button.querySelector('img').src = chrome.runtime.getURL(autoplay ? "src/images/autoplay-on.png" : "src/images/autoplay-off.png");
    button.dataset.autoplay = autoplay ? "On" : "Off";
}

function autoPlayShorts() {
    if (location.pathname.startsWith("/shorts/")) {
        const video = Array.from(document.getElementsByTagName('video')).find(v => !isNaN(v.duration) && v.duration > 0);
        if (!video) return;

        video.removeEventListener('ended', nextShort);

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get('autoplay', (result) => {
                updateButton(document.getElementById('autoplay-button'), result.autoplay);
                if (result.autoplay === true && location.pathname.startsWith("/shorts/")) {
                    video.loop = false;
                    video.dataset.STLoop = "false";
                    video.addEventListener('ended', nextShort);
                } else {
                    video.loop = true;
                    video.dataset.STLoop = "true";
                }
            });
        }
    }
}

function toggleAutoPlay(isShorts = true, clicked = false) {
    if (isShorts) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get('autoplay', (result) => {
                if (typeof result.autoplay === 'boolean') {
                    chrome.storage.sync.set({ autoplay: !result.autoplay});
                    updateButton(document.getElementById('autoplay-button'), !result.autoplay);
                    displaySpeedLabel();
                    displayMessage(video?.playbackRate, video?.playbackRate, `Auto ${!result.autoplay ? '▶' : '⏸'}`);
                    if (result.autoplay) {
                        video.loop = true;
                        video.dataset.STLoop = "true";
                        video.removeEventListener('ended', nextShort);
                    } else {
                        video.loop = false;
                        video.dataset.STLoop = "false";
                        video.addEventListener('ended', nextShort);
                    }
                } else {
                    chrome.storage.sync.set({ autoplay: true});
                    displaySpeedLabel();
                    displayMessage(video?.playbackRate, video?.playbackRate, 'Auto ▶');
                    document.getElementById('autoplay-button').title = `Autoplay On (${ctrl} + A)`;
                    document.getElementById('autoplay-button').ariaLabel = `Autoplay On (${ctrl} + A)`;
                    document.getElementById('autoplay-button').querySelector('img').src = chrome.runtime.getURL("src/images/autoplay-on.png");
                    video.loop = false;
                    video.dataset.STLoop = "true";
                    video.addEventListener('ended', nextShort);
                }
            });
        }
    } else {
        if (!clicked) {
            document.querySelector('.ytp-button.ytp-autonav-toggle')?.click();
        }
        displayMessage(video?.playbackRate, video?.playbackRate, `Auto ${document.querySelector('.ytp-autonav-toggle')?.querySelector('.ytp-autonav-toggle-button-container')?.querySelector('.ytp-autonav-toggle-button')?.ariaChecked === "true" ? '▶' : '⏸'}`);
    }
}

function displaySpeedLabel() {
    const video = Array.from(document.getElementsByTagName('video')).find(v => !isNaN(v.duration) && v.duration > 0);
    if (!video) return;

    if (location.pathname.startsWith("/shorts/")) {
        speedLabelShorts = document.getElementById("speed-label-shorts");
        if (!speedLabelShorts) {
            const labelShorts = document.createElement("span");
            labelShorts.id = "speed-label-shorts";
            labelShorts.style.cursor = "default";
            labelShorts.style.userSelect = "none";
            labelShorts.style.float = "right";
            labelShorts.style.background = "#F00";
            labelShorts.style.borderRadius = "4px";
            labelShorts.style.padding = "2px 4px";
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                chrome.storage.sync.get('autoplay', (result) => {
                    labelShorts.textContent = `Speed: ${video?.playbackRate || 1}x | Autoplay: ${result.autoplay ? 'On' : 'Off'}`;
                })
            }

            const nextToChildShorts = document.querySelector('h2.ytShortsVideoTitleViewModelShortsVideoTitle')?.querySelector('span.yt-core-attributed-string.yt-core-attributed-string--white-space-pre-wrap.yt-core-attributed-string--link-inherit-color');

            if (!nextToChildShorts) return;

            nextToChildShorts.after(labelShorts);
            speedLabelShorts = document.getElementById("speed-label-shorts");
            speedLabelShorts.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            });
        }
        speedLabelShorts.textContent = `Speed: ${video?.playbackRate || 1}x | Autoplay: ${document.getElementById('autoplay-button')?.dataset.autoplay || 'Off'}`;
    } else {
        speedLabel = document.getElementById("speed-label");
        if (!speedLabel) {
            const label = document.createElement("span");
            label.id = "speed-label";
            label.style.fontSize = "115%";
            label.style.cursor = "default";
            label.style.userSelect = "none";
            label.style.background = "#F00";
            label.style.borderRadius = "4px";
            label.style.padding = "2px 4px";
            label.style.width = "fit-content";
            label.style.height = "fit-content";
            label.style.lineHeight = "normal";
            label.style.transform = "translate(10%, 50%)";

            const nextToChild = document.querySelector('div.ytp-time-display');

            if (!nextToChild) return;

            nextToChild.after(label);
            speedLabel = document.getElementById("speed-label");
            speedLabel.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
            });
        }
        speedLabel.textContent = `Speed: ${video?.playbackRate || 1}x`;
    }
}

function ctrlKey(e) {
    return isMac ? (!e.ctrlKey && e.metaKey && !textMode(document.activeElement)): (e.ctrlKey && !e.metaKey && !textMode(document.activeElement));
}

function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function initialize() {
    checkShortsSpeed();
    getHotkeys();
    initializeExtensionButton();
    displaySpeedLabel();
    autoPlayShorts();
}

initialize();

setInterval(initialize, 1000);
