import { BadRequestException } from '@nestjs/common';
import { parseLogSearch } from './log-query.service';

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
