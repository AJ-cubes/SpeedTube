document.addEventListener('DOMContentLoaded', () => {
    if (chrome && chrome.runtime && chrome.runtime.getManifest) {
        const versionSpan = document.getElementById('versionSpan');
        if (versionSpan) {
            versionSpan.textContent = 'v' + chrome.runtime.getManifest().version;
        }
    }

    const hotkeyList = document.getElementById('hotkeyList');
    const saveSharedBtn = document.getElementById('saveSharedBtn');
    const homeBtn = document.getElementById('homeBtn');
    const saveSharedBtnBottom = document.getElementById('saveSharedBtnBottom');
    const homeBtnBottom = document.getElementById('homeBtnBottom');
    const outputMsg = document.getElementById('outputMsg');
    const infoBtn = document.getElementById('infoBtn');
    const copyBtn = document.getElementById('copyBtn');
    const header = document.querySelector('.header');
    const themeBtn = document.getElementById('themeBtn');
    const themeBtnText = document.querySelector('#themeBtn svg text');
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    saveSharedBtn.querySelector('span.custom-tooltip').innerHTML = `Save these hotkeys to your settings (<b>${isMac ? 'Command' : 'Ctrl'} + S</b>)`;
    saveSharedBtnBottom.querySelector('span.custom-tooltip').innerHTML = `Save these hotkeys to your settings (<b>${isMac ? 'Command' : 'Ctrl'} + S</b>)`;

    let disabled = false;

    infoBtn.href += `?version=${chrome.runtime.getManifest().version}`;

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

    function hideEverything(homeBtnHide = false) {
        saveSharedBtn.style.display = 'none';
        saveSharedBtnBottom.style.display = 'none';
        copyBtn.style.display = 'none';
        if (homeBtnHide) {
            homeBtn.style.display = 'none';
            homeBtnBottom.style.display = 'none';
        }
        document.getElementById('hotkeyList').style.display = 'none';
        outputMsg.scrollIntoView()
        setTimeout(() => {
            window.location.href = "index.html";
        }, 3000)
    }

    function disableEverything() {
        const msgDiv = document.createElement('div');
        msgDiv.id = 'legacyUrlMsg';
        msgDiv.style.userSelect = 'none';
        msgDiv.style.display = 'flex';
        msgDiv.style.justifyContent = 'space-between';
        msgDiv.style.fontWeight = 'bold';
        msgDiv.style.position = 'relative';
        msgDiv.style.fontSize = '1.18em';
        msgDiv.style.maxWidth = '700px';
        msgDiv.style.padding = '18px 28px';
        msgDiv.style.borderRadius = '10px';
        msgDiv.style.margin = '0 auto 18px auto';
        msgDiv.style.textAlign = 'center';
        msgDiv.style.alignItems = 'center';
        msgDiv.innerHTML = `
            <div style="width: 100%; text-align: center;">
                <b>Deprecated Legacy URL Detected!</b><br>
                Please update, copy the new link and reshare it!
            </div>
            
            <span id="questionMark" style="position: absolute;top: 50%;right: 18px;transform: translateY(-50%);cursor: help;border-radius: 50%;outline: none;" tabindex="0">
                <svg viewBox="0 0 20 20" width="30" height="30" fill="none">
                  <circle cx="10" cy="10" r="10" fill="#e53935" style="transition: fill 0.2s, filter 0.2s;"></circle>
                  <text x="10" y="15" text-anchor="middle" font-size="13" fill="#fff" font-family="Arial" font-weight="bold">?</text>
                </svg>
            </span>
        `;


        const container = document.getElementById('hotkeyForm');
        if (container && container.parentNode) {
            container.parentNode.insertBefore(msgDiv, container);
        }

        copyBtn.querySelector('.custom-tooltip').innerHTML = 'Copy the <b>updated</b> link to the shared hotkey settings';

        if (msgDiv && copyBtn) {
            if (window.legacyLeaderLine) {
                window.legacyLeaderLine.remove();
                window.legacyLeaderLine = null;
            }
            function drawLeaderLine() {
                if (typeof LeaderLine !== 'undefined' && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                    chrome.storage.sync.get('darkMode', (result) => {
                        const color = result.darkMode === true ? '#ff6f60' : '#e53935';
                        window.legacyLeaderLine = new LeaderLine(
                            msgDiv,
                            copyBtn,
                            {
                                color: color,
                                startPlug: 'disc',
                                endPlug: 'arrow2',
                                size: 5,
                                dash: {
                                    gap: 7.5,
                                    size: 7.5,
                                    animation: {
                                        duration: 350
                                    }
                                },
                                dropShadow: {
                                    color: color,
                                    dx: 0,
                                    dy: 0,
                                    opacity: 0.6
                                },
                                hide: true
                            }
                        );
                        requestAnimationFrame(() => {
                            window.legacyLeaderLine.position();
                        });

                        const questionMark = document.getElementById('questionMark');
                        questionMark.addEventListener('mouseenter', () => {
                            window.legacyLeaderLine.show('draw', {
                                duration: 1000,
                                timing: 'ease-in-out'
                            });
                        });
                        questionMark.addEventListener('focus', () => {
                            window.legacyLeaderLine.show('draw', {
                                duration: 1000,
                                timing: 'ease-in-out'
                            });
                        });
                        questionMark.addEventListener('mouseleave', () => {
                            window.legacyLeaderLine.hide('draw', {
                                duration: 1000,
                                timing: 'ease-in-out'
                            });
                        });
                        questionMark.addEventListener('blur', () => {
                            window.legacyLeaderLine.hide('draw', {
                                duration: 1000,
                                timing: 'ease-in-out'
                            });
                        });
                    });
                } else {
                    setTimeout(drawLeaderLine, 0);
                }
            }
            drawLeaderLine();
        }

        disabled = true;
        [document.getElementById('hotkeyForm'), ...Array.from(document.querySelector('.header').children), homeBtn, saveSharedBtn, infoBtn, themeBtn].forEach((el) => {
            if (el.id) {
                el.classList.add('disabled');
                el.tabIndex = -1;
                el.querySelectorAll('button').forEach(button => {
                    button.tabIndex = -1;
                })
            }
        })

        header.classList.add('opaque');
    }

    function enableEverything() {
        disabled = false;
        document.getElementById('legacyUrlMsg')?.remove();
        if (window.legacyLeaderLine) {
            window.legacyLeaderLine.remove();
            window.legacyLeaderLine = null;
        }
        copyBtn.querySelector('.custom-tooltip').innerHTML = 'Copy the link to the shared hotkey settings';

        [document.getElementById('hotkeyForm'), ...Array.from(document.querySelector('.header').children), homeBtn, saveSharedBtn, infoBtn, themeBtn].forEach((el) => {
            if (el.id) {
                el.classList.remove('disabled');
            }
        })

        header.classList.remove('opaque');
    }

    function showWarning(msg) {
        outputMsg.textContent = msg;
    }

    function fromBase64Url(b64url) {
        let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new TextDecoder().decode(bytes);
    }

    function decompressSettings(encoded) {
        if (!encoded) return [];
        const raw = fromBase64Url(encoded);
        if (!raw) return [];
        const entries = raw.split(';').filter(Boolean);
        return entries.map(entry => {
            const fields = entry.split('|');
            const enabled = fields[0] === '1';
            const hotkey = fields[1] || '';
            const modeChar = fields[2] || 'n';
            const mode = modeChar === 't' ? 'toggle' : 'normal';

            if (mode === 'toggle') {
                const speed1 = parseFloat(fields[3]);
                const speed2 = parseFloat(fields[4]);
                return {
                    enabled,
                    hotkey,
                    mode,
                    speed1: Number.isFinite(speed1) ? speed1 : undefined,
                    speed2: Number.isFinite(speed2) ? speed2 : undefined
                };
            } else {
                const speed = parseFloat(fields[3]);
                return {
                    enabled,
                    hotkey,
                    mode,
                    speed: Number.isFinite(speed) ? speed : undefined
                };
            }
        });
    }

    function compareVersions(v1, v2) {
        const parts1 = v1.split('.').map(Number);
        const parts2 = v2.split('.').map(Number);
        const maxLen = Math.max(parts1.length, parts2.length);

        for (let i = 0; i < maxLen; i++) {
            const num1 = parts1[i] || 0;
            const num2 = parts2[i] || 0;
            if (num1 > num2) return 1;
            if (num1 < num2) return -1;
        }
        return 0;
    }

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

    function getSettingsFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const encoded = params.get('settings');
        if (!encoded) return null;

        const version = params.get('version') || '0';

        if (compareVersions(version, '2025.4.2.1') >= 0) {
            try {
                return decompressSettings(encoded);
            } catch (e) {
                return null;
            }
        }

        try {
            const decoded = decodeURIComponent(encoded);
            const json = atob(decoded);
            const settings = JSON.parse(json);

            const manifestVersion = chrome.runtime.getManifest().version;
            const newEncoded = compressSettings(settings);
            const newParams = new URLSearchParams();
            newParams.set('version', manifestVersion);
            newParams.set('settings', newEncoded);

            const newUrl = `${location.origin}${location.pathname}?${newParams.toString()}`;
            history.replaceState(null, '', newUrl);

            disableEverything();

            return settings;
        } catch (e2) {
            return null;
        }
    }

    function getHotkeyDisplayMap() {
        if (isMac) {
            return {
                'Ctrl': 'Ctrl (⌃)',
                'Alt': 'Option (⌥)',
                'Shift': 'Shift (⇧)',
                'Meta': 'Command (⌘)',
                'Enter': 'Return (↩)',
                'Escape': 'Esc (⎋)',
                'ArrowUp': 'Up (↑)',
                'ArrowDown': 'Down (↓)',
                'ArrowLeft': 'Left (←)',
                'ArrowRight': 'Right (→)'
            };
        } else {
            return {
                'Meta': 'Win (⊞)',
                'Enter': 'Enter (↵)',
                'Escape': 'Esc',
                'ArrowUp': 'Up (↑)',
                'ArrowDown': 'Down (↓)',
                'ArrowLeft': 'Left (←)',
                'ArrowRight': 'Right (→)'
            };
        }
    }

    function formatHotkeyDisplay(hotkey) {
        if (!hotkey) return '';
        const map = getHotkeyDisplayMap();
        return hotkey.split('+').map(part => map[part] || part).join(' + ');
    }

    function createCustomDropdown(options, value) {
        const container = document.createElement('div');
        container.className = 'custom-dropdown';

        const selected = document.createElement('div');
        selected.className = 'custom-dropdown-selected';
        selected.tabIndex = -1;
        selected.textContent = options.find(opt => opt.value === value)?.label || options[0].label;
        selected.style.pointerEvents = "none";
        container.appendChild(selected);

        return { container, setValue: (val) => {
            selected.textContent = options.find(opt => opt.value === val)?.label || options[0].label;
        }};
    }

    function renderSettings(settings) {
        hotkeyList.innerHTML = '';
        if (!Array.isArray(settings) || settings.length === 0) {
            showWarning('No hotkeys found in the shared settings.');
            hideEverything();
            return;
        }
        settings.forEach((data, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'hotkey-entry';
            wrapper.style = 'cursor: default;';
            wrapper.style.position = 'relative';
            wrapper.style.opacity = data.enabled === false ? '0.5' : '';

            const toggleContainer = document.createElement('div');
            toggleContainer.style.position = 'absolute';
            toggleContainer.style.top = '16px';
            toggleContainer.style.right = '16px';
            toggleContainer.style.zIndex = '2';
            toggleContainer.style.cursor = 'default';

            const enabledCheckbox = document.createElement('input');
            enabledCheckbox.type = 'checkbox';
            enabledCheckbox.className = 'hotkey-enabled';
            enabledCheckbox.checked = data.enabled !== false;
            enabledCheckbox.style.cursor = 'default';
            enabledCheckbox.style.display = 'none';

            const toggleLabel = document.createElement('label');
            toggleLabel.className = 'toggle-switch no-active';
            toggleLabel.style.cursor = 'default';
            toggleLabel.tabIndex = -1;

            const slider = document.createElement('span');
            slider.className = 'slider';
            slider.style.pointerEvents = 'none';
            slider.style.cursor = 'default';

            toggleLabel.appendChild(slider);
            toggleContainer.appendChild(enabledCheckbox);
            toggleContainer.appendChild(toggleLabel);

            const hotkeyLabel = document.createElement('label');
            hotkeyLabel.textContent = 'Hotkey: ';
            const hotkeyInput = document.createElement('input');
            hotkeyInput.type = 'text';
            hotkeyInput.className = 'hotkey-input';
            hotkeyInput.value = formatHotkeyDisplay(data.hotkey || '');
            hotkeyInput.readOnly = true;
            hotkeyInput.disabled = true;
            hotkeyInput.required = true;
            hotkeyInput.tabIndex = -1;

            const modeLabel = document.createElement('label');
            modeLabel.textContent = ' Mode: ';

            let modeValue = data.mode || 'normal';

            const modeDropdownObj = createCustomDropdown([
                { value: 'normal', label: 'Normal' },
                { value: 'toggle', label: 'Toggle' }
            ], modeValue);
            const modeDropdown = modeDropdownObj.container;

            const dropdownWrapper = document.createElement('span');
            dropdownWrapper.className = 'custom-dropdown-wrapper';
            dropdownWrapper.appendChild(modeDropdown);

            const br = document.createElement('br');

            const speedWrapper = document.createElement('span');
            speedWrapper.className = 'speed-wrapper';

            function updateSpeedInputs() {
                speedWrapper.innerHTML = '';
                if (modeValue === 'toggle') {
                    const speedLabel1 = document.createElement('label');
                    speedLabel1.textContent = ' Speed 1: ';
                    const speedInput1 = document.createElement('input');
                    speedInput1.type = 'number';
                    speedInput1.step = 'any';
                    speedInput1.min = '0.1';
                    speedInput1.name = `speed1_${index}`;
                    speedInput1.value = (typeof data.speed1 !== "undefined")
                        ? data.speed1
                        : (Array.isArray(data.speeds) && data.speeds.length > 0 ? data.speeds[0] : '');
                    speedInput1.required = true;
                    speedInput1.placeholder = 'Max: 16x';
                    speedInput1.readOnly = true;
                    speedInput1.disabled = true;
                    speedInput1.tabIndex = -1;

                    const speedLabel2 = document.createElement('label');
                    speedLabel2.textContent = ' Speed 2: ';
                    const speedInput2 = document.createElement('input');
                    speedInput2.type = 'number';
                    speedInput2.step = 'any';
                    speedInput2.min = '0.1';
                    speedInput2.name = `speed2_${index}`;
                    speedInput2.value = (typeof data.speed2 !== "undefined")
                        ? data.speed2
                        : (Array.isArray(data.speeds) && data.speeds.length > 1 ? data.speeds[1] : '');
                    speedInput2.required = true;
                    speedInput2.placeholder = 'Max: 16x';
                    speedInput2.readOnly = true;
                    speedInput2.disabled = true;
                    speedInput2.tabIndex = -1;

                    speedWrapper.append(speedLabel1, speedInput1, speedLabel2, speedInput2);
                } else {
                    const speedLabel = document.createElement('label');
                    speedLabel.textContent = ' Speed: ';
                    const speedInput = document.createElement('input');
                    speedInput.type = 'number';
                    speedInput.step = 'any';
                    speedInput.min = '0.1';
                    speedInput.name = `speed_${index}`;
                    speedInput.value = typeof data.speed !== "undefined"
                        ? data.speed
                        : (Array.isArray(data.speeds) && data.speeds.length > 0 ? data.speeds[0] : '');
                    speedInput.required = true;
                    speedInput.placeholder = 'Max: 16x';
                    speedInput.readOnly = true;
                    speedInput.disabled = true;
                    speedInput.tabIndex = -1;

                    speedWrapper.append(speedLabel, speedInput);
                }
            }

            updateSpeedInputs();

            wrapper.append(
                toggleContainer,
                hotkeyLabel, hotkeyInput,
                modeLabel, dropdownWrapper, br, speedWrapper
            );
            hotkeyList.appendChild(wrapper);
        });
    }

    const settings = getSettingsFromUrl();
    if (!settings || !Array.isArray(settings)) {
        showWarning('Invalid or missing shared settings.');
        hideEverything();
        return;
    } else {
        showWarning('This is a read-only preview. Click 💾 to save these hotkeys to your settings.');
        renderSettings(settings);
    }

    function saveAndRedirect() {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.set({ hotkeys: settings }, () => {
                showWarning('Settings saved! Redirecting...');
                hideEverything(true);
                setTimeout(() => {
                    window.location.href = "index.html";
                }, 1000)
            });
        } else {
            showWarning('Failed to save settings. Please check your browser settings.');
            infoBtn.scrollIntoView();
        }
    }

    function goHome() {
        window.location.href = "index.html";
    }

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

    if (saveSharedBtn) saveSharedBtn.addEventListener('click', saveAndRedirect);
    if (saveSharedBtnBottom) saveSharedBtnBottom.addEventListener('click', saveAndRedirect);
    if (homeBtn) homeBtn.addEventListener('click', goHome);
    if (homeBtnBottom) homeBtnBottom.addEventListener('click', goHome);
    document.addEventListener('keydown', (e) => {
        if (
            e.code === 'KeyS' &&
            !e.shiftKey && ctrlKey(e) && !e.altKey &&
            !textMode(document.activeElement)
        ) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            saveAndRedirect();
        }
    })

    function ctrlKey(e) {
        return isMac ? (!e.ctrlKey && e.metaKey && !textMode(document.activeElement)): (e.ctrlKey && !e.metaKey && !textMode(document.activeElement));
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

    if (copyBtn && copyBtn.parentNode) {
        copyBtn.parentNode.insertBefore(shareMsg, copyBtn);
    } else {
        document.body.appendChild(shareMsg);
    }

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            if (disabled) {
                enableEverything();
            }

            shareMsg.textContent = "Link copied!";
            shareMsg.style.display = "block";
            shareMsg.style.opacity = "1";
            fadeOutShareMsg(shareMsg, 1500);
            navigator.clipboard.writeText(window.location.href);
        });
    }

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
    [saveSharedBtn, homeBtn, saveSharedBtnBottom, homeBtnBottom, infoBtn, copyBtn, document.getElementById('logo'), themeBtn].forEach(btn => {
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
});
