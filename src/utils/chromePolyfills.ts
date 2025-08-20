// Chrome Polyfills for older versions
// This ensures compatibility with Chrome versions that don't support modern JavaScript features

export const applyChromePolyfills = () => {
  // Polyfill for Array.prototype.find if not available
  if (!Array.prototype.find) {
    Array.prototype.find = function(predicate: any) {
      if (this == null) {
        throw new TypeError('Array.prototype.find called on null or undefined');
      }
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }
      const list = Object(this);
      const length = parseInt(list.length) || 0;
      const thisArg = arguments[1];
      for (let i = 0; i < length; i++) {
        const element = list[i];
        if (predicate.call(thisArg, element, i, list)) {
          return element;
        }
      }
      return undefined;
    };
  }

  // Polyfill for Array.prototype.filter if not available
  if (!Array.prototype.filter) {
    Array.prototype.filter = function(callback: any, thisArg: any) {
      if (this == null) {
        throw new TypeError('Array.prototype.filter called on null or undefined');
      }
      if (typeof callback !== 'function') {
        throw new TypeError('callback must be a function');
      }
      const list = Object(this);
      const length = parseInt(list.length) || 0;
      const result = [];
      for (let i = 0; i < length; i++) {
        const element = list[i];
        if (callback.call(thisArg, element, i, list)) {
          result.push(element);
        }
      }
      return result;
    };
  }

  // Polyfill for Array.prototype.map if not available
  if (!Array.prototype.map) {
    Array.prototype.map = function(callback: any, thisArg: any) {
      if (this == null) {
        throw new TypeError('Array.prototype.map called on null or undefined');
      }
      if (typeof callback !== 'function') {
        throw new TypeError('callback must be a function');
      }
      const list = Object(this);
      const length = parseInt(list.length) || 0;
      const result = new Array(length);
      for (let i = 0; i < length; i++) {
        const element = list[i];
        result[i] = callback.call(thisArg, element, i, list);
      }
      return result;
    };
  }

  // Polyfill for String.prototype.includes if not available
  if (!String.prototype.includes) {
    String.prototype.includes = function(search: string, start?: number) {
      if (typeof start !== 'number') {
        start = 0;
      }
      if (start + search.length > this.length) {
        return false;
      } else {
        return this.indexOf(search, start) !== -1;
      }
    };
  }

  // Polyfill for Promise if not available
  if (typeof Promise === 'undefined') {
    console.warn('Promise not available - this may cause issues');
  }

  // Polyfill for Object.assign if not available
  if (typeof Object.assign !== 'function') {
    Object.assign = function(target: any, ...sources: any[]) {
      if (target == null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }
      const to = Object(target);
      for (let index = 1; index < arguments.length; index++) {
        const nextSource = arguments[index];
        if (nextSource != null) {
          for (const nextKey in nextSource) {
            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
              to[nextKey] = nextSource[nextKey];
            }
          }
        }
      }
      return to;
    };
  }

  console.log('🔧 Chrome polyfills applied');
};

// Detect Chrome version and apply appropriate polyfills
export const detectChromeVersion = () => {
  const userAgent = navigator.userAgent;
  const chromeMatch = userAgent.match(/Chrome\/(\d+)/);
  
  if (chromeMatch) {
    const version = parseInt(chromeMatch[1]);
    console.log('🔍 Chrome version detected:', version);
    
    // Apply polyfills for Chrome versions below 80
    if (version < 80) {
      console.log('🔧 Applying polyfills for older Chrome version');
      applyChromePolyfills();
    }
  } else {
    console.log('🔍 Not Chrome or version not detected');
  }
};

// Initialize polyfills
export const initializeChromeCompatibility = () => {
  detectChromeVersion();
  applyChromePolyfills(); // Apply basic polyfills regardless
};
