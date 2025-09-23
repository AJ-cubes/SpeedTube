document.addEventListener('DOMContentLoaded', () => {
    if (chrome && chrome.runtime && chrome.runtime.getManifest) {
        const versionSpan = document.getElementById('versionSpan');
        if (versionSpan) {
            versionSpan.textContent = 'v' + chrome.runtime.getManifest().version;
        }
    }

    document.querySelectorAll('span.informative-text').forEach(span => {
        let isMac = navigator.platform.toUpperCase().includes('MAC');
        span.innerHTML = span.innerHTML
            .replace(/hotkeyControlSlashCommandPlaceholder/g, isMac ? 'Command' : 'Ctrl')
            .replace(/hotkeyAlternateSlashOptionPlaceholder/g, isMac ? 'Option' : 'Alt')
            .replace(/hotkeyListPlaceholder/g, isMac ? 'Shift, Control, Option, Command' : 'Shift, Control, Alt, Windows');
    });

    const params = new URLSearchParams(window.location.search);
    const prevVersion = params.get('version');
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    let currentVersion = '';
    if (chrome && chrome.runtime && chrome.runtime.getManifest) {
        currentVersion = chrome.runtime.getManifest().version;
    }

    if (prevVersion === 'undefined' || (currentVersion && currentVersion !== prevVersion) && prevVersion) {
        const isWelcome = !prevVersion || prevVersion === 'undefined';
        const msgDiv = document.createElement('div');
        msgDiv.id = 'welcomeMsg';
        msgDiv.style.fontWeight = 'bold';
        msgDiv.style.fontSize = '1.18em';
        msgDiv.style.padding = '18px 28px';
        msgDiv.style.borderRadius = '10px';
        msgDiv.style.margin = '0 auto 18px auto';
        msgDiv.style.textAlign = 'center';
        msgDiv.style.maxWidth = '700px';
        msgDiv.style.position = 'relative';
        msgDiv.style.userSelect = 'none';
        msgDiv.innerHTML = isWelcome
            ? `🎉 <b>Welcome to SpeedTube!</b><br>Thank you for installing SpeedTube <b>v${currentVersion}</b>.<br>Get started by reading the instructions below.`
            : `SpeedTube has been updated from <b>v${prevVersion}</b> to <b>v${currentVersion}</b>!<br>See what's new and enjoy the latest features.`;
        const container = document.getElementById('instructions-container');
        if (container && container.parentNode) {
            container.parentNode.insertBefore(msgDiv, container);
        }
        history.replaceState(null, '', `${location.origin}${location.pathname}`);
    }

    const okBtn = document.getElementById('okBtn');
    const homeBtn = document.getElementById('homeBtn');
    const shareBtn = document.getElementById('shareBtn');
    const themeBtn = document.getElementById('themeBtn');
    const themeBtnText = document.querySelector('#themeBtn svg text');

    const textMode = (currentElement) =>
        currentElement.tagName.toLowerCase() === "input" ||
        currentElement.tagName.toLowerCase() === "textarea" ||
        currentElement.isContentEditable;

    function toggleTheme(onLoad = false) {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get('darkMode', (result) => {
                const darkMode = typeof result.darkMode === 'boolean' ? (onLoad === true ? result.darkMode : !result.darkMode) : window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (darkMode) {
                    document.body.classList.add('dark-mode');
                    themeBtnText.textContent = '🔅';
                    themeBtn.querySelector('span.custom-tooltip').innerHTML = `Switch to <b>light mode</b> (<b>${isMac ? 'Option' : 'Alt'} + T</b>)`;
                } else {
                    document.body.classList.remove('dark-mode');
                    themeBtnText.textContent = '🌙';
                    themeBtn.querySelector('span.custom-tooltip').innerHTML = `Switch to <b>dark mode</b> (<b>${isMac ? 'Option' : 'Alt'} + T</b>)`;
                }
                chrome.storage.sync.set({ darkMode: darkMode });
            });
        }
    }

    toggleTheme(true);

    themeBtn.addEventListener('click', toggleTheme);
    document.addEventListener('keydown', (e) => {
        if (
            e.code === 'KeyT' &&
            !e.shiftKey && !e.ctrlKey && !e.metaKey && e.altKey &&
            !textMode(document.activeElement)
        ) toggleTheme();
    });

    function fadeOutShareMsg(element, duration = 1000, url = null) {
        let opacity = 1;
        element.style.opacity = '1';
        element.style.display = 'block';
        const start = performance.now();

        function step(now) {
            const elapsed = now - start;
            opacity = Math.max(1 - elapsed / duration, 0);
            element.style.opacity = opacity;
            if (opacity > 0) {
                requestAnimationFrame(step);
            } else {
                element.style.display = "none";
                element.style.opacity = "1";
                if (url) {
                    location.href = url;
                }
            }
        }
        requestAnimationFrame(step);
    }

    let shareMsg = document.createElement('div');
    shareMsg.id = 'shareCopyMsg';
    shareMsg.style.position = 'absolute';
    shareMsg.style.left = '50%';
    shareMsg.style.transform = 'translateX(-50%)';
    shareMsg.style.top = '-38px';
    shareMsg.style.background = '#fff';
    shareMsg.style.color = '#e53935';
    shareMsg.style.fontWeight = 'bold';
    shareMsg.style.fontSize = '1.08em';
    shareMsg.style.padding = '8px 24px';
    shareMsg.style.borderRadius = '10px';
    shareMsg.style.boxShadow = '0 2px 12px rgba(229,57,53,0.18)';
    shareMsg.style.display = 'none';
    shareMsg.style.zIndex = '10001';
    shareMsg.style.opacity = '1';

    if (shareBtn && shareBtn.parentNode) {
        shareBtn.parentNode.insertBefore(shareMsg, shareBtn);
    } else {
        document.body.appendChild(shareMsg);
    }

    if (okBtn && homeBtn && shareBtn && document.getElementById('logo')) {

        okBtn.addEventListener('click', () => {
            const tooltip = okBtn.querySelector('.custom-tooltip');
            if (tooltip) tooltip.style.display = 'none';
            okBtn.classList.remove('show-tooltip');
            window.location.href = 'index.html';
        });

        function toBase64Url(str) {
            const bytes = new TextEncoder().encode(str);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
            const b64 = btoa(binary);
            return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
        }

        function compressSettings(hotkeysArray) {
            const parts = hotkeysArray.map(item => {
                const enabled = item.enabled ? '1' : '0';
                const mode = item.mode === 'toggle' ? 't' : 'n';

                if (mode === 't') {
                    return [enabled, item.hotkey ?? '', mode, String(item.speed1 ?? ''), String(item.speed2 ?? '')].join('|');
                } else {
                    return [enabled, item.hotkey ?? '', mode, String(item.speed ?? '')].join('|');
                }
            });

            return toBase64Url(parts.join(';'));
        }


        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                chrome.storage.sync.get('hotkeys', (result) => {
                    const data = result.hotkeys || [];
                    const settingsParam = compressSettings(data);
                    const url = `${location.origin}${location.pathname.replace(/(index|instructions)\.html$/, 'share.html')}?version=${chrome.runtime.getManifest().version}&settings=${settingsParam}`;
                    shareMsg.textContent = "Link copied!";
                    shareMsg.style.display = "block";
                    shareMsg.style.opacity = "1";
                    fadeOutShareMsg(shareMsg, 1500, url);
                    navigator.clipboard.writeText(url);
                });
            });
        }

        homeBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });

        function adjustTooltipPosition(tooltip, parent) {
            tooltip.classList.remove('left');
            tooltip.style.left = '';
            tooltip.style.right = '';
            tooltip.style.marginLeft = '16px';
            tooltip.style.marginRight = '';
            const rect = tooltip.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();
            const rightEdge = parentRect.right + rect.width + 16;
            if (rightEdge > window.innerWidth) {
                tooltip.classList.add('left');
            }
        }
        [okBtn, homeBtn, shareBtn, document.getElementById('logo'), themeBtn].forEach(btn => {
            if (!btn) return;
            const tooltip = btn.querySelector('.custom-tooltip');
            btn.addEventListener('mouseenter', function() {
                if (tooltip) {
                    tooltip.style.display = 'block';
                    btn.classList.add('show-tooltip');
                    setTimeout(function() { adjustTooltipPosition(tooltip, btn); }, 0);
                }
            });
            btn.addEventListener('focus', function() {
                if (tooltip) {
                    tooltip.style.display = 'block';
                    btn.classList.add('show-tooltip');
                    setTimeout(function() { adjustTooltipPosition(tooltip, btn); }, 0);
                }
            });
            btn.addEventListener('mouseleave', function() {
                if (tooltip) {
                    tooltip.style.display = 'none';
                    btn.classList.remove('show-tooltip');
                }
            });
            btn.addEventListener('blur', function() {
                if (tooltip) {
                    tooltip.style.display = 'none';
                    btn.classList.remove('show-tooltip');
                }
            });
            btn.addEventListener('click', function() {
                if (tooltip) {
                    tooltip.style.display = 'none';
                }
                btn.classList.remove('show-tooltip');
            });
        });
    }
});
