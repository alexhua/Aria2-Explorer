/**
 * Notice Manager (with i18n support)
 * - Fetches JSON config from a URL
 * - Renders a sticky notice bar under the fixed header
 * - Click to navigate to provided URL (if any)
 * - Auto refresh every pollIntervalMs (default: 30 minutes)
 * - Multi-language selection based on document.documentElement.lang
 *
 * Supported JSON:
 * 1) Single-language:
 * {
 *   "visible": true,
 *   "text": "New release: Aria2 Explorer v2.3 is out! Click to learn more.",
 *   "url": "https://rec.aria2e.com/blog/release-v2-3"
 * }
 *
 * 2) Multi-language:
 * {
 *   "visible": true,
 *   "text": { "en": "New release...", "zh": "新版本发布..." },
 *   "url":  { "en": "https://.../en", "zh": "https://.../zh" }
 * }
 */
export default class NoticeManager {
  constructor(configUrl, options = {}) {
    this.configUrl = configUrl;
    this.pollIntervalMs = options.pollIntervalMs || 30 * 60 * 1000;
    this.getCurrentLang =
      typeof options.getCurrentLang === 'function'
        ? options.getCurrentLang
        : () => this.getDocumentLang();

    this.container = null;
    this.linkUrl = null;
    this._timer = null;
    this._lastData = null; // cache last fetched JSON for re-render on lang change
    this._langObserver = null;

    // Initialize after DOM ready if needed
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    this.ensureBar();
    this.refresh();
    this.startPolling();
    this.observeLangChange();
  }

  startPolling() {
    // Clear any existing interval just in case
    if (this._timer) {
      clearInterval(this._timer);
    }
    this._timer = setInterval(() => this.refresh(), this.pollIntervalMs);
  }

  async refresh() {
    if (this._dismissed) return;
    try {
      const url = this.appendCacheBusting(this.configUrl);
      const resp = await fetch(url, { cache: 'no-store' });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      this._lastData = data;
      this.renderForCurrentLang(data);
    } catch (err) {
      // 静默失败，不打扰用户
      // console.debug('NoticeManager refresh failed:', err);
      this.hide();
    }
  }

  renderForCurrentLang(data) {
    if (this._dismissed) {
      this.hide();
      return;
    }
    const visible = !!data.visible;

    // Select text based on lang
    const currentLang = this.getCurrentLang();
    const text = this.selectByLang(data.text, currentLang);
    const link = this.selectByLang(data.url, currentLang);

    if (visible && text) {
      this.render(text, link);
      this.show();
    } else {
      this.hide();
    }
  }

