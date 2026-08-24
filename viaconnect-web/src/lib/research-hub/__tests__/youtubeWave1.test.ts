import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('227a YouTube Wave 1', () => {
  it('uses official Data API env and stores no person fields', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/lib/research-hub/youtubeSignalIngest.ts'),
      'utf8',
    );
    expect(src).toContain('YOUTUBE_DATA_API_KEY');
    expect(src).toContain('youtube/v3/search');
    expect(src).toContain('stores_person_id: false');
    expect(src).not.toMatch(/snippet\.channel/);
    expect(src).not.toMatch(/channelTitle\s*[:=]/);
    expect(src).not.toMatch(/scrape/i);
  });

  it('migration marks youtube live and keeps other platforms pending', () => {
    const sql = fs.readFileSync(
      path.join(
        process.cwd(),
        'supabase/migrations/20260822040000_prompt_227a_youtube_wave1_live.sql',
      ),
      'utf8',
    );
    expect(sql).toContain("domain = 'youtube.com'");
    expect(sql).toContain("registry_status = 'live'");
    expect(sql).toContain('reddit.com');
    expect(sql).toContain("registry_status = 'pending_access'");
  });
});
