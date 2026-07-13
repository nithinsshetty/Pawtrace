// ==========================================================================
// CUSTOM CLIENT-SIDE HASH ROUTER
// ==========================================================================

import { showToast } from './utils.js';

class HashRouter {
  constructor() {
    this.routes = [];
    this.authCheckFunction = null; // Setter injected by auth.js or app.js
    this.initialized = false;
    
    // Bind hashchange event to this instance
    this.handleHashChange = this.handleHashChange.bind(this);
  }

  /**
   * Register a route mapping
   * @param {string} path - Hash route definition, e.g. '/pet/:id/medical'
   * @param {function} handler - Page render function that accepts (params)
   * @param {boolean} isProtected - Guard redirecting to login if unauthenticated
   */
  add(path, handler, isProtected = true) {
    // Generate route regex. 
    // Escape standard slashes, and capture named parameters (e.g. :id)
    const pattern = path
      .replace(/\//g, '\\/')
      .replace(/:[a-zA-Z0-9]+/g, '([^\\/]+)');
    const regex = new RegExp(`^#${pattern}$`);

    // Extract param names
    const paramNames = (path.match(/:[a-zA-Z0-9]+/g) || []).map(p => p.slice(1));

    this.routes.push({
      path,
      regex,
      paramNames,
      handler,
      isProtected
    });
  }

  /**
   * Inject auth validation handler
   * @param {function} authCheckFn - Function returning { isLoggedIn: boolean, isPending: boolean }
   */
  setAuthCheck(authCheckFn) {
    this.authCheckFunction = authCheckFn;
  }

  /**
   * Navigate programmatically
   * @param {string} path - E.g. '/dashboard' or 'dashboard'
   */
  navigate(path) {
    const targetHash = path.startsWith('#') ? path : `#${path.startsWith('/') ? '' : '/'}${path}`;
    if (window.location.hash === targetHash) {
      // Force resolve if already on target hash
      this.resolve();
    } else {
      window.location.hash = targetHash;
    }
  }

  /**
   * Resolve current hash state to matched handler
   */
  async resolve() {
    let hash = window.location.hash || '#/dashboard';

    // Support portfolio same-page anchor scrolling (Temporarily disabled: redirect to dashboard)
    if (hash === '#/portfolio' || hash.startsWith('#portfolio-')) {
      console.warn("Portfolio page is temporarily disabled. Redirecting to dashboard.");
      this.navigate('/dashboard');
      return;
    }

    // Ignore other non-app hash changes that don't start with '#/'
    if (window.location.hash && !window.location.hash.startsWith('#/')) {
      console.log(`Router: Ignoring non-app hash anchor: ${window.location.hash}`);
      return;
    }
    
    // Guard against running routing resolution before Auth state finishes initializing

    if (this.authCheckFunction) {
      const authState = this.authCheckFunction();
      if (authState.isPending) {
        console.log("Router: Auth state is pending. Delaying route resolution...");
        return; // App.js auth listener will re-trigger router.resolve() once resolved
      }

      // Check match in registered routes
      const matched = this.matchRoute(hash);

      if (matched) {
        const { route, params } = matched;

        // Route Guarding
        if (route.isProtected && !authState.isLoggedIn) {
          console.warn(`Router: Protected path ${hash} requires authentication. Redirecting...`);
          this.navigate('/login');
          return;
        }

        if (!route.isProtected && authState.isLoggedIn && (hash === '#/login' || hash === '#/signup')) {
          console.log(`Router: Logged-in user attempted guest page ${hash}. Redirecting to dashboard.`);
          this.navigate('/dashboard');
          return;
        }

        // Execute render handler
        try {
          this.updateActiveNavLinks(route.path);

          // Apply portal-specific accent class to body
          const path = route.path;
          document.body.classList.remove('portal-owner', 'portal-vet', 'portal-ngo', 'portal-caregiver');
          if (path.startsWith('/ngo')) {
            document.body.classList.add('portal-ngo');
          } else if (path.startsWith('/vet-portal') || path === '/vets') {
            document.body.classList.add('portal-vet');
          } else if (path.startsWith('/caregiver')) {
            document.body.classList.add('portal-caregiver');
          } else {
            document.body.classList.add('portal-owner');
          }

          await route.handler(params);
        } catch (error) {
          console.error(`Router error rendering route ${hash}:`, error);
          showToast("Failed to load page. Redirecting to dashboard.", "error");
          this.navigate('/dashboard');
        }
      } else {
        // Fallback for non-matching paths
        console.warn(`Router: Path ${hash} did not match any routes. Defaulting to dashboard.`);
        this.navigate('/dashboard');
      }
    }
  }

  /**
   * Match a path string against registered route configurations
   */
  matchRoute(hash) {
    // Sort routes by specificity (longer/more slashes first)
    const sortedRoutes = [...this.routes].sort((a, b) => b.path.split('/').length - a.path.split('/').length);

    for (const route of sortedRoutes) {
      const matchResult = hash.match(route.regex);
      if (matchResult) {
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = decodeURIComponent(matchResult[index + 1]);
        });
        return { route, params };
      }
    }
    return null;
  }

  /**
   * Apply css classes to navigation items based on current active route
   */
  updateActiveNavLinks(routePath) {
    // Extract primary route section, e.g. '#/dashboard' or '#/pets' from path
    const mainSection = routePath.split('/:')[0]; // yields e.g., '/pets' or '/dashboard'
    
    const activeClass = 'active';
    
    // Update Sidebar Navigation
    const sidebarItems = document.querySelectorAll('.sidebar-menu .menu-item');
    sidebarItems.forEach(el => {
      const href = el.getAttribute('href');
      if (href) {
        const hrefPath = href.replace('#', '').split('/:')[0];
        let isActive = false;
        if (hrefPath === mainSection) {
          isActive = true;
        } else if (hrefPath === '/pets' && mainSection.startsWith('/pet')) {
          isActive = true;
        } else if (mainSection.startsWith(hrefPath + '/') && hrefPath !== '/ngo' && hrefPath !== '/vet-portal' && hrefPath !== '/') {
          isActive = true;
        }
        
        if (isActive) {
          el.classList.add(activeClass);
        } else {
          el.classList.remove(activeClass);
        }
      }
    });

    // Update Mobile Nav
    const mobileItems = document.querySelectorAll('.mobile-nav-bar .mobile-nav-item');
    mobileItems.forEach(el => {
      const href = el.getAttribute('href');
      if (href) {
        const hrefPath = href.replace('#', '').split('/:')[0];
        let isActive = false;
        if (hrefPath === mainSection) {
          isActive = true;
        } else if (hrefPath === '/pets' && mainSection.startsWith('/pet')) {
          isActive = true;
        } else if (mainSection.startsWith(hrefPath + '/') && hrefPath !== '/ngo' && hrefPath !== '/vet-portal' && hrefPath !== '/') {
          isActive = true;
        }
        
        if (isActive) {
          el.classList.add(activeClass);
        } else {
          el.classList.remove(activeClass);
        }
      }
    });
  }

  handleHashChange() {
    this.resolve();
  }

  /**
   * Bind event listeners and start router loop
   */
  init() {
    if (!this.initialized) {
      window.addEventListener('hashchange', this.handleHashChange);
      this.initialized = true;
      this.resolve();
    }
  }

  /**
   * Tear down event listeners
   */
  destroy() {
    window.removeEventListener('hashchange', this.handleHashChange);
    this.initialized = false;
  }
}

export const Router = new HashRouter();
