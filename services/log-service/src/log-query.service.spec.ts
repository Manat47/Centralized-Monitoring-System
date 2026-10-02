import { BadRequestException } from '@nestjs/common';
import { DataStore } from './data.store';
import { LogQueryService, parseLogSearch } from './log-query.service';

describe('universal log search parser', () => {
  it('parses standard fields and numeric comparisons with spaces', () => {
    expect(
      parseLogSearch('source:payments status_code >= 400 ip:203.0.*'),
    ).toEqual([
      { field: 'source', operator: ':', value: 'payments' },
      { field: 'status_code', operator: '>=', value: '400' },
      { field: 'ip', operator: ':', value: '203.0.*' },
    ]);
  });
  it('rejects unsupported keys visibly', () => {
    expect(() => parseLogSearch('metadata.status:failed')).toThrow(
      BadRequestException,
    );
    expect(() => parseLogSearch('metadata.status:failed')).toThrow(
      'Unsupported search field',
    );
  });
});

describe('LogQueryService exclusions', () => {
  it('applies NOT conditions to rows, facets, histogram, and total', async () => {
    const calls: Array<{ sql: string; values: unknown[] }> = [];
    const db = {
      query: (sql: string, values: unknown[]) => {
        calls.push({ sql, values });
        return Promise.resolve({
          rows: sql.includes('SELECT count(*)::text AS count FROM')
            ? [{ count: '0' }]
            : [],
        });
      },
    } as unknown as DataStore;
    const query = new LogQueryService(db);
    await query.list('project-1', {
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-01T01:00:00.000Z',
      exclude_source: ['payments', 'test'],
      exclude_severity: 'WARN',
    });

    expect(calls).toHaveLength(8);
    for (const { sql, values } of calls) {
      expect(sql).toContain('lower(e.source)<>lower($4)');
      expect(sql).toContain('lower(e.source)<>lower($5)');
      expect(sql).toContain('(e.severity IS NULL OR e.severity<>$6)');
      expect(values.slice(3, 6)).toEqual(['payments', 'test', 'WARN']);
    }
  });
});
