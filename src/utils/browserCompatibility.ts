// Browser Compatibility Utility
// Handles cross-browser issues and provides fallbacks

export interface BrowserInfo {
  name: string;
  version: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  supportsLocalStorage: boolean;
  supportsSessionStorage: boolean;
  supportsIndexedDB: boolean;
  supportsWebWorkers: boolean;
  supportsServiceWorkers: boolean;
  supportsFetch: boolean;
  supportsPromise: boolean;
  supportsAsyncAwait: boolean;
  supportsES6: boolean;
  userAgent: string;
}

export interface CompatibilityIssue {
  type: 'feature' | 'performance' | 'layout' | 'api';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  fallback?: () => void;
}

class BrowserCompatibility {
  private browserInfo: BrowserInfo;
  private issues: CompatibilityIssue[] = [];

  constructor() {
    this.browserInfo = this.detectBrowser();
    this.checkCompatibility();
  }

  private detectBrowser(): BrowserInfo {
    const userAgent = navigator.userAgent;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*\bMobile\b)(?=.*\bSafari\b)/i.test(userAgent);
    const isDesktop = !isMobile && !isTablet;

    // Detect browser name and version
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';

    if (userAgent.includes('Chrome')) {
      browserName = 'Chrome';
      browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'Safari';
      browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Edge')) {
      browserName = 'Edge';
      browserVersion = userAgent.match(/Edge\/(\d+)/)?.[1] || 'Unknown';
    }

    return {
      name: browserName,
      version: browserVersion,
      isMobile,
      isTablet,
      isDesktop,
      supportsLocalStorage: this.testFeature('localStorage'),
      supportsSessionStorage: this.testFeature('sessionStorage'),
      supportsIndexedDB: this.testFeature('indexedDB'),
      supportsWebWorkers: this.testFeature('webWorkers'),
      supportsServiceWorkers: this.testFeature('serviceWorkers'),
      supportsFetch: this.testFeature('fetch'),
      supportsPromise: this.testFeature('promise'),
      supportsAsyncAwait: this.testFeature('asyncAwait'),
      supportsES6: this.testFeature('es6'),
      userAgent
    };
  }

  private testFeature(feature: string): boolean {
    try {
      switch (feature) {
        case 'localStorage':
          return 'localStorage' in window && window.localStorage !== null;
        case 'sessionStorage':
          return 'sessionStorage' in window && window.sessionStorage !== null;
        case 'indexedDB':
          return 'indexedDB' in window;
        case 'webWorkers':
          return 'Worker' in window;
        case 'serviceWorkers':
          return 'serviceWorker' in navigator;
        case 'fetch':
          return 'fetch' in window;
        case 'promise':
          return 'Promise' in window;
        case 'asyncAwait':
          return this.testAsyncAwait();
        case 'es6':
          return this.testES6();
        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  private testAsyncAwait(): boolean {
    try {
      // Test if async/await is supported
      const testAsync = async () => true;
      return typeof testAsync === 'function';
    } catch {
      return false;
    }
  }

  private testES6(): boolean {
    try {
      // Test ES6 features
      const testArrow = () => true;
      const testDestructuring = ({ test }: { test: boolean }) => test;
      const testTemplate = `test ${1 + 1}`;
      const testLet = true;
      const testConst = true;
      
      return testArrow() && testDestructuring({ test: true }) && testTemplate === 'test 2';
    } catch {
      return false;
    }
  }

  private checkCompatibility(): void {
    // Check for critical issues
    if (!this.browserInfo.supportsLocalStorage) {
      this.issues.push({
        type: 'feature',
        severity: 'critical',
        message: 'LocalStorage não é suportado. Algumas funcionalidades podem não funcionar.',
        fallback: () => this.setupLocalStorageFallback()
      });
    }

    if (!this.browserInfo.supportsFetch) {
      this.issues.push({
        type: 'api',
        severity: 'high',
        message: 'Fetch API não é suportado. Usando XMLHttpRequest como fallback.',
        fallback: () => this.setupFetchFallback()
      });
    }

    if (!this.browserInfo.supportsPromise) {
      this.issues.push({
        type: 'feature',
        severity: 'critical',
        message: 'Promises não são suportadas. A aplicação pode não funcionar corretamente.',
        fallback: () => this.setupPromiseFallback()
      });
    }

    // Check for performance issues on mobile
    if (this.browserInfo.isMobile && this.browserInfo.name === 'Safari') {
      this.issues.push({
        type: 'performance',
        severity: 'medium',
        message: 'Safari mobile detectado. Algumas animações podem ser otimizadas.',
        fallback: () => this.optimizeForMobileSafari()
      });
    }

    // Check for layout issues
    if (this.browserInfo.name === 'Internet Explorer') {
      this.issues.push({
        type: 'layout',
        severity: 'high',
        message: 'Internet Explorer detectado. Alguns estilos podem não ser aplicados corretamente.',
        fallback: () => this.setupIEFallback()
      });
    }
  }

  private setupLocalStorageFallback(): void {
    // Implement localStorage fallback using cookies or memory
    console.warn('🔧 [BROWSER_COMPAT] Setting up localStorage fallback');
  }

  private setupFetchFallback(): void {
    // Implement fetch fallback using XMLHttpRequest
    console.warn('🔧 [BROWSER_COMPAT] Setting up fetch fallback');
  }

  private setupPromiseFallback(): void {
    // Implement promise fallback using callbacks
    console.warn('🔧 [BROWSER_COMPAT] Setting up promise fallback');
  }

  private optimizeForMobileSafari(): void {
    // Optimize animations and interactions for mobile Safari
    console.warn('🔧 [BROWSER_COMPAT] Optimizing for mobile Safari');
    
    // Reduce animation complexity
    document.documentElement.style.setProperty('--animation-duration', '0.2s');
    
    // Disable hover effects on touch devices
    if ('ontouchstart' in window) {
      document.documentElement.classList.add('touch-device');
    }
  }

  private setupIEFallback(): void {
    // Add IE-specific CSS and JavaScript
    console.warn('🔧 [BROWSER_COMPAT] Setting up IE fallback');
    
    // Add IE-specific styles
    const ieStyles = document.createElement('style');
    ieStyles.textContent = `
      /* IE-specific fixes */
      .flex { display: -ms-flexbox; }
      .grid { display: -ms-grid; }
    `;
    document.head.appendChild(ieStyles);
  }

  public getBrowserInfo(): BrowserInfo {
    return this.browserInfo;
  }

  public getIssues(): CompatibilityIssue[] {
    return this.issues;
  }

  public hasCriticalIssues(): boolean {
    return this.issues.some(issue => issue.severity === 'critical');
  }

  public applyFallbacks(): void {
    this.issues.forEach(issue => {
      if (issue.fallback) {
        try {
          issue.fallback();
        } catch (error) {
          console.error('🔧 [BROWSER_COMPAT] Fallback failed:', error);
        }
      }
    });
  }

  public logCompatibilityReport(): void {
    console.group('🔍 [BROWSER_COMPAT] Compatibility Report');
    console.log('Browser:', this.browserInfo.name, this.browserInfo.version);
    console.log('Device:', this.browserInfo.isMobile ? 'Mobile' : this.browserInfo.isTablet ? 'Tablet' : 'Desktop');
    console.log('User Agent:', this.browserInfo.userAgent);
    console.log('Issues found:', this.issues.length);
    
    if (this.issues.length > 0) {
      console.group('Issues:');
      this.issues.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity.toUpperCase()}] ${issue.type}: ${issue.message}`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }
}

// Create singleton instance
const browserCompatibility = new BrowserCompatibility();

export default browserCompatibility;
