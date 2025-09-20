document.addEventListener('DOMContentLoaded', () => {
    if (chrome && chrome.runtime && chrome.runtime.getManifest) {
        const versionSpan = document.getElementById('versionSpan');
        if (versionSpan) {
            versionSpan.textContent = 'v' + chrome.runtime.getManifest().version;
        }
    }

    const hotkeyList = document.getElementById('hotkeyList');
    const addHotkeyBtn = document.getElementById('addHotkeyBtn');
    const logo = document.getElementById('logo')
    const outputMsg = document.getElementById('outputMsg');
    const infoBtn = document.getElementById('infoBtn');
    const themeBtn = document.getElementById('themeBtn');
    const themeBtnText = document.querySelector('#themeBtn svg text');
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const blockedHotkeys = [
        isMac ? 'Meta+KeyA' : 'Ctrl+KeyA',
        isMac ? 'Meta+KeyS' : 'Ctrl+KeyS',
        'Alt+KeyS',
        'Shift+KeyN',
        'Shift+KeyP',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'KeyL', 'KeyJ', 'KeyC',
        'Key.', 'Key,',
        ...Array.from({ length: 10 }, (_, i) => `Key${i}`)
    ];
    const validModifiers = ['Ctrl', 'Alt', 'Shift', 'Meta'];

    let ignoreNextStorageChange = false;

    infoBtn.href += `${chrome.runtime.getManifest().version}`;

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

    function normalizeHotkey(hotkey) {
        return hotkey
            .split('+')
            .map(part => part.trim())
            .map(part => {
                if (validModifiers.includes(part)) return part;
                if (/^.$/.test(part)) return `Key${part.toUpperCase()}`;
                return part;
            })
            .join('+');
    }

    function isHotkeyValid(hotkey) {
        const normalized = normalizeHotkey(hotkey);
        if (blockedHotkeys.includes(normalized)) return false;

        const parts = normalized.split('+');
        if (parts.length < 1) return false;

        const nonModifiers = parts.filter(part => !validModifiers.includes(part));
        if (nonModifiers.length !== 1) return false;

        const key = nonModifiers[0];
        const isSingleCharCode = /^Key.$/.test(key);
        const isNamedCode = /^(Arrow(Up|Down|Left|Right)|F[1-9][0-2]?|Space|Enter|Escape|Period|Comma|Home|End|Digit[0-9])$/.test(key);

        return isSingleCharCode || isNamedCode;
    }

    function isHotkeyDuplicate(hotkey, idx) {
        for (let i = 0; i < hotkeyList.children.length; i++) {
            if (i === idx) continue;
            const input = hotkeyList.children[i].querySelector('input.hotkey-input');
            let inputValue = input.value;
            const reverseMap = getReverseHotkeyDisplayMap();
            inputValue = inputValue.split(' + ').map(part => reverseMap[part] || part).join('+');
            if (input && inputValue === hotkey) return true;
        }
        return false;
    }

    function autoSave() {
        const entries = [];
        let valid = true;
        const hotkeyEntries = Array.from(hotkeyList.querySelectorAll('.hotkey-entry'));
        hotkeyEntries.forEach((entry) => {
            const hotkeyInput = entry.querySelector('input.hotkey-input');
            if (!hotkeyInput) return;
            let hotkey = hotkeyInput.value;
            const reverseMap = getReverseHotkeyDisplayMap();
            hotkey = hotkey.split(' + ').map(part => reverseMap[part] || part).join('+');
            const modeElem = entry.querySelector(`.custom-dropdown-selected`);
            if (!modeElem) return;
            const mode = modeElem.textContent.toLowerCase();
            const enabledCheckbox = entry.querySelector('input[type="checkbox"].hotkey-enabled');
            let speed, speed1, speed2;
            if (!isHotkeyValid(hotkey)) {
                valid = false;
                return;
            }
            if (entries.some(e => e.hotkey === hotkey)) {
                valid = false;
                return;
            }
            const enabled = enabledCheckbox ? enabledCheckbox.checked : true;
            if (mode === 'toggle') {
                const speedInput1 = entry.querySelector('input[name^="speed1_"]');
                const speedInput2 = entry.querySelector('input[name^="speed2_"]');
                if (!speedInput1 || !speedInput2) return;
                speed1 = parseFloat(speedInput1.value);
                speed2 = parseFloat(speedInput2.value);
                if (isNaN(speed1) || speed1 === 0 || speed1 < 0.0625 || speed1 > 16 ||
                    isNaN(speed2) || speed2 === 0 || speed2 < 0.0625 || speed2 > 16) {
                    valid = false;
                    return;
                }
                entries.push({ hotkey, mode, speed1, speed2, enabled });
            } else {
                const speedInput = entry.querySelector('input[name^="speed_"]');
                if (!speedInput) return;
                speed = parseFloat(speedInput.value);
                if (isNaN(speed) || speed === 0 || speed < 0.0625 || speed > 16) {
                    valid = false;
                    return;
                }
                entries.push({ hotkey, mode, speed, enabled });
            }
        });
        ignoreNextStorageChange = true;
        chrome.storage.sync.set({ hotkeys: entries });
    }

    function enforceFourDecimals(input) {
        let val = input.value;
        if (val.includes('.')) {
            const [intPart, decPart] = val.split('.');
            if (decPart.length > 4) {
                input.value = intPart + '.' + decPart.slice(0, 4);
            }
        }
    }

    function enforceSpeedLimits(input) {
        let val = parseFloat(input.value);
        if (isNaN(val)) return;
        if (val < 0.0625) {
            input.value = 0.0625;
        } else if (val > 16) {
            input.value = 16;
        }
    }

    function createCustomDropdown(options, value, onChange) {
        const container = document.createElement('div');
        container.className = 'custom-dropdown';

        const selected = document.createElement('div');
        selected.className = 'custom-dropdown-selected';
        selected.tabIndex = 0;
        selected.textContent = options.find(opt => opt.value === value)?.label || options[0].label;

        const optionsList = document.createElement('div');
        optionsList.className = 'custom-dropdown-options';

        options.forEach(opt => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-dropdown-option' + (opt.value === value ? ' selected' : '');

            const labelSpan = document.createElement('span');
            labelSpan.textContent = opt.label;

            const help = document.createElement('span');
            help.className = 'dropdown-help';
            help.tabIndex = 0;
            help.innerHTML = `
                <svg viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="#e53935"/>
                    <text x="10" y="15" text-anchor="middle" font-size="13" fill="#fff" font-family="Arial" font-weight="bold">?</text>
                </svg>
            `;

            const tooltip = document.createElement('span');
            tooltip.className = 'dropdown-tooltip';
            tooltip.textContent = opt.value === 'normal'
                ? 'Normal: Pressing the hotkey always sets the video speed to your chosen value.'
                : 'Toggle: Pressing the hotkey switches the video speed between your two chosen values.';

            help.addEventListener('mouseenter', () => {
                tooltip.style.display = 'block';
                help.classList.add('show-tooltip');
                const parentDropdownWrapper = help.closest('.custom-dropdown-wrapper');
                if (parentDropdownWrapper) {
                    const modeTooltip = parentDropdownWrapper.querySelector('.custom-tooltip');
                    if (modeTooltip && modeTooltip.style.display === 'block') {
                        modeTooltip.style.display = 'none';
                        parentDropdownWrapper.classList.remove('show-tooltip');
                    }
                }
                const rect = container.getBoundingClientRect();
                const optionRect = optionDiv.getBoundingClientRect();
                tooltip.style.position = 'fixed';
                tooltip.style.left = `${rect.right + 12}px`;
                tooltip.style.top = `${optionRect.top}px`;
                document.body.appendChild(tooltip);
            });
            help.addEventListener('focus', () => {
                tooltip.style.display = 'block';
                help.classList.add('show-tooltip');
                const parentDropdownWrapper = help.closest('.custom-dropdown-wrapper');
                if (parentDropdownWrapper) {
                    const modeTooltip = parentDropdownWrapper.querySelector('.custom-tooltip');
                    if (modeTooltip && modeTooltip.style.display === 'block') {
                        modeTooltip.style.display = 'none';
                        parentDropdownWrapper.classList.remove('show-tooltip');
                    }
                }
                const rect = container.getBoundingClientRect();
                tooltip.style.position = 'fixed';
                tooltip.style.left = `${rect.right + 12}px`;
                tooltip.style.top = `${rect.top + optionDiv.offsetTop}px`;
                document.body.appendChild(tooltip);
            });
            help.addEventListener('mouseleave', () => {
                tooltip.style.display = 'none';
                help.classList.remove('show-tooltip');
                if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
            });
            help.addEventListener('blur', () => {
                tooltip.style.display = 'none';
                help.classList.remove('show-tooltip');
                if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
            });
            help.addEventListener('click', () => {
                tooltip.style.display = 'none';
                help.classList.remove('show-tooltip');
                if (tooltip.parentNode) tooltip.parentNode.removeChild(tooltip);
            });

            optionDiv.append(labelSpan, help);

            optionDiv.addEventListener('mouseenter', () => {
                Array.from(optionsList.children).forEach(child => child.classList.remove('selected'));
                optionDiv.classList.add('selected');
            });
            optionDiv.addEventListener('mouseleave', () => {
                optionDiv.classList.remove('selected');
            });

            optionDiv.addEventListener('click', () => {
                selected.textContent = opt.label;
                container.classList.remove('open');
                onChange(opt.value);
            });

            optionsList.appendChild(optionDiv);
        });

        selected.addEventListener('click', () => {
            container.classList.toggle('open');
            if (container.classList.contains('open')) {
                Array.from(optionsList.children).forEach(child => child.classList.remove('selected'));
            }
        });
        selected.addEventListener('blur', () => {
            setTimeout(() => container.classList.remove('open'), 150);
        });

        container.appendChild(selected);
        container.appendChild(optionsList);

        return { container, setValue: (val) => {
            selected.textContent = options.find(opt => opt.value === val)?.label || options[0].label;
        }};
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

    let dragSrcEl = null;

    function handleDragStart(e) {
        dragSrcEl = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', '');
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!this.classList.contains('drag-over')) {
            this.classList.add('drag-over');
        }
    }

    function handleDragEnter(e) {
        e.preventDefault();
        this.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        this.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.stopPropagation();
        if (dragSrcEl !== this) {
            const hotkeyList = this.parentNode;
            const entries = Array.from(hotkeyList.children);
            const srcIndex = entries.indexOf(dragSrcEl);
            const destIndex = entries.indexOf(this);

            if (srcIndex > -1 && destIndex > -1) {
                if (srcIndex < destIndex) {
                    hotkeyList.insertBefore(dragSrcEl, this.nextSibling);
                } else {
                    hotkeyList.insertBefore(dragSrcEl, this);
                }
                autoSave();
            }
        }
        this.classList.remove('drag-over');
        return false;
    }

    function handleDragEnd() {
        this.classList.remove('dragging');
        Array.from(document.querySelectorAll('.hotkey-entry.drag-over')).forEach(el => el.classList.remove('drag-over'));
    }

    function makeDraggable(entry) {
        entry.setAttribute('draggable', 'true');
        entry.addEventListener('dragstart', handleDragStart);
        entry.addEventListener('dragover', handleDragOver);
        entry.addEventListener('dragenter', handleDragEnter);
        entry.addEventListener('dragleave', handleDragLeave);
        entry.addEventListener('dragend', handleDragEnd);
        entry.addEventListener('drop', handleDrop);
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

    function getReverseHotkeyDisplayMap() {
        const originalMap = getHotkeyDisplayMap();
        const reversedMap = {};

        for (const [key, value] of Object.entries(originalMap)) {
            reversedMap[value] = key;
        }

        return reversedMap;
    }

    function formatHotkeyDisplay(hotkey) {
        if (!hotkey) return '';
        const map = getHotkeyDisplayMap();
        return hotkey.split('+').map(part => map[part] || part).join(' + ');
    }

    function createHotkeyEntry(index, data = {}) {
        const wrapper = document.createElement('div');
        wrapper.className = 'hotkey-entry';
        wrapper.style.position = 'relative';

        makeDraggable(wrapper);

        const toggleContainer = document.createElement('div');
        toggleContainer.style.position = 'absolute';
        toggleContainer.style.top = '16px';
        toggleContainer.style.right = '16px';
        toggleContainer.style.zIndex = '2';

        const toggleTooltip = document.createElement('span');
        toggleTooltip.className = 'custom-tooltip';
        toggleTooltip.textContent = 'Enable or disable this hotkey';

        const enabledCheckbox = document.createElement('input');
        enabledCheckbox.type = 'checkbox';
        enabledCheckbox.className = 'hotkey-enabled';
        enabledCheckbox.checked = data.enabled !== false;
        enabledCheckbox.id = `hotkey-enabled-${index}`;
        enabledCheckbox.style.display = 'none';
        enabledCheckbox.tabIndex = 0;

        const toggleLabel = document.createElement('label');
        toggleLabel.setAttribute('for', enabledCheckbox.id);
        toggleLabel.className = 'toggle-switch has-tooltip';

        const slider = document.createElement('span');
        slider.className = 'slider';
        slider.tabIndex = 0;

        toggleLabel.appendChild(slider);
        toggleLabel.appendChild(toggleTooltip);
        toggleContainer.appendChild(enabledCheckbox);
        toggleContainer.appendChild(toggleLabel);

        toggleLabel.addEventListener('mouseenter', () => {
            toggleTooltip.style.display = 'block';
            toggleLabel.classList.add('show-tooltip');
            setTimeout(() => adjustTooltipPosition(toggleTooltip, toggleLabel), 0);
        });
        toggleLabel.addEventListener('focus', () => {
            toggleTooltip.style.display = 'block';
            toggleLabel.classList.add('show-tooltip');
            setTimeout(() => adjustTooltipPosition(toggleTooltip, toggleLabel), 0);
        });
        toggleLabel.addEventListener('mouseleave', () => {
            toggleTooltip.style.display = 'none';
            toggleLabel.classList.remove('show-tooltip');
        });
        toggleLabel.addEventListener('blur', () => {
            toggleTooltip.style.display = 'none';
            toggleLabel.classList.remove('show-tooltip');
        });
        toggleLabel.addEventListener('click', () => {
            toggleTooltip.style.display = 'none';
            toggleLabel.classList.remove('show-tooltip');
        });

        enabledCheckbox.addEventListener('focus', () => {
            toggleTooltip.style.display = 'block';
            toggleLabel.classList.add('show-tooltip');
            setTimeout(() => adjustTooltipPosition(toggleTooltip, toggleLabel), 0);
        });
        enabledCheckbox.addEventListener('blur', () => {
            toggleTooltip.style.display = 'none';
            toggleLabel.classList.remove('show-tooltip');
        });
        enabledCheckbox.addEventListener('click', () => {
            toggleTooltip.style.display = 'none';
            toggleLabel.classList.remove('show-tooltip');
        });

        enabledCheckbox.addEventListener('change', () => {
            if (enabledCheckbox.checked) {
                wrapper.style.opacity = '';
            } else {
                wrapper.style.opacity = '0.5';
            }
            autoSave();
        });

        enabledCheckbox.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                enabledCheckbox.checked = !enabledCheckbox.checked;
                enabledCheckbox.dispatchEvent(new Event('change'));
            }
        });
        toggleLabel.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                enabledCheckbox.checked = !enabledCheckbox.checked;
                enabledCheckbox.dispatchEvent(new Event('change'));
                e.preventDefault();
            }
        });

        if (!enabledCheckbox.checked) {
            wrapper.style.opacity = '0.5';
        }

        const hotkeyLabel = document.createElement('label');
        hotkeyLabel.textContent = 'Hotkey: ';
        const hotkeyInput = document.createElement('input');
        hotkeyInput.type = 'text';
        hotkeyInput.name = `hotkey_${index}`;
        hotkeyInput.className = 'hotkey-input';
        hotkeyInput.value = formatHotkeyDisplay(data.hotkey || '');
        hotkeyInput.readOnly = true;
        hotkeyInput.required = true;
        hotkeyInput.placeholder = 'Press hotkey...';
        hotkeyInput.tabIndex = 0;

        let rawHotkeyValue = data.hotkey || '';

        function updateHotkeyDisplay() {
            hotkeyInput.value = formatHotkeyDisplay(rawHotkeyValue);
        }

        hotkeyInput.addEventListener('focus', () => {
            rawHotkeyValue = '';
            hotkeyInput.value = '';
            hotkeyInput.dataset.capturing = 'true';
        });
        hotkeyInput.addEventListener('blur', () => {
            hotkeyInput.dataset.capturing = 'false';
            updateHotkeyDisplay();
        });
        hotkeyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                hotkeyInput.dataset.capturing = 'false';
                return;
            }
            e.preventDefault();
            if (!hotkeyInput.dataset.capturing) return;
            let mods = [];
            if (e.ctrlKey) mods.push('Ctrl');
            if (e.altKey) mods.push('Alt');
            if (e.shiftKey) mods.push('Shift');
            if (e.metaKey) mods.push('Meta');
            let key = e.key;
            if (key === ' ') key = 'Space';
            else if (key === 'Esc') key = 'Escape';
            else if (/^Arrow/.test(key) || /^F\d{1,2}$/.test(key) || ['Enter', 'Escape', 'Space', 'Tab'].includes(key)) {
            } else if (key.length === 1) {
            } else {
                rawHotkeyValue = '';
                hotkeyInput.value = 'Invalid key';
                return;
            }
            const hotkeyStr = mods.concat([key]).join('+');
            if (!isHotkeyValid(hotkeyStr)) {
                rawHotkeyValue = '';
                hotkeyInput.value = 'Invalid format';
                return;
            }
            if (isHotkeyDuplicate(hotkeyStr, index)) {
                rawHotkeyValue = '';
                hotkeyInput.value = 'Duplicate hotkey';
                return;
            }
            rawHotkeyValue = hotkeyStr;
            updateHotkeyDisplay();
            autoSave();
        });

        const modeLabel = document.createElement('label');
        modeLabel.textContent = ' Mode: ';

        let modeValue = data.mode || 'normal';
        let lastNormalSpeed = data.speed || '';
        let lastToggleSpeed1 = typeof data.speed1 !== "undefined" ? data.speed1 : '';

        const modeDropdownObj = createCustomDropdown([
            { value: 'normal', label: 'Normal' },
            { value: 'toggle', label: 'Toggle' }
        ], modeValue, (newValue) => {
            if (modeValue === 'normal') {
                const speedInput = wrapper.querySelector('input[name^="speed_"]');
                if (speedInput) lastNormalSpeed = speedInput.value;
            }
            if (modeValue === 'toggle') {
                const speedInput1 = wrapper.querySelector('input[name^="speed1_"]');
                if (speedInput1) lastToggleSpeed1 = speedInput1.value;
            }
            modeValue = newValue;
            updateSpeedInputs();
            autoSave();
        });
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
                    : (lastNormalSpeed || '');
                speedInput1.required = true;
                speedInput1.placeholder = 'Max: 16x';
                speedInput1.addEventListener('input', (e) => {
                    enforceFourDecimals(speedInput1);
                    autoSave();
                });
                speedInput1.addEventListener('blur', (e) => {
                    enforceSpeedLimits(speedInput1);
                    autoSave();
                });

                const speedLabel2 = document.createElement('label');
                speedLabel2.textContent = ' Speed 2: ';
                const speedInput2 = document.createElement('input');
                speedInput2.type = 'number';
                speedInput2.step = 'any';
                speedInput2.min = '0.1';
                speedInput2.name = `speed2_${index}`;
                speedInput2.value = typeof data.speed2 !== "undefined" ? data.speed2 : '';
                speedInput2.required = true;
                speedInput2.placeholder = 'Max: 16x';
                speedInput2.addEventListener('input', (e) => {
                    enforceFourDecimals(speedInput2);
                    autoSave();
                });
                speedInput2.addEventListener('blur', (e) => {
                    enforceSpeedLimits(speedInput2);
                    autoSave();
                });

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
                    : (lastToggleSpeed1 || '');
                speedInput.required = true;
                speedInput.placeholder = 'Max: 16x';
                speedInput.addEventListener('input', (e) => {
                    enforceFourDecimals(speedInput);
                    autoSave();
                });
                speedInput.addEventListener('blur', (e) => {
                    enforceSpeedLimits(speedInput);
                    autoSave();
                });

                speedWrapper.append(speedLabel, speedInput);
            }
        }

        modeDropdown.addEventListener('change', () => {
            updateSpeedInputs();
            autoSave();
        });
        updateSpeedInputs();

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = 'Remove';
        removeBtn.classList.add('has-tooltip');
        const removeTooltip = document.createElement('span');
        removeTooltip.className = 'custom-tooltip';
        removeTooltip.textContent = 'Double-click to remove this hotkey';
        removeBtn.appendChild(removeTooltip);

        removeBtn.addEventListener('mouseenter', () => {
            removeTooltip.style.display = 'block';
            removeBtn.classList.add('show-tooltip');
            setTimeout(() => adjustTooltipPosition(removeTooltip, removeBtn), 0);
        });
        removeBtn.addEventListener('focus', () => {
            removeTooltip.style.display = 'block';
            removeBtn.classList.add('show-tooltip');
            setTimeout(() => adjustTooltipPosition(removeTooltip, removeBtn), 0);
        });
        removeBtn.addEventListener('mouseleave', () => {
            removeTooltip.style.display = 'none';
            removeBtn.classList.remove('show-tooltip');
        });
        removeBtn.addEventListener('blur', () => {
            removeTooltip.style.display = 'none';
            removeBtn.classList.remove('show-tooltip');
        });
        removeBtn.addEventListener('click', () => {
            removeTooltip.style.display = 'none';
            removeBtn.classList.remove('show-tooltip');
        });

        let removeClickTimeout = null;
        let lastEnterTime = 0;

        removeBtn.onclick = (event) => {
            if (removeClickTimeout) return;
            removeClickTimeout = setTimeout(() => {
                let warn = document.createElement('div');
                warn.className = 'floating-warning';
                warn.textContent = 'Double-click "Remove" to delete this hotkey.';
                const rect = removeBtn.getBoundingClientRect();
                warn.style.position = 'fixed';
                warn.style.left = `${rect.right + 12}px`;
                warn.style.top = `${rect.top}px`;
                document.body.appendChild(warn);

                setTimeout(() => {
                    warn.style.opacity = '0';
                    warn.style.transform = 'translateX(20px)';
                }, 1200);
                setTimeout(() => {
                    if (warn.parentNode) warn.parentNode.removeChild(warn);
                }, 1800);

                removeClickTimeout = null;
            }, 250);
        };

        removeBtn.ondblclick = () => {
            if (removeClickTimeout) {
                clearTimeout(removeClickTimeout);
                removeClickTimeout = null;
            }
            wrapper.remove();
            outputMsg.textContent = '';
            autoSave();
        };

        removeBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const now = Date.now();
                if (now - lastEnterTime < 400) {
                    if (removeClickTimeout) {
                        clearTimeout(removeClickTimeout);
                        removeClickTimeout = null;
                    }
                    wrapper.remove();
                    outputMsg.textContent = '';
                    autoSave();
                }
                lastEnterTime = now;
            }
        });

        dropdownWrapper.classList.add('has-tooltip');
        const modeTooltip = document.createElement('span');
        modeTooltip.className = 'custom-tooltip';
        modeTooltip.textContent = 'Choose between Normal (single speed) or Toggle (switch between two speeds)';
        dropdownWrapper.appendChild(modeTooltip);

        dropdownWrapper.addEventListener('mouseenter', () => {
            modeTooltip.style.display = 'block';
            dropdownWrapper.classList.add('show-tooltip');
            setTimeout(() => adjustTooltipPosition(modeTooltip, dropdownWrapper), 0);
        });
        dropdownWrapper.addEventListener('focus', () => {
            modeTooltip.style.display = 'block';
            dropdownWrapper.classList.add('show-tooltip');
            setTimeout(() => adjustTooltipPosition(modeTooltip, dropdownWrapper), 0);
        });
        dropdownWrapper.addEventListener('mouseleave', () => {
            modeTooltip.style.display = 'none';
            dropdownWrapper.classList.remove('show-tooltip');
        });
        dropdownWrapper.addEventListener('blur', () => {
            modeTooltip.style.display = 'none';
            dropdownWrapper.classList.remove('show-tooltip');
        });
        dropdownWrapper.addEventListener('click', () => {
            modeTooltip.style.display = 'none';
            dropdownWrapper.classList.remove('show-tooltip');
        });

        wrapper.append(
            toggleContainer,
            hotkeyLabel, hotkeyInput,
            modeLabel, dropdownWrapper, br, speedWrapper, removeBtn
        );
        hotkeyList.appendChild(wrapper);
    }

    addHotkeyBtn.addEventListener('click', () => {
        createHotkeyEntry(hotkeyList.children.length);
        autoSave();
    });

    document.body.addEventListener('click', function (e) {
        let el = e.target;
        while (el && el !== document.body) {
            if (el.classList && el.classList.contains('has-tooltip')) {
                el.classList.remove('show-tooltip');
                const tooltip = el.querySelector('.custom-tooltip');
                if (tooltip) tooltip.style.display = 'none';
            }
            el = el.parentElement;
        }
    }, true);

    function refreshDraggables() {
        Array.from(document.querySelectorAll('.hotkey-entry')).forEach(makeDraggable);
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.get('hotkeys', (result) => {
            if (result.hotkeys && Array.isArray(result.hotkeys)) {
                result.hotkeys.forEach((data, idx) => createHotkeyEntry(idx, data));
                refreshDraggables();
            }
        });
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'sync' && changes.hotkeys) {
                if (ignoreNextStorageChange) {
                    ignoreNextStorageChange = false;
                    return;
                }
                hotkeyList.innerHTML = "";
                const data = changes.hotkeys.newValue || [];
                data.forEach((d, idx) => createHotkeyEntry(idx, d));
                refreshDraggables();
            }
        });
    }

    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFileInput = document.getElementById('importFileInput');
    const shareBtn = document.getElementById('shareBtn');

    [infoBtn, addHotkeyBtn, logo, shareBtn, exportBtn, importBtn, themeBtn].forEach(btn => {
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

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            chrome.storage.sync.get('hotkeys', (result) => {
                const data = result.hotkeys || [];
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = "SpeedTube-Hotkeys.sths";
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
            });
        });
    }

    if (importBtn && importFileInput) {
        importBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showDragDropOverlay();
        });

        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (!Array.isArray(data)) throw new Error("Invalid format");
                    for (const entry of data) {
                        if (typeof entry.hotkey !== "string" || typeof entry.mode !== "string") {
                            throw new Error("Invalid entry in file");
                        }
                    }
                    chrome.storage.sync.set({ hotkeys: data }, () => {
                        hotkeyList.innerHTML = "";
                        data.forEach((d, idx) => createHotkeyEntry(idx, d));
                        hideDragDropOverlay();
                    });
                } catch (err) {
                }
            };
            reader.readAsText(file);
        });
    }

    let dragDropOverlay = null;
    function showDragDropOverlay() {
        if (dragDropOverlay) return;
        dragDropOverlay = document.createElement('div');
        dragDropOverlay.id = 'dragDropOverlay';
        dragDropOverlay.style.position = 'fixed';
        dragDropOverlay.style.top = '0';
        dragDropOverlay.style.left = '0';
        dragDropOverlay.style.width = '100vw';
        dragDropOverlay.style.height = '100vh';
        dragDropOverlay.style.background = 'rgba(255,255,255,0.75)';
        dragDropOverlay.style.zIndex = '999999';
        dragDropOverlay.style.display = 'flex';
        dragDropOverlay.style.alignItems = 'center';
        dragDropOverlay.style.justifyContent = 'center';
        dragDropOverlay.style.cursor = 'default';

        dragDropOverlay.innerHTML = `
            <div id="dragDropModal" style="position:relative;min-width:340px;max-width:95vw;min-height:180px;background:rgba(255,255,255,0.97);border-radius:18px;box-shadow:0 4px 32px rgba(229,57,53,0.18);display:flex;flex-direction:column;align-items:center;justify-content:center;">
                <button id="dragDropCloseBtn" style="position:absolute;top:10px;right:10px;background:#e53935;color:#fff;border:none;border-radius:50%;width:32px;height:32px;font-size:1.3em;cursor:pointer;z-index:1001;" title="Close">&times;</button>
                <div id="dragDropBox" style="border:2.5px dashed #e53935;padding:48px 64px;border-radius:18px;background:#fff8f8;color:#b71c1c;font-size:1.3em;font-weight:bold;text-align:center;box-shadow:0 4px 32px rgba(229,57,53,0.10);cursor:pointer;z-index:1000;min-width:260px;">
                    <div style="font-size:2.5em;margin-bottom:18px;">📩</div>
                    <div>Drag & drop your <b>.sths</b> file here<div style="height: 0.5em;"></div>or click to select a file</div>
                </div>
            </div>
        `;
        document.body.appendChild(dragDropOverlay);

        const dragDropModal = dragDropOverlay.querySelector('#dragDropModal');
        const dragDropBox = dragDropOverlay.querySelector('#dragDropBox');
        const closeBtn = dragDropOverlay.querySelector('#dragDropCloseBtn');

        dragDropOverlay.addEventListener('dragover', (e) => {
            e.preventDefault();
            dragDropModal.style.background = 'rgba(255,235,238,0.98)';
        });
        dragDropOverlay.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragDropModal.style.background = 'rgba(255,255,255,0.97)';
        });

        dragDropOverlay.addEventListener('drop', (e) => {
            e.preventDefault();
            dragDropModal.style.background = 'rgba(255,255,255,0.97)';
            if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
            const file = e.dataTransfer.files[0];
            if (!file.name.endsWith('.sths')) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (!Array.isArray(data)) throw new Error("Invalid format");
                    for (const entry of data) {
                        if (typeof entry.hotkey !== "string" || typeof entry.mode !== "string") {
                            throw new Error("Invalid entry in file");
                        }
                    }
                    chrome.storage.sync.set({ hotkeys: data }, () => {
                        hotkeyList.innerHTML = "";
                        data.forEach((d, idx) => createHotkeyEntry(idx, d));
                        hideDragDropOverlay();
                    });
                } catch (err) {
                }
            };
            reader.readAsText(file);
        });

        dragDropBox.addEventListener('click', (e) => {
            if (importFileInput) {
                importFileInput.value = "";
                importFileInput.click();
            }
        });

        dragDropOverlay.addEventListener('click', (e) => {
            if (e.target === dragDropOverlay) {
                hideDragDropOverlay();
            }
        });

        closeBtn.addEventListener('click', () => {
            hideDragDropOverlay();
        });

        dragDropOverlay.tabIndex = 0;
        dragDropOverlay.focus();
        dragDropOverlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideDragDropOverlay();
            }
        });
    }
    function hideDragDropOverlay() {
        if (dragDropOverlay) {
            dragDropOverlay.remove();
            dragDropOverlay = null;
        }
    }


    function isFileDrag(e) {
        const dt = e.dataTransfer;
        if (!dt) return false;
        if (dt.types && Array.from(dt.types).includes('Files')) return true;
        if (dt.items && Array.from(dt.items).some(i => i.kind === 'file')) return true;
        return false;
    }

    document.body.addEventListener('dragover', (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    document.body.addEventListener('drop', (e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file || !file.name.endsWith('.sths')) return;
        const reader = new FileReader();
        reader.onload = function(ev) {
            try {
                const data = JSON.parse(ev.target.result);
                if (!Array.isArray(data)) throw new Error("Invalid format");
                for (const entry of data) {
                    if (typeof entry.hotkey !== "string" || typeof entry.mode !== "string") {
                        throw new Error("Invalid entry in file");
                    }
                }
                chrome.storage.sync.set({ hotkeys: data }, () => {
                    hotkeyList.innerHTML = "";
                    data.forEach((d, idx) => createHotkeyEntry(idx, d));
                });
            } catch (err) {}
        };
        reader.readAsText(file);
    });
});
