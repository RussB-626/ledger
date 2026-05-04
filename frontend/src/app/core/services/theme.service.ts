import { Injectable } from '@angular/core';

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  success: string;
  error: string;
  border: string;
  buttonHover: string;
  zero: string;
}

export interface ThemeDefinition {
  name: string;
  colors: ThemeColors;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themes: Record<string, ThemeDefinition> = {
    default: {
      name: 'Default',
      colors: {
        primary: '#00d9ff',
        secondary: '#1dd1a1',
        accent: '#0066cc',
        background: '#0f1419',
        surface: '#1a1f2e',
        surfaceAlt: '#252d3d',
        text: '#e0e0e0',
        textSecondary: '#a0a0a0',
        success: '#1dd1a1',
        error: '#ff6b6b',
        border: '#2a3447',
        buttonHover: '#005fa3',
        zero: '#ffffff'
      }
    },
    light: {
      name: 'Light',
      colors: {
        primary: '#0066cc',
        secondary: '#00aa66',
        accent: '#0099ff',
        background: '#ffffff',
        surface: '#f5f5f5',
        surfaceAlt: '#eeeeee',
        text: '#1a1a1a',
        textSecondary: '#666666',
        success: '#00aa66',
        error: '#cc0000',
        border: '#cccccc',
        buttonHover: '#0052a3',
        zero: '#999999'
      }
    },
    'high-contrast': {
      name: 'High Contrast',
      colors: {
        primary: '#ffff00',
        secondary: '#00ff00',
        accent: '#00ffff',
        background: '#000000',
        surface: '#1a1a1a',
        surfaceAlt: '#333333',
        text: '#ffffff',
        textSecondary: '#cccccc',
        success: '#00ff00',
        error: '#ff0000',
        border: '#ffffff',
        buttonHover: '#cccc00',
        zero: '#cccccc'
      }
    },
    'colorblind-deuteranopia': {
      name: 'Color Blind (Red-Green)',
      colors: {
        primary: '#0173b2',
        secondary: '#de8f05',
        accent: '#cc78bc',
        background: '#0f1419',
        surface: '#1a1f2e',
        surfaceAlt: '#252d3d',
        text: '#e0e0e0',
        textSecondary: '#a0a0a0',
        success: '#de8f05',
        error: '#cc78bc',
        border: '#2a3447',
        buttonHover: '#005fa3',
        zero: '#ffffff'
      }
    },
    'colorblind-protanopia': {
      name: 'Color Blind (Red-Green Alt)',
      colors: {
        primary: '#0173b2',
        secondary: '#eca307',
        accent: '#d45113',
        background: '#0f1419',
        surface: '#1a1f2e',
        surfaceAlt: '#252d3d',
        text: '#e0e0e0',
        textSecondary: '#a0a0a0',
        success: '#eca307',
        error: '#d45113',
        border: '#2a3447',
        buttonHover: '#005fa3',
        zero: '#ffffff'
      }
    },
    'colorblind-tritanopia': {
      name: 'Color Blind (Blue-Yellow)',
      colors: {
        primary: '#ee7733',
        secondary: '#0077bb',
        accent: '#33bbee',
        background: '#0f1419',
        surface: '#1a1f2e',
        surfaceAlt: '#252d3d',
        text: '#e0e0e0',
        textSecondary: '#a0a0a0',
        success: '#0077bb',
        error: '#ee7733',
        border: '#2a3447',
        buttonHover: '#005fa3',
        zero: '#ffffff'
      }
    }
  };

  applyTheme(themeId: string): void {
    const theme = this.themes[themeId];
    if (!theme) {
      console.warn(`Theme ${themeId} not found, using default`);
      this.applyTheme('default');
      return;
    }

    const colors = theme.colors;
    const root = document.documentElement;

    // Set CSS custom properties
    root.style.setProperty('--color-primary', colors.primary);
    root.style.setProperty('--color-secondary', colors.secondary);
    root.style.setProperty('--color-accent', colors.accent);
    root.style.setProperty('--color-background', colors.background);
    root.style.setProperty('--color-surface', colors.surface);
    root.style.setProperty('--color-surface-alt', colors.surfaceAlt);
    root.style.setProperty('--color-text', colors.text);
    root.style.setProperty('--color-text-secondary', colors.textSecondary);
    root.style.setProperty('--color-success', colors.success);
    root.style.setProperty('--color-error', colors.error);
    root.style.setProperty('--color-border', colors.border);
    root.style.setProperty('--color-button-hover', colors.buttonHover);
    root.style.setProperty('--color-zero', colors.zero);

    // Store current theme
    localStorage.setItem('selected-theme', themeId);
  }

  getStoredTheme(): string {
    return localStorage.getItem('selected-theme') || 'default';
  }
}
