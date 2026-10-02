import { describe, expect, it } from 'vitest';
import { articlesPort } from '../../../../src/app/dependencies/editorial';
import { articlesApi } from '../../../../src/modules/editorial/articles/infrastructure/articlesApi';

describe('Editorial articles composition', () => {
  it('exposes the HTTP adapter through the app dependency', () => {
    expect(articlesPort).toBe(articlesApi);
  });
});
