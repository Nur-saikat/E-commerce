import { TestBed } from '@angular/core/testing';
import { APP_ENV } from '../../../environments/environment';
import { AssetUrlPipe } from './asset-url.pipe';

describe('AssetUrlPipe', () => {
  let pipe: AssetUrlPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: APP_ENV,
          useValue: { production: true, apiBaseUrl: '/api', assetBaseUrl: 'http://cdn.test' }
        }
      ]
    });
    pipe = TestBed.runInInjectionContext(() => new AssetUrlPipe());
  });

  it('returns the placeholder for empty values', () => {
    expect(pipe.transform(null)).toBe('assets/placeholder.svg');
    expect(pipe.transform(undefined)).toBe('assets/placeholder.svg');
    expect(pipe.transform('')).toBe('assets/placeholder.svg');
  });

  it('leaves absolute, protocol-relative, data and bundled asset URLs untouched', () => {
    expect(pipe.transform('https://images.test/a.jpg')).toBe('https://images.test/a.jpg');
    expect(pipe.transform('//images.test/a.jpg')).toBe('//images.test/a.jpg');
    expect(pipe.transform('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(pipe.transform('assets/logo.svg')).toBe('assets/logo.svg');
  });

  it('prefixes API-hosted paths with the asset base URL', () => {
    expect(pipe.transform('/uploads/2026/11/a.jpg')).toBe('http://cdn.test/uploads/2026/11/a.jpg');
    expect(pipe.transform('uploads/2026/11/a.jpg')).toBe('http://cdn.test/uploads/2026/11/a.jpg');
  });
});
