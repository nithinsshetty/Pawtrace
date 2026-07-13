// ==========================================================================
// PAWTRACE STARTUP LANDING PAGE & PORTFOLIO MODULE (Investor Edition)
// ==========================================================================

import { getCurrentUser } from './auth.js';
import { Router } from './router.js';

/**
 * Render the PawTrace Investor-Grade Startup Landing Page
 */
export function renderPortfolio() {
  const viewport = document.getElementById('app-viewport');
  const user = getCurrentUser();
  const launchHref = user ? '#/dashboard' : '#/login';
  const launchText = user ? 'Go to Dashboard' : 'Launch Live Demo';

  // Set the page document title
  document.title = "PawTrace — Smart Digital Pet Identity & Care Ecosystem";

  viewport.innerHTML = `
    <style>
      /* --- Portfolio Specific Styling (Prefix: port-) --- */
      .port-wrapper {
        font-family: var(--primary-font);
        background-color: var(--bg-app);
        color: var(--text-main);
        line-height: 1.6;
        transition: background-color 0.4s ease, color 0.4s ease;
        overflow-x: hidden;
      }
      
      /* Header & Navigation */
      .port-header {
        position: sticky;
        top: 0;
        z-index: 1000;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-bottom: 1px solid var(--border-glass);
        padding: 0.75rem 2rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: all 0.3s ease;
      }
      .dark-theme .port-header {
        background: rgba(18, 20, 21, 0.85);
      }
      .port-logo {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--teal);
        text-decoration: none;
        font-family: 'Outfit', sans-serif;
      }
      .port-logo span {
        background: linear-gradient(135deg, var(--teal), var(--secondary-teal));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .port-nav {
        display: flex;
        gap: 1.25rem;
        align-items: center;
      }
      .port-nav-link {
        color: var(--text-muted);
        text-decoration: none;
        font-size: 0.9rem;
        font-weight: 600;
        transition: color 0.2s ease;
      }
      .port-nav-link:hover {
        color: var(--teal);
      }
      .port-cta-btn {
        background: linear-gradient(135deg, var(--teal), var(--secondary-teal));
        color: white !important;
        padding: 0.6rem 1.25rem;
        border-radius: 50px;
        font-weight: 700;
        font-size: 0.85rem;
        text-decoration: none;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
      }
      .port-cta-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(15, 118, 110, 0.35);
      }

      /* Hero Section */
      .port-hero {
        position: relative;
        padding: 6rem 2rem 5rem;
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 3rem;
        align-items: center;
        max-width: 1200px;
        margin: 0 auto;
        background: radial-gradient(circle at top right, rgba(20, 184, 166, 0.12), transparent 45%),
                    radial-gradient(circle at bottom left, rgba(251, 146, 60, 0.07), transparent 45%);
      }
      @media (max-width: 992px) {
        .port-hero {
          grid-template-columns: 1fr;
          text-align: center;
          padding: 4rem 1.25rem;
        }
      }
      .port-hero-content {
        text-align: left;
      }
      @media (max-width: 992px) {
        .port-hero-content {
          text-align: center;
        }
      }
      .port-hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        background: rgba(15, 118, 110, 0.08);
        color: var(--teal);
        padding: 0.4rem 1rem;
        border-radius: 50px;
        font-size: 0.8rem;
        font-weight: 700;
        margin-bottom: 1.5rem;
        border: 1px solid rgba(15, 118, 110, 0.15);
      }
      .port-hero-title {
        font-family: 'Outfit', sans-serif;
        font-size: 3.25rem;
        font-weight: 800;
        line-height: 1.15;
        margin-bottom: 1.25rem;
        background: linear-gradient(135deg, var(--text-main) 30%, var(--teal) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .port-hero-subtitle {
        font-size: 1.15rem;
        color: var(--text-muted);
        margin-bottom: 2rem;
        max-width: 580px;
      }
      .port-hero-actions {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }
      @media (max-width: 992px) {
        .port-hero-actions {
          justify-content: center;
        }
      }
      .port-btn {
        padding: 0.8rem 1.5rem;
        border-radius: 8px;
        font-weight: 700;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        font-size: 0.95rem;
        transition: all 0.2s ease;
        cursor: pointer;
      }
      .port-btn-primary {
        background: linear-gradient(135deg, var(--teal), var(--secondary-teal));
        color: white !important;
        box-shadow: 0 4px 14px rgba(15, 118, 110, 0.3);
      }
      .port-btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(15, 118, 110, 0.4);
      }
      .port-btn-accent {
        background: linear-gradient(135deg, var(--terracotta), #F97316);
        color: white !important;
        box-shadow: 0 4px 14px rgba(251, 146, 60, 0.3);
      }
      .port-btn-accent:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(251, 146, 60, 0.4);
      }
      .port-btn-secondary {
        background: var(--bg-card);
        color: var(--text-main) !important;
        border: 1px solid var(--border-glass);
        box-shadow: var(--shadow-sm);
      }
      .port-btn-secondary:hover {
        transform: translateY(-2px);
        background: var(--bg-app);
        border-color: var(--border-input);
      }
      
      /* Float Hero Mockup */
      .port-hero-preview {
        display: flex;
        justify-content: center;
        align-items: center;
      }
      .port-hero-mockup {
        width: 100%;
        max-width: 480px;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        border: 1px solid var(--border-glass);
        background: var(--bg-card);
        overflow: hidden;
      }
      .port-hero-mockup-header {
        background: rgba(var(--teal-rgb), 0.05);
        padding: 0.5rem 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid var(--border-glass);
      }
      .port-hero-mockup-dots {
        display: flex;
        gap: 0.35rem;
      }
      .port-hero-mockup-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--border-input);
      }
      .port-hero-mockup-title {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--teal);
      }

      /* Sections General */
      .port-section {
        padding: 5.5rem 1.5rem;
        max-width: 1200px;
        margin: 0 auto;
      }
      .port-section-header {
        text-align: center;
        margin-bottom: 3.5rem;
      }
      .port-section-title {
        font-family: 'Outfit', sans-serif;
        font-size: 2.25rem;
        font-weight: 800;
        margin-bottom: 0.75rem;
        position: relative;
        color: var(--text-main);
      }
      .port-section-title::after {
        content: '';
        display: block;
        width: 50px;
        height: 4px;
        background: var(--secondary-teal);
        margin: 0.75rem auto 0;
        border-radius: 2px;
      }
      .port-section-desc {
        color: var(--text-muted);
        font-size: 1.05rem;
        max-width: 650px;
        margin: 0 auto;
      }

      /* Problem/Solution Dual View */
      .port-problem-solution {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2.5rem;
      }
      @media (max-width: 768px) {
        .port-problem-solution {
          grid-template-columns: 1fr;
        }
      }
      .port-problem-box {
        background: rgba(239, 68, 68, 0.03);
        border: 1px solid rgba(239, 68, 68, 0.15);
        padding: 2.5rem;
        border-radius: 12px;
      }
      .port-problem-box h3 {
        color: var(--accent-red);
        font-family: 'Outfit', sans-serif;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .port-solution-box {
        background: rgba(15, 118, 110, 0.03);
        border: 1px solid rgba(15, 118, 110, 0.15);
        padding: 2.5rem;
        border-radius: 12px;
      }
      .port-solution-box h3 {
        color: var(--teal);
        font-family: 'Outfit', sans-serif;
        font-weight: 800;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
      }
      .port-problem-bullets, .port-solution-bullets {
        list-style: none;
        padding: 0;
        margin-top: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        font-size: 0.95rem;
      }
      .port-problem-bullets li::before {
        content: '❌';
        margin-right: 0.5rem;
      }
      .port-solution-bullets li::before {
        content: '🐾';
        margin-right: 0.5rem;
      }

      /* Impact Metrics Grid */
      .port-metrics-container {
        background: linear-gradient(135deg, var(--teal), var(--teal-hover));
        color: white;
        border-radius: 16px;
        padding: 3rem 2rem;
        margin: 1rem auto 4rem;
        box-shadow: var(--shadow-lg);
      }
      .port-metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 2.5rem;
        text-align: center;
      }
      .port-metric-item h3 {
        font-family: 'Outfit', sans-serif;
        font-size: 3rem;
        font-weight: 800;
        margin-bottom: 0.25rem;
        letter-spacing: -0.03em;
        background: linear-gradient(135deg, #ffffff, #99f6e4);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .port-metric-item p {
        font-size: 0.95rem;
        opacity: 0.9;
        font-weight: 600;
      }

      /* Product Walkthrough */
      .port-walk-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 2rem;
        margin-top: 2rem;
      }
      .port-walk-step {
        background: var(--bg-card);
        border: 1px solid var(--border-glass);
        padding: 2rem;
        border-radius: 12px;
        box-shadow: var(--shadow-sm);
        position: relative;
        transition: transform 0.2s ease;
      }
      .port-walk-step:hover {
        transform: translateY(-4px);
      }
      .port-walk-badge {
        position: absolute;
        top: -15px;
        left: 20px;
        background: var(--terracotta);
        color: white;
        font-weight: 800;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 10px rgba(251,146,60,0.3);
      }

      /* Market Opportunity TAM SAM SOM */
      .port-market-grid {
        display: grid;
        grid-template-columns: 1.2fr 1fr;
        gap: 3rem;
        align-items: center;
      }
      @media (max-width: 900px) {
        .port-market-grid {
          grid-template-columns: 1fr;
          gap: 2rem;
        }
      }
      .port-market-visuals {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      .port-market-bar {
        background: var(--bg-card);
        border: 1px solid var(--border-glass);
        border-radius: 8px;
        padding: 1.25rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: relative;
        overflow: hidden;
        box-shadow: var(--shadow-sm);
      }
      .port-market-bar::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        background: rgba(15,118,110,0.07);
      }
      .port-market-bar.tam::before { width: 100%; }
      .port-market-bar.sam::before { width: 60%; }
      .port-market-bar.som::before { width: 25%; }
      .port-market-bar-label {
        font-weight: 700;
        font-size: 0.95rem;
        position: relative;
        z-index: 2;
      }
      .port-market-bar-value {
        font-family: 'Outfit', sans-serif;
        font-size: 1.25rem;
        font-weight: 800;
        color: var(--teal);
        position: relative;
        z-index: 2;
      }

      /* Revenue Model Tiers */
      .port-revenue-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2rem;
      }
      .port-revenue-card {
        background: var(--bg-card);
        border: 1px solid var(--border-glass);
        border-radius: 12px;
        padding: 2.5rem 2rem;
        text-align: center;
        box-shadow: var(--shadow-md);
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        transition: transform 0.2s ease, border-color 0.2s ease;
      }
      .port-revenue-card:hover {
        transform: translateY(-5px);
        border-color: var(--teal);
      }
      .port-revenue-tier {
        font-size: 0.85rem;
        font-weight: 800;
        text-transform: uppercase;
        color: var(--secondary-teal);
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
      }
      .port-revenue-price {
        font-family: 'Outfit', sans-serif;
        font-size: 2.25rem;
        font-weight: 800;
        color: var(--text-main);
        margin: 0.75rem 0 1rem;
      }
      .port-revenue-price span {
        font-size: 0.9rem;
        color: var(--text-muted);
        font-weight: 500;
      }
      .port-revenue-features {
        list-style: none;
        padding: 0;
        margin: 1.5rem 0 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        text-align: left;
        font-size: 0.9rem;
      }
      .port-revenue-features li::before {
        content: '✓';
        color: var(--teal);
        margin-right: 0.5rem;
        font-weight: 800;
      }

      /* Competitive Comparison Table */
      .port-comp-table-wrapper {
        overflow-x: auto;
        border-radius: 12px;
        border: 1px solid var(--border-glass);
        box-shadow: var(--shadow-md);
        background: var(--bg-card);
      }
      .port-comp-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 0.95rem;
      }
      .port-comp-table th, .port-comp-table td {
        padding: 1.2rem;
        border-bottom: 1px solid var(--border-glass);
      }
      .port-comp-table th {
        background: rgba(var(--teal-rgb), 0.03);
        font-weight: 700;
        color: var(--text-main);
      }
      .port-comp-table tr:last-child td {
        border-bottom: none;
      }
      .port-comp-table td.check {
        color: var(--accent-green);
        font-weight: 800;
        text-align: center;
      }
      .port-comp-table td.cross {
        color: var(--accent-red);
        font-weight: 800;
        text-align: center;
      }
      .port-comp-table td.partial {
        color: var(--accent-yellow);
        font-weight: 800;
        text-align: center;
      }
      .port-comp-table tr.highlight {
        background: rgba(var(--teal-rgb), 0.02);
        font-weight: 600;
      }
      
      /* Real Screenshot Gallery */
      .port-gallery-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2rem;
      }
      .port-gallery-card {
        background: var(--bg-card);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: var(--shadow-md);
        border: 1px solid var(--border-glass);
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      .port-gallery-card:hover {
        transform: translateY(-5px);
        box-shadow: var(--shadow-lg);
      }
      .port-gallery-img-container {
        height: 180px;
        background: linear-gradient(135deg, rgba(15, 118, 110, 0.1), rgba(20, 184, 166, 0.05));
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        border-bottom: 1px solid var(--border-glass);
        overflow: hidden;
      }
      .port-gallery-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }
      .port-gallery-card:hover .port-gallery-img {
        transform: scale(1.04);
      }
      .port-gallery-fallback i {
        font-size: 3.5rem;
        color: var(--teal);
        opacity: 0.8;
      }
      .port-gallery-info {
        padding: 1.25rem;
      }
      .port-gallery-info h4 {
        font-family: 'Outfit', sans-serif;
        font-size: 1.1rem;
        margin-bottom: 0.35rem;
        color: var(--text-main);
      }
      .port-gallery-info p {
        font-size: 0.85rem;
        color: var(--text-muted);
        line-height: 1.4;
      }

      /* Portal Tabs & Tech Stack styles */
      .port-portal-tabs {
        display: flex;
        justify-content: center;
        gap: 0.75rem;
        margin-bottom: 2.5rem;
        flex-wrap: wrap;
      }
      .port-portal-tab {
        padding: 0.6rem 1.25rem;
        border-radius: 30px;
        background: var(--bg-card);
        border: 1px solid var(--border-glass);
        color: var(--text-muted);
        font-weight: 700;
        font-size: 0.9rem;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .port-portal-tab.active {
        background: var(--teal);
        color: white;
        border-color: var(--teal);
      }
      .port-portal-content {
        background: var(--bg-card);
        padding: 2.5rem;
        border-radius: 16px;
        box-shadow: var(--shadow-lg);
        border: 1px solid var(--border-glass);
        min-height: 380px;
      }
      .port-tech-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 1.25rem;
      }
      .port-tech-pill {
        background: var(--bg-card);
        border: 1px solid var(--border-glass);
        padding: 1rem;
        border-radius: 8px;
        text-align: center;
        font-weight: 700;
        font-size: 0.85rem;
        box-shadow: var(--shadow-sm);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .port-tech-pill:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-md);
        border-color: var(--secondary-teal);
      }
      .port-tech-pill i {
        display: block;
        font-size: 2rem;
        margin-bottom: 0.5rem;
        color: var(--teal);
      }

      /* Founder Story Section */
      .port-founder-section {
        background: rgba(var(--teal-rgb), 0.01);
        border-top: 1px solid var(--border-glass);
        border-bottom: 1px solid var(--border-glass);
      }
      .port-founder-grid {
        display: grid;
        grid-template-columns: 1fr 2fr;
        gap: 3.5rem;
        align-items: center;
        max-width: 1100px;
        margin: 0 auto;
      }
      @media (max-width: 768px) {
        .port-founder-grid {
          grid-template-columns: 1fr;
          gap: 2rem;
          text-align: center;
        }
      }
      .port-founder-avatar {
        width: 200px;
        height: 200px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--teal), var(--secondary-teal));
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 5rem;
        color: white;
        margin: 0 auto;
        box-shadow: var(--shadow-lg);
        border: 4px solid var(--bg-card);
      }
      .port-founder-story blockquote {
        font-style: italic;
        font-size: 1.15rem;
        color: var(--text-main);
        margin-bottom: 1.5rem;
        position: relative;
      }
      .port-founder-story blockquote::before {
        content: '“';
        font-size: 3rem;
        color: var(--teal);
        position: absolute;
        left: -1.75rem;
        top: -1.25rem;
        opacity: 0.3;
      }

      /* Architecture Section */
      .port-arch-box {
        background: var(--bg-card);
        border: 1px solid var(--border-glass);
        padding: 2rem;
        border-radius: 12px;
        margin-bottom: 2rem;
        box-shadow: var(--shadow-md);
      }
      
      /* Final Call to Action */
      .port-final-cta {
        background: radial-gradient(circle at bottom, rgba(20, 184, 166, 0.15), transparent 60%),
                    linear-gradient(180deg, var(--bg-card) 0%, var(--bg-app) 100%);
        border-top: 1px solid var(--border-glass);
        padding: 7rem 1.5rem;
        text-align: center;
      }
      .port-final-cta-title {
        font-family: 'Outfit', sans-serif;
        font-size: 2.75rem;
        font-weight: 800;
        margin-bottom: 1rem;
        color: var(--text-main);
      }
      .port-final-cta-desc {
        color: var(--text-muted);
        font-size: 1.1rem;
        max-width: 600px;
        margin: 0 auto 2.5rem;
      }

      /* Timeline Roadmap */
      .port-roadmap-timeline {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        position: relative;
        padding-left: 2rem;
      }
      .port-roadmap-timeline::before {
        content: '';
        position: absolute;
        left: 7px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--border-input);
      }
      .port-roadmap-item {
        position: relative;
      }
      .port-roadmap-dot {
        position: absolute;
        left: -2rem;
        top: 0.25rem;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--bg-card);
        border: 3px solid var(--secondary-teal);
        z-index: 2;
      }
      .port-roadmap-item.completed .port-roadmap-dot {
        background: var(--secondary-teal);
      }
      .port-roadmap-item.current .port-roadmap-dot {
        background: var(--terracotta);
        border-color: var(--terracotta);
        box-shadow: 0 0 0 4px rgba(251, 146, 60, 0.2);
      }
      .port-roadmap-card {
        background: var(--bg-card);
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border-glass);
      }
      .port-roadmap-phase {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--secondary-teal);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.25rem;
      }
      .port-roadmap-card.current-card {
        border-color: rgba(251, 146, 60, 0.3);
      }
      .port-roadmap-card.current-card .port-roadmap-phase {
        color: var(--terracotta);
      }

      /* Animations */
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
    </style>

    <div class="port-wrapper">
      
      <!-- Top Sticky Navigation -->
      <header class="port-header">
        <a href="#/portfolio" class="port-logo">
          <span>🐾 PawTrace</span>
        </a>
        <nav class="port-nav">
          <a href="#portfolio-problem" class="port-nav-link">Market Need</a>
          <a href="#portfolio-features" class="port-nav-link">Product</a>
          <a href="#portfolio-revenue" class="port-nav-link">Business Model</a>
          <a href="#portfolio-comp" class="port-nav-link">Comparison</a>
          <a href="#portfolio-gallery" class="port-nav-link">Screenshots</a>
          <a href="#portfolio-tech" class="port-nav-link">Architecture</a>
          <a href="#portfolio-contact" class="port-nav-link">Contact</a>
        </nav>
        <a href="${launchHref}" class="port-cta-btn">${launchText}</a>
      </header>

      <!-- Hero Section -->
      <section class="port-hero" id="portfolio-hero">
        <div class="port-hero-content">
          <div class="port-hero-badge">
            <i class="fa-solid fa-rocket" style="color:var(--terracotta);"></i> Now Raising Seed Round
          </div>
          <h1 class="port-hero-title">Unified Safety & Digital Care Network for Pets</h1>
          <p class="port-hero-subtitle">
            PawTrace connects pet parents, veterinary clinics, and animal rescue organizations into a single, mobile-first cloud ecosystem driven by smart geolocated QR collars.
          </p>
          <div class="port-hero-actions">
            <a href="${launchHref}" class="port-btn port-btn-accent">
              <i class="fa-solid fa-play"></i> Launch Demo
            </a>
            <a href="#portfolio-problem" class="port-btn port-btn-secondary">
               Review Pitch Details
            </a>
          </div>
        </div>
        <div class="port-hero-preview">
          <div class="port-hero-mockup">
            <div class="port-hero-mockup-header">
              <div class="port-hero-mockup-dots">
                <span class="port-hero-mockup-dot"></span>
                <span class="port-hero-mockup-dot"></span>
                <span class="port-hero-mockup-dot"></span>
              </div>
              <div class="port-hero-mockup-title">🐾 PawTrace Cloud Portal</div>
            </div>
            <div class="port-gallery-img-container" style="height: 250px;">
               <img src="assets/screenshots/owner_portal_desktop.png" alt="Owner Dashboard Desktop" class="port-gallery-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
               <div class="port-gallery-fallback" style="display:none; height:100%; width:100%; align-items:center; justify-content:center; flex-direction:column; background: linear-gradient(135deg, var(--teal), var(--secondary-teal)); color:white;">
                 <i class="fa-solid fa-chart-line" style="font-size:3rem;"></i>
                 <span style="font-size:0.8rem; margin-top:0.5rem; font-weight:700;">Live Dashboard View</span>
               </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Impact Metrics Section -->
      <section class="port-section" style="padding-top:0; padding-bottom:3rem;">
        <div class="port-metrics-container">
          <div class="port-metrics-grid">
            <div class="port-metric-item">
              <h3 style="font-size: 1.6rem; line-height: 1.2; background: none; -webkit-text-fill-color: initial; color: white;">India-First Platform</h3>
              <p style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.9;">Tailored for Indian pet parents, NGOs, and vets</p>
            </div>
            <div class="port-metric-item">
              <h3 style="font-size: 1.6rem; line-height: 1.2; background: none; -webkit-text-fill-color: initial; color: white;">Multi-Portal Ecosystem</h3>
              <p style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.9;">Role-based workspaces for all caretakers</p>
            </div>
            <div class="port-metric-item">
               <h3 style="font-size: 1.6rem; line-height: 1.2; background: none; -webkit-text-fill-color: initial; color: white;">Smart Recovery Network</h3>
               <p style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.9;">Dynamic QR identity tags without battery reliance</p>
            </div>
            <div class="port-metric-item">
               <h3 style="font-size: 1.6rem; line-height: 1.2; background: none; -webkit-text-fill-color: initial; color: white;">Built for Scale</h3>
               <p style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.9;">Cloud architecture ready for expansion</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Why India Needs PawTrace Section -->
      <section class="port-section" id="portfolio-problem">
        <div class="port-section-header">
          <h2 class="port-section-title">Why India Needs PawTrace</h2>
          <p class="port-section-desc">Dense urban cities, a fragmented care ecosystem, and silent veterinary records present unique challenges for Indian pet parenting and animal rescue.</p>
        </div>
        <div class="port-problem-solution">
          <div class="port-problem-box">
            <h3><i class="fa-solid fa-triangle-exclamation"></i> Critical Market Challenges</h3>
            <p style="color:var(--text-muted); font-size: 0.95rem;">
              India's pet care ecosystem is growing rapidly but faces severe infrastructural challenges that put pets and street animals at risk:
            </p>
            <ul class="port-problem-bullets">
              <li><strong>Dense Urban Environments:</strong> Overcrowded streets and high traffic make losing a pet in cities like Bengaluru, Mumbai, or Delhi a high-risk event, with minimal chances of physical recovery.</li>
              <li><strong>Fragmented Rescue & Foster Networks:</strong> NGOs, community rescuers, and foster homes operate in silos, making the tracking and coordination of street rescues highly inefficient.</li>
              <li><strong>Lack of Unified Medical Records:</strong> Pet health histories are scattered across paper prescriptions, making transfers to emergency veterinary clinics complicated and error-prone.</li>
              <li><strong>Limited Adoption Transparency:</strong> Lack of digital verification creates friction in matching rescue animals with verified foster networks and new pet parents.</li>
              <li><strong>Coordination Friction:</strong> No centralized digital loop exists to instantly coordinate pet parents, veterinary clinics, rescuers, and animal rescue organizations.</li>
            </ul>
          </div>
          
          <div class="port-solution-box">
            <h3><i class="fa-solid fa-circle-check"></i> The PawTrace Ecosystem</h3>
            <p style="color:var(--text-muted); font-size: 0.95rem;">
              PawTrace bridges these gaps by introducing a dynamic, zero-cost digital net that binds the entire community together:
            </p>
            <ul class="port-solution-bullets">
              <li><strong>Dynamic Geolocation Tags:</strong> Instant GPS scans alert pet parents of their pet's precise coordinates without battery reliance.</li>
              <li><strong>Collaborative Portals:</strong> Specialized workspaces for pet parents, veterinary clinics, and rescue organizations to interact in real time.</li>
              <li><strong>Centralized Cloud Medical Logs:</strong> Verified digital immunization records and prescriptions accessible via a quick scan.</li>
              <li><strong>Transparent Adoption Workflows:</strong> Streamlined rescue intakes and digital ownership transfers via secure Firestore state transitions.</li>
              <li><strong>Instant Network Coordination:</strong> Automated notification alerts connecting vets, rescuers, and pet parents instantly during emergencies.</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Product Walkthrough Section -->
      <section class="port-section" id="portfolio-walkthrough" style="background: rgba(var(--secondary-teal-rgb), 0.01);">
        <div class="port-section-header">
          <h2 class="port-section-title">Product Walkthrough</h2>
          <p class="port-section-desc">An intuitive, automated recovery process requiring no pre-installed finder apps.</p>
        </div>
        <div class="port-walk-grid">
          <div class="port-walk-step">
            <span class="port-walk-badge">1</span>
            <h4 style="margin: 0.5rem 0 0.5rem; font-family:'Outfit';">QR Collar Scanned</h4>
            <p style="color:var(--text-muted); font-size:0.85rem;">
              A finder spots a lost companion and scans the QR tag on their collar. An instant mobile-optimized page loads without requiring any registration or app download.
            </p>
          </div>
          <div class="port-walk-step">
            <span class="port-walk-badge">2</span>
            <h4 style="margin: 0.5rem 0 0.5rem; font-family:'Outfit';">Location Access Approved</h4>
            <p style="color:var(--text-muted); font-size:0.85rem;">
              The finder's mobile browser prompts for location access. If approved, high-precision GPS coordinates are securely packaged and sent.
            </p>
          </div>
          <div class="port-walk-step">
            <span class="port-walk-badge">3</span>
            <h4 style="margin: 0.5rem 0 0.5rem; font-family:'Outfit';">Owner Alerted Instantly</h4>
            <p style="color:var(--text-muted); font-size:0.85rem;">
              Firestore triggers an instant push notification on the pet parent's dashboard, displaying scan logs and Google Maps location pinpoints.
            </p>
          </div>
          <div class="port-walk-step">
            <span class="port-walk-badge">4</span>
            <h4 style="margin: 0.5rem 0 0.5rem; font-family:'Outfit';">Direct Call Contact</h4>
            <p style="color:var(--text-muted); font-size:0.85rem;">
              The scan page displays the owner's emergency contact with a click-to-call button so the finder can immediately telephone them (no finder personal data is collected).
            </p>
          </div>
        </div>
      </section>

      <!-- Market Size Section -->
      <section class="port-section" id="portfolio-market">
        <div class="port-section-header">
          <h2 class="port-section-title">Market Opportunity</h2>
          <p class="port-section-desc">Positioned at the intersection of India's rapid pet tech growth and globally scalable cloud SaaS.</p>
        </div>
        <div class="port-market-grid">
          <div class="port-market-visuals">
            <div class="port-market-bar tam">
              <span class="port-market-bar-label">Total Addressable Market (Global Pet Care)</span>
              <span class="port-market-bar-value">$261B</span>
            </div>
            <div class="port-market-bar sam">
              <span class="port-market-bar-label">Serviceable Addressable Market (Pet Tech & Safety)</span>
              <span class="port-market-bar-value">$3.5B</span>
            </div>
            <div class="port-market-bar som">
              <span class="port-market-bar-label">Serviceable Obtainable Market (Target Year-3 Capture)</span>
              <span class="port-market-bar-value">$820M</span>
            </div>
          </div>
          <div class="port-about-card" style="background: rgba(var(--secondary-teal-rgb), 0.015);">
            <h3>Strategic Growth Sectors</h3>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">
              Pet care spending displays strong resilience. Digital identifiers and integrated care models are rapidly replacing static paper processes.
            </p>
            <div style="font-size:0.8rem; display:flex; flex-direction:column; gap:0.5rem;">
              <div style="display:flex; justify-content:space-between; font-weight:600; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.25rem;">
                <span>Pet Parents (India Market)</span>
                <span>Fastest Growing Segment</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-weight:600; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.25rem;">
                <span>Veterinary Clinics & Networks</span>
                <span>Expanding Nationwide</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-weight:600; border-bottom: 1px solid var(--border-glass); padding-bottom: 0.25rem;">
                <span>NGOs & Rescue Networks</span>
                <span>Active Indian Rescuer Space</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Revenue Model Section -->
      <section class="port-section" id="portfolio-revenue" style="background: rgba(var(--terracotta-rgb), 0.015);">
        <div class="port-section-header">
          <h2 class="port-section-title">The Business Model</h2>
          <p class="port-section-desc">Diversified recurring revenue flows serving consumers, animal rescue organizations, and veterinary networks.</p>
        </div>
        <div class="port-revenue-grid">
          <div class="port-revenue-card">
            <div>
              <span class="port-revenue-tier">Smart Tag</span>
              <h3 class="port-revenue-price">₹299<span>/ tag</span></h3>
              <p style="font-size: 0.85rem; color:var(--teal); font-weight: 700; margin-bottom: 0.5rem;">[ Fully Functional ]</p>
              <p style="font-size: 0.85rem; color:var(--text-muted);">Smart QR Collar Tag sales shipped to consumer portals.</p>
              <ul class="port-revenue-features">
                <li>Dynamic QR Tag Activation</li>
                <li>Free lifetime basic scan alerts</li>
                <li>Digital Medical Log storage</li>
              </ul>
            </div>
            <button class="btn btn-secondary btn-full" onclick="alert('Pricing models listed for investor presentation.')">Review Hardware Spec</button>
          </div>
          
          <div class="port-revenue-card" style="border-color: var(--teal); box-shadow: var(--shadow-lg);">
            <div>
              <span class="port-revenue-tier" style="color:var(--teal);">Premium Plan</span>
               <h3 class="port-revenue-price">₹99<span>/ month</span></h3>
              <p style="font-size: 0.85rem; color:var(--terracotta); font-weight: 700; margin-bottom: 0.5rem;">[ Planned Expansion Tier ]</p>
              <p style="font-size: 0.85rem; color:var(--text-muted);">Monthly subscription unlocking analytics and recovery fallbacks.</p>
              <ul class="port-revenue-features">
                <li>Predictive Analytics & Client-Side Heuristics (Beta)</li>
                <li>Customized Wellness Alerts & Weight Trajectories</li>
                <li>SMS/Email recovery notifications</li>
                <li>Multi-user Caregiver access keys</li>
              </ul>
            </div>
            <button class="btn btn-primary btn-full" style="background:var(--teal);" onclick="alert('Pricing models listed for investor presentation.')">Review Consumer Features</button>
          </div>
          
          <div class="port-revenue-card">
            <div>
              <span class="port-revenue-tier">NGO/Vet SaaS</span>
               <h3 class="port-revenue-price">₹999<span>/ month</span></h3>
              <p style="font-size: 0.85rem; color:var(--terracotta); font-weight: 700; margin-bottom: 0.5rem;">[ Planned Expansion Tier ]</p>
              <p style="font-size: 0.85rem; color:var(--text-muted);">Veterinary clinic dashboards and NGO intake management suites.</p>
              <ul class="port-revenue-features">
                <li>Clinic prescription signatures API</li>
                <li>Animal rescue organization bulk dashboards</li>
                <li>Ownership transfer verification tools</li>
                <li>Priority technical support</li>
              </ul>
            </div>
            <button class="btn btn-secondary btn-full" onclick="alert('Pricing models listed for investor presentation.')">Review B2B Portal Spec</button>
          </div>
        </div>
      </section>

      <!-- Competitive Advantage Matrix Section -->
      <section class="port-section" id="portfolio-comp">
        <div class="port-section-header">
          <h2 class="port-section-title">Competitive Advantage</h2>
          <p class="port-section-desc">Why PawTrace represents a quantum leap in pet identification and community care.</p>
        </div>
        
        <div class="port-comp-table-wrapper">
          <table class="port-comp-table">
            <thead>
              <tr>
                <th>Product Feature</th>
                <th style="color: var(--teal); font-weight:800;">PawTrace Ecosystem</th>
                <th>Traditional Microchips</th>
                <th>Standard Metal Tags</th>
                <th>Active GPS Trackers</th>
              </tr>
            </thead>
            <tbody>
              <tr class="highlight">
                <td><strong>No Recharge Required</strong></td>
                <td class="check">✓ Yes</td>
                <td class="check">✓ Yes</td>
                <td class="check">✓ Yes</td>
                <td class="cross">✗ No (Requires charging)</td>
              </tr>
              <tr>
                <td><strong>Instant GPS Localization</strong></td>
                <td class="check">✓ Yes (Scan triggers GPS)</td>
                <td class="cross">✗ No (Veterinary clinic scan only)</td>
                <td class="cross">✗ No</td>
                <td class="check">✓ Yes</td>
              </tr>
              <tr class="highlight">
                <td><strong>Integrated Veterinary Clinic Medical Records</strong></td>
                <td class="check">✓ Yes</td>
                <td class="cross">✗ No</td>
                <td class="cross">✗ No</td>
                <td class="cross">✗ No</td>
              </tr>
              <tr>
                <td><strong>Adoption Transfer Automation</strong></td>
                <td class="check">✓ Yes</td>
                <td class="cross">✗ No</td>
                <td class="cross">✗ No</td>
                <td class="cross">✗ No</td>
              </tr>
              <tr class="highlight">
                <td><strong>Zero Subscription Fee Options</strong></td>
                <td class="check">✓ Yes</td>
                <td class="check">✓ Yes</td>
                <td class="check">✓ Yes</td>
                <td class="cross">✗ No (High monthly fees)</td>
              </tr>
              <tr>
                <td><strong>Temporary Caregiver Portals</strong></td>
                <td class="check">✓ Yes</td>
                <td class="cross">✗ No</td>
                <td class="cross">✗ No</td>
                <td class="cross">✗ No</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Original Core Features Section -->
      <section class="port-section" id="portfolio-features" style="background: rgba(var(--secondary-teal-rgb), 0.01);">
        <div class="port-section-header">
          <h2 class="port-section-title">Functional Features Architecture</h2>
          <p class="port-section-desc">Tailored operational boards engineered for all stakeholders in the pet care ecosystem.</p>
        </div>
        
        <div class="port-portal-tabs" id="portal-tabs-container">
          <button class="port-portal-tab active" data-portal="owner" onclick="window.switchPortalTab('owner')">Pet Owner Portal</button>
          <button class="port-portal-tab" data-portal="vet" onclick="window.switchPortalTab('vet')">Veterinary Portal</button>
          <button class="port-portal-tab" data-portal="ngo" onclick="window.switchPortalTab('ngo')">NGO Rescue Portal</button>
          <button class="port-portal-tab" data-portal="admin" onclick="window.switchPortalTab('admin')">Admin Console</button>
        </div>

        <div class="port-portal-content" id="portal-content-box">
          <!-- Dynamic portal layout loaded below -->
        </div>
      </section>

      <!-- Ecosystem Impact Section -->
      <section class="port-section" id="portfolio-impact" style="background: rgba(var(--terracotta-rgb), 0.01); border-top: 1px solid var(--border-glass);">
        <div class="port-section-header">
          <h2 class="port-section-title">Ecosystem Impact</h2>
          <p class="port-section-desc">Connecting every role in the care loop to ensure absolute safety, transparent health tracking, and coordinated rescue efforts.</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 2rem;">
          <div style="background: var(--bg-card); border: 1px solid var(--border-glass); padding: 2rem; border-radius: 12px; box-shadow: var(--shadow-sm); display: flex; gap: 1rem; align-items: flex-start;">
            <div style="font-size: 1.5rem; color: var(--teal); background: rgba(var(--teal-rgb), 0.1); padding: 0.75rem; border-radius: 8px;"><i class="fa-solid fa-house-chimney-user"></i></div>
            <div>
              <h4 style="font-family: 'Outfit'; margin-bottom: 0.5rem; color: var(--text-main);">Pet Owners</h4>
              <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5;">Protect companions with low-cost geolocated tags, secure medical data, and get instant scan maps during emergencies.</p>
            </div>
          </div>
          <div style="background: var(--bg-card); border: 1px solid var(--border-glass); padding: 2rem; border-radius: 12px; box-shadow: var(--shadow-sm); display: flex; gap: 1rem; align-items: flex-start;">
            <div style="font-size: 1.5rem; color: var(--secondary-teal); background: rgba(var(--secondary-teal-rgb), 0.1); padding: 0.75rem; border-radius: 8px;"><i class="fa-solid fa-user-doctor"></i></div>
            <div>
              <h4 style="font-family: 'Outfit'; margin-bottom: 0.5rem; color: var(--text-main);">Veterinarians</h4>
              <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5;">Access verified medical records instantly, log digitised vaccination cards, and issue secure digital prescriptions.</p>
            </div>
          </div>
          <div style="background: var(--bg-card); border: 1px solid var(--border-glass); padding: 2rem; border-radius: 12px; box-shadow: var(--shadow-sm); display: flex; gap: 1rem; align-items: flex-start;">
            <div style="font-size: 1.5rem; color: var(--terracotta); background: rgba(var(--terracotta-rgb), 0.1); padding: 0.75rem; border-radius: 8px;"><i class="fa-solid fa-handshake-angle"></i></div>
            <div>
              <h4 style="font-family: 'Outfit'; margin-bottom: 0.5rem; color: var(--text-main);">NGOs</h4>
              <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5;">Streamline rescue intakes, monitor foster availability, manage rehabilitation milestones, and clear adoption checks.</p>
            </div>
          </div>
          <div style="background: var(--bg-card); border: 1px solid var(--border-glass); padding: 2rem; border-radius: 12px; box-shadow: var(--shadow-sm); display: flex; gap: 1rem; align-items: flex-start;">
            <div style="font-size: 1.5rem; color: var(--teal); background: rgba(var(--teal-rgb), 0.1); padding: 0.75rem; border-radius: 8px;"><i class="fa-solid fa-hand-holding-hand"></i></div>
            <div>
              <h4 style="font-family: 'Outfit'; margin-bottom: 0.5rem; color: var(--text-main);">Caregivers</h4>
              <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5;">Access temporary, secure read-only profiles for vaccine records and reminder notes without credential sharing.</p>
            </div>
          </div>
          <div style="background: var(--bg-card); border: 1px solid var(--border-glass); padding: 2rem; border-radius: 12px; box-shadow: var(--shadow-sm); display: flex; gap: 1rem; align-items: flex-start;">
            <div style="font-size: 1.5rem; color: var(--secondary-teal); background: rgba(var(--secondary-teal-rgb), 0.1); padding: 0.75rem; border-radius: 8px;"><i class="fa-solid fa-paste"></i></div>
            <div>
              <h4 style="font-family: 'Outfit'; margin-bottom: 0.5rem; color: var(--text-main);">Adopters</h4>
              <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5;">Submit digital questionnaires, view verified backgrounds, and complete instant legal ownership transfers.</p>
            </div>
          </div>
          <div style="background: var(--bg-card); border: 1px solid var(--border-glass); padding: 2rem; border-radius: 12px; box-shadow: var(--shadow-sm); display: flex; gap: 1rem; align-items: flex-start;">
            <div style="font-size: 1.5rem; color: var(--terracotta); background: rgba(var(--terracotta-rgb), 0.1); padding: 0.75rem; border-radius: 8px;"><i class="fa-solid fa-user-shield"></i></div>
            <div>
              <h4 style="font-family: 'Outfit'; margin-bottom: 0.5rem; color: var(--text-main);">Administrators</h4>
              <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5;">Fulfill collar tag serial orders, audit registered user safety scopes, and verify veterinary and NGO licenses.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Real Screenshots Gallery Section -->
      <section class="port-section" id="portfolio-gallery">
        <div class="port-section-header">
          <h2 class="port-section-title">Ecosystem Screen Gallery</h2>
          <p class="port-section-desc">Real portal screenshots demonstrating responsive layouts and responsive card listings.</p>
        </div>
        <div class="port-gallery-grid">
          
          <div class="port-gallery-card">
            <div class="port-gallery-img-container">
              <img src="assets/screenshots/owner_portal_desktop.png" alt="Owner Dashboard Desktop" class="port-gallery-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="port-gallery-fallback" style="display:none; height:100%; width:100%; align-items:center; justify-content:center;">
                <i class="fa-solid fa-chart-line"></i>
              </div>
            </div>
            <div class="port-gallery-info">
              <h4>Owner Dashboard (Desktop)</h4>
              <p>Centralized view showing recent recovery tag scans on Leaflet maps, vaccine charts, and status triggers.</p>
            </div>
          </div>
          
          <div class="port-gallery-card">
            <div class="port-gallery-img-container">
              <img src="assets/screenshots/owner_portal_mobile.png" alt="Owner Dashboard Mobile" class="port-gallery-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="port-gallery-fallback" style="display:none; height:100%; width:100%; align-items:center; justify-content:center;">
                <i class="fa-solid fa-mobile-screen-button"></i>
              </div>
            </div>
            <div class="port-gallery-info">
              <h4>Owner Dashboard (Mobile)</h4>
              <p>Compact, one-handed mobile dashboards displaying companions grid and urgent recovery logs.</p>
            </div>
          </div>
          
          <div class="port-gallery-card">
            <div class="port-gallery-img-container">
              <img src="assets/screenshots/vet_portal_desktop.png" alt="Veterinary Dashboard Desktop" class="port-gallery-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="port-gallery-fallback" style="display:none; height:100%; width:100%; align-items:center; justify-content:center;">
                <i class="fa-solid fa-user-doctor"></i>
              </div>
            </div>
            <div class="port-gallery-info">
              <h4>Veterinary Clinic Board</h4>
              <p>Authorized patient record directories, vaccine schedules, and medication diagnostic logs.</p>
            </div>
          </div>
          
          <div class="port-gallery-card">
            <div class="port-gallery-img-container">
              <img src="assets/screenshots/ngo_portal_desktop.png" alt="NGO Portal Desktop" class="port-gallery-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="port-gallery-fallback" style="display:none; height:100%; width:100%; align-items:center; justify-content:center;">
                <i class="fa-solid fa-handshake-angle"></i>
              </div>
            </div>
            <div class="port-gallery-info">
              <h4>NGO Rescue Hub</h4>
              <p>Stray intakes tracking, foster coordinates directories, and adoption clearance approvals.</p>
            </div>
          </div>

          <div class="port-gallery-card">
            <div class="port-gallery-img-container">
              <img src="assets/screenshots/admin_portal_desktop.png" alt="Admin Dashboard Desktop" class="port-gallery-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="port-gallery-fallback" style="display:none; height:100%; width:100%; align-items:center; justify-content:center;">
                <i class="fa-solid fa-lock"></i>
              </div>
            </div>
            <div class="port-gallery-info">
              <h4>Admin Console Control</h4>
              <p>Fulfill collar shipments, verified license approvals, and broadcast emergency updates.</p>
            </div>
          </div>

          <div class="port-gallery-card">
            <div class="port-gallery-img-container">
              <img src="assets/screenshots/adoption_center_desktop.png" alt="Adoption Center Desktop" class="port-gallery-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="port-gallery-fallback" style="display:none; height:100%; width:100%; align-items:center; justify-content:center;">
                <i class="fa-solid fa-shield-heart"></i>
              </div>
            </div>
            <div class="port-gallery-info">
              <h4>Adoption Marketplace</h4>
              <p>Responsive public marketplace allowing pet lovers to browse and apply for adoptions.</p>
            </div>
          </div>

          <div class="port-gallery-card">
            <div class="port-gallery-img-container">
              <img src="assets/screenshots/caregiver_portal_desktop.png" alt="Caregiver Portal Desktop" class="port-gallery-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="port-gallery-fallback" style="display:none; height:100%; width:100%; align-items:center; justify-content:center;">
                <i class="fa-solid fa-hands-holding-child"></i>
              </div>
            </div>
            <div class="port-gallery-info">
              <h4>Caregiver Dashboard</h4>
              <p>Tokenized logs detailing vaccine times, feeding notes, and vet contacts for temporary sitters.</p>
            </div>
          </div>

          <div class="port-gallery-card">
            <div class="port-gallery-img-container">
              <img src="assets/screenshots/admin_portal_mobile.png" alt="Admin Portal Mobile" class="port-gallery-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
              <div class="port-gallery-fallback" style="display:none; height:100%; width:100%; align-items:center; justify-content:center;">
                <i class="fa-solid fa-mobile-screen"></i>
              </div>
            </div>
            <div class="port-gallery-info">
              <h4>Admin Console (Mobile)</h4>
              <p>Responsive mobile verification layouts allowing staff-on-the-go checks.</p>
            </div>
          </div>
          
        </div>
      </section>

      <!-- Technical Architecture Sections -->
      <section class="port-section" id="portfolio-tech">
        <div class="port-section-header">
          <h2 class="port-section-title">The Engineering Layer</h2>
          <p class="port-section-desc">High-performing tech stacks and secure schema protocols built on serverless architectures.</p>
        </div>
        <div class="port-tech-grid" style="margin-bottom:3rem;">
          <div class="port-tech-pill"><i class="fa-brands fa-html5" style="color:#e34f26;"></i>HTML5</div>
          <div class="port-tech-pill"><i class="fa-brands fa-css3-alt" style="color:#1572b6;"></i>CSS3</div>
          <div class="port-tech-pill"><i class="fa-brands fa-js" style="color:#f7df1e;"></i>JavaScript</div>
          <div class="port-tech-pill"><i class="fa-solid fa-fire" style="color:#ffca28;"></i>Firebase Auth</div>
          <div class="port-tech-pill"><i class="fa-solid fa-database" style="color:#ffca28;"></i>Firestore DB</div>
          <div class="port-tech-pill"><i class="fa-solid fa-cloud-arrow-up" style="color:#1a73e8;"></i>Firebase Host</div>
          <div class="port-tech-pill"><i class="fa-solid fa-map" style="color:#7ab55c;"></i>Leaflet Maps</div>
          <div class="port-tech-pill"><i class="fa-solid fa-chart-line" style="color:#ff6384;"></i>Chart.js</div>
        </div>

        <div class="port-arch-box">
          <h4 style="margin-bottom: 1rem; color: var(--teal);"><i class="fa-solid fa-network-wired"></i> Multi-Portal Access Control Architecture</h4>
          <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.6;">
            Our layout utilizes a single index wrapper shell that controls access gates dynamically. Sub-routes check database role constraints before executing templates.
            <div style="display:flex; flex-wrap: wrap; gap: 1rem; margin-top: 1.5rem; justify-content: center;">
              <div style="padding: 0.75rem; background: var(--bg-app); border: 1px solid var(--border-glass); border-radius: 6px; text-align: center; min-width: 150px;">
                <strong>Client View Router</strong>
                <p style="font-size:0.75rem; color: var(--text-muted);">SPA Hash Listener</p>
              </div>
              <div style="display: flex; align-items: center; justify-content: center; color: var(--text-muted);"><i class="fa-solid fa-arrow-right"></i></div>
              <div style="padding: 0.75rem; background: var(--bg-app); border: 1px solid var(--border-glass); border-radius: 6px; text-align: center; min-width: 150px;">
                <strong>Role Filter Gateway</strong>
                <p style="font-size:0.75rem; color: var(--text-muted);">Firestore Role Match</p>
              </div>
              <div style="display: flex; align-items: center; justify-content: center; color: var(--text-muted);"><i class="fa-solid fa-arrow-right"></i></div>
              <div style="padding: 0.75rem; background: var(--bg-app); border: 1px solid var(--border-glass); border-radius: 6px; text-align: center; min-width: 180px; border-color: var(--teal);">
                <strong>Portal Workspaces</strong>
                <p style="font-size:0.75rem; color: var(--teal); font-weight: 700;">Owner / Vet / NGO / Admin</p>
              </div>
            </div>
          </div>
        </div>

        <div class="port-arch-box">
          <h4 style="margin-bottom: 1rem; color: var(--terracotta);"><i class="fa-solid fa-database"></i> Database Schema Map (Firestore)</h4>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
            Firestore organizes records under root collections with linked sub-collections, enabling low-latency queries and real-time synchronizations.
          </p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1rem; font-size: 0.8rem; text-align: left;">
            <div style="padding: 1rem; background: var(--bg-app); border-radius: 8px; border-left: 4px solid var(--teal);">
              <strong>users & notifications</strong>
              <div style="color:var(--text-muted); font-size: 0.75rem; margin-top: 0.25rem;">Stores user accounts, roles (owner, vet, ngo, admin), and sub-collection: <code>notifications</code>.</div>
            </div>
            <div style="padding: 1rem; background: var(--bg-app); border-radius: 8px; border-left: 4px solid var(--secondary-teal);">
              <strong>pets & sub-collections</strong>
              <div style="color:var(--text-muted); font-size: 0.75rem; margin-top: 0.25rem;">Companion records, lost statuses, and QR tags. Sub-collections: <code>medical_records</code>, <code>reminders</code>, <code>journal_entries</code>, <code>scans</code>.</div>
            </div>
            <div style="padding: 1rem; background: var(--bg-app); border-radius: 8px; border-left: 4px solid var(--terracotta);">
              <strong>rescued_animals</strong>
              <div style="color:var(--text-muted); font-size: 0.75rem; margin-top: 0.25rem;">Handles stray intakes, rehabilitation logs, vaccine milestone logs, foster placements, and volunteer assignments.</div>
            </div>
            <div style="padding: 1rem; background: var(--bg-app); border-radius: 8px; border-left: 4px solid #3b82f6;">
              <strong>adoptions & adoption_applications</strong>
              <div style="color:var(--text-muted); font-size: 0.75rem; margin-top: 0.25rem;">Manages adoptable pet profiles, adopter questionnaires, checklist audits, and ownership transfer transactions.</div>
            </div>
            <div style="padding: 1rem; background: var(--bg-app); border-radius: 8px; border-left: 4px solid #8b5cf6;">
              <strong>caregiver_tokens & appointments</strong>
              <div style="color:var(--text-muted); font-size: 0.75rem; margin-top: 0.25rem;">Manages temporary sitter credentials (reminders, journal write scopes) and veterinarian clinic session schedules.</div>
            </div>
            <div style="padding: 1rem; background: var(--bg-app); border-radius: 8px; border-left: 4px solid #ec4899;">
              <strong>orders, profiles & vetAccess</strong>
              <div style="color:var(--text-muted); font-size: 0.75rem; margin-top: 0.25rem;">Handles smart tag orders (₹299), doctor/NGO profiles (<code>vetProfiles</code>, <code>ngoProfiles</code>), and permissions ledger (<code>vetAccess</code>).</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Security Features Section -->
      <section class="port-section">
        <div class="port-section-header">
          <h2 class="port-section-title">Security & Encryption</h2>
          <p class="port-section-desc">Defending privacy and preventing unauthorized medical modifications at all stages.</p>
        </div>
        <div class="port-about-grid">
          <div class="port-about-card">
            <i class="fa-solid fa-user-lock" style="font-size:1.5rem; color:var(--teal);"></i>
            <h4 style="margin: 0.75rem 0 0.5rem;">Role-Based Access (RBAC)</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem;">
              Client side paths and server side Firestore rules restrict users. Vets cannot access NGO intake modules; owners cannot write to vet diagnostic fields.
            </p>
          </div>
          <div class="port-about-card">
            <i class="fa-solid fa-clipboard-check" style="font-size:1.5rem; color:var(--secondary-teal);"></i>
            <h4 style="margin: 0.75rem 0 0.5rem;">Vet Verification Loop</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem;">
              Vets registering on PawTrace cannot search records until admins verify licenses. Once verified, pet parents grant explicit write consent to veterinary clinics.
            </p>
          </div>
          <div class="port-about-card">
            <i class="fa-solid fa-key" style="font-size:1.5rem; color:var(--terracotta);"></i>
            <h4 style="margin: 0.75rem 0 0.5rem;">Caregiver Tokens</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem;">
              Pet parents invite pet sitters via hash-tokens. These tokens grant temporary read permissions to essential logs and automatically expire after a set time.
            </p>
          </div>
        </div>
      </section>

      <!-- Built in India, Designed for the World Section -->
      <section class="port-section" id="portfolio-built-in-india" style="background: rgba(var(--teal-rgb), 0.02); border-top: 1px solid var(--border-glass); border-bottom: 1px solid var(--border-glass);">
        <div class="port-section-header">
          <h2 class="port-section-title">Built in India, Designed for the World</h2>
          <p class="port-section-desc">Proudly developed in India to solve local challenges while scaling on a global architecture.</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; margin-top: 2rem;">
          <div style="background: var(--bg-card); border: 1px solid var(--border-glass); padding: 2rem; border-radius: 12px; box-shadow: var(--shadow-sm);">
            <div style="font-size: 2rem; margin-bottom: 1rem; color: var(--teal);"><i class="fa-solid fa-flag"></i></div>
            <h4 style="font-family: 'Outfit'; margin-bottom: 0.5rem;">Indian Roots & Innovation</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">
              Founded and developed in India, PawTrace addresses the real-world complexities of pet parenting and animal rescue in dense, fast-moving South Asian urban settings.
            </p>
          </div>
          <div style="background: var(--bg-card); border: 1px solid var(--border-glass); padding: 2rem; border-radius: 12px; box-shadow: var(--shadow-sm);">
            <div style="font-size: 2rem; margin-bottom: 1rem; color: var(--secondary-teal);"><i class="fa-solid fa-people-group"></i></div>
            <h4 style="font-family: 'Outfit'; margin-bottom: 0.5rem;">For the Local Community</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">
              Engineered specifically for Indian pet parents, veterinary clinics, street animal rescuers, NGOs, and caregivers, fostering collaboration without barriers.
            </p>
          </div>
          <div style="background: var(--bg-card); border: 1px solid var(--border-glass); padding: 2rem; border-radius: 12px; box-shadow: var(--shadow-sm);">
            <div style="font-size: 2rem; margin-bottom: 1rem; color: var(--terracotta);"><i class="fa-solid fa-globe"></i></div>
            <h4 style="font-family: 'Outfit'; margin-bottom: 0.5rem;">Globally Scalable Architecture</h4>
            <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">
              Built on a cloud-native, serverless framework that is globally scalable, allowing seamless expansion to South Asia and international markets.
            </p>
          </div>
        </div>
      </section>

      <!-- Founder Story / Vision Section -->
      <section class="port-section port-founder-section" id="portfolio-founder">
        <div class="port-founder-grid">
          <div class="port-founder-avatar">🐾</div>
          <div class="port-founder-story">
            <blockquote>
              We built PawTrace after coordinating local street rescues in India and realizing how fragmented pet safety and animal rescue coordination really is. A static collar tag displaying one number or a heavy battery-powered tracker isn't enough for dense Indian cities. We needed a circular, geolocated net that coordinates veterinary clinics, rescue organizations, and pet parents at zero subscriber friction.
            </blockquote>
            <h4 style="font-family: 'Outfit'; margin-bottom: 0.25rem;">Nithin S Shetty</h4>
            <p style="font-size: 0.85rem; color: var(--text-muted); font-weight:700;">Founder & Creator of PawTrace | Full Stack Developer</p>
          </div>
        </div>
      </section>

      <!-- Future Roadmap Section -->
      <section class="port-section" id="portfolio-roadmap">
        <div class="port-section-header">
          <h2 class="port-section-title">Future Expansion Roadmap</h2>
          <p class="port-section-desc">Future expansions targeted to create a globally integrated pet safety network.</p>
        </div>
        <div class="port-roadmap-timeline">
          <div class="port-roadmap-item completed">
            <div class="port-roadmap-dot"></div>
            <div class="port-roadmap-card">
              <div class="port-roadmap-phase">Phase 1: Foundation (Completed)</div>
              <h4 style="margin: 0.25rem 0 0.5rem;">Unified Multi-Portal Infrastructure</h4>
              <p style="color: var(--text-muted); font-size: 0.85rem;">
                Configured Firestore indexes, role filters, QR scan handlers, and Leaflet Maps tracking loops.
              </p>
            </div>
          </div>
          <div class="port-roadmap-item current">
            <div class="port-roadmap-dot"></div>
            <div class="port-roadmap-card current-card">
              <div class="port-roadmap-phase">Phase 2: PWA & UX (Current)</div>
              <h4 style="margin: 0.25rem 0 0.5rem;">Mobile-First Layout Audits & Portfolios</h4>
              <p style="color: var(--text-muted); font-size: 0.85rem;">
                Eliminating horizontal scrolling, optimizing touch target clickpads, and launching the interactive landing showcase.
              </p>
            </div>
          </div>
          <div class="port-roadmap-item">
            <div class="port-roadmap-dot"></div>
            <div class="port-roadmap-card">
              <div class="port-roadmap-phase">Phase 3: hardware & consults (Next)</div>
              <h4 style="margin: 0.25rem 0 0.5rem;">GPS Smart Collars & Advanced Integrations</h4>
              <p style="color: var(--text-muted); font-size: 0.85rem; line-height: 1.5;">
                We are actively designing the following modules for future rollouts:
              </p>
              <ul style="color: var(--text-muted); font-size: 0.8rem; padding-left: 1.25rem; margin-top: 0.5rem; display:flex; flex-direction:column; gap:0.35rem;">
                <li><strong>GPS Hardware Integration:</strong> Lightweight collars linking low-energy BLE tags and hardware GPS beacons.</li>
                <li><strong>Predictive Health Monitoring:</strong> Behavior trackers warning users of rapid changes in steps or sleep patterns.</li>
                <li><strong>Emergency SOS Broadcasts:</strong> Quick notification streams alert all nearby animal rescue organizations and veterinary clinics when a tag is flagged missing.</li>
                <li><strong>Telemedicine Portal:</strong> In-app video channels for verified veterinarian consultations and triage notes.</li>
                <li><strong>NGO Network Expansion:</strong> Automated syndication of pet adoption listings across local NGO listings.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- Final Call to Action -->
      <section class="port-final-cta">
        <h2 class="port-final-cta-title">Ready to Secure Your Companion's Future?</h2>
        <p class="port-final-cta-desc">
          Join thousands of pet parents, verified veterinary clinics, and rescue organizations building a safer tomorrow.
        </p>
        <div style="display:flex; justify-content:center; gap:1.25rem; flex-wrap:wrap;">
          <a href="${launchHref}" class="port-btn port-btn-accent">
            <i class="fa-solid fa-rocket"></i> Get Started Free
          </a>
          <a href="mailto:nithinsshetty3@gmail.com" class="port-btn port-btn-secondary">
            <i class="fa-solid fa-envelope"></i> Contact for Partnerships
          </a>
        </div>
      </section>

      <!-- Contact / Footer Section -->
      <footer class="port-section" id="portfolio-contact" style="border-top: 1px solid var(--border-glass);">
        <div class="port-contact-container">
          <div class="port-contact-info">
            <h3>Contact Our Team</h3>
            <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.5;">
              PawTrace is built by Nithin S Shetty, a Full-Stack Software Developer specializing in building secure, modern, mobile-first cloud applications. Reach out to coordinate veterinary clinic verification integrations, NGO enrollments, or smart collar hardware syncs.
            </p>
            <div class="port-contact-links">
              <a href="mailto:nithinsshetty3@gmail.com" class="port-contact-link">
                <i class="fa-solid fa-envelope"></i> nithinsshetty3@gmail.com
              </a>
              <a href="https://www.linkedin.com/in/nithin-s-shetty-3a0267333/" target="_blank" rel="noopener noreferrer" class="port-contact-link">
                <i class="fa-brands fa-linkedin"></i> linkedin.com/in/nithin-s-shetty-3a0267333
              </a>
            </div>
          </div>
          <div style="background: var(--bg-card); padding: 2rem; border-radius: 12px; border: 1px solid var(--border-glass); box-shadow: var(--shadow-sm);">
            <h4 style="margin-bottom: 0.75rem;">Send Us a Message</h4>
            <div class="form-group" style="margin-bottom: 1rem;">
              <input type="text" class="form-control" placeholder="Your Name" style="font-size:0.85rem;">
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
              <input type="email" class="form-control" placeholder="Email Address" style="font-size:0.85rem;">
            </div>
            <div class="form-group" style="margin-bottom: 1rem;">
              <textarea class="form-control" placeholder="Your Message..." rows="3" style="font-size:0.85rem; resize:none;"></textarea>
            </div>
            <button class="btn btn-primary btn-full" onclick="alert('Thank you! We will get in touch soon.')">Send Message</button>
          </div>
        </div>
        <div style="text-align: center; margin-top: 4rem; font-size: 0.8rem; color: var(--text-muted);">
          &copy; 2026 PawTrace. All rights reserved. Made with 🐾 for pet safety.
        </div>
      </footer>

    </div>
  `;

  // Initialize interactive features
  window.switchPortalTab('owner');
}

