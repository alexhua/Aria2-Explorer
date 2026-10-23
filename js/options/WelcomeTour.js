/**
 * WelcomeTour – First-install guided spotlight tour
 *
 * Steps:
 *   1. RPC URL     – how to connect to Aria2
 *   2. Download Directory – where files land
 *   3. URL Pattern (rpcList overview) – smart routing & auto-sorting
 */
export class WelcomeTour {

    /**
     * Check URL param set by background.js on first install.
     * Strip the param afterwards so a page refresh won't re-trigger.
     */
    static check() {
        if (!location.search.includes('welcome')) return;

        // Clean the URL without triggering navigation
        history.replaceState(null, '', location.pathname);
        new WelcomeTour().start();
    }

    // ── private state ────────────────────────────────────────────────────────
    #steps = null;
    #currentStep = 0;
    #els = {};          // { overlay, spotlight, card }

    // Build step definitions lazily so i18n is ready
    #getSteps() {
        return [
            {
                targetId: 'rpcUrl-0',
                title: chrome.i18n.getMessage('tourStep1Title'),
                body:  chrome.i18n.getMessage('tourStep1Body'),
            },
            {
                targetId: 'location-0',
                title: chrome.i18n.getMessage('tourStep2Title'),
                body:  chrome.i18n.getMessage('tourStep2Body'),
            },
            {
                targetId: 'rpcList',
                title: chrome.i18n.getMessage('tourStep3Title'),
                body:  chrome.i18n.getMessage('tourStep3Body'),
            },
        ];
    }

    // ── public entry ─────────────────────────────────────────────────────────
    start() {
        this.#steps = this.#getSteps();
        this.#buildUI();
        this.#goToStep(0);
    }

    // ── UI construction ──────────────────────────────────────────────────────
    #buildUI() {
        document.body.classList.add('tour-active');

        const overlay    = document.createElement('div');
        overlay.id       = 'tour-overlay';

        const spotlight  = document.createElement('div');
        spotlight.id     = 'tour-spotlight';

        const totalSteps = this.#getSteps().length;
        const dots       = Array.from({ length: totalSteps }, (_, i) =>
            `<span class="tour-dot" data-step="${i}"></span>`
        ).join('');

        const card = document.createElement('div');
        card.id    = 'tour-card';
        card.innerHTML = `
            <div id="tour-card-header">
                <span id="tour-step-badge"></span>
                <h3 id="tour-title"></h3>
            </div>
            <div id="tour-dots">${dots}</div>
            <p id="tour-body"></p>
            <div id="tour-footer">
                <button id="tour-skip">${chrome.i18n.getMessage('tourSkip')}</button>
                <button id="tour-next"></button>
            </div>
        `;

        document.body.append(overlay, spotlight, card);
        this.#els = { overlay, spotlight, card };

        card.querySelector('#tour-next').addEventListener('click', () => {
            if (this.#currentStep < this.#steps.length - 1) {
                this.#goToStep(this.#currentStep + 1);
            } else {
                this.#finish();
            }
        });

        card.querySelector('#tour-skip').addEventListener('click', () => this.#finish());
    }

    // ── step navigation ──────────────────────────────────────────────────────
    #goToStep(index) {
        this.#currentStep = index;
        const step   = this.#steps[index];
        const target = document.getElementById(step.targetId);
        if (!target) return;

        target.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Wait for smooth-scroll to settle before measuring positions
        setTimeout(() => {
            this.#positionSpotlight(target);
            this.#updateCard(step, index, target);
        }, 350);
    }

    // ── spotlight ────────────────────────────────────────────────────────────
    #positionSpotlight(el) {
        const rect = el.getBoundingClientRect();
        const pad  = 8;
        Object.assign(this.#els.spotlight.style, {
            top:    `${rect.top    - pad}px`,
            left:   `${rect.left   - pad}px`,
            width:  `${rect.width  + pad * 2}px`,
            height: `${rect.height + pad * 2}px`,
        });
    }

    // ── card ─────────────────────────────────────────────────────────────────
    #updateCard(step, index, target) {
        const { card } = this.#els;
        const isLast   = index === this.#steps.length - 1;

        card.querySelector('#tour-step-badge').textContent = `${index + 1} / ${this.#steps.length}`;
        card.querySelector('#tour-title').textContent      = step.title;
        card.querySelector('#tour-body').innerHTML         = step.body;
        card.querySelector('#tour-next').textContent       = isLast
            ? chrome.i18n.getMessage('tourDone')
            : chrome.i18n.getMessage('tourNext');

        // Update dot indicators
        card.querySelectorAll('.tour-dot').forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });

        this.#positionCard(target);
    }

    /**
     * Place the card below the target when there is room; otherwise above.
     * Horizontally centred over the target, clamped to the viewport.
     */
    #positionCard(target) {
        const { card } = this.#els;
        const rect     = target.getBoundingClientRect();
        const gap      = 20;
        const edgePad  = 12;
        const cardW    = 340;
        const cardH    = card.offsetHeight || 190;
        const vw       = window.innerWidth;
        const vh       = window.innerHeight;

        // Vertical
        const hasRoomBelow = rect.bottom + gap + cardH <= vh - edgePad;
        const top    = hasRoomBelow ? rect.bottom + gap : rect.top - gap - cardH;
        const arrow  = hasRoomBelow ? 'arrow-top' : 'arrow-bottom';

        // Horizontal – centre over target, stay inside viewport
        const idealLeft = rect.left + rect.width / 2 - cardW / 2;
        const left = Math.max(edgePad, Math.min(idealLeft, vw - cardW - edgePad));

        card.className = arrow;
        Object.assign(card.style, {
            top:     `${top}px`,
            left:    `${left}px`,
            opacity: '1',
        });
    }

    // ── cleanup ──────────────────────────────────────────────────────────────
    #finish() {
        document.body.classList.remove('tour-active');
        Object.values(this.#els).forEach(el => el.remove());
        this.#els = {};
    }
}