  observeLangChange() {
    // 监听 html lang 属性变化，语言切换时根据缓存数据重渲染
    try {
      const target = document.documentElement;
      if (!target || typeof MutationObserver === 'undefined') return;

      this._langObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'attributes' && m.attributeName === 'lang') {
            if (this._lastData) {
              // 基于缓存数据即时重渲染，不重复请求
              this.renderForCurrentLang(this._lastData);
            }
            break;
          }
        }
      });

      this._langObserver.observe(target, { attributes: true, attributeFilter: ['lang'] });
    } catch (_) {
      // 忽略
    }
  }

  getDocumentLang() {
    // 1) localStorage 持久化的语言（与 LanguageManager 一致）
    const saved = (localStorage.getItem('language') || '').trim().toLowerCase();
    if (saved) {
      if (saved.startsWith('zh')) return 'zh';
      if (saved.startsWith('en')) return 'en';
      return saved;
    }
    // 2) html lang
    const langAttr = (document.documentElement.getAttribute('lang') || '').trim().toLowerCase();
    if (langAttr) {
      if (langAttr.startsWith('zh')) return 'zh';
      if (langAttr.startsWith('en')) return 'en';
      return langAttr;
    }
    // 3) 浏览器首选语言
    const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (nav.startsWith('zh')) return 'zh';
    if (nav.startsWith('en')) return 'en';
    // 4) 默认
    return 'en';
  }

  /**
   * Select value by language
   * - If value is string, return as-is
   * - If value is object, try currentLang -> 'en' -> first available key
   */
  selectByLang(value, currentLang) {
    if (value == null) return '';
    if (typeof value === 'string') return value.trim();

    // Object map
    if (typeof value === 'object') {
      // direct by currentLang
      if (value[currentLang] && typeof value[currentLang] === 'string') {
        return value[currentLang].trim();
      }
      // fallback en
      if (value.en && typeof value.en === 'string') {
        return value.en.trim();
      }
      // fallback first
      const firstKey = Object.keys(value).find(
        (k) => typeof value[k] === 'string' && value[k].trim().length > 0
      );
      return firstKey ? value[firstKey].trim() : '';
    }

    return '';
  }

  appendCacheBusting(url) {
    const u = new URL(url, window.location.origin);
    u.searchParams.set('_t', Date.now().toString());
    return u.toString();
  }

  ensureBar() {
    if (this.container) return;

    const bar = document.createElement('div');
    bar.className = 'notice-bar';
    bar.setAttribute('role', 'note');
    bar.setAttribute('aria-live', 'polite');
    bar.style.display = 'none';

    // 内部使用与站点统一的 .container 以对齐内容
    const inner = document.createElement('div');
    inner.className = 'container notice-inner';
    inner.innerHTML = `
      <div class="notice-content">
        <a class="notice-link" href="#" target="_blank" rel="noopener"></a>
        <span class="notice-arrow" aria-hidden="true">→</span>
      </div>
      <button class="notice-close" type="button" aria-label="Close notice" title="Close">X</button>
    `;
    bar.appendChild(inner);

    // 点击整条跳转（若有 URL）：委托到内部链接，确保浏览器状态栏展示目标地址
    bar.addEventListener('click', (e) => {
      if (this._dismissed) return;
      const linkEl = this.container && this.container.querySelector('.notice-link');
      // 若用户不是直接点在链接上，但有可用链接，且不是点击关闭按钮，则触发链接点击
      if (this.linkUrl && linkEl && e.target && !e.target.closest('.notice-link') && !e.target.closest('.notice-close')) {
        linkEl.click();
      }
    });
    // 关闭按钮：仅关闭本次会话
    const closeBtn = bar.querySelector('.notice-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._dismissed = true;
        this.hide();
      });
    }

    // 插入到 header 之后
    const header = document.getElementById('header');
    if (header && header.parentNode) {
      header.parentNode.insertBefore(bar, header.nextSibling);
    } else {
      // 兜底：没有 header 就插入到 body 顶部
      document.body.insertBefore(bar, document.body.firstChild);
    }

    this.container = bar;
  }

  render(text, url) {
    if (!this.container) this.ensureBar();
    const linkEl = this.container.querySelector('.notice-link');
    this.linkUrl = url && typeof url === 'string' && url.trim().length > 0 ? url.trim() : null;

    if (linkEl) {
      linkEl.textContent = text;
      if (this.linkUrl) {
        linkEl.setAttribute('href', this.linkUrl);
        linkEl.setAttribute('aria-label', text);
      } else {
        // 无链接时降级为纯文本
        linkEl.removeAttribute('href');
        linkEl.removeAttribute('target');
        linkEl.removeAttribute('rel');
      }
    }

    // 无链接时，改变光标提示
    this.container.classList.toggle('notice-clickable', !!this.linkUrl);
  }

  show() {
    if (!this.container || this._dismissed) return;
    if (this.container.style.display !== 'block') {
      this.container.style.display = 'block';
      requestAnimationFrame(() => {
        this.container.classList.add('show');
      });
    }
  }

  hide() {
    if (!this.container) return;
    this.container.classList.remove('show');
    // 与过渡动画保持一致
    setTimeout(() => {
      this.container.style.display = 'none';
    }, 200);
  }
}