/**
 * Handle switching tabs inside the features block
 */
window.switchPortalTab = function(portalKey) {
  const container = document.getElementById('portal-content-box');
  if (!container) return;

  // Update tabs buttons UI class
  const tabButtons = document.querySelectorAll('#portal-tabs-container .port-portal-tab');
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-portal') === portalKey) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Render matching content inside the box
  let html = '';
  
  if (portalKey === 'owner') {
    html = `
      <div class="port-portal-showcase">
        <div class="port-feature-list">
          <div class="port-feature-item">
            <i class="fa-solid fa-id-card"></i>
            <div>
              <strong>Companion Management</strong>
              <span>Track multiple pets with key traits, age, weight charts, and photos.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-notes-medical"></i>
            <div>
              <strong>Medical Records</strong>
              <span>Centralize vaccine logs, medical history documents, and allergies.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-clock"></i>
            <div>
              <strong>Reminders & Reminders Control</strong>
              <span>Configure alerts for upcoming medications, booster shots, and veterinary clinic checks.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-book"></i>
            <div>
              <strong>Growth Journal</strong>
              <span>Document weight tracking growth patterns and note active behavioral history.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-hands-holding-child"></i>
            <div>
              <strong>Caregiver Access Delegation</strong>
              <span>Grant temporary, tokenized read access to pet-sitters or family members.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-shield-halved"></i>
            <div>
              <strong>Vet Authorization Consent</strong>
              <span>Explicitly authorize specific veterinary clinics to review or append pet health records.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-qrcode"></i>
            <div>
              <strong>Smart Tag Activation</strong>
              <span>Configure QR endpoints, request finders for scan locations, and toggle tag safety states.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-location-dot"></i>
            <div>
              <strong>Lost & Found Board</strong>
              <span>Report missing pets, print lost posters, and display scanning reports on maps.</span>
            </div>
          </div>
        </div>
        
        <div class="port-mock-browser">
          <div class="port-mock-browser-header">
            <span class="port-mock-dot red"></span>
            <span class="port-mock-dot yellow"></span>
            <span class="port-mock-dot green"></span>
            <span class="port-mock-address">#/pets</span>
          </div>
          <div class="port-mock-body" style="background:#1e1e24;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem; margin-bottom:1rem;">
              <span>🐾 My Companions</span>
              <button style="background:var(--teal); color:white; border:none; padding:0.25rem 0.5rem; border-radius:4px; font-size:0.75rem;">+ Register Pet</button>
            </div>
            <div style="background:rgba(255,255,255,0.04); padding:0.75rem; border-radius:6px; border:1px solid rgba(255,255,255,0.08); display:flex; gap:0.75rem; align-items:center;">
              <div style="width:40px; height:40px; border-radius:50%; background:#1f7a8c; display:flex; align-items:center; justify-content:center; font-size:1.25rem;">🐕</div>
              <div>
                <strong style="font-size:0.85rem;">Bella</strong>
                <span style="font-size:0.75rem; color:#9ca3af; display:block;">Golden Retriever • 3 Years</span>
              </div>
              <div style="margin-left:auto; background:rgba(251,146,60,0.2); color:#fb923c; border:1px solid rgba(251,146,60,0.3); padding:0.15rem 0.4rem; border-radius:3px; font-size:0.65rem; font-weight:700;">
                TAG ACTIVE
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (portalKey === 'vet') {
    html = `
      <div class="port-portal-showcase">
        <div class="port-feature-list">
          <div class="port-feature-item">
            <i class="fa-solid fa-stethoscope"></i>
            <div>
              <strong>Patient Records Inquiry</strong>
              <span>Instantly fetch files by scanning collar endpoints or validating shared access codes.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-chart-line"></i>
            <div>
              <strong>Clinical Dashboard</strong>
              <span>Review growth statistics, chronic histories, vaccine sequences, and caregiver instructions.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-calendar-check"></i>
            <div>
              <strong>Appointment Management</strong>
              <span>Schedule veterinary clinic checkups, log booster due dates, and update intake statuses.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-prescription"></i>
            <div>
              <strong>Digital Prescriptions</strong>
              <span>Issue, sign, and document prescriptions, medication dosages, and follow-ups.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-heart-pulse"></i>
            <div>
              <strong>Treatment History Logs</strong>
              <span>Append veterinary clinic diagnostic logs, surgery notes, and historical physical weigh-ins.</span>
            </div>
          </div>
        </div>
        
        <div class="port-mock-browser">
          <div class="port-mock-browser-header">
            <span class="port-mock-dot red"></span>
            <span class="port-mock-dot yellow"></span>
            <span class="port-mock-dot green"></span>
            <span class="port-mock-address">#/vet-portal/patients</span>
          </div>
          <div class="port-mock-body" style="background:#1e1e24;">
            <div style="margin-bottom:1rem;">
              <input type="text" placeholder="Search patient by Tag ID (e.g. TAG1092)..." style="width:100%; padding:0.4rem 0.75rem; border-radius:4px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); font-size:0.75rem; color:white;" value="TAG1092">
            </div>
            <div style="background:rgba(15,118,110,0.1); border:1px solid rgba(15,118,110,0.2); padding:0.75rem; border-radius:6px; display:flex; gap:0.5rem; flex-direction:column;">
              <span style="font-size:0.7rem; color:var(--secondary-teal); font-weight:700;">VERIFIED CLINIC</span>
              <span style="font-size:0.8rem; font-weight:600;">Dr. Priya Sharma</span>
              <span style="font-size:0.75rem; color:#9ca3af;">PawCare Veterinary Clinic</span>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (portalKey === 'ngo') {
    html = `
      <div class="port-portal-showcase">
        <div class="port-feature-list">
          <div class="port-feature-item">
            <i class="fa-solid fa-truck-pickup"></i>
            <div>
              <strong>Rescue Intake Control</strong>
              <span>Create legal intakes for strays, noting location caught, health states, and images.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-house-chimney-window"></i>
            <div>
              <strong>Foster Homes Coordinates</strong>
              <span>Track active foster locations, availability levels, and temporary sitter agreements.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-users-viewfinder"></i>
            <div>
              <strong>Adoption Management Application</strong>
              <span>Process digital adopter questionnaires, checklist audits, and list adoptable pets.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-briefcase-medical"></i>
            <div>
              <strong>Medical Rehabilitation History</strong>
              <span>Track isolation states, veterinarian referral results, and vaccine schedules.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-hands-holding-heart"></i>
            <div>
              <strong>Volunteer Management</strong>
              <span>Coordinate rescue tasks, rescue assignments, and community feeder notes.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-right-left"></i>
            <div>
              <strong>Ownership Transfer Clearance</strong>
              <span>Authorize instant Firestore account swaps, changing owner pointer once cleared.</span>
            </div>
          </div>
        </div>
        
        <div class="port-mock-browser">
          <div class="port-mock-browser-header">
            <span class="port-mock-dot red"></span>
            <span class="port-mock-dot yellow"></span>
            <span class="port-mock-dot green"></span>
            <span class="port-mock-address">#/ngo/command</span>
          </div>
          <div class="port-mock-body" style="background:#1e1e24;">
            <strong style="display:block; font-size:0.85rem; margin-bottom:0.75rem;">Active NGO Intakes</strong>
            <div style="display:flex; flex-direction:column; gap:0.5rem;">
              <div style="display:flex; justify-content:space-between; font-size:0.75rem; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:0.25rem;">
                <span>Stray Dog (Milo)</span>
                <span style="color:#22c55e;">Rehab Stage</span>
              </div>
              <div style="display:flex; justify-content:space-between; font-size:0.75rem; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:0.25rem;">
                <span>Injured Cat (Luna)</span>
                <span style="color:#f59e0b;">Veterinary Clinic Care</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (portalKey === 'admin') {
    html = `
      <div class="port-portal-showcase">
        <div class="port-feature-list">
          <div class="port-feature-item">
            <i class="fa-solid fa-users-gear"></i>
            <div>
              <strong>User Management & Permissions Control</strong>
              <span>Review registered logins, audit database security scopes, and toggle active credentials.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-handshake-angle"></i>
            <div>
              <strong>NGO Approval Workspace</strong>
              <span>Approve non-profit documentation and list official rescue organizations.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-user-doctor"></i>
            <div>
              <strong>Vet Verification Workspace</strong>
              <span>Audit and verify veterinarian license numbers before opening clinical permission databases.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-bullhorn"></i>
            <div>
              <strong>Broadcast Global Notifications</strong>
              <span>Send push updates to community dashboards regarding vaccine drives or weather alerts.</span>
            </div>
          </div>
          <div class="port-feature-item">
            <i class="fa-solid fa-truck-ramp-box"></i>
            <div>
              <strong>Smart Tag Order Tracking</strong>
              <span>Coordinate collar shipments, serial logs, and status clearances (ordered, printed, shipped).</span>
            </div>
          </div>
        </div>
        
        <div class="port-mock-browser">
          <div class="port-mock-browser-header">
            <span class="port-mock-dot red"></span>
            <span class="port-mock-dot yellow"></span>
            <span class="port-mock-dot green"></span>
            <span class="port-mock-address">#/admin</span>
          </div>
          <div class="port-mock-body" style="background:#1e1e24; display:flex; flex-direction:column; gap:0.5rem; justify-content:center;">
            <div style="background:rgba(251,146,60,0.1); border:1px solid rgba(251,146,60,0.2); padding:0.5rem; border-radius:4px; text-align:center;">
              <span style="font-size:0.75rem; font-weight:700; color:var(--terracotta);">Pending Vet Audits: 2</span>
            </div>
            <div style="background:rgba(34,197,94,0.1); border:1px solid rgba(34,197,94,0.2); padding:0.5rem; border-radius:4px; text-align:center;">
              <span style="font-size:0.75rem; font-weight:700; color:#22c55e;">Pending NGO Approvals: 1</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
};

// Global Utility Alerts
window.showPortfolioGithubInfo = function() {
  alert("PawTrace is configured as a private enterprise project repository.\nPlease contact the administrator at nithinsshetty3@gmail.com for developer codebase read-access.");
};

window.showPortfolioLinkedIn = function() {
  window.open("https://www.linkedin.com/in/nithin-s-shetty-3a0267333/", "_blank");
};
