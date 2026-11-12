import { describe, expect, it } from 'vitest';
import { assetDownload } from '../../scripts/prepare-hosted-assets';

describe('external deployment asset URLs', () => {
  it('preserves the exact logo path used by the header and footer', () => {
    const path = '/__l5e/assets-v1/3a48a122-4057-422d-81c2-8c5faf7e9bdc/mwanainchi-logo.png';
    expect(assetDownload({ url: path }, 'https://source.example')).toEqual({
      url: `https://source.example${path}`, publicPath: path.slice(1), contentType: undefined,
    });
  });
  it('leaves bundled and absolute image URLs untouched', () => {
    expect(assetDownload({ url: '/assets/beef.jpg' })).toBeNull();
    expect(assetDownload({ url: 'https://photos.example/beef.jpg' })).toBeNull();
  });
  it('rejects insecure download origins', () => {
    expect(() => assetDownload({ url: '/__l5e/assets-v1/id/logo.png' }, 'http://source.example')).toThrow();
  });
  it('rejects paths escaping the asset directory', () => {
    expect(() => assetDownload({ url: '/__l5e/assets-v1/../../../private' })).toThrow();
  });
});